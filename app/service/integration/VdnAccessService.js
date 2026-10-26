'use strict';
const { randomUUID } = require('node:crypto');
/**
 * Injectable repository contract (all rows use snake_case, except VDN {id,name}
 * and safe source {id,vdnId,workNo,name,email,enabled}). No credentials returned.
 * read(fn), transaction(fn): fn receives these async methods:
 * findSso(uid), findProfile(uid), findSource(uid), listLegacyVdns(uid),
 * listVdns(), findVdn(id), findVdnByName(name), listGrants(uid|null), listLegacyGrants(),
 * findEmailOwners(normalizedEmail), findAccounts(query), insertProfile(row),
 * verifyProfile(uid), findRequest(id), listRequests({uid?,status?,limit}),
 * insertRequest(row), updateRequest(id,patch), saveGrant(row), createVdn({id,name}),
 * audit({actor,action,target_uid?,vdn_id?,request_id?,outcome,method?}).
 * transaction MUST acquire t_conf_onboard_state VDNID=0 BEFORE invoking fn,
 * commit only on resolution, and roll back the whole callback on rejection.
 * ensureSchema() is explicit deployment work; reads never create/backfill tables.
 * syncVdn(id) runs only after commit; success requires {ok:true,skipped:!true}.
 * Authentication is owned by SSO; this module never accepts raw passwords.
 */
const MAX_ID = 2147483647;
function fail(message, status = 400) { throw Object.assign(new Error(message), {status}); }
function object(input, keys) {
  if (!input || typeof input !== 'object' || Array.isArray(input) || Object.keys(input).some(k=>!keys.includes(k))) fail('Invalid request fields');
  return input;
}
function text(value, max, label, optional = false) {
  if (value == null && optional) return '';
  if (typeof value !== 'string' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/.test(value)) fail('Invalid '+label);
  const result=value.trim(); if ((!optional&&!result) || result.length>max || Buffer.byteLength(result,'utf8')>max*4) fail('Invalid '+label);
  return result;
}
function id(value) {
  if (!['number','string'].includes(typeof value) || !/^[1-9]\d{0,9}$/.test(String(value)) || !Number.isSafeInteger(Number(value)) || Number(value)>MAX_ID) fail('Invalid VDN ID');
  return Number(value);
}
function uidValue(value) { return text(value,128,'UID'); }
function emailValue(value) { const email=text(value,254,'email').toLowerCase();if(!/^[\x21-\x7e]+$/.test(email)||!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email))fail('Invalid email');return email; }
function requestId(value) {const result=text(value,36,'request ID');if(!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(result))fail('Invalid request ID');return result;}
function sourceIdentity(uid) {
  const match=/^conf-vdn:([1-9]\d*):([1-9]\d*):(.+)$/.exec(uid);
  if(!match)return null;
  try {return {vdnId:id(match[1]),sourceId:id(match[2]),workNo:decodeURIComponent(match[3])};}catch{return null;}
}
function safeSource(user) { return user ? {id:user.id,vdnId:user.vdnId,workNo:user.workNo,name:user.name||'',email:user.email||'',enabled:user.enabled} : null; }
const safeVdn = v => ({id:Number(v.id),name:String(v.name||'')});
function publicRequest(row, applicant) {
  return {id:row.id,kind:row.kind,vdn_id:row.vdn_id == null?null:Number(row.vdn_id),vdn_name:row.vdn_name||'',organization:row.organization||'',reason:row.reason||'',status:row.status,
    review_note:row.review_note||'',result_vdn_id:row.result_vdn_id==null?null:Number(row.result_vdn_id),projection_pending:Boolean(Number(row.projection_pending)),created_at:row.created_at,...(applicant?{applicant}: {})};
}
function createService(repository, {syncVdn, requireAccountApproval = typeof process!=='undefined' && process.env.CONF_TENANCY_ENABLED==='1'} = {}) {
  if(!repository || typeof repository.read!=='function'||typeof repository.transaction!=='function')throw new TypeError('Repository read/transaction required');
  async function principal(db, uid, required = true) {
    const sso=await db.findSso(uid), profile=await db.findProfile(uid);
    const parsed=sourceIdentity(uid), source=parsed ? await db.findSource(uid) : null;
    const live=Boolean(sso && (sso.enabled==null || Number(sso.enabled)===1) && (sso.has_credential==null || Number(sso.has_credential)===1) && (!profile || Number(profile.enabled)===1) &&
      (!uid.startsWith('conf-vdn:') || (parsed && source && Number(source.enabled)===1 && Number(source.id)===parsed.sourceId && Number(source.vdnId)===parsed.vdnId && String(source.workNo)===parsed.workNo)));
    if(required&&!live)fail('Account is unavailable',sso?403:401);
    return {live,profile,source,sso,principal:{uid,name:profile?.name||source?.name||sso?.name||uid,email:profile?.email||source?.email||sso?.email||''}};
  }
  async function root(db, actor) {if(actor!=='admin')fail('Superuser required',403);return principal(db,actor);}
  async function context(db, uid) {
    const p=await principal(db,uid,false), manager=requireAccountApproval&&db.findManager?await db.findManager(uid):null;
    const eligible=p.live&&(uid==='admin'||!requireAccountApproval||manager?.status==='approved');
    let vdns=[];
    if(eligible) {
      if(uid==='admin')vdns=(await db.listVdns()).map(safeVdn);
      else {
        const explicit=await db.listGrants(uid), byId=new Map();
        for(const v of await db.listLegacyVdns(uid))byId.set(Number(v.id),safeVdn(v));
        for(const g of explicit) {const key=Number(g.vdn_id);byId.delete(key);if(g.state==='active'){const v=await db.findVdn(key);if(v)byId.set(key,safeVdn(v));}}
        vdns=[...byId.values()];
      }
    }
    vdns.sort((a,b)=>a.id-b.id);
    const role=eligible&&uid==='admin'?'system':eligible&&(manager?.status==='approved'||vdns.length)?'vdn':'none';
    return {allowed:role!=='none',role,vdns,principal:p.principal,user:safeSource(p.source)};
  }
  async function verification(db,p) {
    if(p.profile)return p.profile.verification_status;
    return (await db.listGrants(p.principal.uid)).some(g=>Number(g.identity_verified)===1)?'admin_verified':'pending';
  }
  async function profile(db, uid) {
    const p=await principal(db,uid), c=await context(db,uid);
    return {...p.principal,verification_status:await verification(db,p),management_allowed:c.allowed,vdns:c.vdns,role:c.role};
  }
  async function record(db,actor,action,target,extra={}) {await db.audit({actor,action,target_uid:target||null,outcome:'success',...extra});}
  async function verifiedGrant(db,actor,target,vdn,source,request_id=null) {
    await principal(db,target);if(!await db.findVdn(vdn))fail('Application target unavailable');
    await db.verifyProfile(target);
    await db.saveGrant({uid:target,vdn_id:vdn,state:'active',source,granted_by:actor,identity_verified:true});
    await record(db,actor,source==='request'?'approve':'grant',target,{vdn_id:vdn,request_id,method:'superadmin_review'});
  }
  async function project(request) {
    if(!request.projection_pending || request.status!=='approved' || request.kind!=='new')return {request:publicRequest(request),projection_pending:Boolean(Number(request.projection_pending))};
    let ok=false;
    try {const result=syncVdn ? await syncVdn(Number(request.result_vdn_id)):null;ok=Boolean(result&&result.ok===true&&result.skipped!==true&&!result.sync_pending);}catch{/* Durable pending receipt is the retry mechanism. */}
    // A crash or failed receipt update leaves pending=1; repeating projection is safe.
    if(ok) {
      try {await repository.transaction(async db=>{const latest=await db.findRequest(request.id);if(latest&&latest.status==='approved'&&latest.projection_pending){await db.updateRequest(request.id,{projection_pending:false});await record(db,'admin','projection-synced',latest.uid,{vdn_id:latest.result_vdn_id,request_id:latest.id});}});}catch{/* DB is authoritative; report pending when marking the receipt fails. */}
    }
    return repository.read(async db=>{const current=await db.findRequest(request.id);return {request:publicRequest(current),projection_pending:Boolean(Number(current.projection_pending))};});
  }
  const service={
    ensureSchema:()=>repository.ensureSchema(),
    getProfile:uid=>repository.read(db=>profile(db,uidValue(uid))),
    authorizeManagement:uid=>repository.read(db=>context(db,uidValue(uid))),
    findManagerAccount:uid=>repository.read(db=>db.findManager?db.findManager(uidValue(uid)):null),
    canManage:async uid=>(await service.authorizeManagement(uid)).allowed,
    findProfile:uid=>repository.read(async db=>{const p=await db.findProfile(uidValue(uid));return p?{uid:p.uid,name:p.name,email:p.email,enabled:Number(p.enabled),verification_status:p.verification_status}:null;}),
    registerProfile:async input=>{
      object(input,['uid','name','email']);const uid=uidValue(input.uid),name=text(input.name,80,'name'),email=emailValue(input.email);
      if(!/^conf-account:[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(uid))fail('New independent account required');
      await repository.transaction(async db=>{
        const p=await principal(db,uid);if(p.profile)fail('Account already registered',409);
        if(String(p.sso.email||'').trim().toLowerCase()!==email)fail('Account email conflicts',409);
        if((await db.findEmailOwners(email)).some(x=>x.uid!==uid))fail('Email already registered',409);
        await db.insertProfile({uid,name,email,enabled:1,verification_status:'pending'});await record(db,uid,'register',uid);
      });return service.getProfile(uid);
    },
    listMine:uid=>repository.read(async db=>{uid=uidValue(uid);await principal(db,uid);return {items:(await db.listRequests({uid,limit:100})).map(r=>publicRequest(r))};}),
    apply:async(uid,input)=>{
      if(typeof process!=='undefined'&&process.env.CONF_TENANCY_ENABLED==='1')fail('请注册管理员账号，审核通过后自行创建 VDN',410);
      uid=uidValue(uid);object(input,['kind','vdn_id','vdn_name','organization','reason']);
      if(uid==='admin')fail('Applications require an applicant account',403);
      const kind=input.kind;if(!['existing','new'].includes(kind))fail('Invalid application kind');
      const vdn_id=kind==='existing'?id(input.vdn_id):null,vdn_name=kind==='new'?text(input.vdn_name,40,'VDN name'):'';
      if(kind==='new'&&vdn_name.length<2)fail('VDN name must contain at least two characters');
      if(kind==='new'&&input.vdn_id!=null||kind==='existing'&&input.vdn_name!=null)fail('Invalid application target');
      const organization=text(input.organization,200,'organization'),reason=text(input.reason,2000,'reason');
      return repository.transaction(async db=>{
        await principal(db,uid);if(kind==='existing'&&!await db.findVdn(vdn_id))fail('Application target unavailable');
        const pending=await db.listRequests({uid,status:'pending',limit:1000});
        const existing=pending.find(r=>r.kind===kind&&(kind==='existing'?Number(r.vdn_id)===vdn_id:r.vdn_name.toLowerCase()===vdn_name.toLowerCase()));
        if(existing)return {request:publicRequest(existing)};
        if(pending.length>=100)fail('Too many pending applications',429);
        const row={id:randomUUID(),uid,kind,vdn_id,vdn_name,organization,reason,status:'pending',review_note:'',result_vdn_id:null,projection_pending:false,created_at:new Date().toISOString()};
        await db.insertRequest(row);await record(db,uid,'apply',uid,{vdn_id,request_id:row.id});return {request:publicRequest(row)};
      });
    },
    withdraw:async(uid,input)=>{
      uid=uidValue(uid);object(input,['id']);const rid=requestId(input.id);
      return repository.transaction(async db=>{
        await principal(db,uid);const row=await db.findRequest(rid);if(!row||row.uid!==uid)fail('Request unavailable',404);
        if(row.status==='withdrawn')return {request:publicRequest(row)};if(row.status!=='pending')fail('Request already decided',409);
        await db.updateRequest(rid,{status:'withdrawn'});await record(db,uid,'withdraw',uid,{request_id:rid});return {request:publicRequest({...row,status:'withdrawn'})};
      });
    },
    listAdmin:(actor,input={})=>repository.read(async db=>{
      await root(db,actor);object(input,['status','limit']);if(input.status&&!['pending','approved','rejected','withdrawn'].includes(input.status))fail('Invalid status');
      const limit=input.limit==null?100:id(input.limit);if(limit>200)fail('Invalid limit');
      const rows=await db.listRequests({status:input.status||undefined,limit});const items=[];
      for(const row of rows){const p=await principal(db,row.uid,false);items.push(publicRequest(row,{...p.principal,verification_status:p.profile?.verification_status||'pending'}));}return {items};
    }),
    review:async(actor,input)=>{
      if(typeof process!=='undefined'&&process.env.CONF_TENANCY_ENABLED==='1')fail('请使用注册账号审核；VDN 由审核通过的管理员自行创建',410);
      object(input,['id','decision','vdn_id','note','identity_verified']);const rid=requestId(input.id),decision=input.decision,note=text(input.note,1000,'review note',true);
      if(!['approve','reject'].includes(decision))fail('Invalid decision');if(decision==='approve'&&input.identity_verified!==true)fail('Explicit identity verification required');
      const row=await repository.transaction(async db=>{
        await root(db,actor);const row=await db.findRequest(rid);if(!row)fail('Request unavailable',404);
        const status=decision==='approve'?'approved':'rejected';if(row.status===status)return {...row,projection_pending:Boolean(Number(row.projection_pending))};if(row.status!=='pending')fail('Request already decided',409);
        let vdn=null;
        if(decision==='approve'){
          await principal(db,row.uid);vdn=row.kind==='new'?id(input.vdn_id):id(row.vdn_id);
          if(row.kind==='new'){
            if(await db.findVdn(vdn)||await db.findVdnByName(row.vdn_name))fail('VDN ID or name already exists',409);
            await db.createVdn({id:vdn,name:row.vdn_name});
          }
          await verifiedGrant(db,actor,row.uid,vdn,'request',rid);
        }else await record(db,actor,'reject',row.uid,{request_id:rid});
        const patch={status,reviewer:actor,review_note:note,result_vdn_id:vdn,projection_pending:decision==='approve'&&row.kind==='new'};
        await db.updateRequest(rid,patch);return {...row,...patch};
      });
      return project(row);
    },
    retry:async(actor,input)=>{
      object(input,['id']);const rid=requestId(input.id);
      const row=await repository.transaction(async db=>{await root(db,actor);const r=await db.findRequest(rid);if(!r)fail('Request unavailable',404);if(r.status!=='approved')fail('Approved request required',409);await record(db,actor,'retry',r.uid,{request_id:rid,vdn_id:r.result_vdn_id});return {...r};});return project(row);
    },
    accounts:(actor,input={})=>repository.read(async db=>{
      await root(db,actor);object(input,['query','vdn_id']);const query=text(input.query,128,'account query',true);if(query&&query.length<3)fail('Search requires at least three characters');const filter=input.vdn_id==null?null:id(input.vdn_id);
      const items=[];for(const row of await db.findAccounts(query)) {
        const p=await principal(db,row.uid,false);if(!p.live)continue;if(filter&&!(await context(db,row.uid)).vdns.some(v=>v.id===filter))continue;
        items.push({...p.principal,verification_status:p.profile?.verification_status||'pending',legacy:!p.profile});
      }return {items};
    }),
    grants:(actor,input={})=>repository.read(async db=>{
      await root(db,actor);object(input,['vdn_id']);const filter=input.vdn_id==null?null:id(input.vdn_id),byKey=new Map();
      const explicit=await db.listGrants(null);
      const add=async g=>{if(filter&&Number(g.vdn_id)!==filter)return;const p=await principal(db,g.uid,false);byKey.set(g.uid+'|'+g.vdn_id,{uid:g.uid,name:p.principal.name,email:p.principal.email,vdn_id:Number(g.vdn_id),vdn_name:g.vdn_name||'',state:g.state,source:g.source});};
      // Repository returns the full legacy directory on empty search, bounded UI search is separate.
      const legacyRows=typeof db.listLegacyGrants==='function'?await db.listLegacyGrants():[];
      for(const g of legacyRows)await add({...g,state:'active',source:'legacy'});
      for(const g of explicit)await add(g);
      return {items:[...byKey.values()]};
    }),
    grant:async(actor,input)=>{
      object(input,['uid','vdn_id','identity_verified','note']);const target=uidValue(input.uid),vdn=id(input.vdn_id);text(input.note,1000,'note',true);
      if(input.identity_verified!==true)fail('Explicit identity verification required');if(target==='admin')fail('Root membership is implicit');
      return repository.transaction(async db=>{await root(db,actor);await verifiedGrant(db,actor,target,vdn,'direct');return {grant:{uid:target,vdn_id:vdn,state:'active',source:'direct'}};});
    },
    revoke:async(actor,input)=>{
      object(input,['uid','vdn_id','note']);const target=uidValue(input.uid),vdn=id(input.vdn_id);text(input.note,1000,'note',true);if(target==='admin')fail('Root membership is implicit');
      return repository.transaction(async db=>{await root(db,actor);if(!await db.findVdn(vdn))fail('Application target unavailable');
        const old=(await db.listGrants(target)).find(g=>Number(g.vdn_id)===vdn);
        await db.saveGrant({uid:target,vdn_id:vdn,state:'revoked',source:old?.source||'direct',granted_by:actor,identity_verified:Boolean(old?.identity_verified)});
        await record(db,actor,'revoke',target,{vdn_id:vdn});return {grant:{uid:target,vdn_id:vdn,state:'revoked',source:old?.source||'direct'}};
      });
    }
  };
  service.profile=service.getProfile;
  service.findAccounts=(actor,query)=>service.accounts(actor,typeof query==='string'?{query}:query);
  return service;
}
let singleton;
function getService() {
  if(!singleton)singleton=createService(require('../../dao/VdnAccessDao'),{syncVdn:id=>{
    const {scheduleNotify,SCOPE_VDN}=require('../smcicc/ccsReloadService');
    scheduleNotify({scope:SCOPE_VDN,vdnId:id,reason:'vdn-access-approval'});
    return require('./OmniUserSync').syncVdn(id);
  }});
  return singleton;
}
module.exports={createService,getService};
