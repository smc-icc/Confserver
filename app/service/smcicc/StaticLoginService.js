const Dao = require('../../dao/StaticLoginSMCIccDao');

function parseStaticLogin(raw) {
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return {};
    }
}

function vdnIdFromCtx(ctx, row) {
    const id = row.vdnId ?? ctx.paramsObj.vdnId ?? ctx.session.smcicc_vdn_id;
    return Number(id);
}

async function appendPassword(row, vdnId) {
    const passwd = await Dao.getUserPasswordByWorkNo({ workNo: row.workNo, vdnId });
    return { ...row, passwd };
}

const Service = {};

Service.loadstaticLoginList = async (ctx) => {
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    const pageNum = Number(ctx.paramsObj['staticLoginBean.pageNum'] || 1);
    const pageSize = Number(ctx.paramsObj['staticLoginBean.pageSize'] || 30);
    const workNo = String(ctx.paramsObj['staticLoginBean.workNo'] || '');
    const extNum = String(ctx.paramsObj['staticLoginBean.extNum'] || '');
    const { rows, total } = await Dao.list({ vdnId, workNo, extNum, pageNum, pageSize });
    return { Rows: rows, Total: total };
};

Service.addStaticLogin = async (ctx) => {
    let row = parseStaticLogin(ctx.paramsObj.staticloginJson);
    const vdnId = vdnIdFromCtx(ctx, row);
    row = { ...row, vdnId, id: 0 };

    const workNos = String(row.workNo || '').split(';').map((x) => x.trim()).filter(Boolean);
    if (workNos.length === 0) return 0;

    if (workNos.length === 1) {
        const exist = await Dao.findByPrimary({ vdnId, workNo: row.workNo });
        if (exist.length > 0) return 2;
        const extCount = await Dao.countByExtNum({ vdnId, extNum: row.extNum, oldExtNum: '' });
        if (extCount > 0) return -1;
        row = await appendPassword(row, vdnId);
        await Dao.insert(row);
        return 1;
    }

    let result = 0;
    for (const workNo of workNos) {
        const r = await appendPassword({ ...row, workNo }, vdnId);
        await Dao.insert(r);
        result = 1;
    }
    return result;
};

Service.editStaticLogin = async (ctx) => {
    let row = parseStaticLogin(ctx.paramsObj.staticloginJson);
    const oldWorkNo = String(ctx.paramsObj.oldWorkNo || '');
    const oldExtNum = String(ctx.paramsObj.oldExtNum || '');
    const vdnId = vdnIdFromCtx(ctx, row);
    row = { ...row, vdnId, id: 0 };

    const count = await Dao.countByWorkNo({ vdnId, workNo: row.workNo, oldWorkNo });
    if (count > 0) return 2;
    const extCount = await Dao.countByExtNum({ vdnId, extNum: row.extNum, oldExtNum });
    if (extCount > 0) return -1;

    row = await appendPassword(row, vdnId);
    await Dao.updateByOldWorkNo({ ...row, oldWorkNo });
    return 1;
};

Service.deleteStaticLogin = async (ctx) => {
    const workNos = String(ctx.paramsObj.workNos || '').split(',').map((x) => x.trim()).filter(Boolean);
    let ok = false;
    for (const workNo of workNos) {
        await Dao.deleteByWorkNo({ workNo });
        ok = true;
    }
    return ok;
};

Service.getUserByWorkNo = async (ctx) => {
    const workNo = String(ctx.paramsObj.workNo || '');
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    return Dao.getUserByWorkNo({ workNo, vdnId });
};

Service.getUserList = async (ctx) => {
    const key = String(ctx.paramsObj.key || '');
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    return Dao.getUserList({ key, vdnId });
};

Service.copyStaticLogin = async (ctx) => {
    let row = parseStaticLogin(ctx.paramsObj.staticloginJson || ctx.paramsObj.staticlogin);
    const vdnId = vdnIdFromCtx(ctx, row);
    row = { ...row, vdnId, id: 0 };
    if (!row.workNo) return false;

    row = await appendPassword(row, vdnId);
    const all = await Dao.listAllStaticLoginWorkNos();
    const workNoSet = new Set(all.map((x) => String(x.workNo || '')));

    const candidates = await Dao.getUserList({ key: String(row.workNo), vdnId });
    for (const u of candidates) {
        if (!workNoSet.has(String(u.workNo))) {
            await Dao.insert({ ...row, workNo: u.workNo });
            return true;
        }
    }
    return false;
};

module.exports = Service;
