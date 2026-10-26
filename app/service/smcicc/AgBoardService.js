const Dao = require('../../dao/AgBoardSMCIccDao');
const TasChildDao = require('../../dao/TasChildSMCIccDao');

const Service = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pickAg(p, key) {
    if (!p) return undefined;
    if (p.agBoard && typeof p.agBoard === 'object' && Object.prototype.hasOwnProperty.call(p.agBoard, key)) {
        return p.agBoard[key];
    }
    const dotted = `agBoard.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

function parseAgBoard(p) {
    const rawCti = pickAg(p, 'ctiLogicSpanId');
    let ctiLogicSpanId;
    if (rawCti === undefined || rawCti === null || rawCti === '') ctiLogicSpanId = null;
    else ctiLogicSpanId = toInt(rawCti, 0);
    return {
        oamBoardId: toInt(pickAg(p, 'oamBoardId'), 0),
        cfgIsxPid: toInt(pickAg(p, 'cfgIsxPid'), 0),
        ctiLogicSpanId,
        isEnable: toInt(pickAg(p, 'isEnable'), 0),
    };
}

/** 与 AgBoardImpl.deleteAgBoard：逻辑通道集合 vs 物理通道集合交集 */
function buildLogicList(channelGroupList) {
    const logicList = [];
    for (const cg of channelGroupList) {
        const cgBeginSpanId = cg.beginSpanId;
        const cgEndSpanId = cg.endSpanId;
        const cgBeginChannelId = cg.beginChannelId;
        const cgEndChannelId = cg.endChannelId;
        for (let beginId = cgBeginSpanId; beginId <= cgEndSpanId; beginId++) {
            for (let i = cgBeginChannelId; i <= cgEndChannelId; i++) {
                const v = i + beginId * 32;
                if (!logicList.includes(v)) logicList.push(v);
            }
        }
    }
    return logicList;
}

function buildPhysicalList(agBoardList) {
    const physicalList = [];
    for (const agBoard of agBoardList) {
        const boardId = agBoard.oamBoardId;
        const spanId = agBoard.ctiLogicSpanId != null ? Number(agBoard.ctiLogicSpanId) : 0;
        for (let chNum = 0; chNum < 4; chNum++) {
            const ch = spanId * 32 + ((boardId % 8) * 4) + chNum;
            if (!physicalList.includes(ch)) physicalList.push(ch);
        }
    }
    return physicalList;
}

function intersection(a, b) {
    const setB = new Set(b);
    return a.filter((x) => setB.has(x));
}

Service.loadAgBoardList = async (ctx) => {
    const p = ctx.paramsObj || {};
    const cfgIsxPid = toInt(pickAg(p, 'cfgIsxPid'), 0);
    if (!cfgIsxPid) return { Rows: [], Total: 0 };
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        Dao.agBoardListPage(cfgIsxPid, offset, pagesize),
        Dao.agBoardCount(cfgIsxPid),
    ]);
    return { Rows, Total };
};

Service.addAgBoard = async (ctx) => {
    const p = ctx.paramsObj || {};
    const row = parseAgBoard(p);
    const oldOamBoardId = p.oldOamBoardId != null ? toInt(p.oldOamBoardId, -1) : null;
    if (!row.cfgIsxPid || !row.oamBoardId) return 0;
    try {
        const cnt = await Dao.countByPidAndCfgIsxPid({
            cfgIsxPid: row.cfgIsxPid,
            oamBoardId: row.oamBoardId,
            oldOamBoardId: oldOamBoardId == null ? -1 : oldOamBoardId,
        });
        if (cnt > 0) return -1;
        const ret = await Dao.agBoardInsert({
            oamBoardId: row.oamBoardId,
            cfgIsxPid: row.cfgIsxPid,
            ctiLogicSpanId: row.ctiLogicSpanId,
            isEnable: row.isEnable,
        });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Service.editAgBoard = async (ctx) => {
    const p = ctx.paramsObj || {};
    const row = parseAgBoard(p);
    const oldOamBoardId = toInt(p.oldOamBoardId, 0);
    if (!row.cfgIsxPid || !row.oamBoardId || !oldOamBoardId) return 0;
    try {
        const cnt = await Dao.countByPidAndCfgIsxPid({
            cfgIsxPid: row.cfgIsxPid,
            oamBoardId: row.oamBoardId,
            oldOamBoardId,
        });
        if (cnt > 0) return -1;
        const ret = await Dao.agBoardUpdate({
            ctiLogicSpanId: row.ctiLogicSpanId,
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

Service.deleteAgBoard = async (ctx) => {
    const p = ctx.paramsObj || {};
    const cfgIsxPid = toInt(pickAg(p, 'cfgIsxPid') ?? p.cfgIsxPid, 0);
    const idsStr = String(p.oamBoardIds || '').trim();
    const oamBoardIds = idsStr
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgIsxPid || !oamBoardIds.length) return 0;
    try {
        const channelGroupList = await TasChildDao.selChannelGroup();
        const logicList = buildLogicList(channelGroupList);
        const agBoardList = await Dao.agBoardSelectByBoardIds(oamBoardIds, cfgIsxPid);
        const physicalList = buildPhysicalList(agBoardList);
        const commonList = intersection(logicList, physicalList);
        if (commonList.length > 0) return -2;
        const result = await Dao.agBoardDelete(oamBoardIds, cfgIsxPid);
        return Number(result || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Service.copyAgBoard = async (ctx) => {
    const p = ctx.paramsObj || {};
    const row = parseAgBoard(p);
    if (!row.cfgIsxPid || !row.oamBoardId) return false;
    let newOamBoardId = row.oamBoardId;
    let i = 0;
    let oamBoardId;
    try {
        do {
            i++;
            oamBoardId = newOamBoardId + i;
        } while (await Dao.agBoardSelectById(oamBoardId) != null);
        const ret = await Dao.agBoardInsert({
            oamBoardId,
            cfgIsxPid: row.cfgIsxPid,
            ctiLogicSpanId: row.ctiLogicSpanId,
            isEnable: row.isEnable,
        });
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

module.exports = Service;
