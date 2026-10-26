const logger = require('../../../logger');
const Service = require('../../service/smcicc/AccessMachineService');

const Controller = {};

Controller.loadAccessMachineList = async (ctx) => {
    try {
        ctx.body = await Service.loadAccessMachineList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAccessMachineList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addAccessMachine = async (ctx) => {
    try {
        ctx.body = await Service.addAccessMachine(ctx);
    } catch (e) {
        logger.error('[smcicc][addAccessMachine]', e, ctx);
        ctx.body = 0;
    }
};

Controller.modifyAccessMachine = async (ctx) => {
    try {
        ctx.body = await Service.modifyAccessMachine(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyAccessMachine]', e, ctx);
        ctx.body = 0;
    }
};

Controller.copyAccessMachine = async (ctx) => {
    try {
        ctx.body = await Service.copyAccessMachine(ctx);
    } catch (e) {
        logger.error('[smcicc][copyAccessMachine]', e, ctx);
        ctx.body = 0;
    }
};

Controller.deleteAccessMachine = async (ctx) => {
    try {
        ctx.body = await Service.deleteAccessMachine(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteAccessMachine]', e, ctx);
        ctx.body = false;
    }
};

module.exports = Controller;
