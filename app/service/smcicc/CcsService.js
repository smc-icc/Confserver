const Dao = require('../../dao/CcsSMCIccDao');
const OdbcDao = require('../../dao/OdbcSMCIccDao');
const axios = require('axios');

const XML_WRITE_PORT = 8080;
const XML_WRITE_PATH = '/ConfigureWrite/write';
const XML_WRITE_FILE_NAME = 'ccs_config.xml';

const VOICE_NUM_SUFFIXES = [
    '0', '1', '2', '3', '4', '5', '6', '7', '8', '9',
    '10', '11', '12', '13', '14', '15', '16', '17', '18', '19', '20',
    '30', '40', '50', '60', '70', '80', '90',
];

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function rpick(row, name) {
    if (!row || !name) return undefined;
    if (Object.prototype.hasOwnProperty.call(row, name)) return row[name];
    const lk = name.toLowerCase();
    for (const k of Object.keys(row)) {
        if (k.toLowerCase() === lk) return row[k];
    }
    return undefined;
}

function toCheckboxInt(v) {
    if (v === true || v === 'on' || v === '1' || v === 1) return 1;
    if (v === false || v === '0' || v === 0) return 0;
    if (v === '' || v == null) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : (n ? 1 : 0);
}

function escAttr(s) {
    return String(s ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');
}

function normalizeDbType(dbType) {
    const t = String(dbType || '').toLowerCase();
    if (t === 'mysql') return 'MySql';
    if (t === 'mssql') return 'MSSql';
    if (t === 'oracle') return 'ORACLE';
    throw new Error(`dbType不支持${dbType}类型`);
}

function mapCcsEntity(row) {
    if (!row) return null;
    const o = { ...row };
    o.deployUser = row.deployUserId != null ? { id: row.deployUserId, name: row.deployUserName } : null;
    delete o.deployUserId;
    delete o.deployUserName;
    return o;
}

function setDefaultValues(ccs) {
    const c = { ...ccs };
    if (c.supportReport == null) c.supportReport = 0;
    if (c.sync == null) c.sync = 0;
    if (c.debugInfo == null) c.debugInfo = 0;
    if (c.tIcipAgCallRecord == null) c.tIcipAgCallRecord = 0;
    if (c.tIcipAgGroupSignRecord == null) c.tIcipAgGroupSignRecord = 0;
    if (c.tIcipAgSkillSignRecord == null) c.tIcipAgSkillSignRecord = 0;
    if (c.tIcipAgStateTrkRecord == null) c.tIcipAgStateTrkRecord = 0;
    if (c.tIcipBaseCdr == null) c.tIcipBaseCdr = 0;
    if (c.callIn == null) c.callIn = 0;
    if (c.callOut == null) c.callOut = 0;
    if (!c.channelStatusFlag || c.channelStatusFlag === '') c.channelStatusFlag = 'Disable';
    if (!c.agentStatusFlag || c.agentStatusFlag === '') c.agentStatusFlag = 'Disable';
    if (c.ttsMyId != null && Number(c.ttsMyId) === -1) c.ttsMyId = null;
    if (c.logStyle === '') c.logStyle = null;
    if (c.relogin === '') c.relogin = null;
    return c;
}

function parseCcsForm(p) {
    const g = (a, b = '') => (p[a] !== undefined && p[a] !== null ? p[a] : b);
    const base = {
        pid: toInt(g('ccs.pid'), 0),
        cfgFocuCommPid: toInt(g('ccs.cfgFocuCommPid'), 0),
        cfgOdbcPid: toInt(g('ccs.cfgOdbcPid'), 0),
        myName: String(g('ccs.myName', '')).trim(),
        myId: toInt(g('ccs.myId'), 0),
        runMode: String(g('ccs.runMode', '')),
        note: String(g('ccs.note', '')),
        connectKeepAlive: toInt(g('ccs.connectKeepAlive'), 0),
        poolSize: toInt(g('ccs.poolSize'), 0),
        supportReport: toInt(g('ccs.supportReport'), 0),
        sync: toInt(g('ccs.sync'), 0),
        poolLength: toInt(g('ccs.poolLength'), 0),
        debugInfo: toInt(g('ccs.debugInfo'), 0),
        elapsed: toInt(g('ccs.elapsed'), 0),
        tIcipAgStateTrkRecord: toCheckboxInt(g('ccs.tIcipAgStateTrkRecord')),
        tIcipAgSkillSignRecord: toCheckboxInt(g('ccs.tIcipAgSkillSignRecord')),
        tIcipAgGroupSignRecord: toCheckboxInt(g('ccs.tIcipAgGroupSignRecord')),
        tIcipAgCallRecord: toCheckboxInt(g('ccs.tIcipAgCallRecord')),
        tIcipBaseCdr: toCheckboxInt(g('ccs.tIcipBaseCdr')),
        defaultWaitingMusic: String(g('ccs.defaultWaitingMusic', '')),
        defaultWaitingAgentMusic: String(g('ccs.defaultWaitingAgentMusic', '')),
        voiceFileWorkerNumChinese: String(g('ccs.voiceFileWorkerNumChinese', '')),
        voiceFileWorkerNumEnglish: String(g('ccs.voiceFileWorkerNumEnglish', '')),
        voiceFileServiceForYouChinese: String(g('ccs.voiceFileServiceForYouChinese', '')),
        voiceFileServiceForYouEnglish: String(g('ccs.voiceFileServiceForYouEnglish', '')),
        relogin: String(g('ccs.relogin', '')),
        callIn: toInt(g('ccs.callIn'), 0),
        callOut: toInt(g('ccs.callOut'), 0),
        ttsMyId: toInt(g('ccs.ttsMyId'), 0),
        logStyle: String(g('ccs.logStyle', '')),
        channelStatusFlag: String(g('ccs.channelStatusFlag', '')),
        agentStatusFlag: String(g('ccs.agentStatusFlag', '')),
        agentRecordFilePath: String(g('ccs.agentRecordFilePath', '')),
        agentRecordFileName: String(g('ccs.agentRecordFileName', '')),
    };
    for (const suf of VOICE_NUM_SUFFIXES) {
        base[`voiceFileNum${suf}Chinese`] = String(g(`ccs.voiceFileNum${suf}Chinese`, ''));
        base[`voiceFileNum${suf}English`] = String(g(`ccs.voiceFileNum${suf}English`, ''));
    }
    return base;
}

function parseCcsAdd(p) {
    return {
        cfgFocuCommPid: toInt(p['ccs.cfgFocuCommPid'], 0),
        myName: String(p['ccs.myName'] || '').trim(),
        myId: toInt(p['ccs.myId'], 0),
        runMode: String(p['ccs.runMode'] || ''),
        note: String(p['ccs.note'] || ''),
    };
}

function buildInsertRowFromAdd(parsed) {
    const c = setDefaultValues({
        ...parsed,
        supportReport: 0,
        sync: 0,
        debugInfo: 0,
        tIcipAgStateTrkRecord: 0,
        tIcipAgSkillSignRecord: 0,
        tIcipAgGroupSignRecord: 0,
        tIcipAgCallRecord: 0,
        tIcipBaseCdr: 0,
        callIn: 0,
        callOut: 0,
        channelStatusFlag: 'Disable',
        agentStatusFlag: 'Disable',
    });
    return c;
}

function validateAndBuildCcsXml(row, chs, ags) {
    const msg = '生成ccs_config.xml配置文件内容时出错，${param}数据为空';
    const need = (v, param) => {
        if (v === null || v === undefined) throw new Error(msg.replace('${param}', param));
        if (typeof v === 'string' && v.trim() === '') throw new Error(msg.replace('${param}', param));
    };

    const ipAddress = rpick(row, 'focuIpAddress');
    const port = rpick(row, 'focuPort');
    const myId = rpick(row, 'myId');
    const myName = rpick(row, 'myName');
    need(ipAddress, 'focuComm.ipAddress');
    need(port, 'focuComm.port');
    need(myId, 'myId');
    need(myName, 'myName');

    const odbcName = rpick(row, 'odbcName');
    const loginId = rpick(row, 'loginId');
    const loginPwd = rpick(row, 'loginPwd');
    const dbTypeRaw = rpick(row, 'dbType');
    need(odbcName, 'odbc.odbcName');
    need(loginId, 'odbc.loginId');
    need(loginPwd, 'odbc.loginPwd');
    need(dbTypeRaw, 'odbc.dbType');
    const dbType = normalizeDbType(dbTypeRaw);

    const connectKeepAlive = rpick(row, 'ConnectKeepAlive');
    const poolSize = rpick(row, 'poolSize');
    const supportReport = rpick(row, 'SupportReport');
    const sync = rpick(row, 'Sync');
    const debugInfo = rpick(row, 'DebugInfo');
    const poolLength = rpick(row, 'PoolLength');
    need(connectKeepAlive, 'connectKeepAlive');
    need(poolSize, 'poolSize');
    need(supportReport, 'supportReport');
    need(sync, 'sync');
    need(debugInfo, 'debugInfo');
    need(poolLength, 'poolLength');

    const defaultWaitingMusic = rpick(row, 'defaultWaitingMusicFileName');
    const defaultWaitingAgentMusic = rpick(row, 'defaultWaitingAgentMusicFileName');
    need(defaultWaitingMusic, 'defaultWaitingMusic');
    need(defaultWaitingAgentMusic, 'defaultWaitingAgentMusic');

    const voiceFileWorkerNumChinese = rpick(row, 'VoiceFileWorkerNumChinese');
    const voiceFileWorkerNumEnglish = rpick(row, 'VoiceFileWorkerNumEnglish');
    need(voiceFileWorkerNumChinese, 'voiceFileWorkerNumChinese');
    need(voiceFileWorkerNumEnglish, 'voiceFileWorkerNumEnglish');

    const voiceFileServiceForYouChinese = rpick(row, 'VoiceFileServiceForYouChinese');
    const voiceFileServiceForYouEnglish = rpick(row, 'VoiceFileServiceForYouEnglish');
    need(voiceFileServiceForYouChinese, 'voiceFileServiceForYouChinese');
    need(voiceFileServiceForYouEnglish, 'voiceFileServiceForYouEnglish');

    const nums = {};
    for (const suf of VOICE_NUM_SUFFIXES) {
        const ch = rpick(row, `VoiceFileNum${suf}Chinese`);
        const en = rpick(row, `VoiceFileNum${suf}English`);
        need(ch, `voiceFileNum${suf}Chinese`);
        need(en, `voiceFileNum${suf}English`);
        nums[suf] = { ch, en };
    }

    const logStyle = rpick(row, 'LogStyle');
    const elapsed = rpick(row, 'Elapsed');
    const ttsMyId = rpick(row, 'TTSmyId');
    const relogin = rpick(row, 'Relogin');
    const channelStatusFlag = rpick(row, 'ChannelStatusFlag');
    const agentStatusFlag = rpick(row, 'AgentStatusFlag');
    need(logStyle, 'LogStyle');
    need(elapsed, 'elapsed');
    need(ttsMyId, 'ttsMyId');
    need(relogin, 'relogin');
    need(channelStatusFlag, 'channelStatusFlag');
    need(agentStatusFlag, 'agentStatusFlag');

    const tIcipAgStateTrkRecord = toInt(rpick(row, 't_icc_ag_state_trk_record'), 0);
    const tIcipAgSkillSignRecord = toInt(rpick(row, 't_icc_ag_skill_sign_record'), 0);
    const tIcipAgGroupSignRecord = toInt(rpick(row, 't_icc_ag_group_sign_record'), 0);
    const tIcipAgCallRecord = toInt(rpick(row, 't_icc_ag_call_record'), 0);
    const tIcipBaseCdr = toInt(rpick(row, 't_icc_base_cdr'), 0);
    need(tIcipAgStateTrkRecord, 'tIcipAgStateTrkRecord');
    need(tIcipAgSkillSignRecord, 'tIcipAgSkillSignRecord');
    need(tIcipAgGroupSignRecord, 'tIcipAgGroupSignRecord');
    need(tIcipAgCallRecord, 'tIcipAgCallRecord');
    need(tIcipBaseCdr, 'tIcipBaseCdr');

    const callOut = toInt(rpick(row, 'CallOut'), 0);
    const callIn = toInt(rpick(row, 'CallIn'), 0);
    need(callOut, 'callOut');
    need(callIn, 'callIn');

    const agentRecordFilePath = rpick(row, 'AgentRecordFilePath');
    const agentRecordFileName = rpick(row, 'AgentRecordFileName');
    need(agentRecordFilePath, 'agentRecordFilePath');
    need(agentRecordFileName, 'agentRecordFileName');

    for (const ch of chs || []) {
        if (ch.value == null) throw new Error(msg.replace('${param}', 'Ccs4Chs.value'));
        if (ch.myId == null) throw new Error(msg.replace('${param}', 'Ccs4Chs.myId'));
    }
    for (const ag of ags || []) {
        if (ag.value == null) throw new Error(msg.replace('${param}', 'Ccs4Ag.agValue'));
        if (ag.myId == null) throw new Error(msg.replace('${param}', 'Ccs4Ag.agMyId'));
    }

    const ck = connectKeepAlive != null && Number(connectKeepAlive) === 0 ? 'false' : 'true';
    const dis = (n) => (Number(n) === 0 ? 'Disable' : 'Enable');

    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<configuration>\n';
    xml += `  <netbus serverName="${escAttr(ipAddress)}" port="${escAttr(port)}" myId="${escAttr(myId)}" myName="${escAttr(myName)}" MonitorMyID="31" AgentMonitorMyID="32"/>\n`;
    xml += `  <database DataSource="${escAttr(odbcName)}" UserName="${escAttr(loginId)}" Passwd="${escAttr(loginPwd)}" ConnectKeepAlive="${ck}" DataBaseType="${escAttr(dbType)}" poolSize="${escAttr(poolSize)}" HeartBeat="10" SupportReport="${escAttr(supportReport)}" Sync="${escAttr(sync)}" DebugInfo="${escAttr(debugInfo)}" PoolLength="${escAttr(poolLength)}"/>\n`;
    xml += `  <DefaultWaitingMusic FileName="${escAttr(defaultWaitingMusic)}"/>\n`;
    xml += `  <DefaultWaitingAgentMusic FileName="${escAttr(defaultWaitingAgentMusic)}"/>\n`;
    xml += '  <VoiceList>\n';
    xml += `    <VoiceFileWorkerNum Chinese="${escAttr(voiceFileWorkerNumChinese)}" English="${escAttr(voiceFileWorkerNumEnglish)}"/>\n`;
    xml += `    <VoiceFileServiceForYou Chinese="${escAttr(voiceFileServiceForYouChinese)}" English="${escAttr(voiceFileServiceForYouEnglish)}"/>\n`;
    for (const suf of VOICE_NUM_SUFFIXES) {
        const { ch, en } = nums[suf];
        xml += `    <VoiceFileNum${suf} Chinese="${escAttr(ch)}" English="${escAttr(en)}"/>\n`;
    }
    xml += '  </VoiceList>\n';
    xml += `  <Log Style="${escAttr(logStyle)}" DebugInfo="0" Count="200"/>\n`;
    xml += `  <Debug Elapsed="${escAttr(elapsed)}"/>\n`;
    xml += `  <TTS myId="${escAttr(ttsMyId)}"/>\n`;
    xml += `  <Agent Relogin="${escAttr(relogin)}"/>\n`;
    xml += `  <ChannelStatus Flag="${escAttr(channelStatusFlag)}">\n`;
    for (const ch of chs || []) {
        xml += `    <State Value="${escAttr(ch.value)}" myId="${escAttr(ch.myId)}"/>\n`;
    }
    xml += '  </ChannelStatus>\n';
    xml += `  <AgentStatus Flag="${escAttr(agentStatusFlag)}">\n`;
    for (const ag of ags || []) {
        xml += `    <State Value="${escAttr(ag.value)}" myId="${escAttr(ag.myId)}"/>\n`;
    }
    xml += '  </AgentStatus>\n';
    xml += `  <DBCompatible t_icc_ag_state_trk_record="${dis(tIcipAgStateTrkRecord)}" t_icc_ag_skill_sign_record="${dis(tIcipAgSkillSignRecord)}" t_icc_ag_group_sign_record="${dis(tIcipAgGroupSignRecord)}" t_icc_ag_call_record="${dis(tIcipAgCallRecord)}" t_icc_base_cdr="${dis(tIcipBaseCdr)}"/>\n`;
    xml += `  <AgentOfferedEvt CallOut="${dis(callOut)}" CallIn="${dis(callIn)}"/>\n`;
    xml += `  <AgentRecordFile Path="${escAttr(agentRecordFilePath)}" FileName="${escAttr(agentRecordFileName)}"/>\n`;
    xml += '  <DBMaxPIDFrom Value="BOTH"/>\n';
    xml += '</configuration>';
    return xml;
}

function normalizeIdList(raw) {
    if (raw == null) return [];
    if (Array.isArray(raw)) return raw.map((x) => String(x).trim()).filter(Boolean);
    return [String(raw).trim()].filter(Boolean);
}

function parseCcs4Ch(p) {
    return {
        pid: toInt(p['ccs4Ch.pid'] || p.pid, 0),
        cfgCcsPid: toInt(p['ccs4Ch.cfgCcsPid'] || p.cfgCcsPid, 0),
        value: toInt(p['ccs4Ch.value'] || p.value, 0),
        myId: toInt(p['ccs4Ch.myId'] || p.myId, 0),
    };
}

function parseCcs4Ag(p) {
    return {
        pid: toInt(p['ccs4Ag.pid'] || p.pid, 0),
        cfgCcsPid: toInt(p['ccs4Ag.cfgCcsPid'] || p.cfgCcsPid, 0),
        value: toInt(p['ccs4Ag.value'] || p.value, 0),
        myId: toInt(p['ccs4Ag.myId'] || p.myId, 0),
    };
}

const Service = {};

Service.loadCcsRunModeList = async () => Dao.loadRunModeList();

Service.loadSysVoiceList = async () => Dao.loadSysVoiceList();

Service.loadFocuCommList = async () => Dao.loadFocuCommList();

Service.loadCcsOdbcList = async () => OdbcDao.listAll();

Service.addCcs = async (ctx) => {
    const parsed = parseCcsAdd(ctx.paramsObj);
    const dup = await Dao.selectByMyId({ pid: null, myId: parsed.myId });
    if (dup.length > 0) return -2;
    const row = buildInsertRowFromAdd(parsed);
    try {
        const newPid = await Dao.insertCcs(row, undefined);
        return newPid > 0 ? newPid : -1;
    } catch (e) {
        return -1;
    }
};

Service.loadCcs = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return null;
    const row = await Dao.selectByPrimaryKey(pid);
    return mapCcsEntity(row);
};

Service.modifyCcs = async (ctx) => {
    let ccs = parseCcsForm(ctx.paramsObj);
    ccs = setDefaultValues(ccs);
    const dup = await Dao.selectByMyId({ pid: ccs.pid, myId: ccs.myId });
    if (dup.length > 0) {
        return { result: -2, ccs: null };
    }
    try {
        const updated = await Dao.updateCcs(ccs, undefined);
        if (Number(updated || 0) <= 0) {
            return { result: -1, ccs: null };
        }
        const row = await Dao.selectByPrimaryKey(ccs.pid);
        return { result: 1, ccs: mapCcsEntity(row) };
    } catch (e) {
        return { result: -1, ccs: null };
    }
};

Service.deleteCcs = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return '-1';
    let ref = '';
    try {
        ref = await Dao.callCheckCcsReferenced(pid);
    } catch (e) {
        return '-2';
    }
    if (ref && String(ref).trim() && String(ref) !== 'null') {
        return String(ref);
    }
    const Db = require('../../dao/db');
    const t = await Db.db_smcicc.sequelize.transaction();
    try {
        await Dao.deleteCcs4ChByCcsPid(pid, t);
        await Dao.deleteCcs4AgByCcsPid(pid, t);
        const del = await Dao.deleteCcsByPid(pid, t);
        if (Number(del || 0) <= 0) {
            await t.rollback();
            return '-1';
        }
        await t.commit();
        return '0';
    } catch (e) {
        await t.rollback();
        throw e;
    }
};

Service.copyCcs = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return null;
    try {
        await Dao.callCopyCcs(pid);
        const newPid = await Dao.lastInsertId();
        if (!newPid) return null;
        const row = await Dao.selectByPrimaryKey(newPid);
        return mapCcsEntity(row);
    } catch (e) {
        return null;
    }
};

Service.deployCcsXML = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return { result: false, msg: '发布XML异常' };

    const row = await Dao.getCcsXmlRow(pid);
    if (!row) return { result: false, msg: '发布XML异常' };

    let chs;
    let ags;
    try {
        chs = await Dao.listCcs4ChByCcsPid(pid);
        ags = await Dao.listCcs4AgByCcsPid(pid);
        const xmlContent = validateAndBuildCcsXml(row, chs, ags);
        const host = String(rpick(row, 'myName') || '').trim();
        if (!host) return { result: false, msg: '发布XML异常' };

        const body = new URLSearchParams();
        body.append('filename', XML_WRITE_FILE_NAME);
        body.append('content', xmlContent);

        let rsp;
        try {
            rsp = await axios({
                method: 'post',
                url: `http://${host}:${XML_WRITE_PORT}${XML_WRITE_PATH}`,
                data: body.toString(),
                headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
                timeout: 20000,
                responseType: 'json',
                validateStatus: () => true,
            });
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
    } catch (e) {
        return { result: false, msg: e.message || '发布XML异常' };
    }
};

Service.loadCcs4ChList = async (ctx) => {
    const ccsPid = toInt(ctx.paramsObj.ccsPid, 0);
    if (!ccsPid) return { Rows: [], Total: 0 };
    const list = await Dao.listCcs4ChByCcsPid(ccsPid);
    return { Rows: list, Total: list.length };
};

Service.addCcs4Ch = async (ctx) => {
    const row = parseCcs4Ch(ctx.paramsObj);
    const dup = await Dao.countCcs4ChDup({
        cfgCcsPid: row.cfgCcsPid,
        value: row.value,
        myId: row.myId,
        excludePid: null,
    });
    if (dup > 0) return -2;
    try {
        const ret = await Dao.insertCcs4Ch({
            cfgCcsPid: row.cfgCcsPid,
            value: row.value,
            myId: row.myId,
        }, undefined);
        return Number(ret || 0) > 0 ? 1 : -1;
    } catch (e) {
        return -1;
    }
};

Service.modifyCcs4Ch = async (ctx) => {
    const row = parseCcs4Ch(ctx.paramsObj);
    const dup = await Dao.countCcs4ChDup({
        cfgCcsPid: row.cfgCcsPid,
        value: row.value,
        myId: row.myId,
        excludePid: row.pid,
    });
    if (dup > 0) return -2;
    try {
        const ret = await Dao.updateCcs4Ch(row, undefined);
        return Number(ret || 0) > 0 ? 1 : -1;
    } catch (e) {
        return -1;
    }
};

Service.deleteCcs4Chs = async (ctx) => {
    const ids = normalizeIdList(ctx.paramsObj.idList).map((x) => Number(x)).filter((x) => !Number.isNaN(x));
    if (!ids.length) return false;
    try {
        const ret = await Dao.deleteCcs4ChByPids(ids, undefined);
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

Service.loadCcs4AgList = async (ctx) => {
    const ccsPid = toInt(ctx.paramsObj.ccsPid, 0);
    if (!ccsPid) return { Rows: [], Total: 0 };
    const list = await Dao.listCcs4AgByCcsPid(ccsPid);
    return { Rows: list, Total: list.length };
};

Service.addCcs4Ag = async (ctx) => {
    const row = parseCcs4Ag(ctx.paramsObj);
    const dup = await Dao.countCcs4AgDup({
        cfgCcsPid: row.cfgCcsPid,
        value: row.value,
        myId: row.myId,
        excludePid: null,
    });
    if (dup > 0) return -2;
    try {
        const ret = await Dao.insertCcs4Ag({
            cfgCcsPid: row.cfgCcsPid,
            value: row.value,
            myId: row.myId,
        }, undefined);
        return Number(ret || 0) > 0 ? 1 : -1;
    } catch (e) {
        return -1;
    }
};

Service.modifyCcs4Ag = async (ctx) => {
    const row = parseCcs4Ag(ctx.paramsObj);
    const dup = await Dao.countCcs4AgDup({
        cfgCcsPid: row.cfgCcsPid,
        value: row.value,
        myId: row.myId,
        excludePid: row.pid,
    });
    if (dup > 0) return -2;
    try {
        const ret = await Dao.updateCcs4Ag(row, undefined);
        return Number(ret || 0) > 0 ? 1 : -1;
    } catch (e) {
        return -1;
    }
};

Service.deleteCcs4Ags = async (ctx) => {
    const ids = normalizeIdList(ctx.paramsObj.idList).map((x) => Number(x)).filter((x) => !Number.isNaN(x));
    if (!ids.length) return false;
    try {
        const ret = await Dao.deleteCcs4AgByPids(ids, undefined);
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

module.exports = Service;
