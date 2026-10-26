const logger = require('../../../logger');
const Service = require('../../service/smcicc/SipBoardService');

const C = {};

C.loadSipBoardList = async (ctx) => {
    try {
        ctx.body = await Service.loadSipBoardList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadSipBoardList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addSipBoard = async (ctx) => {
    try {
        ctx.body = await Service.addSipBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][addSipBoard]', e, ctx);
        ctx.body = 0;
    }
};

C.editSipBoard = async (ctx) => {
    try {
        ctx.body = await Service.editSipBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][editSipBoard]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteSipBoard = async (ctx) => {
    try {
        ctx.body = await Service.deleteSipBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteSipBoard]', e, ctx);
        ctx.body = false;
    }
};

C.copySipBoard = async (ctx) => {
    try {
        ctx.body = await Service.copySipBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][copySipBoard]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
