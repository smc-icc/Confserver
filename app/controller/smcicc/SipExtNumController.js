const logger = require('../../../logger');
const Service = require('../../service/smcicc/SipExtNumService');

const C = {};

C.connectionDB = async (ctx) => {
    try {
        ctx.body = await Service.connectionDB(ctx);
    } catch (e) {
        logger.error('[smcicc][connectionDB]', e, ctx);
        ctx.body = { Rows: [], Total: 0, isConnection: false };
    }
};

C.sIPExtNumList = async (ctx) => {
    try {
        ctx.body = await Service.sIPExtNumList(ctx);
    } catch (e) {
        logger.error('[smcicc][sIPExtNumList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addSIPExtNum = async (ctx) => {
    try {
        ctx.body = await Service.addSIPExtNum(ctx);
    } catch (e) {
        logger.error('[smcicc][addSIPExtNum]', e, ctx);
        ctx.body = { result: -1, id: 0 };
    }
};

C.copySIPExtNum = async (ctx) => {
    try {
        ctx.body = await Service.copySIPExtNum(ctx);
    } catch (e) {
        logger.error('[smcicc][copySIPExtNum]', e, ctx);
        ctx.body = { result: 0, id: 0 };
    }
};

C.modifySIPExtNum = async (ctx) => {
    try {
        ctx.body = await Service.modifySIPExtNum(ctx);
    } catch (e) {
        logger.error('[smcicc][modifySIPExtNum]', e, ctx);
        ctx.body = { result: 0, id: 0 };
    }
};

C.deleteSubscriber = async (ctx) => {
    try {
        ctx.body = await Service.deleteSubscriber(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteSubscriber]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
