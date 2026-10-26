const { QueryTypes } = require('sequelize');
const Db = require('../../dao/db');
const Dao = require('../../dao/TasChildSMCIccDao');

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pick(p, path) {
    if (!p) return undefined;
    if (Object.prototype.hasOwnProperty.call(p, path)) return p[path];
    return undefined;
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

function parseQuotedPids(pidsStr) {
    const s = String(pidsStr || '').trim();
    if (!s) return [];
    return s
        .split(',')
        .map((x) => x.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
        .map((pair) => {
            const parts = pair.split('-');
            if (parts.length < 2) return null;
            return [toInt(parts[0], NaN), toInt(parts[1], NaN)];
        })
        .filter((x) => x && !Number.isNaN(x[0]) && !Number.isNaN(x[1]));
}

function spanRangesOverlap(nb, ne, ob, oe) {
    return nb <= oe && ne >= ob;
}

function callSpanConflict(rows, cfgTasPid, nb, ne, oldB, oldE) {
    const ob = oldB != null ? Number(oldB) : -1;
    const oe = oldE != null ? Number(oldE) : -1;
    for (const r of rows) {
        if (Number(r.cfgTasPid) !== Number(cfgTasPid)) continue;
        if (ob >= 0 && Number(r.beginSpan) === ob && Number(r.endSpan) === oe) continue;
        if (spanRangesOverlap(nb, ne, Number(r.beginSpan), Number(r.endSpan))) return true;
    }
    return false;
}

function chsBlockOverlap(nb, ne, bc, ec, rows) {
    for (const r of rows) {
        if (
            spanRangesOverlap(nb, ne, Number(r.beginSpan), Number(r.endSpan)) &&
            spanRangesOverlap(bc, ec, Number(r.beginChannel), Number(r.endChannel))
        ) {
            return true;
        }
    }
    return false;
}

async function channelGroupLogicPhysicalIntersect(pairs) {
    const channelGroups = await Dao.selChannelGroup();
    const logicList = [];
    for (const cg of channelGroups || []) {
        const cgBeginSpanId = toInt(cg.beginSpanId, 0);
        const cgEndSpanId = toInt(cg.endSpanId, 0);
        const cgBeginChannelId = toInt(cg.beginChannelId, 0);
        const cgEndChannelId = toInt(cg.endChannelId, 0);
        for (let beginId = cgBeginSpanId; beginId <= cgEndSpanId; beginId += 1) {
            for (let i = cgBeginChannelId; i <= cgEndChannelId; i += 1) {
                const val = i + beginId * 32;
                if (!logicList.includes(val)) logicList.push(val);
            }
        }
    }
    const physicalList = [];
    for (const [beginSpan, endSpan] of pairs) {
        for (let chNum = 0; chNum < 32; chNum += 1) {
            for (let i = beginSpan; i <= endSpan; i += 1) {
                const ch = chNum + i * 32;
                if (!physicalList.includes(ch)) physicalList.push(ch);
            }
        }
    }
    const common = logicList.filter((x) => physicalList.includes(x));
    return common.length > 0;
}

async function updateSysVoiceByOldId(oldId, row) {
    await Db.db_smcicc.sequelize.query(
        `UPDATE t_icc_cfg_tas4sysvoice SET ID = :newId, CfgTASPID = :cfgTasPid, Description = :description, FileName = :fileName WHERE ID = :oldId`,
        {
            replacements: {
                newId: row.id,
                cfgTasPid: row.cfgTasPid,
                description: row.description,
                fileName: row.fileName,
                oldId,
            },
            type: QueryTypes.UPDATE,
        }
    );
}

const Svc = {};

Svc.loadTas4SysVoiceList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4SysVoice.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4SysVoiceList(cfgTasPid, offset, pagesize),
        Dao.tas4SysVoiceCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4SysVoice = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        id: toInt(pick(p, 'tas4SysVoice.id'), 0),
        cfgTasPid: toInt(pick(p, 'tas4SysVoice.cfgTasPid'), 0),
        description: String(pick(p, 'tas4SysVoice.description') || ''),
        fileName: String(pick(p, 'tas4SysVoice.fileName') || ''),
    };
    if (!row.id) return 0;
    const exists = await Dao.tas4SysVoiceSelectById(row.id);
    if (exists) return -1;
    try {
        await Dao.tas4SysVoiceInsert(row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4SysVoice = async (ctx) => {
    const p = ctx.paramsObj;
    const oldId = toInt(pick(p, 'id'), 0);
    const row = {
        id: toInt(pick(p, 'tas4SysVoice.id'), 0),
        cfgTasPid: toInt(pick(p, 'tas4SysVoice.cfgTasPid'), 0),
        description: String(pick(p, 'tas4SysVoice.description') || ''),
        fileName: String(pick(p, 'tas4SysVoice.fileName') || ''),
    };
    if (!oldId || !row.id) return 0;
    if (row.id !== oldId) {
        const clash = await Dao.tas4SysVoiceSelectById(row.id);
        if (clash) return -1;
    }
    try {
        await updateSysVoiceByOldId(oldId, row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4SysVoice = async (ctx) => {
    const ids = String(ctx.paramsObj.ids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!ids.length) return false;
    try {
        const n = await Dao.tas4SysVoiceDelete(ids);
        return n > 0;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4FxoList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4Fxo.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4FxoList(cfgTasPid, offset, pagesize),
        Dao.tas4FxoCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4Fxo = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        agCh: toInt(pick(p, 'tas4Fxo.agCh'), 0),
        cfgTasPid: toInt(pick(p, 'tas4Fxo.cfgTasPid'), 0),
        no: String(pick(p, 'tas4Fxo.no') || ''),
        flag: String(pick(p, 'tas4Fxo.flag') || ''),
    };
    const cnt = await Dao.tas4FxoCountDup({ cfgTasPid: row.cfgTasPid, agCh: row.agCh, oldAgCh: null });
    if (cnt > 0) return -1;
    try {
        await Dao.tas4FxoInsert(row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4Fxo = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        agCh: toInt(pick(p, 'tas4Fxo.agCh'), 0),
        cfgTasPid: toInt(pick(p, 'tas4Fxo.cfgTasPid'), 0),
        no: String(pick(p, 'tas4Fxo.no') || ''),
        flag: String(pick(p, 'tas4Fxo.flag') || ''),
    };
    const oldAgch = toInt(ctx.paramsObj.oldAgch, 0);
    const cnt = await Dao.tas4FxoCountDup({ cfgTasPid: row.cfgTasPid, agCh: row.agCh, oldAgCh: oldAgch });
    if (cnt > 0 && row.agCh !== oldAgch) return -1;
    try {
        const ret = await Dao.tas4FxoUpdate({ ...row, oldAgCh: oldAgch });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4Fxo = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const agChs = String(ctx.paramsObj.agChs || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgTasPid || !agChs.length) return false;
    try {
        return (await Dao.tas4FxoDelete(agChs, cfgTasPid)) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyTas4Fxo = async (ctx) => {
    const p = ctx.paramsObj;
    const base = toInt(pick(p, 'tas4Fxo.agCh'), 0);
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4Fxo.cfgTasPid'), 0),
        no: String(pick(p, 'tas4Fxo.no') || ''),
        flag: String(pick(p, 'tas4Fxo.flag') || ''),
    };
    let agCh = base + 1;
    while (await Dao.tas4FxoSelectByAgCh(agCh)) agCh += 1;
    try {
        await Dao.tas4FxoInsert({ ...row, agCh });
        return true;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4DtiList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4Dti.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4DtiList(cfgTasPid, offset, pagesize),
        Dao.tas4DtiCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4Dti = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        span: toInt(pick(p, 'tas4Dti.span'), 0),
        cfgTasPid: toInt(pick(p, 'tas4Dti.cfgTasPid'), 0),
        no: String(pick(p, 'tas4Dti.no') || ''),
        flag: String(pick(p, 'tas4Dti.flag') || ''),
    };
    const cnt = await Dao.tas4DtiCountDup({ cfgTasPid: row.cfgTasPid, span: row.span, oldSpan: null });
    if (cnt > 0) return -1;
    try {
        await Dao.tas4DtiInsert(row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4Dti = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        span: toInt(pick(p, 'tas4Dti.span'), 0),
        cfgTasPid: toInt(pick(p, 'tas4Dti.cfgTasPid'), 0),
        no: String(pick(p, 'tas4Dti.no') || ''),
        flag: String(pick(p, 'tas4Dti.flag') || ''),
    };
    const oldSpan = toInt(ctx.paramsObj.oldSpan, 0);
    const cnt = await Dao.tas4DtiCountDup({ cfgTasPid: row.cfgTasPid, span: row.span, oldSpan });
    if (cnt > 0 && row.span !== oldSpan) return -1;
    try {
        const ret = await Dao.tas4DtiUpdate({ ...row, oldSpan });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4Dti = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const spans = String(ctx.paramsObj.Spans || ctx.paramsObj.spans || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgTasPid || !spans.length) return false;
    try {
        return (await Dao.tas4DtiDelete(spans, cfgTasPid)) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyTas4Dti = async (ctx) => {
    const p = ctx.paramsObj;
    const base = toInt(pick(p, 'tas4Dti.span'), 0);
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4Dti.cfgTasPid'), 0),
        no: String(pick(p, 'tas4Dti.no') || ''),
        flag: String(pick(p, 'tas4Dti.flag') || ''),
    };
    let span = base + 1;
    while (await Dao.tas4DtiSelectBySpan(span)) span += 1;
    try {
        await Dao.tas4DtiInsert({ ...row, span });
        return true;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4ChsList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4Chs.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4ChsList(cfgTasPid, offset, pagesize),
        Dao.tas4ChsCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4Chs = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4Chs.cfgTasPid'), 0),
        type: String(pick(p, 'tas4Chs.type') || ''),
        beginSpan: toInt(pick(p, 'tas4Chs.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4Chs.endSpan'), 0),
        beginChannel: toInt(pick(p, 'tas4Chs.beginChannel'), 0),
        endChannel: toInt(pick(p, 'tas4Chs.endChannel'), 0),
        flag: String(pick(p, 'tas4Chs.flag') || ''),
    };
    try {
        const pid = await Dao.tas4ChsInsert(row);
        return pid > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4Chs = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        pid: toInt(pick(p, 'tas4Chs.pid'), 0),
        cfgTasPid: toInt(pick(p, 'tas4Chs.cfgTasPid'), 0),
        type: String(pick(p, 'tas4Chs.type') || ''),
        beginSpan: toInt(pick(p, 'tas4Chs.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4Chs.endSpan'), 0),
        beginChannel: toInt(pick(p, 'tas4Chs.beginChannel'), 0),
        endChannel: toInt(pick(p, 'tas4Chs.endChannel'), 0),
        flag: String(pick(p, 'tas4Chs.flag') || ''),
    };
    try {
        const ret = await Dao.tas4ChsUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4Chs = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgTasPid || !pids.length) return false;
    try {
        return (await Dao.tas4ChsDelete(pids, cfgTasPid)) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyTas4Chs = async (ctx) => {
    const p = ctx.paramsObj;
    const srcPid = toInt(pick(p, 'tas4Chs.pid'), 0);
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4Chs.cfgTasPid'), 0),
        type: String(pick(p, 'tas4Chs.type') || ''),
        beginSpan: toInt(pick(p, 'tas4Chs.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4Chs.endSpan'), 0),
        beginChannel: toInt(pick(p, 'tas4Chs.beginChannel'), 0),
        endChannel: toInt(pick(p, 'tas4Chs.endChannel'), 0),
        flag: String(pick(p, 'tas4Chs.flag') || ''),
    };
    if (!row.cfgTasPid) return false;
    const all = await Dao.tas4ChsList(row.cfgTasPid, 0, 100000);
    const others = srcPid ? all.filter((r) => Number(r.pid) !== srcPid) : all;
    let bs = row.beginSpan;
    let es = row.endSpan;
    let delta = 1;
    for (; delta <= 10000; delta += 1) {
        bs = row.beginSpan + delta;
        es = row.endSpan + delta;
        if (!chsBlockOverlap(bs, es, row.beginChannel, row.endChannel, others)) break;
    }
    if (delta > 10000) return false;
    try {
        await Dao.tas4ChsInsert({ ...row, beginSpan: bs, endSpan: es });
        return true;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4CallOutList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4CallOut.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4CallOutList(cfgTasPid, offset, pagesize),
        Dao.tas4CallOutCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4CallOut = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        beginSpan: toInt(pick(p, 'tas4CallOut.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4CallOut.endSpan'), 0),
        cfgTasPid: toInt(pick(p, 'tas4CallOut.cfgTasPid'), 0),
        voiceCodes: String(pick(p, 'tas4CallOut.voiceCodes') || ''),
        type: String(pick(p, 'tas4CallOut.type') || ''),
        ip: String(pick(p, 'tas4CallOut.ip') || ''),
        port: toInt(pick(p, 'tas4CallOut.port'), 0),
        userName: String(pick(p, 'tas4CallOut.userName') || ''),
        passWord: String(pick(p, 'tas4CallOut.passWord') || ''),
        nodeId: toInt(pick(p, 'tas4CallOut.nodeId'), 0),
        flag: String(pick(p, 'tas4CallOut.flag') || ''),
    };
    const all = await Dao.tas4CallOutListAll(row.cfgTasPid);
    if (callSpanConflict(all, row.cfgTasPid, row.beginSpan, row.endSpan, -1, -1)) return -1;
    try {
        await Dao.tas4CallOutInsert(row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4CallOut = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        beginSpan: toInt(pick(p, 'tas4CallOut.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4CallOut.endSpan'), 0),
        cfgTasPid: toInt(pick(p, 'tas4CallOut.cfgTasPid'), 0),
        voiceCodes: String(pick(p, 'tas4CallOut.voiceCodes') || ''),
        type: String(pick(p, 'tas4CallOut.type') || ''),
        ip: String(pick(p, 'tas4CallOut.ip') || ''),
        port: toInt(pick(p, 'tas4CallOut.port'), 0),
        userName: String(pick(p, 'tas4CallOut.userName') || ''),
        passWord: String(pick(p, 'tas4CallOut.passWord') || ''),
        nodeId: toInt(pick(p, 'tas4CallOut.nodeId'), 0),
        flag: String(pick(p, 'tas4CallOut.flag') || ''),
    };
    const oldBeginSpan = toInt(ctx.paramsObj.oldBeginSpan, 0);
    const oldEndSpan = toInt(ctx.paramsObj.oldEndSpan, 0);
    const bool = toInt(ctx.paramsObj.bool, 0);
    const all = await Dao.tas4CallOutListAll(row.cfgTasPid);
    if (callSpanConflict(all, row.cfgTasPid, row.beginSpan, row.endSpan, oldBeginSpan, oldEndSpan) && bool === 1) {
        return -1;
    }
    try {
        const ret = await Dao.tas4CallOutUpdate(row, oldBeginSpan, oldEndSpan);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4CallOut = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const pairs = parseQuotedPids(ctx.paramsObj.pids);
    if (!cfgTasPid || !pairs.length) return false;
    try {
        return (await Dao.tas4CallOutDelete(pairs, cfgTasPid)) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyTas4CallOut = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        beginSpan: toInt(pick(p, 'tas4CallOut.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4CallOut.endSpan'), 0),
        cfgTasPid: toInt(pick(p, 'tas4CallOut.cfgTasPid'), 0),
        voiceCodes: String(pick(p, 'tas4CallOut.voiceCodes') || ''),
        type: String(pick(p, 'tas4CallOut.type') || ''),
        ip: String(pick(p, 'tas4CallOut.ip') || ''),
        port: toInt(pick(p, 'tas4CallOut.port'), 0),
        userName: String(pick(p, 'tas4CallOut.userName') || ''),
        passWord: String(pick(p, 'tas4CallOut.passWord') || ''),
        nodeId: toInt(pick(p, 'tas4CallOut.nodeId'), 0),
        flag: String(pick(p, 'tas4CallOut.flag') || ''),
    };
    if (!row.cfgTasPid) return false;
    const all = await Dao.tas4CallOutListAll(row.cfgTasPid);
    let bs = row.beginSpan;
    let es = row.endSpan;
    let delta = 1;
    for (; delta <= 10000; delta += 1) {
        bs = row.beginSpan + delta;
        es = row.endSpan + delta;
        if (!callSpanConflict(all, row.cfgTasPid, bs, es, row.beginSpan, row.endSpan)) break;
    }
    if (delta > 10000) return false;
    try {
        await Dao.tas4CallOutInsert({ ...row, beginSpan: bs, endSpan: es });
        return true;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4CallInList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4CallIn.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4CallInList(cfgTasPid, offset, pagesize),
        Dao.tas4CallInCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4CallIn = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        beginSpan: toInt(pick(p, 'tas4CallIn.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4CallIn.endSpan'), 0),
        cfgTasPid: toInt(pick(p, 'tas4CallIn.cfgTasPid'), 0),
        voiceCodes: String(pick(p, 'tas4CallIn.voiceCodes') || ''),
        flag: String(pick(p, 'tas4CallIn.flag') || ''),
    };
    const all = await Dao.tas4CallInListAll(row.cfgTasPid);
    if (callSpanConflict(all, row.cfgTasPid, row.beginSpan, row.endSpan, -1, -1)) return -1;
    try {
        await Dao.tas4CallInInsert(row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4CallIn = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        beginSpan: toInt(pick(p, 'tas4CallIn.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4CallIn.endSpan'), 0),
        cfgTasPid: toInt(pick(p, 'tas4CallIn.cfgTasPid'), 0),
        voiceCodes: String(pick(p, 'tas4CallIn.voiceCodes') || ''),
        flag: String(pick(p, 'tas4CallIn.flag') || ''),
    };
    const oldBeginSpan = toInt(ctx.paramsObj.oldBeginSpan, 0);
    const oldEndSpan = toInt(ctx.paramsObj.oldEndSpan, 0);
    const bool = toInt(ctx.paramsObj.bool, 0);
    const all = await Dao.tas4CallInListAll(row.cfgTasPid);
    if (callSpanConflict(all, row.cfgTasPid, row.beginSpan, row.endSpan, oldBeginSpan, oldEndSpan) && bool === 1) {
        return -1;
    }
    try {
        const ret = await Dao.tas4CallInUpdate(row, oldBeginSpan, oldEndSpan);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4CallIn = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const pairs = parseQuotedPids(ctx.paramsObj.pids);
    if (!cfgTasPid || !pairs.length) return 0;
    const hit = await channelGroupLogicPhysicalIntersect(pairs);
    if (hit) return -2;
    try {
        const n = await Dao.tas4CallInDelete(pairs, cfgTasPid);
        return n > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.copyTas4CallIn = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        beginSpan: toInt(pick(p, 'tas4CallIn.beginSpan'), 0),
        endSpan: toInt(pick(p, 'tas4CallIn.endSpan'), 0),
        cfgTasPid: toInt(pick(p, 'tas4CallIn.cfgTasPid'), 0),
        voiceCodes: String(pick(p, 'tas4CallIn.voiceCodes') || ''),
        flag: String(pick(p, 'tas4CallIn.flag') || ''),
    };
    if (!row.cfgTasPid) return false;
    const all = await Dao.tas4CallInListAll(row.cfgTasPid);
    let bs = row.beginSpan;
    let es = row.endSpan;
    let delta = 1;
    for (; delta <= 10000; delta += 1) {
        bs = row.beginSpan + delta;
        es = row.endSpan + delta;
        if (!callSpanConflict(all, row.cfgTasPid, bs, es, row.beginSpan, row.endSpan)) break;
    }
    if (delta > 10000) return false;
    try {
        await Dao.tas4CallInInsert({ ...row, beginSpan: bs, endSpan: es });
        return true;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4RegList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4Reg.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4RegList(cfgTasPid, offset, pagesize),
        Dao.tas4RegCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4Reg = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4Reg.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4Reg.nodeId'), 0),
        brd: toInt(pick(p, 'tas4Reg.brd'), 0),
        domain: String(pick(p, 'tas4Reg.domain') || ''),
        port: toInt(pick(p, 'tas4Reg.port'), 0),
        userName: String(pick(p, 'tas4Reg.userName') || ''),
        passWord: String(pick(p, 'tas4Reg.passWord') || ''),
        expires: toInt(pick(p, 'tas4Reg.expires'), 0),
        nat: String(pick(p, 'tas4Reg.nat') || ''),
        flag: String(pick(p, 'tas4Reg.flag') || ''),
    };
    const dup = await Dao.tas4RegDupCount({ id: 0, domain: row.domain, port: row.port, userName: row.userName });
    if (dup > 0) return -1;
    try {
        const id = await Dao.tas4RegInsert(row);
        return id > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4Reg = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        id: toInt(pick(p, 'tas4Reg.id'), 0),
        cfgTasPid: toInt(pick(p, 'tas4Reg.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4Reg.nodeId'), 0),
        brd: toInt(pick(p, 'tas4Reg.brd'), 0),
        domain: String(pick(p, 'tas4Reg.domain') || ''),
        port: toInt(pick(p, 'tas4Reg.port'), 0),
        userName: String(pick(p, 'tas4Reg.userName') || ''),
        passWord: String(pick(p, 'tas4Reg.passWord') || ''),
        expires: toInt(pick(p, 'tas4Reg.expires'), 0),
        nat: String(pick(p, 'tas4Reg.nat') || ''),
        flag: String(pick(p, 'tas4Reg.flag') || ''),
    };
    const dup = await Dao.tas4RegDupCount({ id: row.id, domain: row.domain, port: row.port, userName: row.userName });
    if (dup > 0) return -1;
    try {
        const ret = await Dao.tas4RegUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4Reg = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgTasPid || !pids.length) return false;
    try {
        return (await Dao.tas4RegDelete(pids, cfgTasPid)) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyTas4Reg = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4Reg.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4Reg.nodeId'), 0),
        brd: toInt(pick(p, 'tas4Reg.brd'), 0),
        domain: String(pick(p, 'tas4Reg.domain') || ''),
        port: toInt(pick(p, 'tas4Reg.port'), 0),
        userName: String(pick(p, 'tas4Reg.userName') || ''),
        passWord: String(pick(p, 'tas4Reg.passWord') || ''),
        expires: toInt(pick(p, 'tas4Reg.expires'), 0),
        nat: String(pick(p, 'tas4Reg.nat') || ''),
        flag: String(pick(p, 'tas4Reg.flag') || ''),
    };
    if (!row.cfgTasPid) return false;
    let port = row.port + 1;
    while (port < 65536) {
        const dup = await Dao.tas4RegDupCount({ id: 0, domain: row.domain, port, userName: row.userName });
        if (dup === 0) break;
        port += 1;
    }
    if (port >= 65536) return false;
    try {
        const id = await Dao.tas4RegInsert({ ...row, port });
        return id > 0;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4EhRegList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4EhReg.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4EhRegList(cfgTasPid, offset, pagesize),
        Dao.tas4EhRegCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4EhReg = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4EhReg.cfgTasPid'), 0),
        userId: String(pick(p, 'tas4EhReg.userId') || ''),
        passwd: String(pick(p, 'tas4EhReg.passwd') || ''),
        userName: String(pick(p, 'tas4EhReg.userName') || ''),
        flag: String(pick(p, 'tas4EhReg.flag') || ''),
    };
    const dup = await Dao.tas4EhRegDupCount({ cfgTasPid: row.cfgTasPid, pid: 0, userId: row.userId });
    if (dup > 0) return -1;
    try {
        const pid = await Dao.tas4EhRegInsert(row);
        return pid > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4EhReg = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        pid: toInt(pick(p, 'tas4EhReg.pid'), 0),
        cfgTasPid: toInt(pick(p, 'tas4EhReg.cfgTasPid'), 0),
        userId: String(pick(p, 'tas4EhReg.userId') || ''),
        passwd: String(pick(p, 'tas4EhReg.passwd') || ''),
        userName: String(pick(p, 'tas4EhReg.userName') || ''),
        flag: String(pick(p, 'tas4EhReg.flag') || ''),
    };
    const dup = await Dao.tas4EhRegDupCount({ cfgTasPid: row.cfgTasPid, pid: row.pid, userId: row.userId });
    if (dup > 0) return -1;
    try {
        const ret = await Dao.tas4EhRegUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4EhReg = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgTasPid || !pids.length) return false;
    try {
        return (await Dao.tas4EhRegDelete(pids, cfgTasPid)) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyTas4EhReg = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4EhReg.cfgTasPid'), 0),
        userId: String(pick(p, 'tas4EhReg.userId') || ''),
        passwd: String(pick(p, 'tas4EhReg.passwd') || ''),
        userName: String(pick(p, 'tas4EhReg.userName') || ''),
        flag: String(pick(p, 'tas4EhReg.flag') || ''),
    };
    if (!row.cfgTasPid) return false;
    let userId = `${row.userId}_copy`;
    let n = 0;
    while ((await Dao.tas4EhRegDupCount({ cfgTasPid: row.cfgTasPid, pid: 0, userId })) > 0) {
        n += 1;
        userId = `${row.userId}_copy${n}`;
    }
    try {
        const pid = await Dao.tas4EhRegInsert({ ...row, userId });
        return pid > 0;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4NatSipList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4NatSip.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4NatSipList(cfgTasPid, offset, pagesize),
        Dao.tas4NatSipCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4NatSip = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4NatSip.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4NatSip.nodeId'), 0),
        publicIp: String(pick(p, 'tas4NatSip.publicIp') || ''),
        publicPort: toInt(pick(p, 'tas4NatSip.publicPort'), 0),
        flag: String(pick(p, 'tas4NatSip.flag') || ''),
    };
    const dup = await Dao.tas4NatSipDupCount({
        pid: 0,
        nodeId: row.nodeId,
        publicIp: row.publicIp,
        publicPort: row.publicPort,
    });
    if (dup > 0) return -1;
    try {
        const pid = await Dao.tas4NatSipInsert(row);
        return pid > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4NatSip = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        pid: toInt(pick(p, 'tas4NatSip.pid'), 0),
        cfgTasPid: toInt(pick(p, 'tas4NatSip.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4NatSip.nodeId'), 0),
        publicIp: String(pick(p, 'tas4NatSip.publicIp') || ''),
        publicPort: toInt(pick(p, 'tas4NatSip.publicPort'), 0),
        flag: String(pick(p, 'tas4NatSip.flag') || ''),
    };
    const dup = await Dao.tas4NatSipDupCount({
        pid: row.pid,
        nodeId: row.nodeId,
        publicIp: row.publicIp,
        publicPort: row.publicPort,
    });
    if (dup > 0) return -1;
    try {
        const ret = await Dao.tas4NatSipUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4NatSip = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgTasPid || !pids.length) return false;
    try {
        return (await Dao.tas4NatSipDelete(pids, cfgTasPid)) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyTas4NatSip = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4NatSip.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4NatSip.nodeId'), 0),
        publicIp: String(pick(p, 'tas4NatSip.publicIp') || ''),
        publicPort: toInt(pick(p, 'tas4NatSip.publicPort'), 0),
        flag: String(pick(p, 'tas4NatSip.flag') || ''),
    };
    if (!row.cfgTasPid) return false;
    let publicPort = row.publicPort + 1;
    while (publicPort < 65536) {
        const dup = await Dao.tas4NatSipDupCount({
            pid: 0,
            nodeId: row.nodeId,
            publicIp: row.publicIp,
            publicPort,
        });
        if (dup === 0) break;
        publicPort += 1;
    }
    if (publicPort >= 65536) return false;
    try {
        const pid = await Dao.tas4NatSipInsert({ ...row, publicPort });
        return pid > 0;
    } catch (e) {
        return false;
    }
};

Svc.loadTas4NatXiopList = async (ctx) => {
    const cfgTasPid = toInt(pick(ctx.paramsObj, 'tas4NatXiop.cfgTasPid'), 0);
    const { offset, pagesize } = pageOf(ctx);
    if (!cfgTasPid) return { Rows: [], Total: 0 };
    const [Rows, Total] = await Promise.all([
        Dao.tas4NatXiopList(cfgTasPid, offset, pagesize),
        Dao.tas4NatXiopCount(cfgTasPid),
    ]);
    return { Rows, Total };
};

Svc.addTas4NatXiop = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4NatXiop.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4NatXiop.nodeId'), 0),
        publicIp: String(pick(p, 'tas4NatXiop.publicIp') || ''),
        privateIp: String(pick(p, 'tas4NatXiop.privateIp') || ''),
        flag: String(pick(p, 'tas4NatXiop.flag') || ''),
    };
    const prefix = String(row.privateIp || '').split(':')[0] || '';
    const dup = await Dao.tas4NatXiopDupCount({ pid: 0, cfgTasPid: row.cfgTasPid, nodeId: row.nodeId, privateIpPrefix: prefix });
    if (dup > 0) return -1;
    try {
        const pid = await Dao.tas4NatXiopInsert(row);
        return pid > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.modifyTas4NatXiop = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        pid: toInt(pick(p, 'tas4NatXiop.pid'), 0),
        cfgTasPid: toInt(pick(p, 'tas4NatXiop.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4NatXiop.nodeId'), 0),
        publicIp: String(pick(p, 'tas4NatXiop.publicIp') || ''),
        privateIp: String(pick(p, 'tas4NatXiop.privateIp') || ''),
        flag: String(pick(p, 'tas4NatXiop.flag') || ''),
    };
    const prefix = String(row.privateIp || '').split(':')[0] || '';
    const dup = await Dao.tas4NatXiopDupCount({ pid: row.pid, cfgTasPid: row.cfgTasPid, nodeId: row.nodeId, privateIpPrefix: prefix });
    if (dup > 0) return -1;
    try {
        const ret = await Dao.tas4NatXiopUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteTas4NatXiop = async (ctx) => {
    const cfgTasPid = toInt(ctx.paramsObj.cfgTasPid, 0);
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!cfgTasPid || !pids.length) return false;
    try {
        return (await Dao.tas4NatXiopDelete(pids, cfgTasPid)) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyTas4NatXiop = async (ctx) => {
    const p = ctx.paramsObj;
    const row = {
        cfgTasPid: toInt(pick(p, 'tas4NatXiop.cfgTasPid'), 0),
        nodeId: toInt(pick(p, 'tas4NatXiop.nodeId'), 0),
        publicIp: String(pick(p, 'tas4NatXiop.publicIp') || ''),
        privateIp: String(pick(p, 'tas4NatXiop.privateIp') || ''),
        flag: String(pick(p, 'tas4NatXiop.flag') || ''),
    };
    if (!row.cfgTasPid) return false;
    let newPrivateIp = null;
    for (let i = 1; i < 1000; i += 1) {
        const tryIp = i === 1 ? `${row.privateIp}_copy` : `${row.privateIp}_copy${i}`;
        const prefix = String(tryIp).split(':')[0] || '';
        const dup = await Dao.tas4NatXiopDupCount({
            pid: 0,
            cfgTasPid: row.cfgTasPid,
            nodeId: row.nodeId,
            privateIpPrefix: prefix,
        });
        if (dup === 0) {
            newPrivateIp = tryIp;
            break;
        }
    }
    if (!newPrivateIp) return false;
    try {
        const pid = await Dao.tas4NatXiopInsert({ ...row, privateIp: newPrivateIp });
        return pid > 0;
    } catch (e) {
        return false;
    }
};

module.exports = Svc;
