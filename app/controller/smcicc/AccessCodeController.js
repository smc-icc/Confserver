const logger = require('../../../logger');
const Service = require('../../service/smcicc/AccessCodeService');

const Controller = {};

Controller.loadAccessCodeList = async (ctx) => {
    try {
        ctx.body = await Service.loadAccessCodeList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAccessCodeList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.loadAccessCodeListByNotAssign = async (ctx) => {
    try {
        ctx.body = await Service.loadAccessCodeListByNotAssign(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAccessCodeListByNotAssign]', e, ctx);
        ctx.body = { Rows: [], Total: 0, ids: '' };
    }
};

Controller.loadAccessCodeListByNotAssignSelf = async (ctx) => {
    try {
        ctx.body = await Service.loadAccessCodeListByNotAssignSelf(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAccessCodeListByNotAssignSelf]', e, ctx);
        ctx.body = { Rows: [], Total: 0, ids: '' };
    }
};

Controller.addAccessCode = async (ctx) => {
    try {
        ctx.body = await Service.addAccessCode(ctx);
    } catch (e) {
        logger.error('[smcicc][addAccessCode]', e, ctx);
        ctx.body = 0;
    }
};

Controller.modifyAccessCode = async (ctx) => {
    try {
        ctx.body = await Service.modifyAccessCode(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyAccessCode]', e, ctx);
        ctx.body = 0;
    }
};

Controller.copyAccessCode = async (ctx) => {
    try {
        ctx.body = await Service.copyAccessCode(ctx);
    } catch (e) {
        logger.error('[smcicc][copyAccessCode]', e, ctx);
        ctx.body = 0;
    }
};

Controller.deleteAccessCode = async (ctx) => {
    try {
        ctx.body = await Service.deleteAccessCode(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteAccessCode]', e, ctx);
        ctx.body = false;
    }
};

Controller.loadMediaTypeListAtAccessCode = async (ctx) => {
    try {
        ctx.body = await Service.loadMediaTypeListAtAccessCode(ctx);
    } catch (e) {
        logger.error('[smcicc][loadMediaTypeListAtAccessCode]', e, ctx);
        ctx.body = [];
    }
};

module.exports = Controller;
