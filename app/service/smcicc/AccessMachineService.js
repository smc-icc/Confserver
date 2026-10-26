const Dao = require('../../dao/AccessMachineSMCIccDao');

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

const Service = {};

Service.loadAccessMachineList = async (ctx) => {
    const ipAddress = String(ctx.paramsObj.ipAddress || '');
    const port = toInt(ctx.paramsObj.port, -1);
    const runMode = String(ctx.paramsObj.runMode || '');
    const page = toInt(ctx.paramsObj.page, 1);
    const pagesize = toInt(ctx.paramsObj.pagesize, 10);
    const { rows, total } = await Dao.list({ ipAddress, port, runMode, page, pageSize: pagesize });
    return { Rows: rows, Total: total };
};

Service.addAccessMachine = async (ctx) => {
    const ipAddress = String(ctx.paramsObj.ipAddress || '');
    const port = toInt(ctx.paramsObj.port, -1);
    const runMode = String(ctx.paramsObj.runMode || '');
    const note = String(ctx.paramsObj.note || '');
    const exist = await Dao.listByIpPort({ ipAddress, port });
    if (exist.length) return -2;
    await Dao.insert({ ipAddress, port, runMode, note });
    return 1;
};

Service.modifyAccessMachine = async (ctx) => {
    const pid = toInt(ctx.paramsObj.pid, 0);
    const ipAddress = String(ctx.paramsObj.ipAddress || '');
    const port = toInt(ctx.paramsObj.port, -1);
    const runMode = String(ctx.paramsObj.runMode || '');
    const note = String(ctx.paramsObj.note || '');
    const exist = await Dao.listByIpPort({ ipAddress, port });
    if (!exist.length) {
        await Dao.update({ pid, ipAddress, port, runMode, note });
        return 1;
    }
    if (Number(exist[0].pid) === Number(pid)) {
        await Dao.update({ pid, ipAddress, port, runMode, note });
        return 1;
    }
    return -2;
};

Service.copyAccessMachine = async (ctx) => Service.addAccessMachine(ctx);

Service.deleteAccessMachine = async (ctx) => {
    const ids = String(ctx.paramsObj.accessMachineIds || '')
        .split(',')
        .map((x) => Number(x.trim()))
        .filter((x) => !Number.isNaN(x));
    const ret = await Dao.deleteByIds(ids);
    return Number(ret || 0) > 0;
};

module.exports = Service;
