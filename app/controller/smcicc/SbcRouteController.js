'use strict';

const crypto = require('crypto');
const { decide } = require('../../service/smcicc/SbcRouteService');

const FIELDS = ['method', 'from_user', 'to_user', 'ruri_user', 'source', 'transport', 'domain'];

function tokenOk(presented, expected) {
    const got = Buffer.from(String(presented || ''));
    const want = Buffer.from(String(expected || ''));
    return want.length > 0 && got.length === want.length && crypto.timingSafeEqual(got, want);
}

function requestOf(body) {
    const source = body && typeof body === 'object' ? body : {};
    const input = {};
    for (const field of FIELDS) input[field] = source[field] == null ? '' : String(source[field]).slice(0, 128);
    return input;
}

function createController(deps = {}) {
    const context = deps.context || (ctx => require('../../service/integration/OnboardIdentity').context(ctx));
    const token = () => (deps.token == null ? process.env.SBC_ROUTE_TOKEN : deps.token);

    async function answer(input, scopeVdnId) {
        const load = deps.load || require('../../dao/SbcRouteDao').load;
        const domains = deps.domains || (deps.load ? null : require('../../service/smcicc/SbcDomainConfig').current().names);
        const data = await load(input, scopeVdnId);
        return decide(input, data, { scopeVdnId, domains });
    }

    async function internal(ctx) {
        ctx.set('Cache-Control', 'no-store');
        if (!tokenOk(ctx.get('x-sbc-route-token'), token())) {
            ctx.status = 403;
            ctx.body = { action: 'deny', status: 403, reason: 'denied' };
            return;
        }
        try {
            ctx.body = await answer(requestOf(ctx.request.body), null);
        } catch {
            ctx.status = 503;
            ctx.body = { action: 'deny', status: 503, reason: 'unavailable' };
        }
    }

    async function preview(ctx) {
        ctx.set('Cache-Control', 'no-store');
        let actor;
        try { actor = await context(ctx); } catch (err) {
            ctx.status = err.status || 401;
            ctx.body = { action: 'deny', status: ctx.status, reason: 'denied' };
            return;
        }
        const body = ctx.request.body || {};
        const input = requestOf(body);
        try {
            if (actor && actor.role === 'system') {
                ctx.body = { scope: 'platform', ...(await answer(input, null)) };
                return;
            }
            const vdnId = Number(body.vdnId);
            const allowed = actor && actor.role === 'vdn' && Array.isArray(actor.vdns) && actor.vdns.some(row => Number(row.id) === vdnId);
            if (!allowed) {
                ctx.status = 403;
                ctx.body = { action: 'deny', status: 403, reason: 'denied' };
                return;
            }
            const decision = await answer(input, vdnId);
            if (decision.vdn_id != null && Number(decision.vdn_id) !== vdnId) {
                ctx.body = { scope: 'vdn', action: 'deny', status: 403, reason: 'denied' };
                return;
            }
            ctx.body = { scope: 'vdn', ...decision };
        } catch {
            ctx.status = 503;
            ctx.body = { action: 'deny', status: 503, reason: 'unavailable' };
        }
    }

    return { internal, preview };
}

const live = createController();
module.exports = { ...live, createController };
