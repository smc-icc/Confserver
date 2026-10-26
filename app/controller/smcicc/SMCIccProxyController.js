/**
 * ICC 配置中心迁移：兼容旧 Struts2 命名空间的 HTTP 代理与注册表查询。
 * 设置环境变量 ICC_LEGACY_BASE_URL（含应用 context，如 http://host:8080/smcicccfg）后，
 * /api/smcicc/proxy/* 会将请求转发到原 Java 应用，便于渐进替换为 Node 实现。
 */

const axios = require('axios');
const logger = require('../../../logger');
const strutsActions = require('../../service/smcicc/strutsActions.json');
const migrationOutline = require('../../service/smcicc/migrationOutline');

const LEGACY_BASE = (process.env.ICC_LEGACY_BASE_URL || '').replace(/\/$/, '');
/** 嵌入旧版 systemadmin/*.html 的静态根（默认同 ICC_LEGACY_BASE_URL，可单独设 ICC_LEGACY_UI_URL） */
const LEGACY_UI_BASE = (process.env.ICC_LEGACY_UI_URL || process.env.ICC_LEGACY_BASE_URL || '').replace(/\/$/, '');

function normalizeAction(name) {
    if (!name) return '';
    return String(name).replace(/\.action$/i, '');
}

function toFormBody(body) {
    if (body == null || Buffer.isBuffer(body)) return body;
    if (typeof body === 'string') return body;
    if (typeof body !== 'object') return String(body);
    const sp = new URLSearchParams();
    Object.keys(body).forEach((k) => {
        const v = body[k];
        if (v === undefined || v === null) return;
        if (typeof v === 'object') {
            sp.append(k, JSON.stringify(v));
        } else {
            sp.append(k, String(v));
        }
    });
    return sp.toString();
}

async function forwardToLegacy(ctx, namespace) {
    const action = normalizeAction(ctx.params.action);
    if (!action) {
        ctx.status = 400;
        ctx.body = { err: 'missing action' };
        return;
    }

    if (!/^[A-Za-z][A-Za-z0-9_]*$/.test(action)) {
        ctx.status = 400; ctx.body = { ret_code: 400, err_msg: '无效的旧版操作名称' }; return;
    }
    if (process.env.CONF_TENANCY_ENABLED === '1' && namespace === '/systemadmin' && action.toLowerCase() === 'addvdn') {
        ctx.status = 410; ctx.body = { ret_code: 410, err_msg: '请使用审核通过的管理员账号自行创建 VDN' }; return;
    }

    if (!LEGACY_BASE) {
        ctx.status = 503;
        ctx.body = {
            err: 'ICC_LEGACY_BASE_URL 未配置',
            action,
            namespace,
            hint: '迁移过渡期请指向原 Tomcat 应用根地址（含 context path）',
            registry: '/api/smcicc/registry',
        };
        return;
    }

    const targetUrl = `${LEGACY_BASE}${namespace}/${action}.action`;
    const method = (ctx.method || 'get').toLowerCase();
    const headers = {};

    const cookie = ctx.headers.cookie;
    if (cookie) headers.Cookie = cookie;

    try {
        const req = {
            method,
            url: targetUrl,
            validateStatus: () => true,
            maxRedirects: 0,
            responseType: 'text',
            transformResponse: [(data) => data],
            headers,
        };

        if (method === 'get' || method === 'head') {
            req.params = { ...ctx.query };
        } else {
            const ct = (ctx.headers['content-type'] || '').toLowerCase();
            if (ct.includes('application/json')) {
                headers['Content-Type'] = 'application/json;charset=UTF-8';
                req.data = ctx.request.body;
            } else {
                headers['Content-Type'] = 'application/x-www-form-urlencoded;charset=UTF-8';
                req.data = toFormBody(ctx.request.body);
            }
        }

        const res = await axios(req);
        ctx.status = res.status;

        const resCt = res.headers['content-type'] || '';
        if (resCt.includes('application/json') || (typeof res.data === 'string' && res.data.trim().startsWith('{'))) {
            ctx.set('Content-Type', 'application/json; charset=utf-8');
            try {
                ctx.body = typeof res.data === 'string' ? JSON.parse(res.data) : res.data;
            } catch (e) {
                ctx.set('Content-Type', resCt || 'text/plain; charset=utf-8');
                ctx.body = res.data;
            }
        } else {
            if (resCt) ctx.set('Content-Type', resCt);
            ctx.body = res.data;
        }

        const setCookie = res.headers['set-cookie'];
        if (setCookie) ctx.set('Set-Cookie', setCookie);
    } catch (e) {
        logger.error('[SMCIccProxy]', e.message, targetUrl);
        ctx.status = 502;
        ctx.body = { err: 'proxy_failed', message: e.message, targetUrl };
    }
}

const Controller = {};

Controller.registry = async (ctx) => {
    ctx.makeResObj(200, '', {
        legacyBaseConfigured: !!LEGACY_BASE,
        legacyUiBase: LEGACY_UI_BASE,
        legacyUiConfigured: !!LEGACY_UI_BASE,
        /** 与 smciccconfig webapp/systemadmin 下路径拼接：${legacyUiBase}/systemadmin/${path} */
        legacySystemadminWebPrefix: LEGACY_UI_BASE ? `${LEGACY_UI_BASE}/systemadmin/` : '',
        strutsActions,
        migrationOutline,
        proxyPaths: {
            vdnadmin: '/api/smcicc/proxy/vdnadmin/:action',
            systemadmin: '/api/smcicc/proxy/systemadmin/:action',
            authentication: '/api/smcicc/proxy/authentication/:action',
        },
        legacyWebStatic: migrationOutline.legacyWebRelativePaths,
        /** 与 smcicccfg.properties Kamailio 库一致，供 SIP 分机页预填（可选环境变量） */
        kamailioDbDefaults: {
            ip: process.env.ICC_KAMAILIO_DB_HOST || '',
            port: process.env.ICC_KAMAILIO_DB_PORT || '3306',
            dbName: process.env.ICC_KAMAILIO_DB_NAME || '',
            userName: process.env.ICC_KAMAILIO_DB_USER || '',
            password: process.env.ICC_KAMAILIO_DB_PASSWORD || '',
        },
    });
};

Controller.proxyVdnadmin = async (ctx) => {
    await forwardToLegacy(ctx, '/vdnadmin');
};

Controller.proxySystemadmin = async (ctx) => {
    await forwardToLegacy(ctx, '/systemadmin');
};

Controller.proxyAuthentication = async (ctx) => {
    await forwardToLegacy(ctx, '/authentication');
};

module.exports = Controller;
