const logger = require('../../../logger');
const Service = require('../../service/smcicc/ChannelService');

const C = {};

C.loadChannelList = async (ctx) => {
    try {
        ctx.body = await Service.loadChannelList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadChannelList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addChannel = async (ctx) => {
    try {
        ctx.body = await Service.addChannel(ctx);
    } catch (e) {
        logger.error('[smcicc][addChannel]', e, ctx);
        ctx.body = 0;
    }
};

C.editChannel = async (ctx) => {
    try {
        ctx.body = await Service.editChannel(ctx);
    } catch (e) {
        logger.error('[smcicc][editChannel]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteChannel = async (ctx) => {
    try {
        ctx.body = await Service.deleteChannel(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteChannel]', e, ctx);
        ctx.body = false;
    }
};

C.copyChannel = async (ctx) => {
    try {
        ctx.body = await Service.copyChannel(ctx);
    } catch (e) {
        logger.error('[smcicc][copyChannel]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
