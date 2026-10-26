/**
 * Tencent is pleased to support the open source community by making Tars available.
 *
 * Copyright (C) 2016THL A29 Limited, a Tencent company. All rights reserved.
 *
 * Licensed under the BSD 3-Clause License (the "License"); you may not use this file except
 * in compliance with the License. You may obtain a copy of the License at
 *
 * https://opensource.org/licenses/BSD-3-Clause
 *
 * Unless required by applicable law or agreed to in writing, software distributed
 * under the License is distributed on an "AS IS" BASIS, WITHOUT WARRANTIES OR
 * CONDITIONS OF ANY KIND, either express or implied. See the License for the
 * specific language governing permissions and limitations under the License.
 */

const Koa = require('koa');
const app = new Koa();
const path = require('path');
const url = require('url');
const onerror = require('./midware/errorHandler');
const session = require('koa-session');
const static = require('koa-static');
const helmet = require("koa-helmet");
const staticRouter = require('koa-static-router');

const WebConf = require('./config/webConf');
const logger = require('./logger');

const localeMidware = require('./midware/localeMidware');
const loginMidware = require('./midware/ssoMidware');
const limitMidware = require('./midware/limitMidware');

const AuthService = require('./sso/service/auth/AuthService');
const PluginController = require('./plugin/controller/PluginController');
//信任proxy头部，支持 X-Forwarded-Host
app.proxy = true;

// error handler
onerror(app);

//防洪水攻击
app.use(limitMidware());

//验证码
const CONFIG = {
    key: 'koa:sess',
    maxAge: 1000 * 60 * 60 * 12, // 12小时, 设置 session 的有效时间，单位毫秒
    autoCommit: true,
    overwrite: true,
    httpOnly: true,
    signed: true,
    rolling: false,
    renew: false,
}
app.keys = ['sessionCaptcha']

app.use(session(CONFIG, app));

//安全防护
app.use(helmet());

//国际化多语言中间件
app.use(localeMidware);

const xmlCurlRouter = require('./app/xmlCurlRouter');
const sbcRouteRouter = require('./app/sbcRouteRouter');
const { notFound: xmlCurlNotFound } = require('./app/service/smcicc/xmlCurlCommon');
app.use(async (ctx, next) => {
    if (ctx.path.indexOf('/xml_curl') !== 0) {
        return next();
    }
    // FS still hits this URL when opening conference.conf because
    // switch_xml_parse_section_string() always ORs the "result" bit.
    // Never 302/HTML here — mod_xml_curl follows redirects and then stalls on parse.
    ctx.type = 'text/xml; charset=utf-8';
    try {
        await xmlCurlRouter.routes()(ctx, async () => {
            ctx.body = xmlCurlNotFound();
        });
    } catch (e) {
        logger.error('[xml_curl]', e);
        ctx.body = xmlCurlNotFound();
    }
});

app.use(async (ctx, next) => {
    if (ctx.path !== '/internal/sbc/route') return next();
    try {
        await sbcRouteRouter.routes()(ctx, async () => {
            ctx.status = 404;
            ctx.body = { action: 'deny', status: 404, reason: 'denied' };
        });
    } catch (e) {
        logger.error('[sbc-route]', e);
        ctx.status = 503;
        ctx.body = { action: 'deny', status: 503, reason: 'unavailable' };
    }
});

//app.use
//登录校验
let loginConf = require('./config/loginConf.js');
loginConf.ignore = loginConf.ignore.concat(['/web', '/static', '/files', '/get_tarsnode', '/install.sh', '/favicon.ico', '/favicon.svg']);
loginConf.ignore = loginConf.ignore.concat(['/adminPass.html', '/login.html', '/pages/server/api/adminModifyPass', '/pages/server/api/get_locale', '/pages/server/api/login', '/pages/server/api/isEnableLdap', '/pages/plugin/api/install', '/pages/server/api/authList', '/pages/server/api/ticket']);
loginConf.ignore = loginConf.ignore.concat(['/pages/server/api/smcicc/authentication/getCaptcha', '/pages/server/api/smcicc/authentication/login', '/api/smcicc/authentication/getCaptcha', '/api/smcicc/authentication/login']);
loginConf.ignore = loginConf.ignore.concat(['/api/integrations', '/integrations.html']);
loginConf.ignore = loginConf.ignore.concat([
    '/xml_curl',
    '/xml_curl/directory',
    '/xml_curl/dialplan',
    '/xml_curl/configuration',
    '/internal/sbc/route',
]);

//不需要登录, 环境变量优先
if (process.env.TARS_ENABLE_LOGIN == "false") {
    loginConf.enableLogin = false;
}

require('./app/service/integration/ConfTenancySafety').configureManagedLogin(loginConf);

app.use(async (ctx, next) => {

    if (process.env.TARS_HAS_EXPIRE == 'true') {
        logger.error("expire:", process.env.TARS_HAS_EXPIRE);
        ctx.body = "The system has expired, please renew...";
        return;
    }

    var myurl = url.parse(ctx.url);

    if (!await AuthService.isActivated()) {

        if ((myurl.pathname.lastIndexOf('.html') != -1 || myurl.pathname == '/') && myurl.pathname != '/adminPass.html') {

            logger.info('/adminPass.html?redirect_url=' + encodeURIComponent(ctx.url));
            ctx.redirect('/adminPass.html?redirect_url=' + encodeURIComponent(ctx.url));
            return;
        }

    } else if (myurl.pathname == '/adminPass.html') {

        ctx.redirect(myurl.pathname);
        return;
    }

    await next();
});

app.use(require('./app/service/community/http').runtimeMiddleware());
app.use(loginMidware(loginConf));


//安装包资源中间件
app.use(staticRouter([{
    dir: './files', //静态资源目录对于相对入口文件index.js的路径
    router: '/files' //路由命名
}]));

//激活router
if (WebConf.isEnableK8s()) {
    require('./k8s');
}

app.use(async (ctx, next) => {

    ctx.cookies.set('enable', WebConf.enable ? "true" : "false", {
        httpOnly: false
    });
    ctx.cookies.set('show', (WebConf.enable && WebConf.show) ? "true" : "false", {
        httpOnly: false
    });
    ctx.cookies.set('k8s', WebConf.isEnableK8s() ? "true" : "false", {
        httpOnly: false
    });

    await next();

})

//激活router
// dcache 会添加新的 page、api router， 不能提前
const {
    indexRouter,
    pageRouter,
    pageApiRouter,
    clientRouter,
    apiRouter,
    k8sRouter,
    k8sApiRouter,
    pluginApiRouter,
    marketApiRouter
} = require('./midware');

app.use(indexRouter.routes(), indexRouter.allowedMethods({
    throw: true
}));
app.use(pageRouter.routes(), pageRouter.allowedMethods({
    throw: true
}));
app.use(pageApiRouter.routes(), pageApiRouter.allowedMethods({
    throw: true
}));
app.use(clientRouter.routes(), clientRouter.allowedMethods({
    throw: true
}));
app.use(apiRouter.routes(), apiRouter.allowedMethods({
    throw: true
}));
if (k8sRouter) {
    app.use(k8sRouter.routes()).use(k8sRouter.allowedMethods());
}
if (k8sApiRouter) {
    app.use(k8sApiRouter.routes()).use(k8sApiRouter.allowedMethods());
}

app.use(pluginApiRouter.routes()).use(pluginApiRouter.allowedMethods());
app.use(marketApiRouter.routes()).use(marketApiRouter.allowedMethods());

// HTML 入口不做强缓存：tars.html 里引用的 bundle 带内容 hash，
// 若 HTML 本身被缓存 7 天，前端重新构建后浏览器仍会去加载旧 bundle（看起来“没变化”）。
// 静态资源仍沿用下面的长缓存，因为文件名带 hash。
app.use(async (ctx, next) => {
    await next();
    if (ctx.path === '/' || ctx.path.endsWith('.html')) {
        ctx.set('Cache-Control', 'no-cache, no-store, must-revalidate');
        ctx.set('Pragma', 'no-cache');
    }
});

//激活静态资源中间件
app.use(static(path.join(__dirname, './client/dist'), {
    maxage: 7 * 24 * 60 * 60 * 1000
}));


PluginController.loadPlugins(app).catch((e) => {
    logger.error('[PluginController.loadPlugins]', e.message || e);
});

if (process.env.CONF_TENANCY_ENABLED === '1') require('./app/service/integration/VdnRegistrationNotifications').start();

module.exports = app;