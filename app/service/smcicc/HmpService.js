const axios = require('axios');
const Dao = require('../../dao/HmpSMCIccDao');
const CcsDao = require('../../dao/CcsSMCIccDao');

const CONST_MYNAME_MAX_LENGTH = 100;
const XML_WRITE_PORT = 8080;
const XML_WRITE_PATH = '/ConfigureWrite/write';
const XML_WRITE_FILE_NAME = 'smcloudhmp_config.xml';

const Service = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pick(p, key) {
    if (!p) return undefined;
    if (p.hmp && typeof p.hmp === 'object' && Object.prototype.hasOwnProperty.call(p.hmp, key)) {
        return p.hmp[key];
    }
    const dotted = `hmp.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

function escXml(v) {
    return String(v ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&apos;');
}

function mapHmpGridRow(r) {
    if (!r) return null;
    return {
        pid: r.pid,
        cfgFocuCommPid: r.cfgFocuCommPid,
        myName: r.myName,
        myId: r.myId,
        runMode: r.runMode,
        note: r.note,
        localIp: r.localIp,
        rtpPort: r.rtpPort,
        channelCount: r.channelCount,
        mode: r.mode,
        t30UseEcm: r.t30UseEcm,
        filePath: r.filePath,
        identifier: r.identifier,
        pageHeaderInfo: r.pageHeaderInfo,
        t30SetMaxRetries: r.t30SetMaxRetries,
        t30SetReceiverNotReady: r.t30SetReceiverNotReady,
        baudRate: r.baudRate,
        logStyle: r.logStyle,
        logLevel: r.logLevel,
        logCache: r.logCache,
        lastDeployDate: r.lastDeployDate,
        focuComm: r.cfgFocuCommPid != null || r.focuIpAndPort
            ? { pid: r.cfgFocuCommPid, ipAndPort: r.focuIpAndPort || '' }
            : null,
        deployUser: r.deployUserId != null ? { id: r.deployUserId, name: r.deployUserName } : null,
    };
}

function mapHmpEntity(r) {
    if (!r) return null;
    return {
        pid: r.pid,
        cfgFocuCommPid: r.cfgFocuCommPid,
        myName: r.myName,
        myId: r.myId,
        runMode: r.runMode,
        note: r.note,
        localIp: r.localIp,
        rtpPort: r.rtpPort,
        channelCount: r.channelCount,
        mode: r.mode,
        t30UseEcm: r.t30UseEcm,
        filePath: r.filePath,
        identifier: r.identifier,
        pageHeaderInfo: r.pageHeaderInfo,
        t30SetMaxRetries: r.t30SetMaxRetries,
        t30SetReceiverNotReady: r.t30SetReceiverNotReady,
        baudRate: r.baudRate,
        logStyle: r.logStyle,
        logLevel: r.logLevel,
        logCache: r.logCache,
    };
}

function parseHmp(p) {
    return {
        pid: toInt(pick(p, 'pid'), 0),
        cfgFocuCommPid: toInt(pick(p, 'cfgFocuCommPid'), 0),
        myName: String(pick(p, 'myName') ?? '').trim(),
        myId: toInt(pick(p, 'myId'), 0),
        runMode: String(pick(p, 'runMode') ?? ''),
        note: String(pick(p, 'note') ?? ''),
        localIp: String(pick(p, 'localIp') ?? ''),
        rtpPort: toInt(pick(p, 'rtpPort'), 0),
        channelCount: toInt(pick(p, 'channelCount'), 0),
        mode: String(pick(p, 'mode') ?? ''),
        t30UseEcm: toInt(pick(p, 't30UseEcm'), 0),
        filePath: String(pick(p, 'filePath') ?? ''),
        identifier: String(pick(p, 'identifier') ?? ''),
        pageHeaderInfo: String(pick(p, 'pageHeaderInfo') ?? ''),
        t30SetMaxRetries: toInt(pick(p, 't30SetMaxRetries'), 0),
        t30SetReceiverNotReady: toInt(pick(p, 't30SetReceiverNotReady'), 0),
        baudRate: String(pick(p, 'baudRate') ?? ''),
        logStyle: String(pick(p, 'logStyle') ?? ''),
        logLevel: String(pick(p, 'logLevel') ?? ''),
        logCache: String(pick(p, 'logCache') ?? ''),
    };
}

/** 与 HmpCreator.assembleContent 一致 */
function buildHmpXml(d) {
    const ipAddress = d.focuIpAddress;
    const port = d.focuPort;
    if (ipAddress == null || String(ipAddress).trim() === '') {
        throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，focuComm.ipAddress数据为空');
    }
    if (port == null) {
        throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，focuComm.port数据为空');
    }
    const myId = d.myId;
    const myName = d.myName;
    const logStyle = d.logStyle;
    const level = d.logLevel;
    const cache = d.logCache;
    const localIP = d.localIp;
    const rtpPort = d.rtpPort;
    const channelCount = d.channelCount;
    const filePath = d.filePath;
    const baudRate = d.baudRate;
    const identifier = d.identifier;
    const pageHeaderInfo = d.pageHeaderInfo;
    const t30UserEcm = d.t30UseEcm;
    const t30SetMaxRetries = d.t30SetMaxRetries;
    const t30SetReceiverNotReady = d.t30SetReceiverNotReady;

    if (myId == null) throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，myId数据为空');
    if (myName == null || String(myName).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，myName数据为空');
    if (logStyle == null || String(logStyle).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，logStyle数据为空');
    if (level == null || String(level).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，level数据为空');
    if (cache == null || String(cache).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，cache数据为空');
    if (localIP == null || String(localIP).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，localIP数据为空');
    if (rtpPort == null) throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，rtpPort数据为空');
    if (channelCount == null) throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，channelCount数据为空');
    if (filePath == null || String(filePath).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，filePath数据为空');
    if (baudRate == null || String(baudRate).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，baudRate数据为空');
    if (identifier == null || String(identifier).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，identifier数据为空');
    if (pageHeaderInfo == null || String(pageHeaderInfo).trim() === '') throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，pageHeaderInfo数据为空');
    if (t30UserEcm == null) throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，t30UserEcm数据为空');
    if (t30SetMaxRetries == null) throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，t30SetMaxRetries数据为空');
    if (t30SetReceiverNotReady == null) throw new Error('生成smcloudhmp_config.xml配置文件内容时出错，t30SetReceiverNotReady数据为空');

    return `<?xml version="1.0" encoding="UTF-8"?>
<configuration>
  <netbus serverName="${escXml(ipAddress)}" port="${escXml(String(port))}" myId="${escXml(String(myId))}" myName="${escXml(myName)}" MonitorMyID="31"/>
  <Log Style="${escXml(logStyle)}" Level="${escXml(level)}" Cache="${escXml(cache)}"/>
  <Fax LocalIP="${escXml(localIP)}" RtpPort="${escXml(String(rtpPort))}" ChannelCount="${escXml(String(channelCount))}" FilePath="${escXml(filePath)}" BaudRate="${escXml(baudRate)}" Identifier="${escXml(identifier)}" PageHeaderInfo="${escXml(pageHeaderInfo)}" t30_use_ecm="${escXml(String(t30UserEcm))}" t30_set_max_retries="${escXml(String(t30SetMaxRetries))}" t30_set_receiver_not_ready="${escXml(String(t30SetReceiverNotReady))}"/>
</configuration>`;
}

function computeCopyMyName(oldMyName) {
    const prefix = 'copy';
    const oldVal = String(oldMyName || '');
    const cutLen = prefix.length - (CONST_MYNAME_MAX_LENGTH - oldVal.length);
    return cutLen > 0 ? prefix + oldVal.substring(0, oldVal.length - cutLen) : prefix + oldVal;
}

Service.loadHmpList = async (ctx) => {
    const p = ctx.paramsObj || {};
    let myName = '';
    let runMode = '';
    if (p.hmp && typeof p.hmp === 'object') {
        if (p.hmp.myName != null) myName = String(p.hmp.myName);
        if (p.hmp.runMode != null) runMode = String(p.hmp.runMode);
    } else {
        if (p['hmp.myName'] != null) myName = String(p['hmp.myName']);
        if (p['hmp.runMode'] != null) runMode = String(p['hmp.runMode']);
    }
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        Dao.hmpList(myName, runMode, offset, pagesize),
        Dao.hmpCount(myName, runMode),
    ]);
    return { Rows: Rows.map(mapHmpGridRow), Total };
};

Service.addHmp = async (ctx) => {
    const row = parseHmp(ctx.paramsObj || {});
    try {
        const dup = await Dao.hmpCountByMyId(row.myId, 0);
        if (dup > 0) return -1;
        await Dao.hmpInsert({
            cfgFocuCommPid: row.cfgFocuCommPid,
            myName: row.myName,
            myId: row.myId,
            runMode: row.runMode,
            note: row.note,
            localIp: row.localIp,
            rtpPort: row.rtpPort,
            channelCount: row.channelCount,
            mode: row.mode,
            t30UseEcm: row.t30UseEcm,
            filePath: row.filePath,
            identifier: row.identifier,
            pageHeaderInfo: row.pageHeaderInfo,
            t30SetMaxRetries: row.t30SetMaxRetries,
            t30SetReceiverNotReady: row.t30SetReceiverNotReady,
            baudRate: row.baudRate,
            logStyle: row.logStyle,
            logLevel: row.logLevel,
            logCache: row.logCache,
        });
        return 1;
    } catch (e) {
        return 0;
    }
};

Service.editHmp = async (ctx) => {
    const row = parseHmp(ctx.paramsObj || {});
    if (!row.pid) return 0;
    try {
        const dup = await Dao.hmpCountByMyId(row.myId, row.pid);
        if (dup > 0) return -1;
        const ret = await Dao.hmpUpdate({
            pid: row.pid,
            cfgFocuCommPid: row.cfgFocuCommPid,
            myName: row.myName,
            myId: row.myId,
            runMode: row.runMode,
            note: row.note,
            localIp: row.localIp,
            rtpPort: row.rtpPort,
            channelCount: row.channelCount,
            mode: row.mode,
            t30UseEcm: row.t30UseEcm,
            filePath: row.filePath,
            identifier: row.identifier,
            pageHeaderInfo: row.pageHeaderInfo,
            t30SetMaxRetries: row.t30SetMaxRetries,
            t30SetReceiverNotReady: row.t30SetReceiverNotReady,
            baudRate: row.baudRate,
            logStyle: row.logStyle,
            logLevel: row.logLevel,
            logCache: row.logCache,
        });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Service.deleteHmp = async (ctx) => {
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!pids.length) return false;
    try {
        const ret = await Dao.hmpDelete(pids);
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

Service.copyHmp = async (ctx) => {
    const p = ctx.paramsObj || {};
    const pid = toInt(pick(p, 'pid'), 0);
    const oldMyName = String(pick(p, 'myName') ?? '');
    if (!pid) return false;
    const newMyName = computeCopyMyName(oldMyName);
    try {
        const src = await Dao.hmpSelectById(pid);
        if (!src) return false;
        await Dao.hmpInsert({
            cfgFocuCommPid: src.cfgFocuCommPid,
            myName: newMyName,
            myId: src.myId,
            runMode: src.runMode,
            note: src.note,
            localIp: src.localIp,
            rtpPort: src.rtpPort,
            channelCount: src.channelCount,
            mode: src.mode,
            t30UseEcm: src.t30UseEcm,
            filePath: src.filePath,
            identifier: src.identifier,
            pageHeaderInfo: src.pageHeaderInfo,
            t30SetMaxRetries: src.t30SetMaxRetries,
            t30SetReceiverNotReady: src.t30SetReceiverNotReady,
            baudRate: src.baudRate,
            logStyle: src.logStyle,
            logLevel: src.logLevel,
            logCache: src.logCache,
        });
        return true;
    } catch (e) {
        return false;
    }
};

Service.getHmpByPid = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return [];
    const row = await Dao.hmpSelectById(pid);
    return row ? [mapHmpEntity(row)] : [];
};

Service.loadAllHmp = async () => {
    const rows = await Dao.hmpSelectAll();
    return rows.map(mapHmpEntity);
};

Service.getCountByMyId = async (ctx) => {
    const myId = toInt(pick(ctx.paramsObj || {}, 'myId'), 0);
    const excludePid = toInt(pick(ctx.paramsObj || {}, 'pid'), 0);
    if (!myId) return 0;
    return Dao.hmpCountByMyId(myId, excludePid);
};

Service.deployHmpXML = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    if (!pid) return { result: false, msg: '发布XML异常' };

    const row = await Dao.getHmpXmlRow(pid);
    if (!row) return { result: false, msg: '发布XML异常' };

    let xmlContent;
    try {
        xmlContent = buildHmpXml(row);
    } catch (e) {
        return { result: false, msg: e.message || '组装Hmp4XML发生异常' };
    }

    const host = String(row.localIp || '').trim();
    if (!host) {
        return { result: false, msg: '发布XML异常' };
    }

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
    const updated = await Dao.updateXMLDeployer({ pid, userId, workName });
    if (Number(updated || 0) <= 0) {
        return { result: false, msg: '发布XML异常' };
    }
    return { result: true, msg };
};

module.exports = Service;
