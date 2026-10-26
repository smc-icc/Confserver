const logger = require('../../../logger');
const Service = require('../../service/smcicc/OdbcService');

const Controller = {};

Controller.loadOdbcList = async (ctx) => {
    try {
        ctx.body = await Service.loadOdbcList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadOdbcList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.getOdbcList = async (ctx) => {
    try {
        ctx.body = await Service.getOdbcList(ctx);
    } catch (e) {
        logger.error('[smcicc][getOdbcList]', e, ctx);
        ctx.body = [];
    }
};

Controller.addOdbc = async (ctx) => {
    try {
        ctx.body = await Service.addOdbc(ctx);
    } catch (e) {
        logger.error('[smcicc][addOdbc]', e, ctx);
        ctx.body = -1;
    }
};

Controller.editOdbc = async (ctx) => {
    try {
        ctx.body = await Service.editOdbc(ctx);
    } catch (e) {
        logger.error('[smcicc][editOdbc]', e, ctx);
        ctx.body = -1;
    }
};

Controller.deleteOdbc = async (ctx) => {
    try {
        ctx.body = await Service.deleteOdbc(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteOdbc]', e, ctx);
        ctx.body = false;
    }
};

Controller.copyOdbc = async (ctx) => {
    try {
        ctx.body = await Service.copyOdbc(ctx);
    } catch (e) {
        logger.error('[smcicc][copyOdbc]', e, ctx);
        ctx.body = false;
    }
};

module.exports = Controller;
