const logger = require('../../../logger');
const Service = require('../../service/smcicc/RoleAndPowerManagerService');

const C = {};

C.initRoleData = async (ctx) => {
    try {
        ctx.body = await Service.initRoleData(ctx);
    } catch (e) {
        logger.error('[smcicc][initRoleData]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

C.getNotRelateUsersByRole = async (ctx) => {
    try {
        ctx.body = await Service.getNotRelateUsersByRole(ctx);
    } catch (e) {
        logger.error('[smcicc][getNotRelateUsersByRole]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

C.getRelateUsersByRole = async (ctx) => {
    try {
        ctx.body = await Service.getRelateUsersByRole(ctx);
    } catch (e) {
        logger.error('[smcicc][getRelateUsersByRole]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

/** 与 Struts roleAdmin.getPower：m_OutMap.Rows */
C.getPower = async (ctx) => {
    try {
        ctx.body = await Service.getPower(ctx);
    } catch (e) {
        logger.error('[smcicc][role.getPower]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

C.toRole = async (ctx) => {
    try {
        ctx.body = await Service.toRole(ctx);
    } catch (e) {
        logger.error('[smcicc][toRole]', e, ctx);
        ctx.body = false;
    }
};

C.removeFromRole = async (ctx) => {
    try {
        ctx.body = await Service.removeFromRole(ctx);
    } catch (e) {
        logger.error('[smcicc][removeFromRole]', e, ctx);
        ctx.body = false;
    }
};

C.addPowerForRole = async (ctx) => {
    try {
        ctx.body = await Service.addPowerForRole(ctx);
    } catch (e) {
        logger.error('[smcicc][addPowerForRole]', e, ctx);
        ctx.body = false;
    }
};

C.deletePowerForRole = async (ctx) => {
    try {
        ctx.body = await Service.deletePowerForRole(ctx);
    } catch (e) {
        logger.error('[smcicc][deletePowerForRole]', e, ctx);
        ctx.body = false;
    }
};

C.getRoleById = async (ctx) => {
    try {
        ctx.body = await Service.getRoleById(ctx);
    } catch (e) {
        logger.error('[smcicc][getRoleById]', e, ctx);
        ctx.body = {};
    }
};

/** Struts root=m_OutInteger */
C.addRole = async (ctx) => {
    try {
        ctx.body = await Service.addRole(ctx);
    } catch (e) {
        logger.error('[smcicc][addRole]', e, ctx);
        ctx.body = 0;
    }
};

C.editRole = async (ctx) => {
    try {
        ctx.body = await Service.editRole(ctx);
    } catch (e) {
        logger.error('[smcicc][editRole]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteRole = async (ctx) => {
    try {
        ctx.body = await Service.deleteRole(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteRole]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
