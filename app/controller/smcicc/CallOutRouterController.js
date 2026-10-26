const logger = require('../../../logger');
const Service = require('../../service/smcicc/CallOutRouterService');

const C = {};

C.loadCallOutRouterList = async (ctx) => {
    try {
        ctx.body = await Service.loadCallOutRouterList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadCallOutRouterList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addCallOutRouter = async (ctx) => {
    try {
        ctx.body = await Service.addCallOutRouter(ctx);
    } catch (e) {
        logger.error('[smcicc][addCallOutRouter]', e, ctx);
        ctx.body = 0;
    }
};

C.editCallOutRouter = async (ctx) => {
    try {
        ctx.body = await Service.editCallOutRouter(ctx);
    } catch (e) {
        logger.error('[smcicc][editCallOutRouter]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteCallOutRouter = async (ctx) => {
    try {
        ctx.body = await Service.deleteCallOutRouter(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteCallOutRouter]', e, ctx);
        ctx.body = -1;
    }
};

module.exports = C;
