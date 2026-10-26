'use strict';

/**
 * Kamailio 路由裁决。只回答放行动作，不返回 SIP 口令。
 * scopeVdnId 有值时只看该 VDN 的分机、呼入路由和视频租约，避免租户互相发现。
 * 同一号码落在多个 VDN 时拒绝，不挑一个放行。
 */

const DOMAIN = 'cloud-sbc.internal.invalid';
const PUBLIC_DOMAIN = 'omni.seami.cloud';
const DOMAINS = new Set([DOMAIN, PUBLIC_DOMAIN]);

function domainNames(options) {
    const given = options && options.domains;
    return given instanceof Set && given.size ? given : DOMAINS;
}

function sameDomain(rowDomain, requestDomain, names) {
    if (!rowDomain || rowDomain === requestDomain) return true;
    return names.has(rowDomain) && names.has(requestDomain);
}
const EXTENSION = /^[1-9]\d{2,19}$/;
const VISITOR = /^(voice|video)_[a-f0-9]{32}$/;
const METHODS = new Set(['REGISTER', 'INVITE', 'NOTIFY']);
const SOURCES = new Set(['external', 'freeswitch']);
const TRANSPORTS = new Set(['tls', 'ws', 'tcp', 'udp']);

function deny(reason, status = 403) {
    return { action: 'deny', status, reason };
}

function allow(action, vdnId) {
    return { action, status: 200, reason: 'allowed', vdn_id: vdnId };
}

function scoped(rows, vdnId) {
    const list = Array.isArray(rows) ? rows : [];
    if (vdnId == null) return list;
    return list.filter(row => Number(row.vdn_id) === Number(vdnId));
}

function oneVdn(rows) {
    const ids = [...new Set(rows.map(row => Number(row.vdn_id)).filter(id => Number.isInteger(id) && id > 0))];
    if (ids.length !== 1) return { ok: false, ambiguous: ids.length > 1 };
    return { ok: true, vdnId: ids[0] };
}

function decide(input, data, options = {}) {
    const scope = options.scopeVdnId == null ? null : Number(options.scopeVdnId);
    const method = String(input.method || '').toUpperCase();
    const source = String(input.source || '');
    const transport = String(input.transport || '').toLowerCase();
    const domain = String(input.domain || '');
    const from = String(input.from_user || '');
    const to = String(input.to_user || '');
    const ruri = String(input.ruri_user || '');
    const names = domainNames(options);
    if (!METHODS.has(method) || !SOURCES.has(source) || !TRANSPORTS.has(transport)) return deny('denied');
    if (!names.has(domain)) return deny('domain');
    const directory = scoped(data && data.directory, scope);
    const routes = scoped(data && data.routes, scope);
    const leases = scoped(data && data.leases, scope);

    if (method === 'REGISTER' && source === 'external' && (transport === 'tls' || transport === 'ws')) {
        if (!from || from !== to) return deny('denied');
        if (VISITOR.test(from)) {
            const hit = oneVdn(leases.filter(row => row.username === from));
            return hit.ok ? allow('register', hit.vdnId) : deny(hit.ambiguous ? 'ambiguous' : 'denied');
        }
        if (!EXTENSION.test(from)) return deny('denied');
        const hit = oneVdn(directory.filter(row => row.username === from && sameDomain(row.domain, domain, names)));
        return hit.ok ? allow('register', hit.vdnId) : deny(hit.ambiguous ? 'ambiguous' : 'denied');
    }

    if (method === 'INVITE' && source === 'external' && transport === 'ws') {
        const called = ruri || to;
        let callerVdn = null;
        if (VISITOR.test(from)) {
            const hit = oneVdn(leases.filter(row => row.username === from));
            if (!hit.ok) return deny(hit.ambiguous ? 'ambiguous' : 'denied');
            callerVdn = hit.vdnId;
        } else if (EXTENSION.test(from)) {
            const hit = oneVdn(directory.filter(row => row.username === from));
            if (!hit.ok) return deny(hit.ambiguous ? 'ambiguous' : 'denied');
            callerVdn = hit.vdnId;
        } else {
            return deny('denied');
        }
        const owned = routes.filter(row => row.called === called && Number(row.vdn_id) === callerVdn);
        return owned.length === 1 ? allow('video', callerVdn) : deny('denied');
    }

    if (method === 'INVITE' && source === 'external' && transport === 'tls') {
        const called = ruri || to;
        if (!EXTENSION.test(called)) return deny('denied');
        const routeRows = routes.filter(row => row.called === called);
        const extRows = directory.filter(row => row.username === called);
        const routeHit = oneVdn(routeRows);
        const extHit = oneVdn(extRows);
        if (routeRows.length && !routeHit.ok) return deny('ambiguous');
        if (extRows.length && !extHit.ok) return deny('ambiguous');
        if (routeHit.ok && extHit.ok && routeHit.vdnId !== extHit.vdnId) return deny('ambiguous');
        if (routeHit.ok) return allow('inbound', routeHit.vdnId);
        if (extHit.ok) return allow('inbound', extHit.vdnId);
        return deny('denied');
    }

    if ((method === 'INVITE' || method === 'NOTIFY') && source === 'freeswitch' && transport === 'tls') {
        const target = ruri || to;
        const visitor = VISITOR.test(target);
        if (!visitor && !EXTENSION.test(target)) return deny('denied');
        const rows = visitor ? leases.filter(row => row.username === target) : directory.filter(row => row.username === target);
        const hit = oneVdn(rows);
        if (!hit.ok) return deny(hit.ambiguous ? 'ambiguous' : 'denied');
        if (EXTENSION.test(from)) {
            const fromRows = directory.filter(row => row.username === from);
            const fromHit = oneVdn(fromRows);
            if (fromRows.length && (!fromHit.ok || fromHit.vdnId !== hit.vdnId)) return deny('ambiguous');
        }
        return allow(visitor ? 'video' : 'return', hit.vdnId);
    }
    return deny('denied');
}

module.exports = { decide, DOMAIN, EXTENSION, VISITOR };
