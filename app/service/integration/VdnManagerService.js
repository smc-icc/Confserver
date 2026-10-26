'use strict';
const {randomUUID,createHash}=require('node:crypto');
function fail(message,status=400){throw Object.assign(new Error(message),{status});}
function fields(input,keys){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!keys.includes(k)))fail('请求字段无效');return input;}
function uid(value){if(typeof value!=='string'||!value||value.length>128)fail('账号无效');return value;}
function name(value){if(typeof value!=='string'||value.trim().length<2||value.trim().length>40)fail('VDN 名称需为2至40个字符');return value.trim();}
function id(value){if(!/^\d+$/.test(String(value))||!Number.isSafeInteger(Number(value))||Number(value)<=0||Number(value)>2147483647)fail('VDN 编号无效');return Number(value);}
function requestId(value){if(typeof value!=='string'||!/^[a-f0-9]{8}-(?:[a-f0-9]{4}-){3}[a-f0-9]{12}$/i.test(value))fail('请求编号无效');return value;}
const publicAccount=a=>({uid:a.uid,name:a.name,company:a.company||'',phone:a.phone||'',email:a.email||'',status:a.status,phone_verified:Boolean(Number(a.phone_verified)),email_verified:Boolean(Number(a.email_verified)),legacy:Boolean(Number(a.legacy)),review_note:a.review_note||'',review_due_at:a.review_due_at,created_at:a.created_at});
async function enqueue(db,a,purpose,version){
 for(const [channel,recipient] of [['sms',a.phone],['email',a.email]]){
  if(!recipient)continue;
  const key=createHash('sha256').update(a.uid+'\0'+version+'\0'+purpose+'\0'+channel).digest('hex');
  await db.appendOutbox({id:randomUUID(),event_key:key,uid:a.uid,purpose,channel,recipient});
 }
}
function createService(repository,{authorize,syncVdn=async()=>({ok:false})}={}){
 async function access(actor,root=false){uid(actor);const c=await authorize(actor);if(!c.allowed||(root?actor!=='admin':c.role!=='vdn'&&actor!=='admin'))fail('没有管理权限',403);return c;}
 async function approved(db,actor){const a=await db.getAccount(actor);if(!a||a.status!=='approved')fail('管理员资格尚未开通或已停用',403);return a;}
 async function owned(db,actor,vdnId){await approved(db,actor);const grant=await db.getGrant(actor,vdnId),v=await db.getVdn(vdnId);if(!v||!grant||grant.state!=='active')fail('没有此 VDN 的管理权限',403);return v;}
 async function project(actor,vdnId,revision){
  let ok=false;try{const r=await syncVdn(vdnId);ok=Boolean(r&&r.ok&&!r.skipped);}catch{}
  if(ok)await repository.transaction(async db=>{await approved(db,actor);const g=await db.getGrant(actor,vdnId);if(g&&g.state==='active')await db.markProject(vdnId,revision);});
  return repository.read(async db=>({vdn:await db.getVdn(vdnId),projection_pending:Boolean((await db.getProject(vdnId))?.pending)}));
 }
 const service={
  accounts:async(actor,input={})=>{await access(actor,true);fields(input,['status','limit']);if(input.status&&!['pending','approved','rejected','disabled'].includes(input.status))fail('状态无效');const limit=input.limit==null?100:id(input.limit);if(limit>200)fail('查询数量无效');return repository.read(async db=>({items:(await db.listAccounts({status:input.status||undefined,limit})).map(publicAccount),notifications:await db.outboxSummary()}));},
  review:async(actor,input)=>{
   await access(actor,true);fields(input,['uid','decision','note','legacy_identity_verified']);const target=uid(input.uid),decision=input.decision;
   if(!['approve','reject'].includes(decision)||typeof(input.note||'')!=='string'||String(input.note||'').length>1000)fail('审核信息无效');if(decision==='reject'&&!String(input.note||'').trim())fail('请填写未通过原因');
   return repository.transaction(async db=>{
    const a=await db.getAccount(target);if(!a)fail('注册申请不存在',404);const desired=decision==='approve'?'approved':'rejected';
    if(a.status===desired)return {account:publicAccount(a)};if(a.status!=='pending')fail('申请状态已变更，请刷新',409);
    if(decision==='approve'&&Number(a.legacy)===1&&input.legacy_identity_verified!==true)fail('请先核验旧版注册账号身份');
    if(decision==='approve'&&Number(a.legacy)!==1&&(!Number(a.phone_verified)||!Number(a.email_verified)))fail('手机和邮箱尚未完成验证',409);
    const version=Number(a.review_version||0)+1,patch={status:desired,reviewer:actor,review_note:String(input.note||'').trim(),review_version:version};
    await db.setAccount(target,patch);await enqueue(db,a,desired,version);await db.audit({actor,action:'review-manager-'+desired,target_uid:target,method:'account_review'});
    return {account:publicAccount({...a,...patch})};
   });
  },
  setEnabled:async(actor,input)=>{
   await access(actor,true);fields(input,['uid','enabled','note']);const target=uid(input.uid);if(typeof input.enabled!=='boolean'||typeof input.note!=='string'||!input.note.trim()||input.note.length>1000)fail('请确认账号状态并填写原因');
   return repository.transaction(async db=>{const a=await db.getAccount(target);if(!a)fail('账号不存在',404);const status=input.enabled?'approved':'disabled';if(a.status===status)return {account:publicAccount(a)};if(!['approved','disabled'].includes(a.status))fail('请先完成注册审核',409);const version=Number(a.review_version||0)+1,patch={status,review_version:version,reviewer:actor,review_note:input.note.trim()};await db.setAccount(target,patch);await enqueue(db,a,status,version);await db.audit({actor,action:'manager-'+status,target_uid:target});return {account:publicAccount({...a,...patch})};});
  },
  vdns:async actor=>{const c=await access(actor);return repository.read(async db=>({items:await Promise.all(c.vdns.map(async v=>({...v,projection_pending:Boolean((await db.getProject(Number(v.id)))?.pending)})))}));},
  createVdn:async(actor,input)=>{
   await access(actor);fields(input,['name','request_id']);const vdnName=name(input.name),rid=requestId(input.request_id);
   const saved=await repository.transaction(async db=>{
    await approved(db,actor);const existing=await db.getCreation(actor,rid);
    if(existing){if(existing.requested_name!==vdnName)fail('请求编号已用于其他创建操作',409);const v=await owned(db,actor,Number(existing.vdn_id));return {id:v.id,revision:(await db.getProject(v.id))?.revision||1};}
    if(await db.findVdnByName(vdnName))fail('VDN 名称已存在',409);const vdnId=id(await db.nextVdnId());await db.insertVdn({id:vdnId,name:vdnName});
    await db.saveGrant({uid:actor,vdn_id:vdnId,state:'active',source:'direct',granted_by:actor,identity_verified:1});await db.insertCreation({uid:actor,request_id:rid,vdn_id:vdnId,requested_name:vdnName});const revision=await db.touchProject(vdnId);
    await db.audit({actor,action:'manager-create-vdn',target_uid:actor,vdn_id:vdnId,method:'self_service'});return {id:vdnId,revision};
   });return project(actor,saved.id,saved.revision);
  },
  updateVdn:async(actor,input)=>{
   await access(actor);fields(input,['id','name']);const vdnId=id(input.id),vdnName=name(input.name);
   const revision=await repository.transaction(async db=>{await owned(db,actor,vdnId);const duplicate=await db.findVdnByName(vdnName);if(duplicate&&Number(duplicate.id)!==vdnId)fail('VDN 名称已存在',409);await db.updateVdn(vdnId,vdnName);const revision=await db.touchProject(vdnId);await db.audit({actor,action:'manager-update-vdn',target_uid:actor,vdn_id:vdnId});return revision;});return project(actor,vdnId,revision);
  },
  retry:async(actor,input)=>{await access(actor);fields(input,['id']);const vdnId=id(input.id),revision=await repository.transaction(async db=>{await owned(db,actor,vdnId);return (await db.getProject(vdnId))?.revision||await db.touchProject(vdnId);});return project(actor,vdnId,revision);},
  managers:async(actor,input)=>{await access(actor);fields(input,['id']);const vdnId=id(input.id);return repository.transaction(async db=>{await owned(db,actor,vdnId);return {items:await db.listVdnManagers(vdnId),self_uid:actor};});},
  invite:async(actor,input)=>{
   const scope=await access(actor);fields(input,['id','email']);const vdnId=id(input.id),email=typeof input.email==='string'?input.email.trim().toLowerCase():'';if(!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)||email.length>254)fail('请填写有效邮箱');if(!scope.vdns.some(v=>Number(v.id)===vdnId))fail('没有此 VDN 的管理权限',403);
   const candidates=await repository.read(db=>db.approvedByEmail(email));if(candidates.length!==1||!(await authorize(candidates[0].uid)).allowed)fail('此账号不存在、未通过审核或无法加入',409);const target=candidates[0].uid;
   return repository.transaction(async db=>{await owned(db,actor,vdnId);const matches=await db.approvedByEmail(email);if(matches.length!==1||matches[0].uid!==target)fail('账号状态已变更，请刷新',409);await approved(db,target);await db.activateGrant({uid:target,vdn_id:vdnId,granted_by:actor});await db.audit({actor,action:'invite-vdn-manager',target_uid:target,vdn_id:vdnId});return {added:true};});
  },
  removeManager:async(actor,input)=>{
   await access(actor);fields(input,['id','uid']);const vdnId=id(input.id),target=uid(input.uid);if(target===actor)fail('不能移除当前操作账号，请由其他管理员操作',409);
   return repository.transaction(async db=>{await owned(db,actor,vdnId);const grant=await db.getGrant(target,vdnId);if(!grant||grant.state!=='active')fail('管理关系已变更，请刷新',409);await db.revokeGrant(target,vdnId);await db.audit({actor,action:'remove-vdn-manager',target_uid:target,vdn_id:vdnId});return {removed:true};});
  },
  retryNotifications:async(actor,input)=>{await access(actor,true);fields(input,['uid']);return repository.transaction(async db=>{await db.retryOutbox(uid(input.uid));await db.audit({actor,action:'retry-manager-notifications',target_uid:input.uid});return {queued:true};});},
 };
 return service;
}
let singleton;
function getService(){if(!singleton)singleton=createService(require('../../dao/VdnManagerDao'),{authorize:actor=>require('./VdnAccessService').getService().authorizeManagement(actor),syncVdn:async id=>{const {scheduleNotify,SCOPE_VDN}=require('../smcicc/ccsReloadService');scheduleNotify({scope:SCOPE_VDN,vdnId:id,reason:'manager-self-service'});return require('./OmniUserSync').syncVdn(id);}});return singleton;}
module.exports={createService,getService,enqueue,publicAccount};
