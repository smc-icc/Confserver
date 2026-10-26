const Dao = require('../../dao/AgentUserSMCIccDao');
const Identity = require('../../dao/ExtensionIdentityDao');
const VideoConfig = require('../../dao/AgentVideoConfigDao');
const OmniUserSync = require('../integration/OmniUserSync');
const WorkNoAlloc = require('./WorkNoAllocService');

const Service = {};

function toInt(v, d = 0) {
    if (v === null || v === undefined || v === '') return d;
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function pick(p, key, altKeys = []) {
    if (!p) return undefined;
    if (Object.prototype.hasOwnProperty.call(p, key)) return p[key];
    for (const k of altKeys) {
        if (Object.prototype.hasOwnProperty.call(p, k)) return p[k];
    }
    if (p.user && typeof p.user === 'object' && Object.prototype.hasOwnProperty.call(p.user, key)) {
        return p.user[key];
    }
    if (p.jsonUser && typeof p.jsonUser === 'object' && Object.prototype.hasOwnProperty.call(p.jsonUser, key)) {
        return p.jsonUser[key];
    }
    return undefined;
}

function parseJsonUser(ctx) {
    const raw = ctx.paramsObj?.jsonUser || ctx.paramsObj?.user || ctx.request?.body?.jsonUser;
    if (!raw) return {};
    if (typeof raw === 'object') return raw;
    try {
        return JSON.parse(String(raw));
    } catch (e) {
        return {};
    }
}

function resolveVdnId(ctx, user) {
    const fromUser = toInt(user.vdnId ?? user.VDNID, NaN);
    if (!Number.isNaN(fromUser) && fromUser > 0) return fromUser;
    const fromParam = toInt(ctx.paramsObj?.vdnId ?? ctx.paramsObj?.['vdn.id'], NaN);
    if (!Number.isNaN(fromParam) && fromParam > 0) return fromParam;
    const fromSession = toInt(ctx.session?.smcicc_vdn_id, NaN);
    if (!Number.isNaN(fromSession) && fromSession > 0) return fromSession;
    return -1;
}

function parseAgent(user, vdnId) {
    return {
        id: toInt(user.id ?? user.ID, 0),
        workNo: String(user.workNo ?? user.WorkNO ?? '').trim(),
        name: String(user.name ?? user.Name ?? '').trim(),
        password: String(user.password ?? user.PassWord ?? '').trim(),
        email: user.email != null ? String(user.email).trim() : '',
        calledTel: String(user.calledTel ?? user.CalledTel ?? '').trim(),
        mobileTel: String(user.mobileTel ?? user.MobileTel ?? '').trim(),
        extensionTel: String(user.extensionTel ?? user.ExtensionTel ?? '').trim(),
        clientReleaseMode: toInt(user.clientReleaseMode, 0),
        agentReleaseMode: toInt(user.agentReleaseMode, 0),
        autoAnswerCall: toInt(user.autoAnswerCall, 0),
        notPlayWorkNO: toInt(user.notPlayWorkNO, 0),
        agentHookMode: toInt(user.agentHookMode, 0),
        useTelAgent: toInt(user.useTelAgent ?? user.IfUse, 0),
        telAgentExtendNO: String(user.telAgentExtendNO ?? user.ExtNum ?? '').trim(),
        isAutoDial: user.isAutoDial === '' || user.isAutoDial == null ? null : toInt(user.isAutoDial, 0),
        autoDialNO: String(user.autoDialNO ?? '').trim(),
        defaultGroup: toInt(user.defaultGroup, 1),
        vdnId,
        oldWorkNo: String(user.oldWorkNo ?? '').trim(),
    };
}

Service.loadUserInfo = async (ctx) => {
    const p = ctx.paramsObj || {};
    const user = parseJsonUser(ctx);
    const vdnId = resolveVdnId(ctx, { ...user, vdnId: p.vdnId });
    if (vdnId < 0) return { Rows: [], Total: 0 };
    const page = Math.max(1, toInt(p.page, 1));
    const pageSize = Math.max(1, toInt(p.pagesize ?? p.pageSize, 20));
    const workNo = String(pick(p, 'workNo') ?? user.workNo ?? '').trim();
    const name = String(pick(p, 'name') ?? user.name ?? '').trim();
    const { rows, total } = await Dao.listByVdn({ vdnId, workNo, name, page, pageSize });
    return { Rows: rows, Total: total };
};

Service.addUserInfo = async (ctx) => {
    const raw = parseJsonUser(ctx);
    const user = parseAgent(raw, resolveVdnId(ctx, raw));
    if (user.vdnId < 0 || !user.name || !user.password) return 0;
    if (user.useTelAgent && user.telAgentExtendNO) {
        const ok = await Dao.extensionExists({ vdnId: user.vdnId, telNo: user.telAgentExtendNO });
        if (!ok) return 3;
        const dupExt = await Dao.countStaticLoginByExt({ extNum: user.telAgentExtendNO });
        if (dupExt > 0) return -1;
    }
    try {
        await WorkNoAlloc.getService().ready();
        await Identity.withTransaction(async (transaction) => {
            user.workNo = await WorkNoAlloc.getService().claim({ vdnId: user.vdnId, requested: user.workNo, transaction });
            if (await Dao.existsWorkNo({ workNo: user.workNo, vdnId: user.vdnId, transaction })) {
                const error = new Error('工号不能重复');
                error.status = 409;
                throw error;
            }
            if (user.useTelAgent && user.telAgentExtendNO) await VideoConfig.assertTelephoneAvailable({ extension: user.telAgentExtendNO, userId: 0, vdnId: user.vdnId, workNo: user.workNo }, transaction);
            user.id = await Dao.insertAgent(user, transaction);
            await VideoConfig.save({ userId: user.id, vdnId: user.vdnId, input: raw }, transaction);
        });
    } catch (e) {
        if (e.videoConfig) throw e;
        if (e.status === 409) return 2;
        if (e.status === 422) return 4;
        console.error('[AgentUser] addUserInfo failed');
        return 0;
    }
    // ICC 已成功：Omni 失败只打日志，不回滚、不把接口改成失败
    await OmniUserSync.upsert({
        vdnId: user.vdnId, sourceUserId: user.id || undefined,
        workNo: user.workNo,
        name: user.name,
        email: user.email || null,
        password: user.password,
    });
    return 1;
};

Service.editUserInfo = async (ctx) => {
    const raw = parseJsonUser(ctx);
    const vdnId = resolveVdnId(ctx, raw);
    const user = parseAgent(raw, vdnId);
    const oldWorkNo = String(ctx.paramsObj?.oldWorkNo || user.oldWorkNo || user.workNo).trim();
    if (user.id <= 0 || user.vdnId < 0 || !user.workNo || !user.name) return 0;
    if (user.workNo !== oldWorkNo) return 5;
    const exists = await Dao.existsWorkNo({
        workNo: user.workNo,
        vdnId: user.vdnId,
        excludeId: user.id,
    });
    if (exists) return 2;
    if (user.useTelAgent && user.telAgentExtendNO) {
        const ok = await Dao.extensionExists({ vdnId: user.vdnId, telNo: user.telAgentExtendNO });
        if (!ok) return 3;
        const dupExt = await Dao.countStaticLoginByExt({
            extNum: user.telAgentExtendNO,
            excludeWorkNo: oldWorkNo,
        });
        if (dupExt > 0) return -1;
    }
    const before = await Dao.getById(user.id);
    try {
        await Identity.withTransaction(async transaction => {
            if (user.useTelAgent && user.telAgentExtendNO) await VideoConfig.assertTelephoneAvailable({ extension: user.telAgentExtendNO, userId: user.id, vdnId: user.vdnId, workNo: oldWorkNo }, transaction);
            await Dao.updateAgent({ ...user, oldWorkNo }, transaction);
            await VideoConfig.save({ userId: user.id, vdnId: user.vdnId, input: raw }, transaction);
        });
    } catch (e) {
        if (e.videoConfig) throw e;
        console.error('[AgentUser] editUserInfo failed');
        return 0;
    }
    await OmniUserSync.upsert({
        vdnId: user.vdnId, sourceUserId: user.id,
        workNo: user.workNo,
        previousWorkNo: before?.workNo && before.workNo !== user.workNo ? before.workNo : null,
        name: user.name,
        email: user.email || before?.email || null,
        password: user.password || null,
    });
    return 1;
};

Service.setAgentValid = async (ctx) => {
    const id = Number(ctx.paramsObj.id);
    const vdnId = Number(ctx.paramsObj.vdnId || ctx.session.smcicc_vdn_id);
    const isValid = Number(ctx.paramsObj.isValid) === 1 ? 1 : 0;
    if (!id || Number.isNaN(vdnId)) return 0;
    await Dao.setValid({ id, vdnId, isValid });
    const source = await Dao.getById(id);
    if (source) await OmniUserSync.upsert({ vdnId, sourceUserId: id, workNo: source.workNo, name: source.name, email: source.email, password: source.password });
    return 1;
};

Service.deleteUserInfo = async (ctx) => {
    const raw = String(ctx.paramsObj?.userIds || ctx.paramsObj?.ids || '').trim();
    const ids = raw
        .split(',')
        .map((s) => toInt(s.trim(), NaN))
        .filter((n) => !Number.isNaN(n));
    if (!ids.length) return false;
    try {
        const deleted = await Dao.deleteAgents(ids);
        for (const row of deleted) {
            await OmniUserSync.remove({ vdnId: row.vdnId, sourceUserId: row.id, workNo: row.workNo, email: row.email || null });
        }
        return deleted.length > 0;
    } catch (e) {
        console.error('[AgentUser] deleteUserInfo failed:', e.message || e);
        return false;
    }
};

module.exports = Service;
