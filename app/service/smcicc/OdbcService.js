const Dao = require('../../dao/OdbcSMCIccDao');

/** ODBCName 列常见长度上限（与界面/库一致即可；过长时按 copyUser 思路截断） */
const CONST_ODBC_NAME_MAX_LENGTH = 100;

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

/** 与 Struts 扁平 odbc.xxx 或 Vue postJSON 嵌套 odbc: { } 兼容 */
function pickOdbc(p, key) {
    if (!p) return undefined;
    if (p.odbc && typeof p.odbc === 'object' && Object.prototype.hasOwnProperty.call(p.odbc, key)) {
        return p.odbc[key];
    }
    const dotted = `odbc.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function parseOdbc(paramsObj) {
    const p = paramsObj || {};
    return {
        pid: toInt(pickOdbc(p, 'pid') ?? p.pid, -1),
        odbcName: String(pickOdbc(p, 'odbcName') ?? '').trim(),
        dbType: String(pickOdbc(p, 'dbType') ?? ''),
        dbName: String(pickOdbc(p, 'dbName') ?? ''),
        loginId: String(pickOdbc(p, 'loginId') ?? ''),
        loginPwd: String(pickOdbc(p, 'loginPwd') ?? ''),
        dbCharSet: String(pickOdbc(p, 'dbCharSet') ?? ''),
    };
}

const Service = {};

Service.loadOdbcList = async (ctx) => {
    const p = ctx.paramsObj || {};
    const odbcName = String(pickOdbc(p, 'odbcName') ?? '');
    const dbType = String(pickOdbc(p, 'dbType') ?? '');
    const dbName = String(pickOdbc(p, 'dbName') ?? '');
    const page = toInt(p.page, 1);
    const pagesize = toInt(p.pagesize, 10);
    const { rows, total } = await Dao.list({ odbcName, dbType, dbName, page, pageSize: pagesize });
    return { Rows: rows, Total: total };
};

Service.getOdbcList = async () => Dao.listAll();

Service.addOdbc = async (ctx) => {
    const row = parseOdbc(ctx.paramsObj);
    const exists = await Dao.countByNameExcludingPid({ odbcName: row.odbcName, pid: -1 });
    if (exists > 0) return -2;
    try {
        await Dao.insert(row);
        return 1;
    } catch (e) {
        return -1;
    }
};

Service.editOdbc = async (ctx) => {
    const row = parseOdbc(ctx.paramsObj);
    const exists = await Dao.countByNameExcludingPid({ odbcName: row.odbcName, pid: row.pid });
    if (exists > 0) return -2;
    try {
        await Dao.update(row);
        return 1;
    } catch (e) {
        return -1;
    }
};

Service.deleteOdbc = async (ctx) => {
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => !Number.isNaN(x));
    const ret = await Dao.deleteByPids(pids);
    return Number(ret || 0) > 0;
};

/**
 * Struts 配置了 copyOdbc，Java OdbcAction 未实现；此处按「复制一条 ODBC」：
 * 以源记录为模板插入新行，ODBC 名全局唯一（前缀 copy + 序号，长度截断）。
 */
Service.copyOdbc = async (ctx) => {
    const row = parseOdbc(ctx.paramsObj);
    const pid = toInt(row.pid, 0);
    if (pid <= 0) return false;
    try {
        const src = await Dao.selectByPid(pid);
        if (!src) return false;
        const oldName = String(src.odbcName || '');
        const prefix = 'copy';
        let i = 0;
        let newOdbcName;
        let dup;
        do {
            i += 1;
            const cutLen = (prefix + i).length - (CONST_ODBC_NAME_MAX_LENGTH - oldName.length);
            newOdbcName = cutLen > 0
                ? prefix + i + oldName.substring(0, oldName.length - cutLen)
                : prefix + i + oldName;
            dup = await Dao.countByNameExcludingPid({ odbcName: newOdbcName, pid: -1 });
        } while (dup > 0);
        const ret = await Dao.insert({
            odbcName: newOdbcName,
            dbType: src.dbType != null ? String(src.dbType) : '',
            dbName: src.dbName != null ? String(src.dbName) : '',
            loginId: src.loginId != null ? String(src.loginId) : '',
            loginPwd: src.loginPwd != null ? String(src.loginPwd) : '',
            dbCharSet: src.dbCharSet != null ? String(src.dbCharSet) : '',
        });
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

module.exports = Service;
