const logger = require('../../../logger');
const Service = require('../../service/smcicc/TelAgentService');

const Controller = {};

Controller.loadTelAgentList = async (ctx) => {
    try {
        ctx.body = await Service.loadTelAgentList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTelAgentList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addTelAgent = async (ctx) => {
    try {
        ctx.body = await Service.addTelAgent(ctx);
    } catch (e) {
        logger.error('[smcicc][addTelAgent]', e, ctx);
        ctx.body = 0;
    }
};

Controller.editTelAgent = async (ctx) => {
    try {
        ctx.body = await Service.editTelAgent(ctx);
    } catch (e) {
        logger.error('[smcicc][editTelAgent]', e, ctx);
        ctx.body = 0;
    }
};

Controller.deleteTelAgent = async (ctx) => {
    try {
        ctx.body = await Service.deleteTelAgent(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteTelAgent]', e, ctx);
        ctx.body = false;
    }
};

Controller.copyTelAgent = async (ctx) => {
    try {
        ctx.body = await Service.copyTelAgent(ctx);
    } catch (e) {
        logger.error('[smcicc][copyTelAgent]', e, ctx);
        ctx.body = false;
    }
};

Controller.loadCcsList = async (ctx) => {
    try {
        ctx.body = await Service.loadCcsList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadCcsList][telAgent]', e, ctx);
        ctx.body = [];
    }
};

Controller.deployTelAgentXML = async (ctx) => {
    try {
        ctx.body = await Service.deployTelAgentXML(ctx);
    } catch (e) {
        logger.error('[smcicc][deployTelAgentXML]', e, ctx);
        ctx.body = { result: false, msg: '发布XML异常' };
    }
};

module.exports = Controller;
