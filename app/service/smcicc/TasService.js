const Dao = require('../../dao/TasSMCIccDao');
const Mc100Dao = require('../../dao/Mc100SMCIccDao');
const Db = require('../../dao/db');
const axios = require('axios');
const { buildTasXml } = require('./tasXmlBuilder');

const XML_WRITE_PORT = 8080;
const XML_WRITE_PATH = '/ConfigureWrite/write';
const XML_WRITE_FILE_NAME = 'tas_config.xml';

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function toCheckboxInt(v) {
    if (v === true || v === 'on' || v === '1' || v === 1) return 1;
    if (v === false || v === '0' || v === 0) return 0;
    if (v === '' || v == null) return 0;
    const n = Number(v);
    return Number.isNaN(n) ? 0 : (n ? 1 : 0);
}

function getParam(p, key) {
    if (!p) return undefined;
    if (Object.prototype.hasOwnProperty.call(p, `tas.${key}`)) return p[`tas.${key}`];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function mapDeployUser(row) {
    if (!row) return null;
    const o = { ...row };
    o.deployUser = row.deployUserId != null ? { id: row.deployUserId, name: row.deployUserName } : null;
    delete o.deployUserId;
    delete o.deployUserName;
    return o;
}

function parseIsxIdList(isxStr) {
    return String(isxStr || '')
        .split(',')
        .map((s) => s.trim())
        .filter((s) => /^\d+$/.test(s))
        .map((s) => Number(s));
}

function parseTasAdd(p) {
    return {
        cfgFocuCommPid: toInt(getParam(p, 'cfgFocuCommPid'), 0),
        myId: toInt(getParam(p, 'myId'), 0),
        myName: String(getParam(p, 'myName') || '').trim(),
        localIp: String(getParam(p, 'localIp') || '').trim(),
        note: String(getParam(p, 'note') || '').trim(),
        ccs1: null,
        ccs2: null,
        monitorMyId: null,
        cfgMcPid: null,
        cfgPrdPid: null,
        cfgHmpPid: null,
        cfgMc100Pid: null,
    };
}

function parseTasModify(p) {
    return {
        pid: toInt(getParam(p, 'pid'), 0),
        cfgFocuCommPid: toInt(getParam(p, 'cfgFocuCommPid'), 0),
        myId: toInt(getParam(p, 'myId'), 0),
        myName: String(getParam(p, 'myName') || '').trim(),
        localIp: String(getParam(p, 'localIp') || '').trim(),
        note: String(getParam(p, 'note') || '').trim(),
        ccs1: toInt(getParam(p, 'ccs1'), 0) || null,
        ccs2: toInt(getParam(p, 'ccs2'), 0) || null,
        monitorMyId: toInt(getParam(p, 'monitorMyId'), 0),
        cfgMcPid: toInt(getParam(p, 'cfgMcPid'), 0) || null,
        cfgPrdPid: toInt(getParam(p, 'cfgPrdPid'), 0) || null,
        cfgHmpPid: toInt(getParam(p, 'cfgHmpPid'), 0) || null,
        isActiveStandby: toCheckboxInt(getParam(p, 'isActiveStandby')),
        cfgMc100Pid: toInt(getParam(p, 'cfgMc100Pid'), 0) || null,
        runMode: String(getParam(p, 'runMode') || 'Master'),
        linuxHaLevel: String(getParam(p, 'linuxHaLevel') || 'Low'),
        checkBrdWorkTimeOut: toInt(getParam(p, 'checkBrdWorkTimeOut'), 60),
        logStyle: String(getParam(p, 'logStyle') || 'FILE'),
        logBackupCount: toInt(getParam(p, 'logBackupCount'), 100),
        logCache: String(getParam(p, 'logCache') || 'yes'),
        recordTypeType: String(getParam(p, 'recordTypeType') || 'WAV'),
        recordTypeThreadNum: toInt(getParam(p, 'recordTypeThreadNum'), 8),
        recordTypeBufSize: toInt(getParam(p, 'recordTypeBufSize'), 1024),
        recordTypeFilePath: String(getParam(p, 'recordTypeFilePath') || '/home/ehang/prd'),
    };
}

function parseTasTone(p) {
    return {
        pid: toInt(getParam(p, 'pid'), 0),
        freFlag0: toInt(getParam(p, 'freFlag0'), 0),
        tone0Fq1: toInt(getParam(p, 'tone0Fq1'), 0),
        tone0Dv1: toInt(getParam(p, 'tone0Dv1'), 0),
        tone0Fq2: toInt(getParam(p, 'tone0Fq2'), 0),
        tone0Dv2: toInt(getParam(p, 'tone0Dv2'), 0),
        freFlag1: toInt(getParam(p, 'freFlag1'), 0),
        tone1Fq1: toInt(getParam(p, 'tone1Fq1'), 0),
        tone1Dv1: toInt(getParam(p, 'tone1Dv1'), 0),
        tone1Fq2: toInt(getParam(p, 'tone1Fq2'), 0),
        tone1Dv2: toInt(getParam(p, 'tone1Dv2'), 0),
        freFlag2: toInt(getParam(p, 'freFlag2'), 0),
        tone2Fq1: toInt(getParam(p, 'tone2Fq1'), 0),
        tone2Dv1: toInt(getParam(p, 'tone2Dv1'), 0),
        tone2Fq2: toInt(getParam(p, 'tone2Fq2'), 0),
        tone2Dv2: toInt(getParam(p, 'tone2Dv2'), 0),
        freFlag3: toInt(getParam(p, 'freFlag3'), 0),
        tone3Fq1: toInt(getParam(p, 'tone3Fq1'), 0),
        tone3Dv1: toInt(getParam(p, 'tone3Dv1'), 0),
        tone3Fq2: toInt(getParam(p, 'tone3Fq2'), 0),
        tone3Dv2: toInt(getParam(p, 'tone3Dv2'), 0),
        timeFlag0: toInt(getParam(p, 'timeFlag0'), 0),
        tone0On: toInt(getParam(p, 'tone0On'), 0),
        tone0OnDv: toInt(getParam(p, 'tone0OnDv'), 0),
        tone0Off: toInt(getParam(p, 'tone0Off'), 0),
        tone0OffDv: toInt(getParam(p, 'tone0OffDv'), 0),
        timeFlag1: toInt(getParam(p, 'timeFlag1'), 0),
        tone1On: toInt(getParam(p, 'tone1On'), 0),
        tone1OnDv: toInt(getParam(p, 'tone1OnDv'), 0),
        tone1Off: toInt(getParam(p, 'tone1Off'), 0),
        tone1OffDv: toInt(getParam(p, 'tone1OffDv'), 0),
        timeFlag2: toInt(getParam(p, 'timeFlag2'), 0),
        tone2On: toInt(getParam(p, 'tone2On'), 0),
        tone2OnDv: toInt(getParam(p, 'tone2OnDv'), 0),
        tone2Off: toInt(getParam(p, 'tone2Off'), 0),
        tone2OffDv: toInt(getParam(p, 'tone2OffDv'), 0),
        timeFlag3: toInt(getParam(p, 'timeFlag3'), 0),
        tone3On: toInt(getParam(p, 'tone3On'), 0),
        tone3OnDv: toInt(getParam(p, 'tone3OnDv'), 0),
        tone3Off: toInt(getParam(p, 'tone3Off'), 0),
        tone3OffDv: toInt(getParam(p, 'tone3OffDv'), 0),
        fxsParamRingTimes: toInt(getParam(p, 'fxsParamRingTimes'), 10),
        fxoParamIncomingRingTimes: toInt(getParam(p, 'fxoParamIncomingRingTimes'), 2),
    };
}

function parseTasFlag(p) {
    return {
        pid: toInt(getParam(p, 'pid'), 0),
        sipServerFlag: String(getParam(p, 'sipServerFlag') || 'Disable'),
        natedFlag: String(getParam(p, 'natedFlag') || ''),
        autoSwitchRemoteRtpIpAndPort: String(getParam(p, 'autoSwitchRemoteRtpIpAndPort') || ''),
    };
}

function groupBoardsByIsx(rows) {
    const m = new Map();
    for (const r of rows || []) {
        const id = r.cfgIsxPid;
        if (!m.has(id)) m.set(id, []);
        const { cfgIsxPid, ...rest } = r;
        m.get(id).push(rest);
    }
    return m;
}

async function buildTas4XmlPayload(pid) {
    const row = await Dao.selectTasXmlBase(pid);
    if (!row) return null;

    const isxPids = await Dao.listDistinctIsxPidsForTas(pid);
    const [ags, dtis, sips, tco, tci, tsv, tcs, tfx, tdt, trg, ter, tns, tnx] = await Promise.all([
        Dao.listAgBoardsForIsx(isxPids),
        Dao.listDtiBoardsForIsx(isxPids),
        Dao.listSipBoardsForIsx(isxPids),
        Dao.listCallOuts(pid),
        Dao.listCallIns(pid),
        Dao.listSysVoices(pid),
        Dao.listChs(pid),
        Dao.listFxos(pid),
        Dao.listDtis(pid),
        Dao.listRegs(pid),
        Dao.listEhRegs(pid),
        Dao.listNatSips(pid),
        Dao.listNatXiops(pid),
    ]);

    const agM = groupBoardsByIsx(ags);
    const dtiM = groupBoardsByIsx(dtis);
    const sipM = groupBoardsByIsx(sips);

    const tas4Isxes = isxPids.map((cfgIsxPid) => ({
        cfgIsxPid,
        agBoards: agM.get(cfgIsxPid) || [],
        dtiBoards: dtiM.get(cfgIsxPid) || [],
        sipBoards: sipM.get(cfgIsxPid) || [],
    }));

    const base = {
        pid: row.pid,
        myId: row.myId,
        myName: row.myName,
        localIp: row.localIp,
        monitorMyId: row.monitorMyId,
        freFlag0: row.freFlag0,
        tone0Fq1: row.tone0Fq1,
        tone0Dv1: row.tone0Dv1,
        tone0Fq2: row.tone0Fq2,
        tone0Dv2: row.tone0Dv2,
        freFlag1: row.freFlag1,
        tone1Fq1: row.tone1Fq1,
        tone1Dv1: row.tone1Dv1,
        tone1Fq2: row.tone1Fq2,
        tone1Dv2: row.tone1Dv2,
        freFlag2: row.freFlag2,
        tone2Fq1: row.tone2Fq1,
        tone2Dv1: row.tone2Dv1,
        tone2Fq2: row.tone2Fq2,
        tone2Dv2: row.tone2Dv2,
        freFlag3: row.freFlag3,
        tone3Fq1: row.tone3Fq1,
        tone3Dv1: row.tone3Dv1,
        tone3Fq2: row.tone3Fq2,
        tone3Dv2: row.tone3Dv2,
        timeFlag0: row.timeFlag0,
        tone0On: row.tone0On,
        tone0OnDv: row.tone0OnDv,
        tone0Off: row.tone0Off,
        tone0OffDv: row.tone0OffDv,
        timeFlag1: row.timeFlag1,
        tone1On: row.tone1On,
        tone1OnDv: row.tone1OnDv,
        tone1Off: row.tone1Off,
        tone1OffDv: row.tone1OffDv,
        timeFlag2: row.timeFlag2,
        tone2On: row.tone2On,
        tone2OnDv: row.tone2OnDv,
        tone2Off: row.tone2Off,
        tone2OffDv: row.tone2OffDv,
        timeFlag3: row.timeFlag3,
        tone3On: row.tone3On,
        tone3OnDv: row.tone3OnDv,
        tone3Off: row.tone3Off,
        tone3OffDv: row.tone3OffDv,
        fxsParamRingTimes: row.fxsParamRingTimes,
        fxoParamIncomingRingTimes: row.fxoParamIncomingRingTimes,
        sipServerFlag: row.sipServerFlag,
        natedFlag: row.natedFlag,
        autoSwitchRemoteRtpIpAndPort: row.autoSwitchRemoteRtpIpAndPort,
        logStyle: row.logStyle,
        logBackupCount: row.logBackupCount,
        logCache: row.logCache,
        recordTypeType: row.recordTypeType,
        recordTypeThreadNum: row.recordTypeThreadNum,
        recordTypeBufSize: row.recordTypeBufSize,
        recordTypeFilePath: row.recordTypeFilePath,
        isActiveStandby: row.isActiveStandby,
        runMode: row.runMode,
        linuxHaLevel: row.linuxHaLevel,
        checkBrdWorkTimeOut: row.checkBrdWorkTimeOut,
        focuComm: { ipAddress: row.fcIpAddress, port: row.fcPort },
        ccsEty1: { myId: row.ccs1MyId },
        ccsEty2: { myId: row.ccs2MyId },
        mc4Xml: {
            ipAddressPort: row.mcIpAddressPort,
            savePath: row.mcSavePath,
            beatCycle: row.mcBeatCycle,
            isCheckTone: row.mcIsCheckTone,
            checkTone: row.mcCheckTone,
            isAutoDeleteLogFile: row.mcIsAutoDeleteLogFile,
            autoDeleteLogFile: row.mcAutoDeleteLogFile,
            isInvokeSyncFun: row.mcIsInvokeSyncFun,
            invokeSyncFun: row.mcInvokeSyncFun,
        },
        hmp: {
            myId: row.hmpMyId,
            localIp: row.hmpLocalIp,
            rtpPort: row.hmpRtpPort,
            channelCount: row.hmpChannelCount,
            mode: row.hmpMode,
        },
        prd: { pid: row.prdPid, isxPid: row.prdIsxPid },
        mc100: { ip: row.mc100Ip, port: row.mc100Port },
        tas4Isxes,
        tas4CallOuts: tco,
        tas4CallIns: tci,
        tas4SysVoices: tsv,
        tas4Chses: tcs,
        tas4Fxos: tfx,
        tas4Dtis: tdt,
        tas4Regs: trg,
        tas4EhRegs: ter,
        tas4NatSips: tns,
        tas4NatXiops: tnx,
    };
    return base;
}

async function postConfigure(host, xmlContent) {
    const body = new URLSearchParams();
    body.append('filename', XML_WRITE_FILE_NAME);
    body.append('content', xmlContent);
    return axios({
        method: 'post',
        url: `http://${host}:${XML_WRITE_PORT}${XML_WRITE_PATH}`,
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

Service.loadTasList = async () => Dao.selectRunModeList();

Service.loadTas = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return null;
    const row = await Dao.selectByPrimaryKey(pid);
    return mapDeployUser(row);
};

Service.addTas = async (ctx) => {
    const row = parseTasAdd(ctx.paramsObj);
    const dup = await Dao.countDuplicateMyId({ myId: row.myId, excludePid: 0 });
    if (dup > 0) return -1;
    try {
        const newPid = await Dao.insert(row);
        return newPid > 0 ? newPid : -2;
    } catch (e) {
        return -2;
    }
};

Service.modifyTas = async (ctx) => {
    const tas = parseTasModify(ctx.paramsObj);
    const isx = ctx.paramsObj.isx != null ? String(ctx.paramsObj.isx) : '';
    if (!tas.pid) {
        return { result: 0, tas: null };
    }
    const dup = await Dao.countDuplicateMyId({ myId: tas.myId, excludePid: tas.pid });
    if (dup > 0) {
        return { result: -1, tas };
    }
    const isxIds = parseIsxIdList(isx);
    if (!isxIds.length) {
        return { result: 0, tas };
    }
    const t = await Db.db_smcicc.sequelize.transaction();
    try {
        await Dao.deleteTas4isxByTasPid(tas.pid, t);
        await Dao.insertTas4isx({ cfgTasPid: tas.pid, isxIds }, t);
        const updated = await Dao.updateByPrimaryKey(tas, t);
        if (Number(updated || 0) <= 0) {
            await t.rollback();
            return { result: 0, tas };
        }
        await t.commit();
        return { result: 1, tas };
    } catch (e) {
        await t.rollback();
        return { result: 0, tas };
    }
};

Service.modifyTasFlag = async (ctx) => {
    const row = parseTasFlag(ctx.paramsObj);
    if (!row.pid) return 0;
    try {
        const ret = await Dao.updateTasFlag(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Service.modifyTasByPid = async (ctx) => {
    const row = parseTasTone(ctx.paramsObj);
    if (!row.pid) return null;
    try {
        const ret = await Dao.updateByPid(row);
        return Number(ret || 0) > 0 ? row : null;
    } catch (e) {
        return null;
    }
};

Service.loadTasFlag = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return null;
    return Dao.selectFlag(pid);
};

Service.copyTas = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return null;
    try {
        await Dao.callCopyTas(pid);
        const newPid = await Dao.lastInsertId();
        if (!newPid) return null;
        const row = await Dao.selectByPrimaryKey(newPid);
        if (!row) return null;
        return { pid: row.pid, runMode: row.runMode, myId: row.myId };
    } catch (e) {
        return null;
    }
};

Service.loadMc100 = async () => Mc100Dao.listMc100All();

Service.getMc100 = async (ctx) => Service.loadMc100(ctx);

Service.deleteTas = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return 0;
    const ref = await Dao.countMyIdUsedByChannels(pid);
    if (ref > 0) return -1;
    try {
        await Dao.callDeleteTas(pid);
        const still = await Dao.selectByPrimaryKey(pid);
        return still ? 0 : 1;
    } catch (e) {
        return 0;
    }
};

Service.getTas4Isx = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    const isx = await Dao.listAllIsxPids();
    const tas4Isx = pid ? await Dao.listTas4IsxByTasPid(pid) : [];
    return { isx, tas4Isx };
};

Service.deployTasXML = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return { result: false, msg: '发布XML异常' };

    let payload;
    try {
        payload = await buildTas4XmlPayload(pid);
    } catch (e) {
        return { result: false, msg: '发布XML异常' };
    }
    if (!payload) return { result: false, msg: '发布XML异常' };

    let xml;
    try {
        xml = buildTasXml(payload);
    } catch (e) {
        return { result: false, msg: e.message || '发布XML异常' };
    }

    const host = String(payload.localIp || '').trim();
    if (!host) {
        return { result: false, msg: '发布XML异常' };
    }

    let rsp;
    try {
        rsp = await postConfigure(host, xml);
    } catch (e) {
        return { result: false, msg: '发布XML异常' };
    }

    const wr = interpretJsonRsp(rsp);
    if (!wr.ok) {
        return { result: false, msg: wr.msg };
    }

    const workNo = String(ctx.session.smcicc_sys_work_no || '');
    const workName = String(ctx.session.smcicc_sys_work_name || workNo || 'system');
    const user = workNo ? await Dao.findSysUserByWorkNo(workNo) : null;
    const userId = Number(user?.id || 0);
    const updated = await Dao.updateXMLDeployer({ pid, userId, workName });
    if (Number(updated || 0) <= 0) {
        return { result: false, msg: '发布XML异常' };
    }

    return { result: true, msg: wr.msg };
};

module.exports = Service;
