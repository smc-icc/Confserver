const axios = require('axios');
const AgpDao = require('../../dao/AgpSMCIccDao');
const CcsDao = require('../../dao/CcsSMCIccDao');
const AcdDao = require('../../dao/AcdSMCIccDao');

const XML_WRITE_PORT = 8080;
const XML_WRITE_PATH = '/ConfigureWrite/write';
const XML_WRITE_FILE_NAME = 'agentproxy_config.xml';

const Service = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pick(p, key) {
    if (!p) return undefined;
    if (p.agp && typeof p.agp === 'object' && Object.prototype.hasOwnProperty.call(p.agp, key)) {
        return p.agp[key];
    }
    const dotted = `agp.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function mapAgpRow(r) {
    if (!r) return null;
    return {
        pid: r.pid,
        cfgFocuCommPid: r.cfgFocuCommPid,
        ccs1: r.ccs1,
        ccs2: r.ccs2,
        timeout: r.timeout,
        runMode: r.runMode,
        clientCount: r.clientCount,
        note: r.note,
        localIpAndPort: r.localIpAndPort,
        localTimeout: r.localTimeout,
        localClientCount: r.localClientCount,
        localExpiryDuration: r.localExpiryDuration,
        logLevel: r.logLevel,
        logStyle: r.logStyle,
        ccsComId: r.ccsComId,
        acdComId: r.acdComId,
        lastDeployDate: r.lastDeployDate,
        deployUser: r.deployUserId != null ? { id: r.deployUserId, name: r.deployUserName } : null,
    };
}

function mapCcsRow(row) {
    if (!row) return null;
    const o = { ...row };
    o.deployUser = row.deployUserId != null ? { id: row.deployUserId, name: row.deployUserName } : null;
    delete o.deployUserId;
    delete o.deployUserName;
    return o;
}

function mapAcdRow(r) {
    return {
        pid: r.pid,
        cfgOdbcPid: r.cfgOdbcPid,
        cfgFocuCommPid: r.cfgFocuCommPid,
        myName: r.myName,
        appId: r.appId,
        runMode: r.runMode,
        localIp: r.localIp,
        note: r.note,
        poolSize: r.poolSize,
        clientCharset: r.clientCharset,
        sync: r.sync,
        dbDebugInfo: r.dbDebugInfo,
        tIcipAcdAgentQueueRecord: r.tIcipAcdAgentQueueRecord,
        tIcipAcdCallRecord: r.tIcipAcdCallRecord,
        ccsId: r.ccsId,
        logLevel: r.logLevel,
        logCount: r.logCount,
        lastDeployDate: r.lastDeployDate,
        odbc: { pid: r.cfgOdbcPid, odbcName: r.odbcOdbcName || '' },
        deployUser: r.deployUserId != null ? { id: r.deployUserId, name: r.deployUserName } : null,
    };
}

function parseAgpFull(p) {
    return {
        pid: toInt(pick(p, 'pid'), 0),
        cfgFocuCommPid: toInt(pick(p, 'cfgFocuCommPid'), 0),
        ccs1: toInt(pick(p, 'ccs1'), 0),
        ccs2: toInt(pick(p, 'ccs2'), 0),
        timeout: toInt(pick(p, 'timeout'), 0),
        runMode: String(pick(p, 'runMode') || ''),
        clientCount: toInt(pick(p, 'clientCount'), 0),
        note: String(pick(p, 'note') || ''),
        localIpAndPort: String(pick(p, 'localIpAndPort') || ''),
        localTimeout: toInt(pick(p, 'localTimeout'), 0),
        localClientCount: toInt(pick(p, 'localClientCount'), 0),
        localExpiryDuration: toInt(pick(p, 'localExpiryDuration'), 0),
        logLevel: String(pick(p, 'logLevel') || ''),
        logStyle: String(pick(p, 'logStyle') || ''),
        ccsComId: toInt(pick(p, 'ccsComId'), 0),
        acdComId: toInt(pick(p, 'acdComId'), 0),
    };
}

function escXml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function need(v, param) {
    if (v === null || v === undefined) throw new Error(`agentproxy_config.xml 生成失败：${param} 为空`);
    if (typeof v === 'string' && v.trim() === '') throw new Error(`agentproxy_config.xml 生成失败：${param} 为空`);
}

/** 与 Java AgpCreator.assembleContent 等价 */
function buildAgpXml(d) {
    const localIpAndPort = d.localIpAndPort;
    need(localIpAndPort, 'localIpAndPort');
    const colonIndex = String(localIpAndPort).indexOf(':');
    if (colonIndex < 0) {
        throw new Error(`agentproxy_config.xml 生成失败：错误的 IP:端口 ${localIpAndPort}`);
    }
    const localIp = String(localIpAndPort).substring(0, colonIndex);
    const localPort = String(localIpAndPort).substring(colonIndex + 1);
    need(d.localTimeout, 'localTimeout');
    need(d.localClientCount, 'localClientCount');
    need(d.localExpiryDuration, 'localExpiryDuration');
    need(d.focuIpAddress, 'focuComm.ipAddress');
    need(d.focuPort, 'focuComm.port');
    need(d.timeout, 'timeout');
    need(d.clientCount, 'clientCount');
    need(d.ccs1MyId, 'ccsEty1.myId');
    need(d.ccs2MyId, 'ccsEty2.myId');
    need(d.logStyle, 'logStyle');
    need(d.logLevel, 'logLevel');
    need(d.ccsComMyId, 'ccsComm.myId');
    need(d.acdAppId, 'acdComm.AppId');

    return `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <LocalHost IP="${escXml(localIp)}" Port="${escXml(localPort)}" Timeout="${escXml(d.localTimeout)}" ClientCount="${escXml(d.localClientCount)}" ExpiryDuration="${escXml(d.localExpiryDuration)}" />
  <CommHost IP="${escXml(d.focuIpAddress)}" Port="${escXml(d.focuPort)}" Timeout="${escXml(d.timeout)}" ClientCount="${escXml(d.clientCount)}" MyName="AGENTPROXY" CCS1="${escXml(d.ccs1MyId)}" CCS2="${escXml(d.ccs2MyId)}" />
  <Log Style="${escXml(d.logStyle)}" Level="${escXml(d.logLevel)}" Cache="yes" />
  <Component>
    <CCSCom type="12" ID="${escXml(d.ccsComMyId)}" />
    <ACDCom type="11" ID="${escXml(d.acdAppId)}" />
    <OBSCom type="9" ID="1" />
    <CallCom type="14" ID="1" />
  </Component>
</configuration>`;
}

Service.loadAgpList = async () => {
    const rows = await AgpDao.agpSelectAll();
    return { agpList: rows.map(mapAgpRow) };
};

Service.loadAccessMachineList2 = async () => {
    const rows = await CcsDao.loadFocuCommList();
    const focuCommList = rows.map((r) => ({
        ...r,
        ipAddress: `${r.ipAddress}:${r.port}`,
    }));
    return { focuCommList };
};

Service.loadFocuCommList2 = Service.loadAccessMachineList2;

Service.loadCcsList2 = async () => {
    const rows = await CcsDao.listAllCcs();
    return { ccsList: rows.map(mapCcsRow) };
};

Service.loadAcdList2 = async () => {
    const { rows } = await AcdDao.listPaged({ myName: '', runMode: '', page: 1, pageSize: 99999 });
    return { acdList: rows.map(mapAcdRow) };
};

Service.loadAgp = async (ctx) => {
    const agpId = toInt(ctx.paramsObj.agpId, 0);
    if (!agpId) return { agp: null };
    const row = await AgpDao.agpSelectById(agpId);
    return { agp: mapAgpRow(row) };
};

Service.addAgp = async (ctx) => {
    const p = ctx.paramsObj || {};
    const cfgFocuCommPid = toInt(p.focuCommPid ?? p.cfgFocuCommPid, 0);
    const runMode = String(p.runMode ?? '');
    const note = String(p.note ?? '');
    try {
        await AgpDao.agpInsertMinimal({ cfgFocuCommPid, runMode, note });
        const agp = await AgpDao.agpSelectLast();
        return { result: agp ? 1 : 0, agp: mapAgpRow(agp) };
    } catch (e) {
        return { result: 0, agp: null };
    }
};

Service.saveAgpForm = async (ctx) => {
    const row = parseAgpFull(ctx.paramsObj || {});
    if (!row.pid) return { result: 0, agp: null };
    try {
        const ret = await AgpDao.agpUpdate(row);
        const agp = await AgpDao.agpSelectById(row.pid);
        return { result: Number(ret || 0) > 0 ? 1 : 0, agp: mapAgpRow(agp) };
    } catch (e) {
        return { result: 0, agp: null };
    }
};

Service.deleteAgp = async (ctx) => {
    const agpId = toInt(ctx.paramsObj.agpId, 0);
    if (!agpId) return 0;
    try {
        const ret = await AgpDao.agpDelete(agpId);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Service.copyAgp = async (ctx) => {
    const agpId = toInt(ctx.paramsObj.agpId, 0);
    if (!agpId) return { result: -1, agp: null };
    const src = await AgpDao.agpSelectById(agpId);
    if (!src) return { result: -1, agp: null };
    const copyRow = {
        cfgFocuCommPid: src.cfgFocuCommPid,
        runMode: src.runMode,
        note: src.note,
        ccs1: src.ccs1,
        ccs2: src.ccs2,
        timeout: src.timeout,
        clientCount: src.clientCount,
        localIpAndPort: src.localIpAndPort,
        localTimeout: src.localTimeout,
        localClientCount: src.localClientCount,
        localExpiryDuration: src.localExpiryDuration,
        logLevel: src.logLevel,
        logStyle: src.logStyle,
        ccsComId: src.ccsComId,
        acdComId: src.acdComId,
    };
    try {
        await AgpDao.agpInsertCopy(copyRow);
        const agp = await AgpDao.agpSelectLast();
        return { result: agp ? 1 : 0, agp: mapAgpRow(agp) };
    } catch (e) {
        return { result: 0, agp: null };
    }
};

Service.deployAgpXML = async (ctx) => {
    const pid = toInt(ctx.paramsObj.agpId, 0);
    if (!pid) return { result: false, msg: '发布XML异常' };

    const row = await AgpDao.getAgp4XmlByPid(pid);
    if (!row) return { result: false, msg: '发布XML异常' };

    let xmlContent;
    try {
        xmlContent = buildAgpXml(row);
    } catch (e) {
        return { result: false, msg: e.message || '组装AGP4XML发生异常' };
    }

    const lip = String(row.localIpAndPort || '').trim();
    const xmlWriteIP = lip.split(':')[0];
    if (!xmlWriteIP) {
        return { result: false, msg: '获取发布生成AGP4XML的IP异常' };
    }

    const body = new URLSearchParams();
    body.append('filename', XML_WRITE_FILE_NAME);
    body.append('content', xmlContent);

    let rsp;
    try {
        rsp = await axios({
            method: 'post',
            url: `http://${xmlWriteIP}:${XML_WRITE_PORT}${XML_WRITE_PATH}`,
            data: body.toString(),
            headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
            timeout: 20000,
            responseType: 'json',
            validateStatus: () => true,
        });
    } catch (e) {
        return { result: false, msg: '发布XML异常' };
    }

    const data = rsp?.data || {};
    if (data && Object.prototype.hasOwnProperty.call(data, 'error')) {
        return { result: false, msg: data.msg || '发布XML异常' };
    }
    const status = Number(data.status);
    const msg = data.msg || '';
    if (status !== 1) {
        return { result: false, msg: msg || '发布XML异常' };
    }

    const workNo = String(ctx.session?.smcicc_sys_work_no || '');
    const workName = String(ctx.session?.smcicc_sys_work_name || workNo || 'system');
    const user = workNo ? await CcsDao.findSysUserByWorkNo(workNo) : null;
    const userId = Number(user?.id || 0);
    const updated = await AgpDao.updateXMLDeployer({ agpId: pid, userId, workName });
    if (Number(updated || 0) <= 0) {
        return { result: false, msg: '发布XML异常' };
    }
    return { result: true, msg };
};

module.exports = Service;
