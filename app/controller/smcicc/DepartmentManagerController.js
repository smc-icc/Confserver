const logger = require('../../../logger');
const Service = require('../../service/smcicc/DepartmentManagerService');

const C = {};

/** Struts root=m_OutList */
C.getDepartTree = async (ctx) => {
    try {
        ctx.body = await Service.getDepartTree(ctx);
    } catch (e) {
        logger.error('[smcicc][getDepartTree]', e, ctx);
        ctx.body = [];
    }
};

/** Struts root=m_OutMap */
C.getDepartPower = async (ctx) => {
    try {
        ctx.body = await Service.getDepartPower(ctx);
    } catch (e) {
        logger.error('[smcicc][getDepartPower]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

C.addPowerForDepart = async (ctx) => {
    try {
        ctx.body = await Service.addPowerForDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][addPowerForDepart]', e, ctx);
        ctx.body = false;
    }
};

C.deletePowerForDepart = async (ctx) => {
    try {
        ctx.body = await Service.deletePowerForDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][deletePowerForDepart]', e, ctx);
        ctx.body = false;
    }
};

C.getNotRelateUsersByDepart = async (ctx) => {
    try {
        ctx.body = await Service.getNotRelateUsersByDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][getNotRelateUsersByDepart]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

C.getRelateUsersByDepart = async (ctx) => {
    try {
        ctx.body = await Service.getRelateUsersByDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][getRelateUsersByDepart]', e, ctx);
        ctx.body = { Rows: [] };
    }
};

C.toDepart = async (ctx) => {
    try {
        ctx.body = await Service.toDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][toDepart]', e, ctx);
        ctx.body = false;
    }
};

C.removeUserFromDepart = async (ctx) => {
    try {
        ctx.body = await Service.removeUserFromDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][removeUserFromDepart]', e, ctx);
        ctx.body = false;
    }
};

C.getDepartById = async (ctx) => {
    try {
        ctx.body = await Service.getDepartById(ctx);
    } catch (e) {
        logger.error('[smcicc][getDepartById]', e, ctx);
        ctx.body = {};
    }
};

/** Struts root=m_OutInteger */
C.addDepart = async (ctx) => {
    try {
        ctx.body = await Service.addDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][addDepart]', e, ctx);
        ctx.body = 0;
    }
};

C.editDepart = async (ctx) => {
    try {
        ctx.body = await Service.editDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][editDepart]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteDepart = async (ctx) => {
    try {
        ctx.body = await Service.deleteDepart(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteDepart]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
