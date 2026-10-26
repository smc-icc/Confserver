const Dao = require('../../dao/OnboardDao');
const Identity = require('../integration/OnboardIdentity');
const Sync = require('../integration/OmniUserSync');
const WorkNoAlloc = require('./WorkNoAllocService');
const LoginDao = require('../../../sso/dao/LoginDao');
const sha1 = require('sha1');
const { scheduleNotify, SCOPE_VDN } = require('./ccsReloadService');
const required = (value, pattern, message) => { const s = String(value || '').trim(); if (!pattern.test(s)) Identity.deny(message, 400); return s; };
const enabled = () => process.env.CONF_TENANCY_ENABLED === '1';
const Service = {};
Service.context = async ctx => {
  const c = await Identity.context(ctx);
  return { role: c.role, vdns: c.vdns, tenancyEnabled: enabled(),
    message: enabled() ? '' : '多 VDN 托管尚未切换：请先完成旧数据对账并启用两端托管模式。开通记录将保留为待同步。' };
};
Service.createVdn = async ctx => {
  const c = await Identity.context(ctx); if (c.role !== 'system') Identity.deny('仅系统超级用户可创建 VDN');
  const p = ctx.paramsObj || {};
  const id = Number(required(p.vdnId, /^[1-9]\d{0,8}$/, 'VDN 编号需为正整数'));
  const name = required(p.name, /^.{2,40}$/, 'VDN 名称需为 2～40 个字符');
  return Dao.lock(0, c.uid, 'create-vdn', async state => {
    const reservation = state['vdn-' + id];
    const rows = await Dao.select('SELECT ID AS id, Name AS name FROM t_icc_vdn WHERE ID = :id OR Name = :name', { id, name });
    if (rows.length && (!reservation || reservation.name !== name || rows.length !== 1 || Number(rows[0].id) !== id || rows[0].name !== name)) Identity.deny('VDN 编号或名称已存在，请选择现有 VDN 继续配置', 409);
    state['vdn-' + id] = { name };
    if (!rows.length) { await require('../integration/VdnIdSafety').assertUnused(id); await Dao.exec('INSERT INTO t_icc_vdn (ID, Name, StartRecord, RecordWorkNo, SipExtStatusSupport, Expires) VALUES (:id, :name, 0, 0, 1, :expires)', { id, name, expires: '9999-12-31 23:59:59' }); }
    scheduleNotify({ scope: SCOPE_VDN, vdnId: id, reason: 'onboard-create-vdn' });
    const sync = await Sync.syncVdn(id);
    const ok = enabled() && sync.ok && !sync.skipped;
    state['vdn-' + id].sync_pending = !ok;
    return { vdnId: id, name, sync_pending: !ok };
  });
};
Service.status = async ctx => {
  const c = await Identity.selected(ctx, true);
  const state = await Dao.read(c.vdn.id);
  const users = await Dao.select('SELECT ID AS id, WorkNO AS workNo, Name AS name, Email AS email FROM t_user_users WHERE VDNID = :id AND IsValid = 1 ORDER BY ID', { id: c.vdn.id });
  let receipt = state.provisioning ? { ...state.provisioning } : null;
  if (receipt) {
    const user = await Dao.user(c.vdn.id, receipt.sourceId);
    const valid = user && Number(user.enabled) === 1 && String(user.email || '').trim().toLowerCase() === receipt.email && (await Dao.adminVdns(user.id)).some(v => Number(v.id) === Number(c.vdn.id));
    receipt.status = valid ? 'pending' : 'blocked';
    receipt.message = valid ? '请点击核验 / 重试同步，确认两端当前状态。' : '管理员已停用、撤权或身份变更，需要系统管理员审核。';
  }
  return { vdn: c.vdn, users, provisioning: receipt, completed: Boolean(state.completed) };
};
async function project(c, state, user) {
  const uid = Identity.uidFor(user);
  const aliases = await LoginDao.getUsersByEmail(user.email);
  if (aliases.some(x => x.uid !== uid)) Identity.deny('邮箱已被其他登录账号使用，未覆盖任何账号', 409);
  const model = require('../../../sso/dao/db').db_user_system.tUserInfo;
  const existing = await LoginDao.getUserInfoByUid(uid);
  if (existing && String(existing.email).trim().toLowerCase() !== user.email) Identity.deny('登录身份邮箱不一致，需要先审核', 409);
  if (!existing) await model.create({ uid, email: user.email, password: sha1(sha1(user.password)), update_time: new Date() });
  const map = await Sync.syncVdn(c.vdn.id);
  const sync = enabled() && map.ok && !map.skipped ? await Sync.upsert({ vdnId: c.vdn.id, sourceUserId: user.id, workNo: user.workNo }) : { ok: false };
  const ready = enabled() && map.ok && !map.skipped && sync.ok && !sync.skipped;
  state.provisioning = { sourceId: user.id, workNo: user.workNo, email: user.email, accountId: map.data && map.data.account_id || null,
    status: ready ? 'ready' : 'pending', updatedAt: new Date().toISOString() };
  return { ...state.provisioning, sync_pending: !ready };
}
Service.admin = async ctx => {
  const c = await Identity.selected(ctx, true), p = ctx.paramsObj || {};
  // All wizard identity claims use the same cross-VDN lock, including email collision checks.
  await WorkNoAlloc.getService().ready();
  return Dao.lock(0, c.uid, 'assign-vdn-admin', async () => Dao.lock(c.vdn.id, c.uid, 'assign-admin', async (state, transaction) => {
    if (state.provisioning) Identity.deny('已保存管理员，请使用“重试同步”，避免重复创建或重新授予已撤销的权限', 409);
    let user;
    if (p.sourceId) {
      user = await Dao.user(c.vdn.id, Number(p.sourceId));
      if (!user || Number(user.enabled) !== 1) Identity.deny('所选管理员不属于当前 VDN 或已停用');
    } else {
      const name = required(p.name, /^.{1,40}$/, '请填写管理员姓名');
      const email = required(p.email, /^[^\s@]+@[^\s@]+\.[^\s@]+$/, '请填写有效邮箱').toLowerCase();
      if (email.length > 50) Identity.deny('当前 ICC 邮箱字段最多 50 个字符', 400);
      const password = String(p.password || '');
      if (password.length < 8 || password.length > 32 || password !== p.confirm || password.trim() !== password) Identity.deny('密码需为 8～32 个字符、首尾无空格且两次一致', 400);
      if ((await Dao.select('SELECT ID FROM t_user_users WHERE LOWER(TRIM(Email)) = :email', { email }, transaction)).length || (await LoginDao.getUsersByEmail(email)).length) Identity.deny('邮箱已存在，请指定现有用户；不会接管旧账号', 409);
      const workNo = await WorkNoAlloc.getService().claim({ vdnId: c.vdn.id, requested: p.workNo, transaction });
      await Dao.exec('INSERT INTO t_user_users (WorkNO, Name, PassWord, Email, IsValid, IsSystem, AgentActivate, VDNID) VALUES (:workNo, :name, :password, :email, 1, 0, 0, :vdnId)', { workNo, name, password, email, vdnId: c.vdn.id }, transaction);
      const created = await Dao.select('SELECT ID AS id FROM t_user_users WHERE VDNID = :vdnId AND WorkNO = :workNo', { vdnId: c.vdn.id, workNo }, transaction);
      if (created.length !== 1) Identity.deny('用户保存结果不唯一，需要审核', 409);
      user = await Dao.user(c.vdn.id, created[0].id, transaction);
    }
    const email = String(user.email || '').trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !user.password) Identity.deny('现有用户必须先配置有效邮箱和密码', 409);
    if ((await Dao.select('SELECT ID FROM t_user_users WHERE LOWER(TRIM(Email)) = :email', { email }, transaction)).length !== 1 || (await LoginDao.getUsersByEmail(email)).some(x => x.uid !== Identity.uidFor(user))) Identity.deny('邮箱归属冲突，未接管已有登录账号', 409);
    user.email = email;
    await Dao.exec(`INSERT INTO t_user_grantpower (OwnerType, OwnerId, PowerId, IsOwn, VDNID)
      SELECT 3, :id, p.ID, 1, :vdnId FROM t_user_power p
      WHERE (p.ID = 10000 OR p.SubSystemType = 90) AND NOT EXISTS
      (SELECT 1 FROM t_user_grantpower g WHERE g.OwnerType = 3 AND g.OwnerId = :id AND g.PowerId = p.ID AND g.VDNID = :vdnId AND g.IsOwn = 1)`, { id: user.id, vdnId: c.vdn.id }, transaction);
    await Dao.exec(`INSERT INTO t_omni_access_scope (VDNID, OwnerType, OwnerId, PowerId, ScopeType)
      SELECT :vdnId, 3, :id, p.ID, 'account' FROM t_user_power p WHERE p.SubSystemType = 90
      AND NOT EXISTS (SELECT 1 FROM t_omni_access_scope s WHERE s.VDNID = :vdnId AND s.OwnerType = 3 AND s.OwnerId = :id AND s.PowerId = p.ID)`, { id: user.id, vdnId: c.vdn.id }, transaction);
    state.provisioning = { sourceId: user.id, workNo: user.workNo, email, status: 'pending' };
    if (!(await Dao.adminVdns(user.id)).some(v => Number(v.id) === Number(c.vdn.id))) Identity.deny('VDN 管理权限目录缺失，需要管理员修复', 409);
    return project(c, state, user);
  }));
};
Service.retry = async ctx => {
  const c = await Identity.selected(ctx, true);
  return Dao.lock(0, c.uid, 'retry-vdn-admin', async () => Dao.lock(c.vdn.id, c.uid, 'retry-admin', async state => {
    const user = state.provisioning && await Dao.user(c.vdn.id, state.provisioning.sourceId);
    if (!user || Number(user.enabled) !== 1 || !(await Dao.adminVdns(user.id)).some(v => Number(v.id) === Number(c.vdn.id))) Identity.deny('管理员已停用或权限已撤销；重试不会重新授权', 409);
    user.email = String(user.email || '').trim().toLowerCase();
    if (user.email !== state.provisioning.email) Identity.deny('邮箱归属已变更，需要审核', 409);
    state.provisioning.status = 'pending';
    return project(c, state, user);
  }));
};
module.exports = Service;
