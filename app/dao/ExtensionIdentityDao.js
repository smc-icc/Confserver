'use strict';
const { QueryTypes } = require('sequelize');
const crypto = require('crypto');
const { inspectExtensionSchema } = require('./ExtensionIdentitySchema');

function fail(message, status = 409) { const e = new Error(message); e.status = status; throw e; }
function normalizeNumber(value) {
    const num = String(value == null ? '' : value).trim();
    if (!/^[1-9]\d{2,11}$/.test(num)) fail('分机号必须为 3-12 位数字，且不能以 0 开头', 400);
    return num;
}
function hashToken(token) {
    if (!/^[a-f0-9]{64}$/.test(String(token || ''))) fail('号码预留凭证无效或已过期');
    return crypto.createHash('sha256').update(token).digest('hex');
}
function isDuplicate(e) { return Boolean(e && (e.name === 'SequelizeUniqueConstraintError' || e.original && e.original.code === 'ER_DUP_ENTRY')); }

function createExtensionIdentityDao(db, config = {}) {
    const min = Number(config.min || process.env.EXTENSION_ALLOC_MIN || 990001);
    const max = Number(config.max || process.env.EXTENSION_ALLOC_MAX || 999999);
    const ttl = Number(config.ttl || process.env.EXTENSION_RESERVATION_TTL_S || 600);
    const domain = config.domain || process.env.XML_CURL_DOMAIN || '192.168.255.128';
    const context = config.context || process.env.XML_CURL_USER_CONTEXT || (process.env.CONF_TENANCY_ENABLED === '1' ? 'sbc-cloud-deny' : 'default');
    if (!/^[a-zA-Z0-9_-]{1,64}$/.test(context)) throw Error('Invalid managed SIP user context');
    if (![min, max, ttl].every(Number.isSafeInteger) || min < 100 || max < min || max > 999999999999 || ttl < 60 || ttl > 3600) throw Error('Invalid extension allocation configuration');
    const select = (sql, replacements = {}, transaction) => db.query(sql, { replacements, transaction, logging: false, type: QueryTypes.SELECT });
    const exec = (sql, replacements = {}, transaction) => db.query(sql, { replacements, transaction, logging: false });
    let readiness;
    const assertReady = async () => {
        if (!readiness) readiness = inspectExtensionSchema(sql => select(sql)).then(s => {
            if (!s.ready) fail('请先运行分机主从表迁移，启用全局唯一约束和 InnoDB 事务', 503);
        }).catch(e => { readiness = null; throw e; });
        return readiness;
    };
    const transaction = async (fn, authorize, existingTransaction) => {
        await assertReady();
        try {
            const run = async t => {
                const lock = await select('SELECT NextNum AS nextNum FROM t_icc_extension_allocator WHERE ID=1 FOR UPDATE', {}, t);
                if (lock.length !== 1) fail('分机号码分配器未初始化', 503);
                if (authorize) await authorize(t);
                await exec('DELETE FROM t_icc_extension_reservation WHERE ExpiresAt<=UTC_TIMESTAMP(3)', {}, t);
                return fn(t, lock[0]);
            };
            return await (existingTransaction ? run(existingTransaction) : db.transaction(run));
        } catch (e) { if (isDuplicate(e)) fail('分机号已存在或已被预留'); throw e; }
    };
    const validateScope = (actor, vdnId) => {
        if (!actor || String(actor).length > 255) fail('请先登录', 401);
        if (!Number.isSafeInteger(Number(vdnId)) || Number(vdnId) < 1) fail('请选择明确的 VDN', 400);
    };
    const releaseIn = async ({ actor, vdnId, token }, t) => {
        validateScope(actor, vdnId);
        await exec('DELETE FROM t_icc_extension_reservation WHERE Actor=:actor AND VDN=:vdnId AND TokenHash=:hash', { actor, vdnId, hash: hashToken(token) }, t);
    };
    const reserve = async ({ actor, vdnId, previousToken, authorize }) => {
        validateScope(actor, vdnId);
        return transaction(async (t, lock) => {
            if (previousToken) await releaseIn({ actor, vdnId, token: previousToken }, t);
            const pending = await select('SELECT COUNT(*) AS c FROM t_icc_extension_reservation WHERE Actor=:actor AND VDN=:vdnId', { actor, vdnId }, t);
            if (Number(pending[0].c) >= 10) fail('待保存分机过多，请关闭其他新增窗口或等待预留过期');
            const first = Math.max(min, Math.min(max, Number(lock.nextNum)));
            for (let i = 0; i <= max - min; i++) {
                const candidate = min + ((first - min + i) % (max - min + 1));
                const num = String(candidate);
                const exists = await select('SELECT Num FROM t_icc_base_extension WHERE Num=:num UNION ALL SELECT Num FROM t_icc_extension_reservation WHERE Num=:num LIMIT 1', { num }, t);
                if (exists.length) continue;
                const token = crypto.randomBytes(32).toString('hex');
                await exec('INSERT INTO t_icc_extension_reservation (Num,VDN,Actor,TokenHash,ExpiresAt) VALUES (:num,:vdnId,:actor,:hash,DATE_ADD(UTC_TIMESTAMP(3),INTERVAL :ttl SECOND))', { num, vdnId, actor, hash: hashToken(token), ttl }, t);
                await exec('UPDATE t_icc_extension_allocator SET NextNum=:next WHERE ID=1', { next: candidate === max ? min : candidate + 1 }, t);
                return { num, reservationToken: token, expiresInSeconds: ttl };
            }
            fail('自动分机号段已用完，请调整号段或手动输入');
        }, authorize);
    };
    const consume = async (num, options, t) => {
        const rows = await select('SELECT Actor AS actor, VDN AS vdn, TokenHash AS hash FROM t_icc_extension_reservation WHERE Num=:num FOR UPDATE', { num }, t);
        if (options.token) {
            if (rows.length !== 1 || rows[0].actor !== options.actor || Number(rows[0].vdn) !== Number(options.vdnId) || rows[0].hash !== hashToken(options.token)) fail('号码预留凭证无效或已过期，请重新获取');
            await exec('DELETE FROM t_icc_extension_reservation WHERE Num=:num', { num }, t);
        } else if (rows.length) fail('分机号已被预留，请使用自动获取或更换号码');
    };
    const sipIn = async (input, t) => {
        const num = normalizeNumber(input.username);
        const owner = await select('SELECT VDN AS vdn, IsValid AS enabled FROM t_icc_base_extension WHERE Num=:num FOR UPDATE', { num }, t);
        if (owner.length !== 1) fail('SIP 账号必须关联现有分机');
        if (Number(owner[0].vdn) !== Number(input.vdnId)) fail('分机不属于当前 VDN', 403);
        if (input.enabled === false || input.enabled === 0) await assertVideoUnreferenced(num, t);
        const realm = String(input.domain || domain).trim();
        if (!realm || realm === '*' || realm.length > 128 || !/^[a-zA-Z0-9.-]+$/.test(realm)) fail('SIP 域无效', 400);
        const existing = await select('SELECT password FROM t_icc_sip_directory WHERE username=:num AND vdn_id=:vdnId', { num, vdnId: input.vdnId }, t);
        const password = input.password || (existing[0] && existing[0].password) || crypto.randomBytes(24).toString('hex');
        if (typeof password !== 'string' || password.length < 12 || password.length > 128) fail('SIP 口令必须为 12-128 位', 400);
        await exec(`INSERT INTO t_icc_sip_directory (username,vdn_id,domain,password,user_context,vm_password,caller_id_name,caller_id_number,enabled,remark)
            VALUES (:num,:vdnId,:realm,:password,:context,NULL,:cid,:num,:enabled,:remark)
            ON DUPLICATE KEY UPDATE domain=VALUES(domain),password=VALUES(password),enabled=VALUES(enabled),remark=VALUES(remark)`,
        { num, vdnId: input.vdnId, realm, password, context, cid: 'Extension ' + num, enabled: input.enabled === false || input.enabled === 0 ? 0 : 1, remark: String(input.remark || 'extension').slice(0, 255) }, t);
        return password;
    };
    const insertIn = async (input, options, t) => {
        const num = normalizeNumber(input.num), vdn = Number(input.vdn);
        if (!Number.isSafeInteger(vdn) || vdn < 1) fail('请选择明确的 VDN', 400);
        await consume(num, { ...options, vdnId: vdn }, t);
        const row = { num, vdn, device: Number(input.device || 0), ch: input.ch == null || input.ch === '' ? null : Number(input.ch), chGroup: input.chGroup || null,
            description: String(input.description || '').slice(0, 100), agentMode: Number(input.agentMode || 0), callAgentRouterType: input.callAgentRouterType || 'called', callExternalRouterType: input.callExternalRouterType || '' };
        await exec(`INSERT INTO t_icc_base_extension (Num,VDN,Device,Ch,ChGroup,Description,AgentMode,CallAgentRouterType,CallExternalRouterType,IsValid)
            VALUES (:num,:vdn,:device,:ch,:chGroup,:description,:agentMode,:callAgentRouterType,:callExternalRouterType,1)`, row, t);
        if (input.sipEnabled === true || input.sipEnabled === 1) await sipIn({ username: num, vdnId: vdn, domain: input.sipDomain, password: input.sipPassword }, t);
        return 1;
    };
    const insert = (ext, options = {}) => transaction(t => insertIn(ext, options, t), options.authorize);
    const batch = (exts, options = {}) => transaction(async t => {
        if (!exts.length || exts.length > 500) fail('批量分机数量必须为 1-500', 400);
        for (const ext of exts) await insertIn(ext, {}, t);
        return exts.length;
    }, options.authorize);
    const assertVideoUnreferenced = async (num, t) => {
        let refs;
        try { refs = await select('SELECT UserID FROM t_icc_agent_video_config WHERE VideoExtension=:num LIMIT 1', { num }, t); }
        catch (e) { if ((e.original || e.parent || e).code === 'ER_NO_SUCH_TABLE') return; throw e; }
        if (refs.length) fail('分机已被视频配置引用，不能改号、删除或停用');
    };
    const update = (ext, options = {}) => transaction(async t => {
        const oldNum = normalizeNumber(ext.hisNum), num = normalizeNumber(ext.num), vdn = Number(ext.vdn);
        const owned = await select('SELECT Num FROM t_icc_base_extension WHERE Num=:oldNum AND VDN=:vdn FOR UPDATE', { oldNum, vdn }, t);
        if (!owned.length) fail('分机不存在或不属于当前 VDN', 403);
        if (ext.sipEnabled === false || ext.sipEnabled === 0) await assertVideoUnreferenced(oldNum, t);
        if (num !== oldNum) {
            await assertVideoUnreferenced(oldNum, t);
            const refs = await select('SELECT ExtNum FROM t_icc_telag_staticlogin WHERE ExtNum=:oldNum UNION ALL SELECT ExtensionTel FROM t_user_users WHERE ExtensionTel=:oldNum LIMIT 1', { oldNum }, t);
            if (refs.length) fail('分机已被引用，不能改号');
            await consume(num, {}, t);
        }
        await exec(`UPDATE t_icc_base_extension SET Num=:num, Device=:device,Ch=:ch,ChGroup=:chGroup,Description=:description,AgentMode=:agentMode,
            CallAgentRouterType=:callAgentRouterType,CallExternalRouterType=:callExternalRouterType WHERE Num=:oldNum AND VDN=:vdn`,
        { oldNum, num, vdn, device: Number(ext.device || 0), ch: ext.ch == null || ext.ch === '' ? null : Number(ext.ch), chGroup: ext.chGroup || null, description: String(ext.description || '').slice(0, 100), agentMode: Number(ext.agentMode || 0), callAgentRouterType: ext.callAgentRouterType || 'called', callExternalRouterType: ext.callExternalRouterType || '' }, t);
        if (ext.sipEnabled === true || ext.sipEnabled === 1) await sipIn({ username: num, vdnId: vdn, domain: ext.sipDomain }, t);
        else if (ext.sipEnabled === false || ext.sipEnabled === 0) await exec('UPDATE t_icc_sip_directory SET enabled=0 WHERE username=:num AND vdn_id=:vdn', { num, vdn }, t);
        return 1;
    }, options.authorize);
    const setValid = (input, options = {}) => transaction(async t => {
        const num = normalizeNumber(input.num);
        const owner = await select('SELECT Num FROM t_icc_base_extension WHERE Num=:num AND VDN=:vdnId FOR UPDATE', { num, vdnId: input.vdnId }, t);
        if (!owner.length) fail('分机不存在或不属于当前 VDN', 403);
        if (Number(input.isValid) !== 1) await assertVideoUnreferenced(num, t);
        await exec('UPDATE t_icc_base_extension SET IsValid=:enabled WHERE Num=:num AND VDN=:vdnId', { num, vdnId: input.vdnId, enabled: Number(input.isValid) === 1 ? 1 : 0 }, t);
        return 1;
    }, options.authorize);
    const deleteByNums = (input, options = {}) => transaction(async t => {
        if (!input.nums.length || input.nums.length > 500) fail('请选择 1-500 个分机', 400);
        for (const value of input.nums) {
            const num = normalizeNumber(value), vdnId = input.vdnId;
            const owned = await select('SELECT Num FROM t_icc_base_extension WHERE Num=:num AND VDN=:vdnId FOR UPDATE', { num, vdnId }, t);
            if (!owned.length) fail('分机不存在或不属于当前 VDN', 403);
            const refs = await select('SELECT ExtNum FROM t_icc_telag_staticlogin WHERE ExtNum=:num UNION ALL SELECT ExtensionTel FROM t_user_users WHERE ExtensionTel=:num LIMIT 1', { num }, t);
            if (refs.length) fail('分机已被坐席引用，不能删除');
            await assertVideoUnreferenced(num, t);
            await exec('DELETE FROM t_icc_base_extension WHERE Num=:num AND VDN=:vdnId', { num, vdnId }, t);
        }
        return 1;
    }, options.authorize);
    return { withTransaction: (fn, existingTransaction) => transaction(fn, null, existingTransaction), assertReady, reserve, insert, batch, update, setValid, deleteByNums,
        isAvailable: async num => !(await select('SELECT Num FROM t_icc_base_extension WHERE Num=:num UNION ALL SELECT Num FROM t_icc_extension_reservation WHERE Num=:num AND ExpiresAt>UTC_TIMESTAMP(3) LIMIT 1', { num: normalizeNumber(num) })).length,
        release: input => transaction(t => releaseIn(input, t), input.authorize),
        upsertSip: (input, options = {}) => transaction(t => sipIn(input, t), options.authorize) };
}

let singleton;
function instance() {
    if (!singleton) singleton = createExtensionIdentityDao(require('./db').db_smcicc.sequelize);
    return singleton;
}
module.exports = { createExtensionIdentityDao, normalizeNumber };
for (const name of ['withTransaction','assertReady','reserve','release','insert','batch','update','setValid','deleteByNums','upsertSip','isAvailable']) module.exports[name] = (...args) => instance()[name](...args);
