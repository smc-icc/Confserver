const logger = require('../../../logger');
const Service = require('../../service/smcicc/Mc100Service');

const C = {};

C.loadMc100List = async (ctx) => {
    try {
        ctx.body = await Service.loadMc100List(ctx);
    } catch (e) {
        logger.error('[smcicc][loadMc100List]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addMc100 = async (ctx) => {
    try {
        ctx.body = await Service.addMc100(ctx);
    } catch (e) {
        logger.error('[smcicc][addMc100]', e, ctx);
        ctx.body = 0;
    }
};

C.modifyMc100 = async (ctx) => {
    try {
        ctx.body = await Service.modifyMc100(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyMc100]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteMc100 = async (ctx) => {
    try {
        ctx.body = await Service.deleteMc100(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteMc100]', e, ctx);
        ctx.body = false;
    }
};

C.copyMc100 = async (ctx) => {
    try {
        ctx.body = await Service.copyMc100(ctx);
    } catch (e) {
        logger.error('[smcicc][copyMc100]', e, ctx);
        ctx.body = 0;
    }
};

module.exports = C;
