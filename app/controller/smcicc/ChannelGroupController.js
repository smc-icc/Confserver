const logger = require('../../../logger');
const Service = require('../../service/smcicc/ChannelGroupService');

const C = {};

C.loadChannelGroupList = async (ctx) => {
    try {
        ctx.body = await Service.loadChannelGroupList(ctx);
    } catch (e) {
        logger.error('[smcicc][loadChannelGroupList]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addChannelGroup = async (ctx) => {
    try {
        ctx.body = await Service.addChannelGroup(ctx);
    } catch (e) {
        logger.error('[smcicc][addChannelGroup]', e, ctx);
        ctx.body = 0;
    }
};

C.editChannelGroup = async (ctx) => {
    try {
        ctx.body = await Service.editChannelGroup(ctx);
    } catch (e) {
        logger.error('[smcicc][editChannelGroup]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteChannelGroup = async (ctx) => {
    try {
        ctx.body = await Service.deleteChannelGroup(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteChannelGroup]', e, ctx);
        ctx.body = {
            result: -1,
            successCount: 0,
            failCount: 0,
            existChannelGroupList: [],
        };
    }
};

C.copyChannelGroup = async (ctx) => {
    try {
        ctx.body = await Service.copyChannelGroup(ctx);
    } catch (e) {
        logger.error('[smcicc][copyChannelGroup]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
