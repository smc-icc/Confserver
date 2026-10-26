const logger = require('../../../logger');
const Service = require('../../service/smcicc/McCfgService');

const C = {};

C.loadMcList = async (ctx) => {
    try {
        ctx.body = await Service.loadMcList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadMcList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addMc = async (ctx) => {
    try {
        ctx.body = await Service.addMc(ctx);
    } catch (e) {
        logger.error('[smcicc][addMc]', e, ctx);
        ctx.body = 0;
    }
};

C.editMc = async (ctx) => {
    try {
        ctx.body = await Service.editMc(ctx);
    } catch (e) {
        logger.error('[smcicc][editMc]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteMc = async (ctx) => {
    try {
        ctx.body = await Service.deleteMc(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteMc]', e, ctx);
        ctx.body = { result: 0 };
    }
};

C.loadAllMc = async (ctx) => {
    try {
        ctx.body = await Service.loadAllMc(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAllMc]', e, ctx);
        ctx.body = [];
    }
};

C.copyMc = async (ctx) => {
    try {
        ctx.body = await Service.copyMc(ctx);
    } catch (e) {
        logger.error('[smcicc][copyMc]', e, ctx);
        ctx.body = false;
    }
};

C.getIsx = async (ctx) => {
    try {
        ctx.body = await Service.getIsx(ctx);
    } catch (e) {
        logger.error('[smcicc][getIsx]', e, ctx);
        ctx.body = [];
    }
};

C.deleteBoardAndIsx = async (ctx) => {
    try {
        ctx.body = await Service.deleteBoardAndIsx(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteBoardAndIsx]', e, ctx);
        ctx.body = false;
    }
};

C.copyBoardAndIsx = async (ctx) => {
    try {
        ctx.body = await Service.copyBoardAndIsx(ctx);
    } catch (e) {
        logger.error('[smcicc][copyBoardAndIsx]', e, ctx);
        ctx.body = {};
    }
};

module.exports = C;
