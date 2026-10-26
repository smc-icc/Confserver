const Dao = require('../../dao/ChannelGroupSMCIccDao');

const CONST_NAME_MAX_LENGTH = 50;

const Svc = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pick(p, key) {
    if (!p) return undefined;
    if (p.channelGroup && typeof p.channelGroup === 'object' && Object.prototype.hasOwnProperty.call(p.channelGroup, key)) {
        return p.channelGroup[key];
    }
    const dotted = `channelGroup.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function parseRow(p) {
    return {
        id: toInt(pick(p, 'id'), 0),
        name: String(pick(p, 'name') || '').trim(),
        beginSpanId: toInt(pick(p, 'beginSpanId'), 0),
        beginChannelId: toInt(pick(p, 'beginChannelId'), 0),
        endSpanId: toInt(pick(p, 'endSpanId'), 0),
        endChannelId: toInt(pick(p, 'endChannelId'), 0),
        seekType: toInt(pick(p, 'seekType'), 0),
        vdnId: toInt(pick(p, 'vdnId'), 0),
        callerCapacity: toInt(pick(p, 'callerCapacity'), 0),
    };
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

Svc.loadChannelGroupList = async (ctx) => {
    const name = pick(ctx.paramsObj || {}, 'name');
    const nameStr = name != null && String(name).trim() !== '' ? String(name).trim() : '';
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        Dao.channelGroupListPage(nameStr, offset, pagesize),
        Dao.channelGroupCount(nameStr),
    ]);
    return { Rows, Total };
};

Svc.addChannelGroup = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    if (!row.name) return 0;
    try {
        const dup = await Dao.channelGroupByNameExact(row.name);
        if (dup) return -2;
        await Dao.channelGroupInsert(row);
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.editChannelGroup = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    if (!row.id || !row.name) return 0;
    try {
        const same = await Dao.channelGroupForEdit(row.name, row.id);
        if (same) {
            const ret = await Dao.channelGroupUpdate(row);
            return Number(ret || 0) > 0 ? 1 : 0;
        }
        const cur = await Dao.channelGroupSelectById(row.id);
        if (!cur) return 0;
        const conflict = await Dao.channelGroupForEditElse(cur.name, row.name);
        if (conflict) return -2;
        const ret = await Dao.channelGroupUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteChannelGroup = async (ctx) => {
    const idsStr = String(ctx.paramsObj?.ids || '').trim();
    const idList = idsStr
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!idList.length) {
        return {
            result: -2,
            successCount: 0,
            failCount: 0,
            existChannelGroupList: [],
        };
    }
    const used = await Dao.channelGroupCheckUsed(idList);
    const usedIds = new Set(used.map((r) => Number(r.id)));
    const toDel = idList.filter((id) => !usedIds.has(id));
    if (!toDel.length) {
        return {
            result: -2,
            successCount: 0,
            failCount: used.length,
            existChannelGroupList: used,
        };
    }
    try {
        const ret = await Dao.channelGroupDeleteByIds(toDel);
        const ok = Number(ret || 0) > 0;
        return {
            result: ok ? 0 : -1,
            successCount: ok ? toDel.length : 0,
            failCount: used.length,
            existChannelGroupList: used,
        };
    } catch (e) {
        return {
            result: -1,
            successCount: 0,
            failCount: used.length,
            existChannelGroupList: used,
        };
    }
};

function computeCopyName(oldName) {
    const prefix = 'copy';
    const cutLen = prefix.length - (CONST_NAME_MAX_LENGTH - oldName.length);
    return cutLen > 0 ? prefix + oldName.substring(0, oldName.length - cutLen) : prefix + oldName;
}

Svc.copyChannelGroup = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    if (!row.name) return false;
    const oldName = row.name;
    const newName = computeCopyName(oldName);
    try {
        await Dao.channelGroupInsert({
            name: newName,
            beginSpanId: row.beginSpanId,
            beginChannelId: row.beginChannelId,
            endSpanId: row.endSpanId,
            endChannelId: row.endChannelId,
            seekType: row.seekType,
            vdnId: row.vdnId,
            callerCapacity: row.callerCapacity,
        });
        return true;
    } catch (e) {
        return false;
    }
};

module.exports = Svc;
