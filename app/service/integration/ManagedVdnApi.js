const Identity = require('./OnboardIdentity');
const Dao = require('../../dao/OnboardDao');
const reads = new Set(['loadUserInfo', 'initRoleData', 'getRoleById', 'getNotRelateUsersByRole', 'getRelateUsersByRole', 'getPower', 'getDepartTree', 'getDepartById', 'getNotRelateUsersByDepart', 'getRelateUsersByDepart', 'getDepartPower']);
const writes = new Set(['setAgentValid', 'addRole', 'editRole', 'deleteRole', 'toRole', 'removeFromRole', 'addPowerForRole', 'deletePowerForRole', 'addDepart', 'editDepart', 'deleteDepart', 'toDepart', 'removeUserFromDepart', 'addPowerForDepart', 'deletePowerForDepart']);
const extensionWrites = new Set(['addExtension','editExtension','setExtensionValid','deleteExtension','copyExtension','batchExtension','acquireExtension','releaseExtension']);
for (const action of extensionWrites) writes.add(action);
for (const action of ['loadExtensionList','loadExtensionListEx','getchGroupList','loadChGroupList','getNumList','checkExtensionNumber']) reads.add(action);
function integer(value) {
  if (!/^[1-9]\d*$/.test(String(value)) || !Number.isSafeInteger(Number(value))) Identity.deny('资源编号无效', 400);
  return Number(value);
}
function ids(value) {
  if (typeof value !== 'string' || !value || value.length > 10000) Identity.deny('资源编号列表无效', 400);
  return [...new Set(value.split(',').map(integer))];
}
async function owned(table, column, values, vdnId) {
  for (const id of values) {
    const found = await Dao.select(`SELECT ID FROM ${table} WHERE ID=:id AND ${column}=:vdnId`, { id, vdnId });
    if (found.length !== 1) Identity.deny('资源不属于当前 VDN');
  }
}
function nested(raw) {
  let value = raw;
  try { if (typeof raw === 'string') value = JSON.parse(raw); } catch { Identity.deny('表单格式无效', 400); }
  if (!value || typeof value !== 'object' || Array.isArray(value)) Identity.deny('表单格式无效', 400);
  return value;
}
function redact(value) {
  if (Array.isArray(value)) return value.map(redact);
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(Object.entries(value).filter(([k]) => !/password|passwd|secret/i.test(k)).map(([k,v]) => [k,redact(v)]));
}
async function authorize(ctx, pathname) {
  const match = /^\/pages\/server\/api\/smcicc\/vdnadmin\/([A-Za-z]+)$/.exec(pathname);
  if (!match || !(reads.has(match[1]) || writes.has(match[1]))) return null;
  const action = match[1];
  if (writes.has(action) && ctx.method !== 'POST') Identity.deny('修改操作必须使用 POST', 405);
  if (reads.has(action) && !['GET','POST'].includes(ctx.method)) Identity.deny('请求方法不支持', 405);
  const scope = await Identity.selected(ctx), vdnId = Number(scope.vdn.id), p = ctx.paramsObj;
  // Legacy parsers accept nested VDN aliases; reject them instead of letting them override the checked scope.
  for (const k of ['VDNID','vdnid','vdn.id']) if (p[k] != null && Number(p[k]) !== vdnId) Identity.deny('VDN 参数冲突', 400);
  if (p['extensionBean.vdnId'] != null && Number(p['extensionBean.vdnId']) !== vdnId) Identity.deny('VDN 参数冲突', 400);
  for (const key of ['extensionJson','extension']) if (p[key]) {
    const ext = nested(p[key]);
    for (const field of ['vdn','vdnId','VDN']) if (ext[field] != null && Number(ext[field]) !== vdnId) Identity.deny('VDN 参数冲突', 400);
  }
  for (const k of ['user','jsonUser']) if (p[k]) {
    const u = nested(p[k]);
    for (const field of ['vdnId','VDNID','vdnid']) if (u[field] != null && Number(u[field]) !== vdnId) Identity.deny('VDN 参数冲突', 400);
  }
  if (p.roleId != null || /Role$/.test(action) && !['addRole','deleteRole'].includes(action) || ['getPower','getRoleById'].includes(action))
    await owned('t_user_role','VDNID',[integer(p.roleId)],vdnId);
  if (action === 'deleteRole') await owned('t_user_role','VDNID',ids(p.roleIds),vdnId);
  if (p.departId != null || ['getDepartById','deleteDepart','getDepartPower','toDepart','removeUserFromDepart','addPowerForDepart','deletePowerForDepart','getNotRelateUsersByDepart','getRelateUsersByDepart'].includes(action))
    await owned('t_user_department','VDNID',[integer(p.departId)],vdnId);
  if (['toRole','removeFromRole','toDepart','removeUserFromDepart'].includes(action))
    await owned('t_user_users','VDNID',ids(p.selIdStr),vdnId);
  if (action === 'setAgentValid') {
    const id=integer(p.id); await owned('t_user_users','VDNID',[id],vdnId);
    if (!['0','1'].includes(String(p.isValid))) Identity.deny('用户状态无效',400);
    if (id === Number(scope.user && scope.user.id) && String(p.isValid)==='0') Identity.deny('不能停用当前登录管理员');
  }
  if (['addDepart','editDepart'].includes(action)) {
    const d = nested(p.jsonDepart);
    if (d.vdnId != null && Number(d.vdnId)!==vdnId) Identity.deny('VDN 参数冲突',400);
    if (action==='editDepart') await owned('t_user_department','VDNID',[integer(d.id)],vdnId);
    let parent=Number(d.parentId || 0); const seen=new Set(action==='editDepart'?[Number(d.id)]:[]);
    while (parent!==0) {
      integer(parent); if (seen.has(parent)) Identity.deny('部门层级不能循环',400); seen.add(parent);
      const rows=await Dao.select('SELECT parentId FROM t_user_department WHERE ID=:id AND VDNID=:vdnId',{id:parent,vdnId});
      if(rows.length!==1) Identity.deny('上级部门不属于当前 VDN'); parent=Number(rows[0].parentId || 0);
    }
  }
  if (/^(add|delete)PowerFor/.test(action)) {
    const powerId=integer(p.powerId);
    const power=await Dao.select('SELECT ID FROM t_user_power WHERE ID=:powerId AND SubSystemType=90',{powerId});
    if(power.length!==1) Identity.deny('此入口仅管理当前 VDN 的 Omni 业务权限');
  }
  // Membership changes must not indirectly grant/revoke elevated legacy powers.
  if (writes.has(action)) {
    const owners = [];
    if (p.roleId != null) owners.push([1, integer(p.roleId)]);
    if (action === 'deleteRole') for (const id of ids(p.roleIds)) owners.push([1,id]);
    if (p.departId != null) owners.push([2, integer(p.departId)]);
    if (action === 'editDepart') owners.push([2,integer(nested(p.jsonDepart).id)]);
    // Department subtree deletion could remove inherited administrative authority.
    if (action === 'deleteDepart') Identity.deny('部门删除需由系统超级管理员执行');
    for (const [ownerType,ownerId] of owners) {
      const elevated=await Dao.select('SELECT g.PowerId FROM t_user_grantpower g LEFT JOIN t_user_power p ON p.ID=g.PowerId WHERE g.OwnerType=:ownerType AND g.OwnerId=:ownerId AND g.VDNID=:vdnId AND g.IsOwn=1 AND (p.SubSystemType IS NULL OR p.SubSystemType<>90)',{ownerType,ownerId,vdnId});
      if(elevated.length) Identity.deny('含管理权限的角色或部门需由系统超级管理员维护');
    }
  }
  ctx.managedVdnId=vdnId;
  return { action };
}
function sanitize(ctx, action) {
  ctx.body=redact(ctx.body);
  if (['getPower','getDepartPower'].includes(action) && ctx.body && Array.isArray(ctx.body.Rows))
    ctx.body.Rows=ctx.body.Rows.filter(r=>Number(r.subsystemtype)===90);
}
async function run(ctx, allowed, pathname, next) {
  if (!writes.has(allowed.action)) return next();
  // ExtensionIdentityDao owns its transaction and rechecks authority after its
  // allocator lock. Avoid holding an unrelated outer transaction/pool slot.
  if (extensionWrites.has(allowed.action)) return next();
  // Shared lock also serializes legacy MAX(ID)+1 allocation across VDNs.
  return Dao.lock(0, ctx.uid, 'vdn-api:' + allowed.action, async () => {
    await authorize(ctx, pathname); // authority may have been revoked while waiting
    await next();
  });
}
module.exports={authorize,sanitize,run,reads,writes};
