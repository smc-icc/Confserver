const axios = require('axios');

const LEGACY_BASE = (process.env.ICC_LEGACY_BASE_URL || '').replace(/\/$/, '');

function getCaptchaKey(userType) {
    return userType === 'vdn' ? 'smcicc_vdn_captcha' : 'smcicc_sys_captcha';
}

function normalizeUserType(userType) {
    const t = String(userType || '').toLowerCase();
    return t === 'sys' || t === 'vdn' ? t : '';
}

function extractLoginPayload(paramsObj) {
    const rawUser = paramsObj.user;
    let user = {};
    if (rawUser && typeof rawUser === 'string') {
        try {
            user = JSON.parse(rawUser);
        } catch (e) {
            user = {};
        }
    } else if (rawUser && typeof rawUser === 'object') {
        user = rawUser;
    }

    const workNo = user.workNo || user.workno || paramsObj.workNo || paramsObj.workerNo || '';
    const password = user.password || paramsObj.password || '';
    const vdnId = user.vdnId || paramsObj.vdnId || '';
    const captcha = paramsObj.captcha || '';

    return {
        workNo: String(workNo || ''),
        password: String(password || ''),
        vdnId: vdnId === '' ? '' : Number(vdnId),
        captcha: String(captcha || ''),
    };
}

async function legacyAuthenticate(payload) {
    if (!LEGACY_BASE) {
        return 1;
    }
    const form = new URLSearchParams();
    form.append('captcha', payload.captcha);
    form.append('workerNo', payload.workNo);
    form.append('password', payload.password);
    if (payload.vdnId !== '' && !Number.isNaN(payload.vdnId)) {
        form.append('vdnId', String(payload.vdnId));
    }

    const url = `${LEGACY_BASE}/authentication/login.action`;
    const res = await axios({
        method: 'post',
        url,
        data: form.toString(),
        headers: { 'Content-Type': 'application/x-www-form-urlencoded;charset=UTF-8' },
        responseType: 'text',
        transformResponse: [(d) => d],
        validateStatus: () => true,
    });

    const n = Number(String(res.data || '').trim());
    if (Number.isNaN(n)) {
        return 1;
    }
    return n;
}

module.exports = {
    getCaptchaKey,
    normalizeUserType,
    extractLoginPayload,
    legacyAuthenticate,
};
