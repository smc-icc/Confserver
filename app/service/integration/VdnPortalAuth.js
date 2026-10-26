const crypto=require('node:crypto');
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
function digest(password){return crypto.createHash('sha1').update(password).digest('hex');}
function hashCredential(proof){const salt=crypto.randomBytes(16);return ['scrypt',salt.toString('base64'),crypto.scryptSync(proof,salt,32).toString('base64')].join('$');}
function verifyCredential(envelope,proof){try{const p=String(envelope).split('$');if(p.length!==3||p[0]!=='scrypt'||typeof proof!=='string'||!/^[a-f0-9]{40}$/i.test(proof))return false;const salt=Buffer.from(p[1],'base64'),expected=Buffer.from(p[2],'base64');if(salt.length!==16||expected.length!==32)return false;return crypto.timingSafeEqual(crypto.scryptSync(proof,salt,32),expected);}catch{return false;}}
// All registration writes use the ICC connection, including the qualified SSO
// table. A second Sequelize transaction cannot make cross-schema writes atomic.
function createRegistrationRepository({dao,iccSequelize,ssoSequelize}) {
 const icc=iccSequelize.config,sso=ssoSequelize.config;
 const identifier=value=>{if(typeof value!=='string'||!/^[A-Za-z0-9_]+$/.test(value))throw Error('Invalid registration schema');return '`'+value+'`';};
 const ssoTable=identifier(sso.database)+'.`t_user_info`';
 const mysql=db=>['mysql','mariadb'].includes(db.getDialect());
 const socket=conf=>conf.dialectOptions&&conf.dialectOptions.socketPath;
 function sameServer(){return mysql(iccSequelize)&&mysql(ssoSequelize)&&
  (socket(icc)||socket(sso)?socket(icc)===socket(sso):
   String(icc.host||'localhost').toLowerCase()===String(sso.host||'localhost').toLowerCase()&&Number(icc.port||3306)===Number(sso.port||3306));}
 const select=(sql,replacements,transaction)=>iccSequelize.query(sql,{replacements,transaction,type:require('sequelize').QueryTypes.SELECT,logging:false});
 const exec=(sql,replacements,transaction)=>iccSequelize.query(sql,{replacements,transaction,logging:false});
 return {
  transaction:async fn=>{
   if(!sameServer())fail('注册存储暂不可用',503);
   return dao.transaction(async transaction=>{
    // Inspect actual engines before even acquiring the lock with an INSERT.
    // Refuse missing/MyISAM tables; rollback must cover every write below.
    const tables=await select(`SELECT TABLE_SCHEMA AS schemaName, TABLE_NAME AS tableName, ENGINE AS engine
      FROM information_schema.TABLES WHERE
      (TABLE_SCHEMA=:ssoSchema AND TABLE_NAME='t_user_info') OR
      (TABLE_SCHEMA=:iccSchema AND TABLE_NAME IN ('t_conf_access_profiles','t_conf_vdn_access_audit','t_conf_onboard_state'))`,
      {ssoSchema:sso.database,iccSchema:icc.database},transaction);
    const required=[[sso.database,'t_user_info'],[icc.database,'t_conf_access_profiles'],[icc.database,'t_conf_vdn_access_audit'],[icc.database,'t_conf_onboard_state']];
    if(!required.every(([schema,table])=>tables.some(row=>row.schemaName===schema&&row.tableName===table&&String(row.engine).toLowerCase()==='innodb')))fail('注册存储暂不可用',503);
    await exec("INSERT INTO t_conf_onboard_state (VDNID,StateJson) VALUES (0,'{}') ON DUPLICATE KEY UPDATE VDNID=VALUES(VDNID)",{},transaction);
    await select('SELECT VDNID FROM t_conf_onboard_state WHERE VDNID=0 FOR UPDATE',{},transaction);
    return fn(transaction);
   });
  },
  findByEmail:(email,transaction)=>select(`SELECT uid FROM ${ssoTable} WHERE LOWER(TRIM(email))=:email LIMIT 1 FOR UPDATE`,{email},transaction),
  findIccEmail:(email,transaction)=>select('SELECT ID FROM t_user_users WHERE LOWER(TRIM(Email))=:email LIMIT 1',{email},transaction),
  createUser:(user,transaction)=>exec(`INSERT INTO ${ssoTable} (uid,email,password,update_time) VALUES (:uid,:email,:password,:update_time)`,user,transaction),
  registerProfile:async(profile,transaction)=>{
   await exec("INSERT INTO t_conf_access_profiles (UID,Name,Email,Enabled,VerificationStatus) VALUES (:uid,:name,:email,1,'pending')",profile,transaction);
   await exec("INSERT INTO t_conf_vdn_access_audit (Actor,Action,TargetUID,Outcome) VALUES (:uid,'register',:uid,'success')",{uid:profile.uid},transaction);
  },
  // Filter incomplete independent identities before LIMIT, retaining disabled
  // completed owners so their email can never be adopted by another account.
  findLoginEmailOwners:email=>{
   if(!sameServer())fail('登录存储暂不可用',503);
   return select(`SELECT s.uid,s.email,s.password FROM ${ssoTable} s
     LEFT JOIN t_conf_access_profiles p ON BINARY p.UID=BINARY s.uid
     WHERE LOWER(TRIM(s.email))=:email AND
     (LEFT(BINARY s.uid,13)<>BINARY 'conf-account:' OR p.UID IS NOT NULL) LIMIT 2`,{email});
  }
 };
}
function createAuth(repo){return {
 register:async input=>{
  if(!input||typeof input!=='object'||Object.keys(input).some(k=>!['name','email','password'].includes(k)))fail('注册信息格式不正确');
  const {password}=input,name=typeof input.name==='string'?input.name.trim():'',email=typeof input.email==='string'?input.email.trim().toLowerCase():'';
  if(!name||name.length>80||email.length>254||!/^\S+@[^\s@]+\.[^\s@]+$/.test(email)||typeof password!=='string'||password.length<12||password.length>128||Buffer.byteLength(password)>256||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))fail('请提供姓名、有效邮箱及至少12位包含字母和数字的密码');
  const uid='conf-account:'+crypto.randomUUID(),credential=hashCredential(digest(password));
  try{await repo.transaction(async transaction=>{
   if((await repo.findByEmail(email,transaction)).length||(await repo.findIccEmail(email,transaction)).length)fail('该邮箱不能用于新注册，请登录已有帐号或联系管理员',409);
   await repo.createUser({uid,email,password:credential,update_time:new Date()},transaction);
   await repo.registerProfile({uid,name,email},transaction);
  });}catch(e){if(e&&e.status===409)throw e;fail('注册未完成，请稍后重试或联系管理员',503);}
  return {registered:true,management_allowed:false,verification_status:'pending'};
 },
 findLoginEmailOwners:email=>repo.findLoginEmailOwners(email),
 authenticate:async(uid,proof)=>{const user=await repo.findByUid(uid);const profile=repo.getProfile?await repo.getProfile(uid):null;if(repo.getProfile&&(!profile||Number(profile.enabled)!==1))return false;return Boolean(user&&verifyCredential(user.password,proof));},
};}
let auth;
function getAuth(){
 if(!auth){
  const Login=require('../../../sso/dao/LoginDao'),sso=require('../../../sso/dao/db').db_user_system.sequelize;
  const icc=require('../../dao/db').db_smcicc.sequelize,dao=require('../../dao/OnboardDao');
  auth=createAuth({...createRegistrationRepository({dao,iccSequelize:icc,ssoSequelize:sso}),
   findByUid:uid=>Login.getUserInfoByUid(uid),
   getProfile:uid=>require('./VdnAccessService').getService().findProfile(uid)});
 }
 auth.findLoginPhoneOwners=async phone=>{const a=await require('../../dao/VdnManagerDao').read(db=>db.getAccountByPhone(phone));if(!a)return [];const user=await require('../../../sso/dao/LoginDao').getUserInfoByUid(a.uid);return user?[user]:[];};
 return auth;
}
module.exports={createAuth,createRegistrationRepository,getAuth,digest,hashCredential,verifyCredential};
