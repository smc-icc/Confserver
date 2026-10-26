const Dao = require('../../dao/SipBoardSMCIccDao');

const Service = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pickSip(p, key) {
    if (!p) return undefined;
    if (p.sipBoard && typeof p.sipBoard === 'object' && Object.prototype.hasOwnProperty.call(p.sipBoard, key)) {
        return p.sipBoard[key];
    }
    const dotted = `sipBoard.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

function parseSipBoard(p) {
    const rawBeg = pickSip(p, 'sipChannelBeginId');
    let sipChannelBeginId;
    if (rawBeg === undefined || rawBeg === null || rawBeg === '') sipChannelBeginId = null;
    else sipChannelBeginId = toInt(rawBeg, 0);
    const rawCnt = pickSip(p, 'sipChannelCount');
    let sipChannelCount;
    if (rawCnt === undefined || rawCnt === null || rawCnt === '') sipChannelCount = null;
    else sipChannelCount = toInt(rawCnt, 0);
    return {
        oamBoardId: toInt(pickSip(p, 'oamBoardId'), 0),
        cfgIsxPid: toInt(pickSip(p, 'cfgIsxPid'), 0),
        sipChannelBeginId,
        sipChannelCount,
        isEnable: toInt(pickSip(p, 'isEnable'), 0),
    };
}

Service.loadSipBoardList = async (ctx) => {
    const p = ctx.paramsObj || {};
    const cfgIsxPid = toInt(pickSip(p, 'cfgIsxPid'), 0);
    if (!cfgIsxPid) return { Rows: [], Total: 0 };
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        Dao.sipBoardListPage(cfgIsxPid, offset, pagesize),
        Dao.sipBoardCount(cfgIsxPid),
    ]);
    return { Rows, Total };
};

Service.addSipBoard = async (ctx) => {
    const p = ctx.paramsObj || {};
    const row = parseSipBoard(p);
    const oldOamBoardId = p.oldOamBoardId != null ? toInt(p.oldOamBoardId, -1) : null;
    if (!row.cfgIsxPid || !row.oamBoardId) return 0;
    try {
        const cnt = await Dao.countByPidAndCfgIsxPid({
            cfgIsxPid: row.cfgIsxPid,
            oamBoardId: row.oamBoardId,
            oldOamBoardId: oldOamBoardId == null ? -1 : oldOamBoardId,
        });
        if (cnt > 0) return -1;
        const ret = await Dao.sipBoardInsert({
            oamBoardId: row.oamBoardId,
            cfgIsxPid: row.cfgIsxPid,
            sipChannelBeginId: row.sipChannelBeginId,
            sipChannelCount: row.sipChannelCount,
            isEnable: row.isEnable,
        });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Service.editSipBoard = async (ctx) => {
    const p = ctx.paramsObj || {};
    const row = parseSipBoard(p);
    const oldOamBoardId = toInt(p.oldOamBoardId, 0);
    if (!row.cfgIsxPid || !row.oamBoardId || !oldOamBoardId) return 0;
    try {
        const cnt = await Dao.countByPidAndCfgIsxPid({
            cfgIsxPid: row.cfgIsxPid,
            oamBoardId: row.oamBoardId,
            oldOamBoardId,
        });
        if (cnt > 0) return -1;
        const ret = await Dao.sipBoardUpdate({
            sipChannelBeginId: row.sipChannelBeginId,
            sipChannelCount: row.sipChannelCount,
            isEnable: row.isEnable,
            oamBoardId: row.oamBoardId,
            oldOamBoardId,
            cfgIsxPid: row.cfgIsxPid,
        });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

/** 与 SipBoardImpl：无通道组交集校验，直接删 */
Service.deleteSipBoard = async (ctx) => {
    const p = ctx.paramsObj || {};
    const cfgIsxPid = toInt(pickSip(p, 'cfgIsxPid') ?? p.cfgIsxPid, 0);
    const idsStr = String(p.oamBoardIds || '').trim();
    const oamBoardIds = idsStr
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgIsxPid || !oamBoardIds.length) return false;
    try {
        const ret = await Dao.sipBoardDelete(oamBoardIds, cfgIsxPid);
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

Service.copySipBoard = async (ctx) => {
    const p = ctx.paramsObj || {};
    const row = parseSipBoard(p);
    if (!row.cfgIsxPid || !row.oamBoardId) return false;
    const newOamBoardId = row.oamBoardId;
    let i = 0;
    let oamBoardId;
    try {
        do {
            i++;
            oamBoardId = newOamBoardId + i;
        } while (await Dao.sipBoardSelectById(oamBoardId) != null);
        const ret = await Dao.sipBoardInsert({
            oamBoardId,
            cfgIsxPid: row.cfgIsxPid,
            sipChannelBeginId: row.sipChannelBeginId,
            sipChannelCount: row.sipChannelCount,
            isEnable: row.isEnable,
        });
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

module.exports = Service;
