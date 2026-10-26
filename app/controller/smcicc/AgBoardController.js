const logger = require('../../../logger');
const Service = require('../../service/smcicc/AgBoardService');

const C = {};

C.loadAgBoardList = async (ctx) => {
    try {
        ctx.body = await Service.loadAgBoardList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAgBoardList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addAgBoard = async (ctx) => {
    try {
        ctx.body = await Service.addAgBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][addAgBoard]', e, ctx);
        ctx.body = 0;
    }
};

C.editAgBoard = async (ctx) => {
    try {
        ctx.body = await Service.editAgBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][editAgBoard]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteAgBoard = async (ctx) => {
    try {
        ctx.body = await Service.deleteAgBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteAgBoard]', e, ctx);
        ctx.body = 0;
    }
};

C.copyAgBoard = async (ctx) => {
    try {
        ctx.body = await Service.copyAgBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][copyAgBoard]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
