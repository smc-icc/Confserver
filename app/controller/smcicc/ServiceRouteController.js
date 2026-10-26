const logger = require('../../../logger');
const Service = require('../../service/smcicc/ServiceRouteService');

const Controller = {};

Controller.loadServiceRouteList = async (ctx) => {
    try {
        ctx.body = await Service.loadServiceRouteList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadServiceRouteList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

Controller.addServiceRoute = async (ctx) => {
    try {
        ctx.body = await Service.addServiceRoute(ctx);
    } catch (e) {
        logger.error('[smcicc][addServiceRoute]', e, ctx);
        ctx.body = 0;
    }
};

Controller.modifyServiceRoute = async (ctx) => {
    try {
        ctx.body = await Service.modifyServiceRoute(ctx);
    } catch (e) {
        logger.error('[smcicc][modifyServiceRoute]', e, ctx);
        ctx.body = 0;
    }
};

Controller.setServiceRouteValid = async (ctx) => {
    try {
        ctx.body = await Service.setServiceRouteValid(ctx);
    } catch (e) {
        logger.error('[smcicc][setServiceRouteValid]', e, ctx);
        ctx.body = 0;
    }
};

Controller.deleteServiceRoutes = async (ctx) => {
    try {
        ctx.body = await Service.deleteServiceRoutes(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteServiceRoutes]', e, ctx);
        ctx.body = false;
    }
};

Controller.copyServiceRoute = async (ctx) => {
    try {
        ctx.body = await Service.copyServiceRoute(ctx);
    } catch (e) {
        logger.error('[smcicc][copyServiceRoute]', e, ctx);
        ctx.body = false;
    }
};

Controller.loadUserList = async (ctx) => {
    try {
        ctx.body = await Service.loadUserList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadUserList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadAccessCodeListByVdnSelf = async (ctx) => {
    try {
        ctx.body = await Service.loadAccessCodeListByVdnSelf(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAccessCodeListByVdnSelf]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadAgentGroupList = async (ctx) => {
    try {
        ctx.body = await Service.loadAgentGroupList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAgentGroupList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadTrunkGroupList = async (ctx) => {
    try {
        ctx.body = await Service.loadTrunkGroupList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadTrunkGroupList]', e, ctx);
        ctx.body = [];
    }
};

Controller.loadIvrFlowList = async (ctx) => {
    try {
        ctx.body = await Service.loadIvrFlowList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadIvrFlowList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

module.exports = Controller;
