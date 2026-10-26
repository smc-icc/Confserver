const logger = require('../../../logger');
const Service = require('../../service/smcicc/IsxService');

const C = {};

C.loadIsxList = async (ctx) => {
    try {
        ctx.body = await Service.loadIsxList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadIsxList]', e, ctx);
        ctx.body = [];
    }
};

C.addIsx = async (ctx) => {
    try {
        ctx.body = await Service.addIsx(ctx);
    } catch (e) {
        logger.error('[smcicc][addIsx]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteIsx = async (ctx) => {
    try {
        ctx.body = await Service.deleteIsx(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteIsx]', e, ctx);
        ctx.body = 0;
    }
};

C.copyIsx = async (ctx) => {
    try {
        ctx.body = await Service.copyIsx(ctx);
    } catch (e) {
        logger.error('[smcicc][copyIsx]', e, ctx);
        ctx.body = 0;
    }
};

module.exports = C;
