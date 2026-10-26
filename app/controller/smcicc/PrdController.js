const logger = require('../../../logger');
const Service = require('../../service/smcicc/PrdService');

const C = {};

C.loadPrdList = async (ctx) => {
    try {
        ctx.body = await Service.loadPrdList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadPrdList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addPrd = async (ctx) => {
    try {
        ctx.body = await Service.addPrd(ctx);
    } catch (e) {
        logger.error('[smcicc][addPrd]', e, ctx);
        ctx.body = 0;
    }
};

C.editPrd = async (ctx) => {
    try {
        ctx.body = await Service.editPrd(ctx);
    } catch (e) {
        logger.error('[smcicc][editPrd]', e, ctx);
        ctx.body = 0;
    }
};

C.deletePrd = async (ctx) => {
    try {
        ctx.body = await Service.deletePrd(ctx);
    } catch (e) {
        logger.error('[smcicc][deletePrd]', e, ctx);
        ctx.body = { result: 0, prd: '' };
    }
};

C.loadAllPrd = async (ctx) => {
    try {
        ctx.body = await Service.loadAllPrd(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAllPrd]', e, ctx);
        ctx.body = [];
    }
};

C.copyPrd = async (ctx) => {
    try {
        ctx.body = await Service.copyPrd(ctx);
    } catch (e) {
        logger.error('[smcicc][copyPrd]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
