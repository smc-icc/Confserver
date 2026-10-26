const Dao = require('../../dao/PrdSMCIccDao');

const Svc = {};

function toInt(v, d) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pick(p, key) {
    if (!p) return undefined;
    if (p.prd && typeof p.prd === 'object' && Object.prototype.hasOwnProperty.call(p.prd, key)) {
        return p.prd[key];
    }
    const dotted = `prd.${key}`;
    if (Object.prototype.hasOwnProperty.call(p, dotted)) return p[dotted];
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    return undefined;
}

function pageOf(ctx) {
    const page = Math.max(1, toInt(ctx.paramsObj.page, 1));
    const pagesize = Math.max(1, toInt(ctx.paramsObj.pagesize, 10));
    return { offset: (page - 1) * pagesize, pagesize, page };
}

Svc.loadPrdList = async (ctx) => {
    const p = ctx.paramsObj || {};
    let pidFilter = -100;
    if (p.prd && p.prd.pid != null && p.prd.pid !== '') {
        pidFilter = toInt(p.prd.pid, -100);
    } else if (p['prd.pid'] != null && p['prd.pid'] !== '') {
        pidFilter = toInt(p['prd.pid'], -100);
    }
    const { offset, pagesize } = pageOf(ctx);
    const [Rows, Total] = await Promise.all([
        Dao.prdList(pidFilter, offset, pagesize),
        Dao.prdCount(pidFilter),
    ]);
    return { Rows, Total };
};

Svc.addPrd = async (ctx) => {
    const pid = toInt(pick(ctx.paramsObj, 'pid'), 0);
    const isxPid = toInt(pick(ctx.paramsObj, 'isxPid'), 0);
    if (!pid) return 0;
    try {
        const exists = await Dao.prdCountByPid(pid);
        if (exists > 0) return -2;
        await Dao.prdInsert({ pid, isxPid });
        return 1;
    } catch (e) {
        return 0;
    }
};

Svc.editPrd = async (ctx) => {
    const newPid = toInt(pick(ctx.paramsObj, 'pid'), 0);
    const isxPid = toInt(pick(ctx.paramsObj, 'isxPid'), 0);
    const oldPid = toInt(ctx.paramsObj.oldPid ?? ctx.paramsObj['prd.oldPid'], 0);
    if (!newPid || !oldPid) return 0;
    try {
        const cnt = await Dao.prdCountByPid(newPid);
        if (cnt > 0 && newPid !== oldPid) return -2;
        const ret = await Dao.prdUpdate({ newPid, oldPid, isxPid });
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

Svc.deletePrd = async (ctx) => {
    const pids = String(ctx.paramsObj.pids || '')
        .split(',')
        .map((x) => toInt(x.trim(), 0))
        .filter((x) => x > 0);
    if (!pids.length) return { result: 0, prd: '' };
    try {
        const refs = await Dao.tasDistinctCfgPrdIn(pids);
        if (refs.length > 0) {
            const prd = refs.map((r) => r.cfgPrdPid).filter((x) => x != null).join(',');
            return { result: 0, prd };
        }
        const ret = await Dao.prdDelete(pids);
        return { result: Number(ret || 0), prd: '' };
    } catch (e) {
        return { result: 0, prd: '' };
    }
};

Svc.loadAllPrd = async () => Dao.prdSelectAll();

/**
 * Struts 有 copyPrd 但 Java PrdAction 无实现：按「复制一条 PRD」插入新 PID，沿用原 ISXPID。
 * 参数：prd.pid 或 oldPid 源行；可选 prd.newPid / newPid，缺省为 MAX(PID)+1。
 */
Svc.copyPrd = async (ctx) => {
    const p = ctx.paramsObj || {};
    const oldPid = toInt(pick(p, 'pid') ?? pick(p, 'oldPid') ?? p.oldPid, 0);
    if (!oldPid) return false;
    try {
        const src = await Dao.prdSelectByPid(oldPid);
        if (!src) return false;
        let newPid = toInt(pick(p, 'newPid') ?? p.newPid, 0);
        if (!newPid) {
            newPid = await Dao.prdNextPid();
        } else if (await Dao.prdCountByPid(newPid) > 0) {
            return false;
        }
        await Dao.prdInsert({ pid: newPid, isxPid: toInt(src.isxPid, 0) });
        return true;
    } catch (e) {
        return false;
    }
};

module.exports = Svc;
