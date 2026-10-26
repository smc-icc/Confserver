const logger = require('../../../logger');
const Service = require('../../service/smcicc/DtiBoardService');

const C = {};

C.loadDtiBoardList = async (ctx) => {
    try {
        ctx.body = await Service.loadDtiBoardList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadDtiBoardList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addDtiBoard = async (ctx) => {
    try {
        ctx.body = await Service.addDtiBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][addDtiBoard]', e, ctx);
        ctx.body = 0;
    }
};

C.editDtiBoard = async (ctx) => {
    try {
        ctx.body = await Service.editDtiBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][editDtiBoard]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteDtiBoard = async (ctx) => {
    try {
        ctx.body = await Service.deleteDtiBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteDtiBoard]', e, ctx);
        ctx.body = 0;
    }
};

C.copyDtiBoard = async (ctx) => {
    try {
        ctx.body = await Service.copyDtiBoard(ctx);
    } catch (e) {
        logger.error('[smcicc][copyDtiBoard]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
