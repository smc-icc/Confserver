const Db = require('../../dao/db');
const RoleDao = require('../../dao/RoleSMCIccDao');
const GrantDao = require('../../dao/SMCIccGrantPowerDao');

function vdnIdFromCtx(ctx) {
    const n = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id || -1);
    return Number.isNaN(n) ? -1 : n;
}

const Service = {};

Service.initRoleData = async (ctx) => {
    const vdnId = vdnIdFromCtx(ctx);
    if (vdnId < 0) return { Rows: [] };
    const kw = ctx.paramsObj.keyWord != null ? String(ctx.paramsObj.keyWord) : '';
    const rows = await RoleDao.getTUserRole(vdnId, kw);
    return { Rows: rows };
};

Service.getNotRelateUsersByRole = async (ctx) => {
    const roleId = Number(ctx.paramsObj.roleId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(roleId) || roleId < 0 || vdnId < 0) return { Rows: [] };
    const kw = ctx.paramsObj.keyWord != null ? String(ctx.paramsObj.keyWord) : '';
    const rows = await RoleDao.getAlternativeData4Role(roleId, kw, vdnId);
    return { Rows: rows };
};

Service.getRelateUsersByRole = async (ctx) => {
    const roleId = Number(ctx.paramsObj.roleId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(roleId) || roleId < 0 || vdnId < 0) return { Rows: [] };
    const kw = ctx.paramsObj.keyWord != null ? String(ctx.paramsObj.keyWord) : '';
    const rows = await RoleDao.getSelectedData4Role(roleId, kw, vdnId);
    return { Rows: rows };
};

/** 角色权限列表：root=m_OutMap.Rows（与 department 的 getDepartPower 结构相同） */
Service.getPower = async (ctx) => {
    const roleId = Number(ctx.paramsObj.roleId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(roleId) || roleId < 0 || vdnId < 0) return { Rows: [] };
    const kw = ctx.paramsObj.keyWord != null ? String(ctx.paramsObj.keyWord) : '';
    const list = await GrantDao.getPowerList(kw);
    const owned = await GrantDao.getRoleToPowerIds(roleId, vdnId);
    const rows = list.filter(row => !ctx.managedVdnId || Number(row.subsystemtype) === 90).map((row) => ({
        ...row,
        isown: owned.has(row.powerid),
    }));
    return { Rows: rows };
};

Service.toRole = async (ctx) => {
    const roleId = Number(ctx.paramsObj.roleId);
    const vdnId = vdnIdFromCtx(ctx);
    const selIdStr = ctx.paramsObj.selIdStr != null ? String(ctx.paramsObj.selIdStr).trim() : '';
    if (Number.isNaN(roleId) || roleId < 0 || !selIdStr || vdnId < 0) return false;
    const ids = selIdStr.split(',').filter(Boolean);
    const t = await Db.db_smcicc.sequelize.transaction();
    try {
        for (const uid of ids) {
            const userId = Number(uid);
            if (Number.isNaN(userId)) continue;
            const n = await RoleDao.insertUserToRole(userId, roleId, vdnId, t);
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

Service.removeFromRole = async (ctx) => {
    const roleId = Number(ctx.paramsObj.roleId);
    const vdnId = vdnIdFromCtx(ctx);
    const selIdStr = ctx.paramsObj.selIdStr != null ? String(ctx.paramsObj.selIdStr).trim() : '';
    if (Number.isNaN(roleId) || roleId < 0 || !selIdStr || vdnId < 0) return false;
    const ids = selIdStr.split(',').filter(Boolean);
    const t = await Db.db_smcicc.sequelize.transaction();
    try {
        for (const uid of ids) {
            const userId = Number(uid);
            if (Number.isNaN(userId)) continue;
            const n = await RoleDao.deleteUserFromRole(userId, roleId, vdnId, t);
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

Service.addPowerForRole = async (ctx) => {
    const roleId = Number(ctx.paramsObj.roleId);
    const powerId = Number(ctx.paramsObj.powerId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(roleId) || Number.isNaN(powerId) || vdnId < 0) return false;
    const t = await Db.db_smcicc.sequelize.transaction();
    try {
        const n = await GrantDao.replacePowerForRole(roleId, powerId, vdnId, t);
        await t.commit();
        return n > 0;
    } catch (e) {
        await t.rollback();
        throw e;
    }
};

Service.deletePowerForRole = async (ctx) => {
    const roleId = Number(ctx.paramsObj.roleId);
    const powerId = Number(ctx.paramsObj.powerId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(roleId) || Number.isNaN(powerId) || vdnId < 0) return false;
    const n = await GrantDao.deletePowerForRole(roleId, powerId, vdnId);
    return n > 0;
};

Service.getRoleById = async (ctx) => {
    const roleId = Number(ctx.paramsObj.roleId);
    const vdnId = vdnIdFromCtx(ctx);
    if (Number.isNaN(roleId) || roleId < 0 || vdnId < 0) return {};
    const row = await RoleDao.getRoleById(roleId, vdnId);
    return row || {};
};

/** Struts root=m_OutInteger：0 重名或失败，1 成功 */
Service.addRole = async (ctx) => {
    const vdnId = vdnIdFromCtx(ctx);
    if (vdnId < 0) return 0;
    const roleName = ctx.paramsObj.roleName != null ? String(ctx.paramsObj.roleName).trim() : '';
    if (!roleName) return 0;
    const exists = await RoleDao.getRole2Add(roleName, vdnId);
    if (exists.length > 0) return 0;
    const n = await RoleDao.addRole(roleName, vdnId);
    return n > 0 ? 1 : 0;
};

Service.editRole = async (ctx) => {
    const vdnId = vdnIdFromCtx(ctx);
    const roleId = Number(ctx.paramsObj.roleId);
    if (Number.isNaN(roleId) || roleId < 0 || vdnId < 0) return 0;
    const roleName = ctx.paramsObj.roleName != null ? String(ctx.paramsObj.roleName).trim() : '';
    if (!roleName) return 0;
    const dup = await RoleDao.getRoleByNameExcludeId(roleName, roleId, vdnId);
    if (dup.length > 0) return 0;
    const n = await RoleDao.editRole(roleId, roleName, vdnId);
    return n > 0 ? 1 : 0;
};

Service.deleteRole = async (ctx) => {
    const vdnId = vdnIdFromCtx(ctx);
    if (vdnId < 0) return false;
    const raw = ctx.paramsObj.roleIds != null ? String(ctx.paramsObj.roleIds).trim() : '';
    if (!raw) return false;
    const ids = raw
        .split(',')
        .map((s) => Number(String(s).trim()))
        .filter((n) => !Number.isNaN(n) && n > 0);
    if (!ids.length) return false;
    /** 与 Java deleteRole：无异常即 true，不校验影响行数 */
    await Db.db_smcicc.sequelize.transaction(async transaction => {
        for (const sql of ['DELETE FROM t_user_usertorole WHERE RoleID IN (:ids) AND VDNID=:vdnId',
            'DELETE FROM t_user_grantpower WHERE OwnerType=1 AND OwnerId IN (:ids) AND VDNID=:vdnId'])
            await Db.db_smcicc.sequelize.query(sql, {replacements:{ids,vdnId},transaction});
        await RoleDao.deleteRolesByIds(ids, vdnId, transaction);
    });
    return true;
};

module.exports = Service;
