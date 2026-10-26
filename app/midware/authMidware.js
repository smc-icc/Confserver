
const AuthService = require('../service/auth/AuthService');
const url = require('url');

//admin用户才能访问
module.exports = async (ctx, next) => {
    if (typeof process !== 'undefined' && process.env.CONF_TENANCY_ENABLED === '1') return require('../service/integration/ConfManagementAccess').enforce(ctx, next);

    var myurl = url.parse(ctx.url);

    if (myurl.pathname.indexOf('/pages/server/api/auth/page/') != -1) {
        if (!await AuthService.isAdmin(ctx.uid)) {
            ctx.makeResObj(500, '#common.noPrivilage#', {});
            return;
        }
    }

    if (ctx.uid && ctx.method === 'GET' && /\/smcicc\/community\/capabilities$/.test(ctx.path)) return next();
    if (String(ctx.uid || '').startsWith('conf-vdn:')) {
        const pathname = myurl.pathname;
        if (ctx.method === 'GET' && pathname === '/') {
            ctx.redirect('/tars.html#/smcicc/system/onboard');
            return;
        }
        if (ctx.method === 'GET' && pathname === '/pages/server/api/logout') {
            await next();
            return;
        }
        const managedApi = require('../service/integration/ManagedVdnApi');
        try {
            const allowed = await managedApi.authorize(ctx, pathname);
            if (allowed) { await managedApi.run(ctx, allowed, pathname, next); managedApi.sanitize(ctx, allowed.action); return; }
        } catch (e) {
            if (!e.status) throw e;
            ctx.status = e.status; ctx.body = { ret_code: e.status, err_msg: e.message }; return;
        }

        const safeRead = ctx.method === 'GET' && /\/(?:is_admin|isAdmin|get_auth_list|get_locale|get_login_uid|is_enable_login|isEnableLdap)$/.test(pathname);
        if (!/\/smcicc\/onboard\/(?:context|status|admin-password|first-agent|hotline|complete|create-vdn|provision-status|assign-admin|retry)$/.test(pathname) && !safeRead) {
            ctx.status = 403;
            ctx.body = { ret_code: 403, err_msg: '此入口尚未支持 VDN 隔离，请通过开通向导或 Omni 获授权功能操作' };
            return;
        }
    }
    await next();
}
