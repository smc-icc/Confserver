function createGate(deps){return async function(ctx,next){
 const pathname=String(ctx.url||'').split('?')[0],method=ctx.method;
 const publicGet=new Set(['/pages/server/api/get_locale','/pages/server/api/isEnableLdap','/pages/server/api/isEnableLogin','/web/captcha','/pages/server/api/vdn-access/readiness']);
 const publicPost=new Set(['/pages/server/api/login','/pages/server/api/adminModifyPass','/pages/server/api/vdn-access/register','/pages/server/api/vdn-access/login','/pages/server/api/vdn-access/verification']);
 if(method==='GET'&&publicGet.has(pathname)||method==='POST'&&publicPost.has(pathname))return next();
 if(!ctx.uid){ctx.status=401;ctx.body={ret_code:401,err_msg:'请先通过真实登录认证'};return;}
 if(ctx.uid==='admin')return next();
 if(method==='GET'&&pathname==='/pages/server/api/smcicc/community/capabilities')return next();
 const personal=new Set(['/pages/server/api/smcicc/vdn-access/profile','/pages/server/api/smcicc/vdn-access/requests','/pages/server/api/smcicc/vdn-access/apply','/pages/server/api/smcicc/vdn-access/withdraw','/pages/server/api/logout']);
 const bootstrapReads=new Set(['is_admin','isAdmin','getMyAuthList','get_locale','get_login_uid','getLoginUid','is_enable_login','isEnableLogin','isEnableLdap'].map(name=>'/pages/server/api/'+name));
 const safeRead=method==='GET'&&bootstrapReads.has(pathname);
 if(personal.has(pathname)||safeRead)return next();
 try{
  const c=await deps.context(ctx);if(c.role!=='vdn'){ctx.status=403;ctx.body={ret_code:403,err_msg:'没有 ConfServer 管理权限，请在申请中心提交申请'};return;}
  if(method==='GET'&&pathname==='/'){ctx.redirect('/tars.html#/smcicc/vdnadmin/workspace');return;}
  if ((method==='GET' && ['/pages/server/api/smcicc/manager/vdns','/pages/server/api/smcicc/manager/vdns/managers'].includes(pathname)) || (method==='POST' && /^\/pages\/server\/api\/smcicc\/manager\/vdns\/(?:create|update|retry|invite|remove-manager)$/.test(pathname))) return next();
  if (method==='POST' && pathname==='/pages/server/api/smcicc/manager/sbc-route/preview') return next();
  const allowed=await deps.scoped.authorize(ctx,pathname);
  if(allowed){await deps.scoped.run(ctx,allowed,pathname,next);deps.scoped.sanitize(ctx,allowed.action);return;}
  if(/^\/pages\/server\/api\/smcicc\/onboard\/(?:context|status|admin-password|first-agent|hotline|complete)$/.test(pathname))return next();
  ctx.status=403;ctx.body={ret_code:403,err_msg:'此入口仅允许系统超级管理员或尚未支持 VDN 隔离'};
 }catch(e){ctx.status=e.status||503;ctx.body={ret_code:ctx.status,err_msg:e.status?e.message:'管理权限核验暂不可用'};}
};}
let gate;
async function enforce(ctx,next){if(!gate)gate=createGate({context:ctx=>require('./OnboardIdentity').context(ctx),scoped:require('./ManagedVdnApi')});return gate(ctx,next);}
module.exports={createGate,enforce};
