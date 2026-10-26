'use strict';

const config = require('../../service/smcicc/SbcDomainConfig');

function createController(store = config) {
    function denied(ctx) {
        ctx.status = 403;
        ctx.body = { ret_code: 403, err_msg: '仅超级管理员可管理 SBC 域名' };
    }

    return {
        async get(ctx) {
            ctx.set('Cache-Control', 'no-store');
            if (ctx.uid !== 'admin') return denied(ctx);
            try {
                ctx.body = { ret_code: 200, data: store.view() };
            } catch (error) {
                ctx.status = error.status || 503;
                ctx.body = { ret_code: ctx.status, err_msg: 'SBC 域名配置暂不可用' };
            }
        },
        async save(ctx) {
            ctx.set('Cache-Control', 'no-store');
            if (ctx.uid !== 'admin') return denied(ctx);
            try {
                ctx.body = { ret_code: 200, data: store.save(ctx.request.body || {}) };
            } catch (error) {
                const status = error.status === 400 ? 400 : 503;
                ctx.status = status;
                ctx.body = { ret_code: status, err_msg: status === 400 ? error.message : 'SBC 域名配置暂不可用' };
            }
        },
    };
}

module.exports = { ...createController(), createController };
