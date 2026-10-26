const { v4: uuidv4 } = require('uuid');
const Kamailio = require('./SipExtNumKamailioPool');

const Service = {};

const DOMAIN = 'smcloud.net';
const MAX_BATCH = 2000n;

function guidNoDash() {
    return uuidv4().replace(/-/g, '').toLowerCase();
}

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function toBigIntOrNull(v) {
    if (v === null || v === undefined || v === '') return null;
    try {
        return BigInt(String(v).trim());
    } catch {
        return null;
    }
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj?.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj?.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize };
}

/** 与 SipExtNumServiceImpl.connectionDB + loadSubscriberList 同请求 */
Service.connectionDB = async (ctx) => {
    const p = ctx.paramsObj || {};
    const ip = p.ip != null ? String(p.ip) : '';
    const port = p.port != null ? String(p.port) : '3306';
    const dbName = p.dbName != null ? String(p.dbName) : '';
    const userName = p.userName != null ? String(p.userName) : '';
    const password = p.password != null ? String(p.password) : '';
    const fenjiNum = p.fenjiNum != null ? String(p.fenjiNum) : '';
    try {
        await Kamailio.createPool({
            host: ip,
            port,
            database: dbName,
            user: userName,
            password,
        });
        const ok = await Kamailio.testConnection();
        if (!ok) {
            return { Rows: [], Total: 0, isConnection: false };
        }
        const pool = Kamailio.getPool();
        const { offset, pagesize } = pageOf(ctx);
        const like = fenjiNum ? `%${fenjiNum}%` : '%';
        const [rows] = await pool.query(
            `SELECT id, username AS userName, domain, password, email_address AS emailAddress,
                    ha1 AS ha1, ha1b AS ha1b, rpid AS rpid
               FROM subscriber
              WHERE username LIKE ?
              ORDER BY CAST(username AS UNSIGNED) ASC
              LIMIT ?, ?`,
            [like, offset, pagesize]
        );
        const [cntRows] = await pool.query(
            `SELECT COUNT(1) AS c FROM subscriber WHERE username LIKE ?`,
            [like]
        );
        const Total = Number(cntRows?.[0]?.c || 0);
        return { Rows: rows, Total, isConnection: true };
    } catch (e) {
        return { Rows: [], Total: 0, isConnection: false };
    }
};

/** 与 sIPExtNumList：已建立连接则查库，否则空列表 */
Service.sIPExtNumList = async (ctx) => {
    const pool = Kamailio.getPool();
    if (!pool) {
        return { Rows: [], Total: 0 };
    }
    try {
        const { offset, pagesize } = pageOf(ctx);
        const [rows] = await pool.query(
            `SELECT id, username AS userName, domain, password, email_address AS emailAddress,
                    ha1 AS ha1, ha1b AS ha1b, rpid AS rpid
               FROM subscriber
              WHERE 1=1
              ORDER BY CAST(username AS UNSIGNED) ASC
              LIMIT ?, ?`,
            [offset, pagesize]
        );
        const [cntRows] = await pool.query('SELECT COUNT(1) AS c FROM subscriber WHERE 1=1');
        return { Rows: rows, Total: Number(cntRows?.[0]?.c || 0) };
    } catch (e) {
        return { Rows: [], Total: 0 };
    }
};

async function insertSubscriber(pool, userName, password) {
    const ha1 = guidNoDash();
    let ha1b = guidNoDash();
    if (ha1b === ha1) ha1b = guidNoDash();
    const [ret] = await pool.query(
        `INSERT INTO subscriber (username, domain, password, email_address, ha1, ha1b, rpid)
         VALUES (?, ?, ?, ?, ?, ?, NULL)`,
        [userName, DOMAIN, password, '', ha1, ha1b]
    );
    return Number(ret?.affectedRows || 0);
}

/** 与 addSIPExtNum */
Service.addSIPExtNum = async (ctx) => {
    const p = ctx.paramsObj || {};
    const pool = Kamailio.getPool();
    const out = { result: 1, id: 0 };
    if (!pool) {
        out.result = -1;
        return out;
    }
    let extNum1 = toBigIntOrNull(p.extNum1);
    let extNum2 = toBigIntOrNull(p.extNum2);
    const password = p.password != null ? String(p.password) : '';
    if (extNum1 == null) {
        out.result = -3;
        return out;
    }
    if (extNum2 == null) extNum2 = extNum1;

    const span = extNum2 - extNum1;
    if (span <= 0n) {
        out.result = -3;
        return out;
    }
    if (span > MAX_BATCH) {
        out.result = -2;
        return out;
    }

    let a = 0;
    for (let i = extNum1; i <= extNum2; i += 1n) {
        const un = i.toString();
        try {
            const r = await insertSubscriber(pool, un, password);
            if (r > 0) a += 1;
        } catch {
            /* 忽略单条失败，与 Java 仅判断 result>0 类似 */
        }
        if (i === extNum2 && a === 0) {
            out.result = -100;
        }
    }
    return out;
};

/** 与 copySIPExtNum / copyServiceRoute */
Service.copySIPExtNum = async (ctx) => {
    const p = ctx.paramsObj || {};
    const pool = Kamailio.getPool();
    const extNum1 = toBigIntOrNull(p.extNum1);
    const password = p.password != null ? String(p.password) : '';
    const out = { result: 0, id: extNum1 != null ? extNum1 : 0 };
    if (!pool || extNum1 == null) {
        out.result = -1;
        return out;
    }
    const un = extNum1.toString();
    try {
        const [cntRows] = await pool.query(
            'SELECT COUNT(1) AS c FROM subscriber WHERE username = ?',
            [un]
        );
        const c = Number(cntRows?.[0]?.c || 0);
        if (c > 0) {
            out.result = -4;
            return out;
        }
        const r = await insertSubscriber(pool, un, password);
        out.result = r > 0 ? 1 : 0;
        return out;
    } catch (e) {
        out.result = 0;
        return out;
    }
};

/** 与 modifySIPExtNum */
Service.modifySIPExtNum = async (ctx) => {
    const p = ctx.paramsObj || {};
    const pool = Kamailio.getPool();
    const pid = toInt(p.pid, 0);
    const extNum1 = toBigIntOrNull(p.extNum1);
    const password = p.password != null ? String(p.password) : '';
    const out = { result: 0, id: extNum1 != null ? extNum1 : 0 };
    if (!pool || !pid || extNum1 == null) {
        return out;
    }
    try {
        const un = extNum1.toString();
        const [ret] = await pool.query(
            'UPDATE subscriber SET username = ?, password = ? WHERE id = ?',
            [un, password, pid]
        );
        out.result = Number(ret?.affectedRows || 0) > 0 ? 1 : 0;
        return out;
    } catch (e) {
        return out;
    }
};

/** 与 deleteSubscriber */
Service.deleteSubscriber = async (ctx) => {
    const p = ctx.paramsObj || {};
    const pool = Kamailio.getPool();
    const ids = String(p.subscriberIds || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => s !== '');
    if (!pool || !ids.length) return false;
    try {
        const marks = ids.map(() => '?').join(',');
        const [ret] = await pool.query(`DELETE FROM subscriber WHERE id IN (${marks})`, ids);
        return Number(ret?.affectedRows || 0) > 0;
    } catch (e) {
        return false;
    }
};

module.exports = Service;
