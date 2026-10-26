const logger = require('../../../logger');
const Service = require('../../service/smcicc/AgentUserService');

const C = {};

C.loadUserInfo = async (ctx) => {
    try {
        ctx.body = await Service.loadUserInfo(ctx);
    } catch (e) {
        logger.error('[smcicc][loadUserInfo]', e, ctx);
        ctx.body = { Rows: [], Total: 0 };
    }
};

C.addUserInfo = async (ctx) => {
    try {
        ctx.body = await Service.addUserInfo(ctx);
    } catch (e) {
        if (e.videoConfig) {
            ctx.body = { error_code: e.status || 400, err_msg: e.message };
            return;
        }
        // SQL errors and request context may contain write-only SIP passwords.
        logger.error('[smcicc][addUserInfo] failed');
        ctx.body = 0;
    }
};

C.editUserInfo = async (ctx) => {
    try {
        ctx.body = await Service.editUserInfo(ctx);
    } catch (e) {
        if (e.videoConfig) {
            ctx.body = { error_code: e.status || 400, err_msg: e.message };
            return;
        }
        // SQL errors and request context may contain write-only SIP passwords.
        logger.error('[smcicc][editUserInfo] failed');
        ctx.body = 0;
    }
};

C.setAgentValid = async (ctx) => {
    try {
        ctx.body = await Service.setAgentValid(ctx);
    } catch (e) {
        logger.error('[smcicc][setAgentValid]', e, ctx);
        ctx.body = 0;
    }
};

C.deleteUserInfo = async (ctx) => {
    try {
        ctx.body = await Service.deleteUserInfo(ctx);
    } catch (e) {
        logger.error('[smcicc][deleteUserInfo]', e, ctx);
        ctx.body = false;
    }
};

module.exports = C;
