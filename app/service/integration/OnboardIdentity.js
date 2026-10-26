const Dao = require('../../dao/OnboardDao');
const LoginDao = require('../../../sso/dao/LoginDao');
const Auth = require('../../../sso/db-service/auth/AuthService');
const loginConf = require('../../../config/loginConf');
const sha1 = require('sha1');
function deny(message, status = 403) { const e = new Error(message); e.status = status; throw e; }
function identity(uid) {
  const m = /^conf-vdn:([1-9]\d*):([1-9]\d*):(.+)$/.exec(uid || '');
  if (!m) return null;
  try { return { vdnId: Number(m[1]), sourceId: Number(m[2]), workNo: decodeURIComponent(m[3]) }; } catch { return null; }
}
const uidFor = u => `conf-vdn:${u.vdnId}:${u.id}:${encodeURIComponent(u.workNo)}`;
async function liveUser(uid, transaction) {
  const id = identity(uid); if (!id) return null;
  const user = await Dao.user(id.vdnId, id.sourceId, transaction);
  return user && Number(user.enabled) === 1 && user.workNo === id.workNo ? user : null;
}
async function context(ctx) {
  if (!loginConf.enableLogin || !ctx.uid) deny('请先通过真实登录认证', 401);
  const sso = await LoginDao.getUserInfoByUid(ctx.uid);
  if (!sso || !sso.password) deny('登录身份无效', 401);
  if (await Auth.isAdmin(ctx.uid)) return { role: 'system', uid: ctx.uid,
    vdns: await Dao.select('SELECT ID AS id, Name AS name FROM t_icc_vdn WHERE ID > 0 ORDER BY ID', {}, ctx.dbTransaction) };
  if (typeof process !== 'undefined' && process.env.CONF_TENANCY_ENABLED === '1') {
    const access = await require('./VdnAccessService').getService().authorizeManagement(ctx.uid);
    const source = identity(ctx.uid) ? await liveUser(ctx.uid, ctx.dbTransaction) : null;
    if (identity(ctx.uid) && !source) return { role: 'none', uid: ctx.uid, vdns: [] };
    return { role: access.allowed ? 'vdn' : 'none', uid: ctx.uid, user: source, principal: access.principal, vdns: access.vdns || [] };
  }
  let user = await liveUser(ctx.uid, ctx.dbTransaction);
  if (!user || Number(user.enabled) !== 1) return { role: 'none', uid: ctx.uid, vdns: [] };
  const vdns = await Dao.adminVdns(user.id, ctx.dbTransaction);
  return { role: vdns.length ? 'vdn' : 'none', uid: ctx.uid, user, vdns };
}
async function selected(ctx, systemOnly = false) {
  const c = await context(ctx);
  if (c.role === 'none' || (systemOnly && c.role !== 'system')) deny('没有开通管理权限');
  const raw = ctx.paramsObj && ctx.paramsObj.vdnId;
  if (!/^[1-9]\d*$/.test(String(raw || '')) || !Number.isSafeInteger(Number(raw))) deny('请选择明确的 VDN', 400);
  const vdn = c.vdns.find(v => Number(v.id) === Number(raw));
  if (!vdn) deny('没有此 VDN 的管理权限');
  return { ...c, vdn };
}
async function authenticateManaged(uid, password, plain) {
  const user = await liveUser(uid);
  return Boolean(user && user.password && (plain ? password === user.password : password === sha1(user.password)));
}
module.exports = { context, selected, deny, identity, uidFor, authenticateManaged };
