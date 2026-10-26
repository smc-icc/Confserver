const Dao = require('../../dao/TelAgentSMCIccDao');
const axios = require('axios');

const XML_WRITE_PORT = 8080;
const XML_WRITE_PATH = '/ConfigureWrite/write';
const XML_DELETE_PATH = '/ConfigureWrite/deleteTelAgentXML';
const XML_WRITE_FILE_NAME = 'telagent_config.xml';

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function parseTelAgent(p) {
    const localIp = String(p['telAgent.localIp'] || p.localIp || '').trim();
    let myName = String(p['telAgent.myName'] || p.myName || '').trim();
    if (!myName) myName = localIp;
    return {
        pid: toInt(p['telAgent.pid'] || p.pid, 0),
        cfgOdbcPid: toInt(p['telAgent.cfgOdbcPid'] || p.cfgOdbcPid, 0),
        cfgCcsPid: toInt(p['telAgent.cfgCcsPid'] || p.cfgCcsPid, 0),
        cfgFocuCommPid: toInt(p['telAgent.cfgFocuCommPid'] || p.cfgFocuCommPid, 0),
        localIp,
        myId: toInt(p['telAgent.myId'] || p.myId, 0),
        myName,
        poolSize: toInt(p['telAgent.poolSize'] || p.poolSize, 0),
    };
}

function mapGridRow(r) {
    return {
        pid: r.pid,
        cfgOdbcPid: r.cfgOdbcPid,
        cfgCcsPid: r.cfgCcsPid,
        cfgFocuCommPid: r.cfgFocuCommPid,
        localIp: r.localIp,
        myId: r.myId,
        poolSize: r.poolSize,
        lastDeployDate: r.lastDeployDate,
        odbc: { pid: r.cfgOdbcPid, odbcName: r.odbcOdbcName || '' },
        ccs: { pid: r.cfgCcsPid, myName: r.ccsMyName || '' },
        focuComm: {
            pid: r.cfgFocuCommPid,
            ipAddress: r.focuIpAddress || '',
            ipAndPort: r.focuIpAndPort || '',
        },
        deployUser: r.deployUserId != null ? { id: r.deployUserId, name: r.deployUserName } : null,
    };
}

function escXml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function buildTelAgentXml(row) {
    const ip = row.ipAddress;
    const port = row.port;
    const myId = row.myId;
    const myName = row.telMyName || row.localIp || '';
    const ccsMyId = row.ccsMyId;
    const odbcName = row.odbcName;
    const loginId = row.loginId;
    const loginPwd = row.loginPwd;
    const poolSize = row.poolSize;
    const dbName = row.dbName;
    const missing = [];
    if (ip == null || ip === '') missing.push('focuComm.ipAddress');
    if (port == null || port === '') missing.push('focuComm.port');
    if (myId == null || myId === '') missing.push('myId');
    if (ccsMyId == null || ccsMyId === '') missing.push('ccs.myId');
    if (odbcName == null || odbcName === '') missing.push('odbc.name');
    if (loginId == null || loginId === '') missing.push('odbc.loginId');
    if (loginPwd == null || loginPwd === '') missing.push('odbc.loginPwd');
    if (poolSize == null || poolSize === '') missing.push('poolSize');
    if (dbName == null || dbName === '') missing.push('odbc.dBName');
    if (missing.length) throw new Error(`生成telagent_config配置文件内容时出错，${missing[0]}数据为空`);
    return `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <netbus serverName="${escXml(ip)}" port="${escXml(port)}" myId="${escXml(myId)}" myName="${escXml(myName)}"/>
  <CCS1 MyID="${escXml(ccsMyId)}"/>
  <database DataSource="${escXml(odbcName)}" UserName="${escXml(loginId)}" Passwd="${escXml(loginPwd)}" poolSize="${escXml(poolSize)}" DBName="${escXml(dbName)}"/>
</configuration>`;
}

async function postConfigure(host, path, xmlContent) {
    const body = new URLSearchParams();
    body.append('filename', XML_WRITE_FILE_NAME);
    body.append('content', xmlContent);
    return axios({
        method: 'post',
        url: `http://${host}:${XML_WRITE_PORT}${path}`,
        data: body.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        timeout: 20000,
        responseType: 'json',
        validateStatus: () => true,
    });
}

function interpretJsonRsp(rsp) {
    const data = rsp?.data || {};
    if (data && Object.prototype.hasOwnProperty.call(data, 'error')) {
        return { ok: false, msg: data.msg || '发布XML异常' };
    }
    const status = Number(data.status);
    const msg = data.msg || '';
    if (status !== 1) {
        return { ok: false, msg: msg || '发布XML异常' };
    }
    return { ok: true, msg };
}

const Service = {};

Service.loadTelAgentList = async (ctx) => {
    const cfgCcsPid = toInt(ctx.paramsObj['telAgent.cfgCcsPid'], -1);
    const localIp = String(ctx.paramsObj['telAgent.localIp'] || '');
    const page = toInt(ctx.paramsObj.page, 1);
    const pagesize = toInt(ctx.paramsObj.pagesize, 10);
    const { rows, total } = await Dao.listPaged({ cfgCcsPid, localIp, page, pageSize: pagesize });
    return { Rows: rows.map(mapGridRow), Total: total };
};

Service.addTelAgent = async (ctx) => {
    const row = parseTelAgent(ctx.paramsObj);
    const dup = await Dao.countByMyIdExcludingPid({ myId: row.myId, currentPid: 0 });
    if (dup > 0) return -1;
    try {
        const newPid = await Dao.insert(row);
        return newPid > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Service.editTelAgent = async (ctx) => {
    const row = parseTelAgent(ctx.paramsObj);
    const dup = await Dao.countByMyIdExcludingPid({ myId: row.myId, currentPid: row.pid });
    if (dup > 0) return -1;
    try {
        const ret = await Dao.update(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Service.deleteTelAgent = async (ctx) => {
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => !Number.isNaN(x) && x > 0);
    if (!pids.length) return false;
    try {
        const ret = await Dao.deleteByPids(pids);
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

/**
 * Struts 有 copyTelAgent，Java TelAgentAction 无实现：按源 PID 复制一行，myId 递增直至唯一。
 */
Service.copyTelAgent = async (ctx) => {
    const p = ctx.paramsObj || {};
    const pid = toInt(p['telAgent.pid'] ?? p.pid, 0);
    if (!pid) return false;
    try {
        const src = await Dao.selectByPid(pid);
        if (!src) return false;
        let newMyId = toInt(src.myId, 0) + 1;
        const maxTry = 100000;
        let tries = 0;
        while (tries < maxTry) {
            const dup = await Dao.countByMyIdExcludingPid({ myId: newMyId, currentPid: 0 });
            if (dup === 0) break;
            newMyId += 1;
            tries += 1;
        }
        if (tries >= maxTry) return false;
        const myName = String(src.myName || src.localIp || '').trim() || String(src.localIp || '');
        const newPid = await Dao.insert({
            cfgOdbcPid: toInt(src.cfgOdbcPid, 0),
            cfgCcsPid: toInt(src.cfgCcsPid, 0),
            cfgFocuCommPid: toInt(src.cfgFocuCommPid, 0),
            localIp: String(src.localIp || '').trim(),
            myId: newMyId,
            myName,
            poolSize: toInt(src.poolSize, 0),
        });
        return newPid > 0;
    } catch (e) {
        return false;
    }
};

Service.loadCcsList = async (ctx) => {
    const key = ctx.paramsObj.key != null ? String(ctx.paramsObj.key) : '';
    return Dao.listCcsByKey(key);
};

Service.deployTelAgentXML = async (ctx) => {
    const list = await Dao.listAllForXml();
    if (!list.length) {
        return { result: false, msg: '发布XML异常' };
    }

    const xmlEntries = [];
    for (const r of list) {
        try {
            const xml = buildTelAgentXml(r);
            xmlEntries.push({ pid: r.pid, localIp: String(r.localIp || '').trim(), xml });
        } catch (e) {
            return { result: false, msg: e.message || '发布XML异常' };
        }
    }

    const seenIp = new Set();
    let lastMsg = '';

    for (const entry of xmlEntries) {
        const host = entry.localIp;
        if (!host) {
            return { result: false, msg: '发布XML异常' };
        }

        try {
            if (!seenIp.has(host)) {
                try {
                    await postConfigure(host, XML_DELETE_PATH, entry.xml);
                } catch (eDel) {
                    return { result: false, msg: 'ConnectException' };
                }
                seenIp.add(host);
            }

            const writeRsp = await postConfigure(host, XML_WRITE_PATH, entry.xml);
            const wr = interpretJsonRsp(writeRsp);
            if (!wr.ok) {
                return { result: false, msg: wr.msg };
            }
            lastMsg = wr.msg;

            const workNo = String(ctx.session.smcicc_sys_work_no || '');
            const workName = String(ctx.session.smcicc_sys_work_name || workNo || 'system');
            const user = workNo ? await Dao.findSysUserByWorkNo(workNo) : null;
            const userId = Number(user?.id || 0);
            const updated = await Dao.updateXMLDeployer({ pid: entry.pid, userId, workName });
            if (Number(updated || 0) <= 0) {
                return { result: false, msg: '发布XML异常' };
            }
        } catch (e) {
            return { result: false, msg: 'ConnectException' };
        }
    }

    return { result: true, msg: lastMsg };
};

module.exports = Service;
