const captcha = require('svg-captcha');
const logger = require('../../../logger');
const {
    getCaptchaKey,
    normalizeUserType,
    extractLoginPayload,
    legacyAuthenticate,
} = require('../../service/smcicc/AuthenticationService');

const Controller = {};

Controller.getCaptcha = async (ctx) => {
    try {
        const userType = normalizeUserType(ctx.paramsObj.userType || ctx.query.userType);
        if (!userType) {
            ctx.status = 400;
            ctx.body = '';
            return;
        }
        const cap = captcha.createMathExpr({
            size: 4,
            ignoreChars: '0o1i',
            noise: 2,
            color: true,
            background: '#cc9966',
            mathMin: 1,
            mathMax: 9,
        });
        ctx.session[getCaptchaKey(userType)] = String(cap.text || '').toLowerCase();
        ctx.set('Content-Type', 'image/svg+xml');
        ctx.body = cap.data;
    } catch (e) {
        logger.error('[smcicc][getCaptcha]', e, ctx);
        ctx.status = 500;
        ctx.body = '';
    }
};

Controller.login = async (ctx) => {
    try {
        const payload = extractLoginPayload(ctx.paramsObj || {});
        const isSysUser = payload.vdnId === '' || Number.isNaN(payload.vdnId);
        const userType = isSysUser ? 'sys' : 'vdn';
        const capKey = getCaptchaKey(userType);
        const expectCaptcha = String(ctx.session[capKey] || '').toLowerCase();

        if (!payload.workNo || !payload.password || !payload.captcha) {
            ctx.body = 1;
            return;
        }
        if (!expectCaptcha || payload.captcha.toLowerCase() !== expectCaptcha) {
            ctx.body = 5;
            return;
        }

        // 先保证与旧系统登录结果兼容：优先走旧库认证，后续再切本地 DAO 校验。
        const result = await legacyAuthenticate(payload);
        if (result === 0) {
            if (isSysUser) {
                ctx.session.smcicc_sys_work_no = payload.workNo;
                ctx.session.smcicc_sys_work_name = payload.workNo;
            } else {
                ctx.session.smcicc_vdn_work_no = payload.workNo;
                ctx.session.smcicc_vdn_work_name = payload.workNo;
                ctx.session.smcicc_vdn_id = payload.vdnId;
            }
        }
        ctx.body = result;
    } catch (e) {
        logger.error('[smcicc][login]', e, ctx);
        ctx.body = 1;
    }
};

Controller.getSysUserInfo = async (ctx) => {
    ctx.body = ctx.session.smcicc_sys_work_name || ctx.uid || '';
};

Controller.getVdnUserInfo = async (ctx) => {
    ctx.body = ctx.session.smcicc_vdn_work_name || ctx.uid || '';
};

Controller.sysUserLogout = async (ctx) => {
    ctx.session.smcicc_sys_work_no = null;
    ctx.session.smcicc_sys_work_name = null;
    ctx.redirect('/systemadmin/login');
};

Controller.vdnUserLogout = async (ctx) => {
    ctx.session.smcicc_vdn_work_no = null;
    ctx.session.smcicc_vdn_work_name = null;
    ctx.session.smcicc_vdn_id = null;
    ctx.redirect('/vdnadmin/login');
};

module.exports = Controller;
