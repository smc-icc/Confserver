const Dao = require('../../dao/IsxSMCIccDao');

const Service = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

/** 与 IsxAction：顶层 newPid / oldPid */
function pickNewPid(p) {
    if (!p) return 0;
    if (p.newPid != null) return toInt(p.newPid, 0);
    return 0;
}

function pickOldPid(p) {
    if (!p) return 0;
    if (p.oldPid != null) return toInt(p.oldPid, 0);
    return 0;
}

/** 与 IsxServiceImpl.loadIsxList */
Service.loadIsxList = async () => Dao.isxSelectAll();

/** 与 IsxServiceImpl.addIsx：已存在返回 -2，成功返回 insert 影响行相关（1），异常 0 */
Service.addIsx = async (ctx) => {
    const pid = pickNewPid(ctx.paramsObj || {});
    if (pid <= 0) return 0;
    try {
        const exists = await Dao.isxSelectByPid(pid);
        if (exists != null) return -2;
        const ret = await Dao.isxInsert(pid);
        return Number(ret || 0) > 0 ? 1 : 0;
    } catch (e) {
        return 0;
    }
};

/** 与 IsxServiceImpl.deleteIsx：TAS 引用返回 -1，成功为存储过程返回值语义，此处成功返回 1 */
Service.deleteIsx = async (ctx) => {
    const pid = pickNewPid(ctx.paramsObj || {});
    if (pid <= 0) return 0;
    try {
        const cnt = await Dao.countTas4IsxByCfgIsxPid(pid);
        if (cnt > 0) return -1;
        await Dao.callDeleteIsx(pid);
        return 1;
    } catch (e) {
        return 0;
    }
};

/** 与 IsxServiceImpl.copyIsx */
Service.copyIsx = async (ctx) => {
    const p = ctx.paramsObj || {};
    const newPid = pickNewPid(p);
    const oldPid = pickOldPid(p);
    if (newPid <= 0 || oldPid <= 0) return 0;
    try {
        const exists = await Dao.isxSelectByPid(newPid);
        if (exists != null) return -2;
        await Dao.callCopyIsx(newPid, oldPid);
        return 1;
    } catch (e) {
        return 0;
    }
};

module.exports = Service;
