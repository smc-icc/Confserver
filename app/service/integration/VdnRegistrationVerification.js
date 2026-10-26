'use strict';
const crypto=require('node:crypto'),fs=require('node:fs');
function error(message,status=400,code='VALIDATION_ERROR'){return Object.assign(new Error(message),{status,code});}
function normalizePhone(value){let phone=typeof value==='string'?value.trim().replace(/[ -]/g,''):'';if(/^1[3-9]\d{9}$/.test(phone))phone='+86'+phone;if(!/^\+[1-9]\d{7,14}$/.test(phone))throw error('请填写有效手机号');return phone;}
function normalizeEmail(value){const email=typeof value==='string'?value.trim().toLowerCase():'';if(email.length>254||!/^[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@(?:[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?\.)+[a-z]{2,63}$/i.test(email))throw error('请填写有效邮箱');return email;}
function createVerification({repository,key,delivery}){
 if(!Buffer.isBuffer(key)||key.length<32)throw error('验证服务未配置',503,'DELIVERY_NOT_READY');
 const hash=(id,channel,code)=>crypto.createHmac('sha256',key).update(id+'\0'+channel+'\0'+code).digest('hex');
 const equal=(a,b)=>typeof a==='string'&&/^[a-f0-9]{64}$/.test(a)&&crypto.timingSafeEqual(Buffer.from(a,'hex'),Buffer.from(b,'hex'));
 return {
  async readiness(){try{const r=await delivery.readiness();return {ready:r.ready===true&&r.sms===true&&r.email===true,sms:r.sms===true,email:r.email===true};}catch{return {ready:false,sms:false,email:false};}},
  async issue(input,{ip='unknown'}={}){
   if(!input||Object.keys(input).some(k=>!['phone','email'].includes(k)))throw error('验证请求无效');
   const phone=normalizePhone(input.phone),email=normalizeEmail(input.email);
   let ready;try{ready=await delivery.readiness();}catch{}if(!ready||!ready.ready||!ready.sms||!ready.email)throw error('短信或邮箱验证服务未配置，请联系管理员',503,'DELIVERY_NOT_READY');
   const id=crypto.randomBytes(32).toString('hex'),sms=crypto.randomInt(0,1000000).toString().padStart(6,'0'),mail=crypto.randomInt(0,1000000).toString().padStart(6,'0');
   const result=await repository.transaction(async db=>{
    if(db.cleanupVerification)await db.cleanupVerification();
    for(const [bucket,window,max] of [['ip:'+String(ip).slice(0,100),3600,20],['phone:'+phone,86400,10],['email:'+email,86400,10],['cooldown:'+phone+':'+email,60,1]]){
     const key=crypto.createHash('sha256').update(bucket).digest('hex');if(!await db.rate(key,window,max))return {limited:true};
    }
    await db.insertVerification({id,phone,email,sms_hash:hash(id,'sms',sms),email_hash:hash(id,'email',mail),ttl:300});return {limited:false};
   });
   if(result.limited)throw error('验证码发送过于频繁，请稍后重试',429,'RATE_LIMITED');
   const sent=await Promise.allSettled([delivery.send({purpose:'verification',channel:'sms',to:phone,code:sms}),delivery.send({purpose:'verification',channel:'email',to:email,code:mail})]);
   const ok=sent.every(x=>x.status==='fulfilled');await repository.transaction(db=>db.setVerification(id,ok?'ready':'failed'));
   if(!ok)throw error('验证码发送失败，请稍后重试或联系管理员',503,'DELIVERY_FAILED');
   return {verification_id:id,expires_in:300,retry_after:60};
  },
  async consume(db,input){
   if(typeof input.verification_id!=='string'||!/^[a-f0-9]{64}$/.test(input.verification_id))return false;
   const row=await db.getVerification(input.verification_id);if(!row||row.state!=='ready'||!Number(row.valid)||Number(row.attempts)>=5)return false;
   const ok=row.phone===input.phone&&row.email===input.email&&/^\d{6}$/.test(String(input.phone_code))&&/^\d{6}$/.test(String(input.email_code))&&equal(row.sms_hash,hash(row.id,'sms',input.phone_code))&&equal(row.email_hash,hash(row.id,'email',input.email_code));
   if(!ok){await db.failVerification(row.id);return false;}await db.setVerification(row.id,'consumed');return true;
  }
 };
}
let singleton;
function getService(){if(!singleton){const file=process.env.CONF_REGISTRATION_OTP_KEY_FILE||process.env.PUSH_CONFIG_ENCRYPTION_KEY_FILE;if(!file)throw error('验证码服务未配置，请联系管理员',503,'DELIVERY_NOT_READY');let raw=fs.readFileSync(file,'utf8').trim();const secret=Buffer.from(raw,'base64');if(secret.length<32)throw error('验证服务未配置',503,'DELIVERY_NOT_READY');const key=crypto.createHmac('sha256',secret).update('conf-admin-registration-otp-v1').digest();singleton=createVerification({repository:require('../../dao/VdnManagerDao'),key,delivery:require('./VdnRegistrationDelivery')});}return singleton;}
module.exports={createVerification,getService,normalizePhone,normalizeEmail,error};
