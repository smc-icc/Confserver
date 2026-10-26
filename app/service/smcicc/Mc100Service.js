const Dao = require('../../dao/Mc100SMCIccDao');

const Service = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pickMc100(p, key) {
    if (!p) return undefined;
    if (p.mc100 && typeof p.mc100 === 'object' && Object.prototype.hasOwnProperty.call(p.mc100, key)) {
        return p.mc100[key];
    }
    const dotted = `mc100.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

/** 与 mc100Action：列表筛选 ip/port 为顶层参数 */
Service.loadMc100List = async (ctx) => {
    const p = ctx.paramsObj || {};
    const iip = p.ip == null ? '' : String(p.ip);
    const iport = p.port == null ? '' : String(p.port);
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        Dao.mc100ListPage(iip, iport, offset, pagesize),
        Dao.mc100Count(iip, iport),
    ]);
    return { Rows, Total };
};

/** 与 addMc100：顶层 ip、port */
Service.addMc100 = async (ctx) => {
    const p = ctx.paramsObj || {};
    const ip = p.ip == null ? '' : String(p.ip).trim();
    const port = p.port == null || p.port === '' ? 0 : toInt(p.port, 0);
    try {
        const dup = await Dao.mc100SelectJq(ip, String(port));
        if (dup.length > 0) return -2;
        const ret = await Dao.mc100Insert({ ip, port });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

/** 与 modifyMc100：顶层 ip、port；pid 来自 mc100 */
Service.modifyMc100 = async (ctx) => {
    const p = ctx.paramsObj || {};
    const pid = toInt(pickMc100(p, 'pid') ?? p.pid, 0);
    const ip = p.ip == null ? '' : String(p.ip).trim();
    const port = p.port == null || p.port === '' ? 0 : toInt(p.port, 0);
    if (!pid) return 0;
    try {
        const mc100List = await Dao.mc100SelectJq(ip, String(port));
        if (mc100List.length === 0) {
            const ret = await Dao.mc100Update({ pid, ip, port });
            return Number(ret || 0) > 0 ? 1 : 0;
        }
        const first = mc100List[0];
        if (Number(first.pid) === Number(pid)) {
            const ret = await Dao.mc100Update({ pid, ip, port });
            return Number(ret || 0) > 0 ? 1 : 0;
        }
        return -2;
    } catch (e) {
        return 0;
    }
};

/** 与 deleteMc100：mc100Ids */
Service.deleteMc100 = async (ctx) => {
    const ids = String(ctx.paramsObj.mc100Ids || ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!ids.length) return false;
    try {
        const ret = await Dao.mc100Delete(ids);
        return Number(ret || 0) > 0;
    } catch (e) {
        return false;
    }
};

/** 与 copyMc100：同 addMc100 */
Service.copyMc100 = Service.addMc100;

module.exports = Service;
