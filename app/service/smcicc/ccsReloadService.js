/**
 * ConfServer 改 VDN / 服务路由后通知 CCS 整表刷内存。
 * 通知失败不回滚库写入；CCS 约 5 分钟定时刷新兜底。
 */

const logger = require('../../../logger');
const { adminRegPrx, ccsAdminPrx, ccsAdminStruct } = require('../util/rpcClient');
const ServerDao = require('../../dao/ServerDao');
const { CCS_APPLICATION, CCS_SERVER, resolveCcsObjs } = require('./ccsAdminResolver');

const RPC_TIMEOUT_MS = 8000;
const SCOPE_VDN = 0;
const SCOPE_VDN_AND_ROUTES = 1;

function makeReq(scope, vdnId, reason) {
    const req = new ccsAdminStruct.stReloadVdnConfigReq_t();
    req.readFromObject({
        scope: Number(scope) || 0,
        vdnId: Number(vdnId) || 0,
        reason: String(reason || ''),
    });
    return req;
}

async function notifyNode(target, scope, vdnId, reason) {
    const base = { nodeName: target.nodeName, ccsObj: target.ccsObj };
    if (!target.ccsObj) {
        return { ...base, ok: false, errors: [{ code: -1, message: target.error || 'CCSObj 不可用' }] };
    }
    const prx = ccsAdminPrx(target.ccsObj);
    prx.setTimeout(RPC_TIMEOUT_MS);
    try {
        const res = await prx.DoReloadVdnConfig(makeReq(scope, vdnId, reason));
        const rsp = res.rsp || {};
        const ok = Number(res.__return) === 0 && Number(rsp.err || 0) === 0;
        return {
            ...base,
            ok,
            err: rsp.err,
            errMsg: rsp.errMsg,
            errors: ok ? [] : [{ code: Number(rsp.err || -2), message: String(rsp.errMsg || 'reload failed') }],
        };
    } catch (e) {
        logger.error('[ccsReloadService] RPC failed node=%s obj=%s', target.nodeName, target.ccsObj, e);
        return { ...base, ok: false, errors: [{ code: -2, message: String(e.message || e) }] };
    }
}

async function notifyViaAdminReg(scope, reason) {
    const rows = await ServerDao.getServerConfList(CCS_APPLICATION, CCS_SERVER);
    const list = Array.isArray(rows) ? rows : [];
    const command = Number(scope) >= 1 ? 'reload-config' : 'reload-vdn';
    const nodes = [];
    for (const row of list) {
        const nodeName = row.node_name || row.nodeName;
        if (!nodeName) continue;
        try {
            const ret = await adminRegPrx.notifyServer(CCS_APPLICATION, CCS_SERVER, nodeName, command);
            const ok = Number(ret.__return) === 0;
            nodes.push({
                nodeName,
                ccsObj: null,
                ok,
                errors: ok ? [] : [{ code: Number(ret.__return), message: String(ret.result || command) }],
            });
        } catch (e) {
            nodes.push({
                nodeName,
                ccsObj: null,
                ok: false,
                errors: [{ code: -2, message: String(e.message || e) }],
            });
        }
    }
    return nodes;
}

async function notify({ scope = SCOPE_VDN, vdnId = 0, reason = '' } = {}) {
    let targets = [];
    let resolveError = null;
    try {
        targets = await resolveCcsObjs();
    } catch (e) {
        resolveError = e;
    }

    let nodes = [];
    if (targets.length) {
        for (const target of targets) {
            nodes.push(await notifyNode(target, scope, vdnId, reason));
        }
    }

    if (!nodes.some((n) => n.ok)) {
        const fallback = await notifyViaAdminReg(scope, reason);
        if (fallback.length) {
            nodes = nodes.concat(fallback);
        }
    }

    const ok = nodes.some((n) => n.ok);
    const errors = nodes.flatMap((n) => n.errors || []);
    if (!ok) {
        logger.warn('[ccsReloadService] CCS 未即时刷新，将靠定时兜底 reason=%s err=%s',
            reason, resolveError ? String(resolveError.message || resolveError) : errors.map((e) => e.message).join(';'));
    } else {
        logger.info('[ccsReloadService] CCS reload ok scope=%s vdnId=%s reason=%s nodes=%s',
            scope, vdnId, reason, nodes.filter((n) => n.ok).map((n) => n.nodeName).join(','));
    }
    return { ok, nodes, errors };
}

function scheduleNotify(opts) {
    setImmediate(() => {
        notify(opts).catch((e) => {
            logger.warn('[ccsReloadService] scheduleNotify failed: %s', e && e.message ? e.message : e);
        });
    });
}

module.exports = {
    SCOPE_VDN,
    SCOPE_VDN_AND_ROUTES,
    notify,
    scheduleNotify,
};
