const StateDao = require('../../dao/OnboardDao');
const Identity = require('../integration/OnboardIdentity');
const VdnDao = require('../../dao/VdnSMCIccDao');
const AccessDao = require('../../dao/AccessCodeSMCIccDao');
const ExtDao = require('../../dao/ExtensionSMCIccDao');
const SipDao = require('../../dao/SipDirectoryDao');
const SkillDao = require('../../dao/SkillSMCIccDao');
const AgentDao = require('../../dao/AgentUserSMCIccDao');
const RouteDao = require('../../dao/ServiceRouteSMCIccDao');
const AgentUserService = require('./AgentUserService');
const OmniUserSync = require('../integration/OmniUserSync');
const DialplanCurl = require('./XmlCurlDialplanService');

const EXT_MIN = 9001;
const EXT_MAX = 9099;
const newSipPassword = () => require('crypto').randomBytes(18).toString('hex');

class OnboardError extends Error {
    constructor(message, status = 400) {
        super(message);
        this.status = status;
        this.name = 'OnboardError';
    }
}

function toInt(v, d = 0) {
    const n = Number(v);
    return Number.isNaN(n) ? d : n;
}

function trim(v) {
    return v == null ? '' : String(v).trim();
}

async function readState(ctx) { return ctx.onboardState || StateDao.read(ctx.onboardContext.vdn.id); }
async function writeState(ctx, patch) {
    if (!ctx.onboardState) throw new OnboardError('缺少 VDN 状态锁', 409);
    Object.assign(ctx.onboardState, patch, { updatedAt: new Date().toISOString() });
    return ctx.onboardState;
}
async function selectedVdn(ctx) { return VdnDao.findByVdnId(ctx.onboardContext.vdn.id); }

async function firstSkill(vdnId) {
    const rows = await SkillDao.loadSkillList({ vdnId, key: '' });
    return rows[0] || null;
}

async function firstAccess(vdnId) {
    const rows = await RouteDao.loadAccessCodeListByVdnSelf({ vdnId, key: '' });
    return rows[0] || null;
}

async function firstGroup(vdnId) {
    const rows = await RouteDao.loadAgentGroupList({ vdnId, key: '' });
    return rows[0] || null;
}

async function firstChannelGroup(vdnId) {
    const rows = await ExtDao.loadChGroupList({ vdnId });
    if (rows && rows.length) return rows[0];
    return null;
}

async function nextFreeExtension(vdnId) {
    const extRows = await ExtDao.loadExtensionList({ num: '', vdnId, pageNum: 1, pageSize: 200 });
    const existing = (extRows.rows || []).map((r) => String(r.num || '')).filter(Boolean);
    for (const num of existing.sort((a, b) => Number(a) - Number(b))) {
        const taken = await AgentDao.countStaticLoginByExt({ extNum: num });
        if (taken === 0 && !(await StateDao.select('SELECT Num FROM t_icc_base_extension WHERE Num = :num AND VDN <> :vdnId', { num, vdnId })).length) return num;
    }
    const used = new Set(existing);
    for (let n = EXT_MIN; n <= EXT_MAX; n += 1) {
        const num = String(n);
        if ((await StateDao.select('SELECT Num FROM t_icc_base_extension WHERE Num = :num', { num })).length) continue;
        if (used.has(num)) continue;
        const taken = await AgentDao.countStaticLoginByExt({ extNum: num });
        if (taken === 0) return num;
    }
    throw new OnboardError('自动分机号段已用完，请先为当前 VDN 配置空闲分机', 409);
}

async function suggestWorkNo(vdnId) {
    for (let i = 1001; i <= 1099; i += 1) {
        const workNo = String(i);
        const exists = await AgentDao.existsWorkNo({ workNo, vdnId });
        if (!exists) return workNo;
    }
    return `1${Date.now().toString().slice(-5)}`;
}

async function ensureExtension({ vdnId, num, name }) {
    const exists = await ExtDao.findByPrimaryKey({ num, vdnId });
    if (exists) return exists;
    const chGroup = await firstChannelGroup(vdnId);
    if (!chGroup) throw new OnboardError('请先为当前 VDN 绑定语音通道组', 409);
    const chGroupName = String(chGroup.name || chGroup.Name);
    let ch = Number(num);
    const clash = await ExtDao.findExistCh({ ch: String(ch) });
    if (clash && clash.length) {
        ch = Number(num) + 1000;
    }
    await ExtDao.insert({
        num,
        device: 0,
        ch: String(ch),
        chGroup: chGroupName,
        description: name ? `${name}分机` : '坐席分机',
        agentMode: 1,
        vdn: vdnId,
        callAgentRouterType: 0,
        callExternalRouterType: 0,
        sipEnabled: true,
    });
    return { num };
}

async function ensureSipUser({ vdnId, num, password, remark }) {
    const owner = await StateDao.select('SELECT VDN AS vdnId FROM t_icc_base_extension WHERE Num = :num', { num });
    if (owner.length !== 1 || Number(owner[0].vdnId) !== Number(vdnId)) throw new OnboardError('分机归属不唯一，不能读取或覆盖 SIP 凭据', 409);
    await SipDao.ensureTable();
    const existing = await SipDao.findUser(num, '', vdnId);
    const sipPassword = existing && existing.password ? existing.password : (password || newSipPassword());
    await SipDao.upsertUser({
        username: num,
        vdnId,
        password: sipPassword,
        remark: remark || 'agent',
    });
    return sipPassword;
}

async function ensureInboundRoute({ vdnId, accessCodeId, calledCode, skillId }) {
    if (!skillId || !accessCodeId) return false;
    const existing = await RouteDao.list({
        vdnId,
        calledCode: '',
        accessCodeId: String(accessCodeId),
        pageNum: 1,
        pageSize: 1000,
    });
    if (existing.rows.some(r => String(r.calledCode) === String(calledCode) && Number(r.deviceType) === 2 && Number(r.deviceId) === Number(skillId) && Number(r.isValid) === 1)) return false;
    if (existing.rows.some(r => String(r.calledCode) === String(calledCode))) throw new OnboardError('接入号码已有不同或停用的路由，请先审核', 409);
    const group = await firstGroup(vdnId);
    const trunk = await firstChannelGroup(vdnId);
    await RouteDao.insert({
        accessCodeId: Number(accessCodeId),
        calledCode: String(calledCode),
        deviceType: 2,
        deviceId: Number(skillId),
        vdnId: Number(vdnId),
        groupId: group ? Number(group.id) : 0,
        userId: 0,
        trunkGroupId: trunk ? Number(trunk.id) : 0,
        nodeId: 0,
    });
    return true;
}

function sessionWorkNo(ctx) {
    return trim(
        (ctx.session && (ctx.session.smcicc_sys_work_no || ctx.session.smcicc_sys_work_name))
        || ctx.uid
    );
}

const Service = {};

Service.OnboardError = OnboardError;

Service.getStatus = async (ctx) => {
    const state = await readState(ctx);
    const workNo = sessionWorkNo(ctx);
    const admin = ctx.onboardContext.user || null;
    const vdn = await selectedVdn(ctx);
    const vdnId = vdn ? Number(vdn.id) : 0;
    const access = vdnId ? await firstAccess(vdnId) : null;
    const skill = vdnId ? await firstSkill(vdnId) : null;
    const agents = vdnId
        ? (await AgentDao.listByVdn({ vdnId, page: 1, pageSize: 8 })).rows || []
        : [];
    let suggestedExtension = '';
    try { suggestedExtension = await nextFreeExtension(vdnId); } catch (e) { if (!(e instanceof OnboardError)) throw e; }
    const prerequisites = [];
    if (!skill) prerequisites.push('语音技能组');
    if (!await firstGroup(vdnId)) prerequisites.push('坐席组');
    if (!await firstChannelGroup(vdnId)) prerequisites.push('语音通道组');
    if (process.env.CONF_TENANCY_ENABLED !== '1') prerequisites.push('双端多 VDN 托管切换');
    const suggestedWorkNo = vdnId ? await suggestWorkNo(vdnId) : '1001';
    return {
        prerequisites,
        completed: Boolean(state.completed),
        completedAt: state.completedAt || '',
        admin: {
            workNo: admin ? admin.workNo : workNo,
            name: admin ? admin.name : workNo,
            loggedIn: Boolean(admin || workNo),
        },
        vdn: vdn
            ? {
                id: Number(vdn.id),
                name: vdn.name,
                startRecord: Number(vdn.startRecord) === 1,
            }
            : null,
        accessCode: access ? { id: Number(access.id), code: String(access.code) } : null,
        skill: skill ? { id: Number(skill.id), name: skill.name } : null,
        agents: agents.map((a) => ({
            workNo: a.workNo,
            name: a.name,
            extension: a.telAgentExtendNO || a.extensionTel || '',
        })),
        suggestedWorkNo,
        suggestedExtension,
        suggestedAccessCode: access ? String(access.code) : '4000',
        omniAgentUrl: process.env.OMNI_AGENT_PUBLIC_URL || 'http://127.0.0.1:3002',
        sipDomain: process.env.XML_CURL_DOMAIN || '192.168.255.128',
    };
};

Service.changeAdminPassword = async () => {
    throw new OnboardError('开通向导不修改系统超级用户密码；请在账户设置中修改当前账号密码', 409);
};

Service.createFirstAgent = async (ctx) => {
    if (process.env.CONF_TENANCY_ENABLED !== '1') throw new OnboardError('请先完成两端多 VDN 托管切换后再创建业务坐席', 409);
    const p = ctx.paramsObj || {};
    const workNo = trim(p.workNo);
    const name = trim(p.name);
    const password = trim(p.password);
    const email = trim(p.email).toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 50) throw new OnboardError('请填写有效坐席邮箱（最多 50 个字符）');
    if (!/^\w{3,20}$/.test(workNo)) {
        throw new OnboardError('工号请使用 3～20 位字母或数字');
    }
    if (!name || name.length > 40) {
        throw new OnboardError('请填写坐席姓名');
    }
    if (password.length < 6 || password.length > 32) {
        throw new OnboardError('坐席密码请使用 6～32 个字符');
    }
    const vdn = await selectedVdn(ctx);
    if (!vdn) throw new OnboardError('系统尚未准备好热线，请先完成出厂初始化');
    const vdnId = Number(vdn.id);
    const existed = await AgentDao.existsWorkNo({ workNo, vdnId });
    const ext = await nextFreeExtension(vdnId);
    const duplicates = await StateDao.select('SELECT ID AS id, VDNID AS vdnId, WorkNO AS workNo FROM t_user_users WHERE LOWER(TRIM(Email)) = :email', { email });
    if (duplicates.some(u => Number(u.vdnId) !== vdnId || u.workNo !== workNo)) throw new OnboardError('邮箱已被其他用户使用');
    if (!await firstGroup(vdnId)) throw new OnboardError('请先为当前 VDN 配置坐席组', 409);
    if (!await firstSkill(vdnId)) throw new OnboardError('请先为当前 VDN 配置语音技能组', 409);
    if (!existed) {
        await ensureExtension({ vdnId, num: ext, name });
        await ensureSipUser({ vdnId, num: ext, remark: `agent ${workNo}` });
        const addRet = await AgentUserService.addUserInfo({
            paramsObj: {
                vdnId,
                jsonUser: {
                    workNo,
                    name,
                    password,
                    email,
                    vdnId,
                    useTelAgent: 1,
                    telAgentExtendNO: ext,
                    extensionTel: '',
                    defaultGroup: (await firstGroup(vdnId))?.id || 0,
                },
            },
            session: ctx.session,
            request: ctx.request,
        });
        if (addRet === 3) throw new OnboardError('分机尚未就绪，请重试');
        if (addRet === -1) throw new OnboardError('该分机已被其他坐席占用');
        if (addRet !== 1 && addRet !== 2) throw new OnboardError('创建坐席失败，请检查填写内容');
    }
    const created = (await AgentDao.listByVdn({ vdnId, workNo, page: 1, pageSize: 1 })).rows[0];
    if (!created) throw new OnboardError('坐席已保存，但未能读取到账号，请刷新后重试');
    if (trim(created.email).toLowerCase() !== email) throw new OnboardError('现有坐席邮箱不一致，未接管旧账号', 409);
    const liveAgent = await StateDao.user(vdnId, created.id);
    if (!liveAgent || Number(liveAgent.enabled) !== 1) throw new OnboardError('坐席已停用，请先审核账号状态', 409);
    const projection = await OmniUserSync.upsert({ vdnId, sourceUserId: created.id, workNo, name: created.name, email });
    const syncPending = !projection.ok || projection.skipped || process.env.CONF_TENANCY_ENABLED !== '1';
    const usedExt = created.telAgentExtendNO || created.extensionTel;
    if (!usedExt) throw new OnboardError('现有坐席尚未配置分机', 409);
    let sipPassword;
    try {
        sipPassword = await ensureSipUser({
            vdnId, num: usedExt,
            remark: `agent ${workNo}`,
        });
    } catch (e) {
        throw new OnboardError('分机目录配置未完成，请重试', 409);
    }
    const skill = await firstSkill(vdnId);
    if (skill) {
        try {
            const bound = await SkillDao.countSkillUser({ agentId: created.id, skillId: skill.id });
            if (bound === 0) {
                await SkillDao.insertUserToSkill({ userId: created.id, skillId: skill.id });
            }
        } catch (e) {
            throw new OnboardError('技能绑定未完成，请重试', 409);
        }
    }
    try {
        await writeState(ctx, {
            firstAgentWorkNo: workNo,
            firstAgentExt: usedExt,
            firstAgentName: created.name || name,
            firstAgentSourceId: created.id,
            agentSyncPending: Boolean(syncPending),
            completed: false,
        });
    } catch (e) {
        throw e;
    }
    return {
        workNo,
        name: created.name || name,
        extension: usedExt,
        sipPassword,
        skill: skill ? skill.name : '',
        vdnName: vdn.name,
        reused: Boolean(existed),
        sync_pending: Boolean(syncPending),
    };
};

Service.saveHotline = async (ctx) => {
    const p = ctx.paramsObj || {};
    const vdnName = trim(p.vdnName || p.name);
    const accessCode = trim(p.accessCode || p.code);
    const startRecord = p.startRecord === true || p.startRecord === 1 || p.startRecord === '1';
    if (!vdnName || vdnName.length > 40) {
        throw new OnboardError('请填写热线名称');
    }
    if (!/^(\*|\d{3,20})$/.test(accessCode)) {
        throw new OnboardError('接入号码请使用 3～20 位数字，或保留出厂通配符 *');
    }
    const vdn = await selectedVdn(ctx);
    if (!vdn) throw new OnboardError('系统尚未准备好热线，请先完成出厂初始化');
    const vdnId = Number(vdn.id);
    const nameClash = await VdnDao.findByName(vdnName);
    if (nameClash && Number(nameClash.id) !== vdnId) {
        throw new OnboardError('该热线名称已被使用');
    }
    let access = await firstAccess(vdnId);
    const mediaTypes = await AccessDao.loadMediaTypeList();
    const voice = (mediaTypes || []).find((m) => Number(m.isAccessMedia) === 1) || (mediaTypes || [])[0];
    const mediaTypeId = voice ? Number(voice.id) : 1;
    const byCode = await AccessDao.findByCode(accessCode);
    if (byCode && access && Number(byCode.id) !== Number(access.id)) {
        throw new OnboardError('该接入号码已被其他热线使用');
    }
    if (!access && byCode) throw new OnboardError('接入号码已存在，不允许从其他 VDN 接管', 409);
    if (!await firstSkill(vdnId) || !await firstGroup(vdnId) || !await firstChannelGroup(vdnId)) throw new OnboardError('请先完成当前 VDN 的技能、坐席组和语音通道配置', 409);
    await VdnDao.updateByVdn({
        id: vdnId,
        name: vdnName,
        parentId: toInt(vdn.parentId, -1),
        startRecord: startRecord ? 1 : 0,
        recordWorkNo: startRecord ? 1 : 0,
        sipExtStatusSupport: toInt(vdn.sipExtStatusSupport, 0),
    });
    if (access) {
        await AccessDao.update({
            id: Number(access.id),
            code: accessCode,
            mediaTypeId,
        });
        access = { id: Number(access.id), code: accessCode };
    } else {
        await AccessDao.insert({ code: accessCode, mediaTypeId });
        const created = await AccessDao.findByCode(accessCode);
        if (!created) throw new OnboardError('接入号码保存失败');
        await VdnDao.updateAccessCodeByVdn({ vdnId, accessCodeIds: [Number(created.id)] });
        access = { id: Number(created.id), code: accessCode };
    }
    DialplanCurl.invalidateCache();
    const skill = await firstSkill(vdnId);
    const routeCreated = await ensureInboundRoute({
        vdnId,
        accessCodeId: access.id,
        calledCode: accessCode,
        skillId: skill ? skill.id : 0,
    });
    if (!skill) throw new OnboardError('当前 VDN 缺少语音技能组', 409);
    await writeState(ctx, {
        completed: false,
        hotlineConfigured: true,
        hotlineName: vdnName,
        accessCode,
        startRecord,
        vdnId,
    });
    return {
        vdnId,
        vdnName,
        accessCode,
        startRecord,
        skill: skill ? skill.name : '',
        routeCreated,
    };
};

Service.complete = async (ctx) => {
    const snapshot = await Service.getStatus(ctx);
    const previous = await readState(ctx);
    if (!snapshot.skill || !snapshot.accessCode || !previous.hotlineConfigured || !previous.firstAgentSourceId) {
        throw new OnboardError('请完成当前 VDN 的坐席、技能组和热线配置后再确认', 409);
    }
    const agent = await StateDao.user(snapshot.vdn.id, previous.firstAgentSourceId);
    if (!agent || Number(agent.enabled) !== 1) throw new OnboardError('开通坐席不存在或已停用', 409);
    if (process.env.CONF_TENANCY_ENABLED !== '1') throw new OnboardError('两端多 VDN 托管尚未切换', 409);
    if (!await SkillDao.countSkillUser({ agentId: agent.id, skillId: snapshot.skill.id })) throw new OnboardError('坐席技能关联已失效', 409);
    await ensureInboundRoute({ vdnId: snapshot.vdn.id, accessCodeId: snapshot.accessCode.id, calledCode: snapshot.accessCode.code, skillId: snapshot.skill.id });
    const projection = await OmniUserSync.upsert({ vdnId: snapshot.vdn.id, sourceUserId: agent.id, workNo: agent.workNo });
    if (process.env.CONF_TENANCY_ENABLED !== '1' || !projection.ok || projection.skipped) {
        await writeState(ctx, { completed: false, agentSyncPending: true });
        throw new OnboardError('Omni 租户同步尚未完成；请先完成托管切换或重试同步', 409);
    }
    const state = await writeState(ctx, { completed: true, agentSyncPending: false, completedAt: new Date().toISOString() });
    return { completed: true, completedAt: state.completedAt, snapshot };
};

// Every entrypoint authorizes from live grants and requires an explicit VDN.
for (const action of ['getStatus', 'changeAdminPassword', 'createFirstAgent', 'saveHotline', 'complete']) {
    const handler = Service[action];
    Service[action] = async ctx => {
        ctx.onboardContext = await Identity.selected(ctx);
        if (action === 'getStatus') return handler(ctx);
        return StateDao.lock(0, ctx.uid, action, async () => StateDao.lock(ctx.onboardContext.vdn.id, ctx.uid, action, async state => {
            ctx.onboardContext = await Identity.selected(ctx);
            ctx.onboardState = state;
            try { return await handler(ctx); } finally { delete ctx.onboardState; }
        }));
    };
}

module.exports = Service;
