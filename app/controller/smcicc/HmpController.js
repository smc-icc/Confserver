const logger = require('../../../logger');
const Service = require('../../service/smcicc/HmpService');

const C = {};

C.loadHmpList = async (ctx) => {
    try {
        ctx.body = await Service.loadHmpList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadHmpList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addHmp = async (ctx) => {
    try {
        ctx.body = await Service.addHmp(ctx);
    } catch (e) {
        logger.error('[smcicc][addHmp]', e, ctx);
        ctx.body = 0;
    }
};

C.editHmp = async (ctx) => {
    try {
        ctx.body = await Service.editHmp(ctx);
    } catch (e) {
        logger.error('[smcicc][editHmp]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteHmp = async (ctx) => {
    try {
        ctx.body = await Service.deleteHmp(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteHmp]', e, ctx);
        ctx.body = false;
    }
};

C.copyHmp = async (ctx) => {
    try {
        ctx.body = await Service.copyHmp(ctx);
    } catch (e) {
        logger.error('[smcicc][copyHmp]', e, ctx);
        ctx.body = false;
    }
};

C.getHmpByPid = async (ctx) => {
    try {
        ctx.body = await Service.getHmpByPid(ctx);
    } catch (e) {
        logger.error('[smcicc][getHmpByPid]', e, ctx);
        ctx.body = [];
    }
};

C.loadAllHmp = async (ctx) => {
    try {
        ctx.body = await Service.loadAllHmp(ctx);
    } catch (e) {
        logger.error('[smcicc][loadAllHmp]', e, ctx);
        ctx.body = [];
    }
};

C.getCountByMyId = async (ctx) => {
    try {
        ctx.body = await Service.getCountByMyId(ctx);
    } catch (e) {
        logger.error('[smcicc][getCountByMyId]', e, ctx);
        ctx.body = 0;
    }
};

C.deployHmpXML = async (ctx) => {
    try {
        ctx.body = await Service.deployHmpXML(ctx);
    } catch (e) {
        logger.error('[smcicc][deployHmpXML]', e, ctx);
        ctx.body = { result: false, msg: '发布XML异常' };
    }
};

module.exports = C;
