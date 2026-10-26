'use strict';
const crypto=require('node:crypto');const {normalizePhone,normalizeEmail,error}=require('./VdnRegistrationVerification');const {hashCredential,digest}=require('./VdnPortalAuth');const {enqueue}=require('./VdnManagerService');
function createRegistration({credentials,manager,verification}){return {
 async register(input){
  if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).some(k=>!['name','company','phone','email','password','verification_id','phone_code','email_code'].includes(k)))throw error('注册字段无效');
  const name=typeof input.name==='string'?input.name.trim():'',company=typeof input.company==='string'?input.company.trim():'',phone=normalizePhone(input.phone),email=normalizeEmail(input.email),password=input.password;
  if(!name||name.length>80||!company||company.length>200||typeof password!=='string'||password.length<12||password.length>128||Buffer.byteLength(password)>256||!/[A-Za-z]/.test(password)||!/[0-9]/.test(password))throw error('请填写姓名、企业名称和至少12位包含字母及数字的密码');
  let result;
  try{result=await credentials.transaction(async tx=>{
   const db=manager.methods(tx);await db.assertEngines();
   if(!await verification.consume(db,{...input,phone,email}))return {verification_error:true};
   if((await credentials.findByEmail(email,tx)).length||(await credentials.findIccEmail(email,tx)).length||await db.findPhone(phone))throw error('手机号或邮箱已被注册，请登录已有账号或联系管理员',409,'CONTACT_EXISTS');
   const uid='conf-account:'+crypto.randomUUID();await credentials.createUser({uid,email,password:hashCredential(digest(password)),update_time:new Date()},tx);await credentials.registerProfile({uid,name,email},tx);
   const account={uid,name,company,phone,email,status:'pending'};await db.insertAccount(account);await enqueue(db,account,'submitted',0);return {registered:true,status:'pending',review_due_days:3};
  });}catch(e){if(e.status===409)throw e;throw error('注册未完成，请稍后重试或联系管理员',503);}
  if(result.verification_error)throw error('手机或邮箱验证码无效、已过期或已使用',400,'VERIFICATION_INVALID');return result;
 }
};}
let singleton;function getService(){if(!singleton){const Auth=require('./VdnPortalAuth'),icc=require('../../dao/db').db_smcicc.sequelize,sso=require('../../../sso/dao/db').db_user_system.sequelize;singleton=createRegistration({credentials:Auth.createRegistrationRepository({dao:require('../../dao/OnboardDao'),iccSequelize:icc,ssoSequelize:sso}),manager:require('../../dao/VdnManagerDao'),verification:require('./VdnRegistrationVerification').getService()});}return singleton;}
module.exports={createRegistration,getService};
