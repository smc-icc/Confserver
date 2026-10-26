const Dao = require('../../dao/ChannelSMCIccDao');

const Svc = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pick(p, key) {
    if (!p) return undefined;
    if (p.channel && typeof p.channel === 'object' && Object.prototype.hasOwnProperty.call(p.channel, key)) {
        return p.channel[key];
    }
    const dotted = `channel.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function parseRow(p) {
    return {
        id: toInt(pick(p, 'id'), 0),
        offset: toInt(pick(p, 'offset'), 0),
        confOffset: toInt(pick(p, 'confOffset'), 0),
        confLength: toInt(pick(p, 'confLength'), 0),
        myId: toInt(pick(p, 'myId'), 0),
    };
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

function mapChannelRow(r) {
    if (!r) return null;
    return {
        id: r.id,
        offset: r.chOffset != null ? r.chOffset : r.offset,
        confOffset: r.confOffset,
        confLength: r.confLength,
        myId: r.myId,
        focuComm: null,
        tas: r.tasPid != null || r.tasMyId != null || r.tasMyName != null
            ? { pid: r.tasPid, myId: r.tasMyId, myName: r.tasMyName }
            : null,
    };
}

Svc.loadChannelList = async (ctx) => {
    const p = ctx.paramsObj || {};
    let myId = -1;
    if (p.channel && p.channel.myId != null && p.channel.myId !== '') {
        myId = toInt(p.channel.myId, -1);
    } else if (p['channel.myId'] != null && p['channel.myId'] !== '') {
        myId = toInt(p['channel.myId'], -1);
    }
    const { offset, pagesize } = pageOf(ctx);
    const [rows, Total] = await Promise.all([
        Dao.channelListPageTas(myId, offset, pagesize),
        Dao.channelListCountTas(myId),
    ]);
    return { Rows: rows.map(mapChannelRow), Total };
};

Svc.addChannel = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    try {
        await Dao.channelInsert({
            offset: row.offset,
            confOffset: row.confOffset,
            confLength: row.confLength,
            myId: row.myId,
        });
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.editChannel = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    if (!row.id) return 0;
    try {
        const ret = await Dao.channelUpdate(row);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deleteChannel = async (ctx) => {
    const idsStr = String(ctx.paramsObj?.ids || '').trim();
    const ids = idsStr
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!ids.length) return false;
    try {
        const ret = await Dao.channelDeleteByIds(ids);
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

Svc.copyChannel = async (ctx) => {
    const row = parseRow(ctx.paramsObj || {});
    try {
        await Dao.channelInsert({
            offset: row.offset,
            confOffset: row.confOffset,
            confLength: row.confLength,
            myId: row.myId,
        });
        return true;
    } catch (e) {
        return false;
    }
};

module.exports = Svc;
