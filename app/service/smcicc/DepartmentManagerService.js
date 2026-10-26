const Db = require('../../dao/db');
const DeptDao = require('../../dao/DepartmentSMCIccDao');
const GrantDao = require('../../dao/SMCIccGrantPowerDao');

function vdnIdFromCtx(ctx) {
    const n = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    return Number.isNaN(n) ? -1 : n;
}

function parseJsonDepart(raw) {
    if (!raw) return null;
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(raw);
    } catch (e) {
        return null;
    }
}

function menuChild(list, parentId, level, seen = new Set()) {
    if (seen.has(parentId)) return [];
    seen = new Set(seen); seen.add(parentId);
    const nextLevel = level + 1;
    const out = [];
    for (const depart of list) {
        if (depart.parentId === parentId) {
            const node = {
                id: depart.id,
                text: depart.departmentName,
                level: nextLevel,
                pid: depart.parentId,
            };
            const sub = menuChild(list, depart.id, nextLevel, seen);
            if (sub.length) node.children = sub;
            out.push(node);
        }
    }
    return out;
}

/** 与 DepartmentManagerServiceImpl.getDepartmentAll */
function buildDepartTree(rows, strKeyWord) {
    const kw = strKeyWord != null ? String(strKeyWord).trim() : '';
    const list = rows;
    const result = [];
    for (const depart of list) {
        if (depart.parentId === 0 || kw.length > 0) {
            const mapArr = {
                id: depart.id,
                text: depart.departmentName,
                level: 1,
                pid: depart.parentId,
            };
            const child = menuChild(list, depart.id, 1);
            if (child.length) mapArr.children = child;
            result.push(mapArr);
        }
    }
    return result;
}

async function collectSubtreeIds(vdnId, rootId) {
    const all = [rootId];
    const queue = [rootId];
    while (queue.length) {
        const pid = queue.shift();
        const children = await DeptDao.selectChildIds(vdnId, pid);
        for (const cid of children) {
            if (all.includes(cid)) continue;
            all.push(cid);
            queue.push(cid);
        }
    }
    return all;
}

const Service = {};

Service.getDepartTree = async (ctx) => {
    const vdnId = vdnIdFromCtx(ctx);
    if (vdnId < 0) return [];
    const keyWord = ctx.paramsObj.key != null && String(ctx.paramsObj.key) !== '' ? ctx.paramsObj.key : ctx.paramsObj.keyWord;
    const strKeyWord = keyWord != null ? String(keyWord) : '';
    const rows = await DeptDao.selectAllFlat(vdnId, strKeyWord);
    return buildDepartTree(rows, strKeyWord);
};

Service.getDepartPower = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(departId) || departId < 0 || vdnId < 0) {
        return { Rows: [] };
    }
    const keyWord = ctx.paramsObj.key != null && String(ctx.paramsObj.key) !== '' ? ctx.paramsObj.key : ctx.paramsObj.keyWord;
    const list = await GrantDao.getPowerList(keyWord != null ? String(keyWord) : '');
    const owned = await GrantDao.getDepartToPowerIds(departId, vdnId);
    const rows = list.filter(row => !ctx.managedVdnId || Number(row.subsystemtype) === 90).map((row) => ({
        ...row,
        isown: owned.has(row.powerid),
    }));
    return { Rows: rows };
};

Service.addPowerForDepart = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    const powerId = Number(ctx.paramsObj.powerId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(departId) || Number.isNaN(powerId) || vdnId < 0) return false;
    const n = await GrantDao.insertToPowerForDepart(departId, powerId, vdnId);
    return n > 0;
};

Service.deletePowerForDepart = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    const powerId = Number(ctx.paramsObj.powerId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(departId) || Number.isNaN(powerId) || vdnId < 0) return false;
    const n = await GrantDao.deletePowerForDepart(departId, powerId, vdnId);
    return n > 0;
};

Service.getNotRelateUsersByDepart = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(departId) || departId < 0 || vdnId < 0) return { Rows: [] };
    const keyWord = ctx.paramsObj.key != null && String(ctx.paramsObj.key) !== '' ? ctx.paramsObj.key : ctx.paramsObj.keyWord;
    const rows = await DeptDao.getAlternativeData4Depart(departId, keyWord != null ? String(keyWord) : '', vdnId);
    return { Rows: rows };
};

Service.getRelateUsersByDepart = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(departId) || departId < 0 || vdnId < 0) return { Rows: [] };
    const keyWord = ctx.paramsObj.key != null && String(ctx.paramsObj.key) !== '' ? ctx.paramsObj.key : ctx.paramsObj.keyWord;
    const rows = await DeptDao.getSelectedData4Depart(departId, keyWord != null ? String(keyWord) : '', vdnId);
    return { Rows: rows };
};

Service.toDepart = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    const vdnId = vdnIdFromCtx(ctx);
    const selIdStr = ctx.paramsObj.selIdStr != null ? String(ctx.paramsObj.selIdStr).trim() : '';
    if (Number.isNaN(departId) || departId < 0 || !selIdStr || vdnId < 0) return false;
    const ids = selIdStr.split(',').filter(Boolean);
    const t = await Db.db_smcicc.sequelize.transaction();
    try {
        for (const uid of ids) {
            const userId = Number(uid);
            if (Number.isNaN(userId)) continue;
            const n = await DeptDao.insertUserToDepart(userId, departId, vdnId, t);
            if (n < 1) {
                await t.rollback();
                return false;
            }
        }
        await t.commit();
        return true;
    } catch (e) {
        await t.rollback();
        throw e;
    }
};

Service.removeUserFromDepart = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    const vdnId = vdnIdFromCtx(ctx);
    const selIdStr = ctx.paramsObj.selIdStr != null ? String(ctx.paramsObj.selIdStr).trim() : '';
    if (Number.isNaN(departId) || departId < 0 || !selIdStr || vdnId < 0) return false;
    const ids = selIdStr.split(',').filter(Boolean);
    const t = await Db.db_smcicc.sequelize.transaction();
    try {
        for (const uid of ids) {
            const userId = Number(uid);
            if (Number.isNaN(userId)) continue;
            const n = await DeptDao.deleteUserToDepart(userId, departId, vdnId, t);
            if (n < 1) {
                await t.rollback();
                return false;
            }
        }
        await t.commit();
        return true;
    } catch (e) {
        await t.rollback();
        throw e;
    }
};

Service.getDepartById = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    if (Number.isNaN(departId) || departId < 0) return {};
    const dept = await DeptDao.selectByPrimaryKey(departId, vdnIdFromCtx(ctx));
    if (!dept) return {};
    let parentName = '-';
    if (dept.parentId != null && dept.parentId !== 0) {
        const parent = await DeptDao.selectByPrimaryKey(dept.parentId, vdnIdFromCtx(ctx));
        if (parent && parent.departmentName) parentName = parent.departmentName;
    }
    return {
        id: dept.id,
        departmentName: dept.departmentName,
        departmentTel: dept.departmentTel,
        departmentFax: dept.departmentFax,
        contact: dept.contact,
        contactMobile: dept.contactMobile,
        parentId: dept.parentId,
        parentName,
    };
};

/** m_OutInteger：0 失败，1 成功，2 重名 */
Service.addDepart = async (ctx) => {
    const vdnId = vdnIdFromCtx(ctx);
    if (vdnId < 0) return 0;
    const depart = parseJsonDepart(ctx.paramsObj.jsonDepart);
    if (!depart) return 0;
    depart.vdnId = vdnId;
    if (depart.parentId == null) depart.parentId = 0;
    const exists = await DeptDao.isExistDepart(vdnId, depart.departmentName, depart.id);
    if (exists) return 2;
    const id = await Db.db_smcicc.sequelize.transaction(t => DeptDao.insert(depart, t));
    return id != null ? 1 : 0;
};

Service.editDepart = async (ctx) => {
    const vdnId = vdnIdFromCtx(ctx);
    if (vdnId < 0) return 0;
    const depart = parseJsonDepart(ctx.paramsObj.jsonDepart);
    if (!depart || depart.id == null) return 0;
    depart.vdnId = vdnId;
    const exists = await DeptDao.isExistDepart(vdnId, depart.departmentName, depart.id);
    if (exists) return 2;
    const n = await DeptDao.updateByPrimaryKey(depart);
    return n > 0 ? 1 : 0;
};

Service.deleteDepart = async (ctx) => {
    const departId = Number(ctx.paramsObj.departId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(departId) || departId < 0 || vdnId < 0) return false;
    const ids = await collectSubtreeIds(vdnId, departId);
    const t = await Db.db_smcicc.sequelize.transaction();
    try {
        await GrantDao.deleteAllPowerByDepartIds(ids, t, vdnId);
        await Db.db_smcicc.sequelize.query('DELETE FROM t_user_usertodepart WHERE departid IN (:ids) AND VDNID=:vdnId', { replacements: { ids, vdnId }, transaction:t });
        await DeptDao.deleteByIds(ids, t, vdnId);
        await t.commit();
        return true;
    } catch (e) {
        await t.rollback();
        throw e;
    }
};

module.exports = Service;
