const Dao = require('../../dao/AcdSMCIccDao');
const { postConfigureWrite } = require('./configureWriteHttp');

const CONST_MYNAME_MAX_LENGTH = 100;
const XML_WRITE_FILE_NAME = 'ACDServer.xml';

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function parseAcd(params) {
    return {
        pid: toInt(params['acd.pid'], 0),
        cfgOdbcPid: toInt(params['acd.cfgOdbcPid'], 0),
        cfgFocuCommPid: toInt(params['acd.cfgFocuCommPid'], 0),
        myName: String(params['acd.myName'] || '').trim(),
        appId: toInt(params['acd.appId'], 0),
        runMode: String(params['acd.runMode'] || ''),
        localIp: String(params['acd.localIp'] || ''),
        note: String(params['acd.note'] || ''),
        poolSize: toInt(params['acd.poolSize'], 0),
        clientCharset: String(params['acd.clientCharset'] || ''),
        sync: toInt(params['acd.sync'], 0),
        dbDebugInfo: toInt(params['acd.dbDebugInfo'], 0),
        tIcipAcdAgentQueueRecord: toInt(params['acd.tIcipAcdAgentQueueRecord'], 0),
        tIcipAcdCallRecord: toInt(params['acd.tIcipAcdCallRecord'], 0),
        ccsId: toInt(params['acd.ccsId'], 0),
        logLevel: String(params['acd.logLevel'] || ''),
        logCount: toInt(params['acd.logCount'], 0),
    };
}

function mapGridRow(r) {
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
        odbc: {
            pid: r.cfgOdbcPid,
            odbcName: r.odbcOdbcName || '',
            dbType: r.odbcDbType || '',
            dbCharSet: r.odbcDbCharSet || '',
        },
        deployUser: r.deployUserId != null ? { id: r.deployUserId, name: r.deployUserName } : null,
    };
}

const Service = {};

function escXml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function buildAcdXml(data) {
    const queueRecord = Number(data.tIcipAcdAgentQueueRecord) === 0 ? 'Disable' : 'Enable';
    const callRecord = Number(data.tIcipAcdCallRecord) === 0 ? 'Disable' : 'Enable';
    return `<?xml version="1.0" encoding="UTF-8"?>
<system>
  <NetBusIp>${escXml(data.ipAddress)}</NetBusIp>
  <NetBusPort>${escXml(data.port)}</NetBusPort>
  <ODBCDataSource>${escXml(data.odbcName)}</ODBCDataSource>
  <ODBCUserName>${escXml(data.loginId)}</ODBCUserName>
  <ODBCPWD>${escXml(data.loginPwd)}</ODBCPWD>
  <PoolSize>${escXml(data.poolSize)}</PoolSize>
  <DBDebugInfo>${escXml(data.dbDebugInfo)}</DBDebugInfo>
  <APPID>${escXml(data.appId)}</APPID>
  <CCSID>${escXml(data.ccsMyId)}</CCSID>
  <ClientCharset>${escXml(data.clientCharset)}</ClientCharset>
  <DBCharset>${escXml(data.dbCharSet)}</DBCharset>
  <ScriptName>queue</ScriptName>
  <DataBaseType>${escXml(data.dbType)}</DataBaseType>
  <Sync>${escXml(data.sync)}</Sync>
  <LogCount>${escXml(data.logCount)}</LogCount>
  <LogLevel>${escXml(data.logLevel)}</LogLevel>
  <DBCompatible t_icc_acd_agent_queue_record="${queueRecord}" t_icc_acd_call_record="${callRecord}" />
</system>`;
}

function validateAcdXmlData(data) {
    const required = [
        'ipAddress', 'port', 'odbcName', 'loginId', 'loginPwd', 'dbType', 'dbCharSet',
        'poolSize', 'clientCharset', 'dbDebugInfo', 'appId', 'ccsMyId', 'sync', 'logCount', 'logLevel',
        'tIcipAcdAgentQueueRecord', 'tIcipAcdCallRecord',
    ];
    for (const k of required) {
        if (data[k] === null || data[k] === undefined || data[k] === '') return k;
    }
    return '';
}

Service.loadAcdList = async (ctx) => {
    const myName = String(ctx.paramsObj['acd.myName'] || '');
    const runMode = String(ctx.paramsObj['acd.runMode'] || '');
    const page = toInt(ctx.paramsObj.page, 1);
    const pagesize = toInt(ctx.paramsObj.pagesize, 10);
    const { rows, total } = await Dao.listPaged({ myName, runMode, page, pageSize: pagesize });
    return { Rows: rows.map(mapGridRow), Total: total };
};

Service.addAcd = async (ctx) => {
    const acd = parseAcd(ctx.paramsObj);
    const dup = await Dao.countByAppIdExcludingPid({ appId: acd.appId, currentPid: null });
    if (dup > 0) return -1;
    try {
        await Dao.insert(acd);
        return 1;
    } catch (e) {
        return 0;
    }
};

Service.editAcd = async (ctx) => {
    const acd = parseAcd(ctx.paramsObj);
    const dup = await Dao.countByAppIdExcludingPid({ appId: acd.appId, currentPid: acd.pid });
    if (dup > 0) return -1;
    try {
        await Dao.update(acd);
        return 1;
    } catch (e) {
        return 0;
    }
};

Service.deleteAcd = async (ctx) => {
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => !Number.isNaN(x));
    const ret = await Dao.deleteByPids(pids);
    return Number(ret || 0) > 0;
};

Service.copyAcd = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid || ctx.paramsObj['acd.pid'], 0);
    const rows = await Dao.selectByPrimaryKey(pid);
    if (!rows.length) return false;
    const src = rows[0];
    const oldMyName = String(src.myName || '');
    const prefix = 'copy';
    const cutLen = prefix.length - (CONST_MYNAME_MAX_LENGTH - oldMyName.length);
    const newMyName = cutLen > 0 ? prefix + oldMyName.substring(0, oldMyName.length - cutLen) : prefix + oldMyName;
    try {
        await Dao.insert({ ...src, myName: newMyName });
        return true;
    } catch (e) {
        return false;
    }
};

Service.getAcdByPid = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    return Dao.selectByPrimaryKey(pid);
};

Service.getCcsList = async () => Dao.listCcsForCombo();
Service.getCfgFocuCommPid = async () => Dao.listFocuCommAll();
Service.getOdbcList = async () => Dao.listOdbcAll();

Service.deployAcdXML = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    const row = await Dao.getAcdXmlByPid(pid);
    if (!row) return { result: false, msg: '发布XML异常' };

    const missing = validateAcdXmlData(row);
    if (missing) return { result: false, msg: `发布XML异常: 缺少字段 ${missing}` };

    const xmlContent = buildAcdXml(row);
    let rsp;
    try {
        rsp = await postConfigureWrite(row.localIp, XML_WRITE_FILE_NAME, xmlContent);
    } catch (e) {
        return { result: false, msg: 'ConnectException' };
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

    const workNo = String(ctx.session.smcicc_sys_work_no || '');
    const workName = String(ctx.session.smcicc_sys_work_name || workNo || 'system');
    const user = workNo ? await Dao.findSysUserByWorkNo(workNo) : null;
    const userId = Number(user?.id || 0);
    const updated = await Dao.updateXMLDeployer({ pid, userId, workName });
    if (Number(updated || 0) <= 0) {
        return { result: false, msg: '发布XML异常' };
    }
    return { result: true, msg };
};

module.exports = Service;
