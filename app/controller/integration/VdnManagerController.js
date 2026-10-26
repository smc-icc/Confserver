'use strict';
const Captcha=require('../../service/auth/CaptchaChallengeStore');const {mutationGuard}=require('./VdnAccessController');
function fail(message,status=400,code){throw Object.assign(new Error(message),{status,code});}
function fields(body,allowed){if(!body||typeof body!=='object'||Array.isArray(body)||Object.keys(body).some(k=>!allowed.includes(k)))fail('请求字段无效');return body;}
function createController({service,registration,verification,captcha=Captcha}={}){
 const controller={};const resolve=()=>service||require('../../service/integration/VdnManagerService').getService();
 for(const [action,method,allowed] of [['accounts','accounts',['status','limit']],['review','review',['uid','decision','note','legacy_identity_verified']],['setEnabled','setEnabled',['uid','enabled','note']],['retryNotifications','retryNotifications',['uid']],['vdns','vdns',[]],['managers','managers',['id']],['invite','invite',['id','email']],['removeManager','removeManager',['id','uid']],['createVdn','createVdn',['name','request_id']],['updateVdn','updateVdn',['id','name']],['retryVdn','retry',['id']]])controller[action]=async ctx=>{
  try{if(!ctx.uid)fail('请先登录',401);if(ctx.method!=='GET')mutationGuard(ctx);const body=ctx.method==='GET'?{...(ctx.query||{})}:(ctx.request.body||{});delete body.ticket;fields(body,allowed);const data=await resolve()[method](ctx.uid,body);ctx.set&&ctx.set('Cache-Control','no-store');ctx.body={ret_code:200,data};}catch(e){ctx.status=e.status||503;ctx.body={ret_code:ctx.status,err_msg:e.status?e.message:'未知错误，请联系管理员'};}
 };
 controller.readiness=async ctx=>{let data={ready:false,sms:false,email:false};try{data=await(verification||require('../../service/integration/VdnRegistrationVerification').getService()).readiness();}catch{}ctx.set&&ctx.set('Cache-Control','no-store');ctx.body={ret_code:200,data};};
 controller.verification=async ctx=>{
  try{mutationGuard(ctx);const b=fields(ctx.request.body||{},['phone','email','captcha']);if(!await captcha.consumeSession(ctx,b.captcha))fail('验证码不正确或已使用',400,'CAPTCHA_INVALID');const v=verification||require('../../service/integration/VdnRegistrationVerification').getService();const data=await v.issue({phone:b.phone,email:b.email},{ip:ctx.ip});ctx.body={ret_code:200,data};}catch(e){ctx.status=e.status||503;ctx.body={ret_code:ctx.status,err_msg:e.status?e.message:'验证码服务不可用，请联系管理员',err_code:e.code||'VERIFICATION_UNAVAILABLE'};}
 };
 controller.register=async ctx=>{
  try{mutationGuard(ctx);const b=fields(ctx.request.body||{},['name','company','phone','email','password','verification_id','phone_code','email_code']);const r=registration||require('../../service/integration/VdnManagerRegistration').getService();const data=await r.register(b);ctx.body={ret_code:200,data};}catch(e){ctx.status=e.status||503;ctx.body={ret_code:ctx.status,err_msg:e.status?e.message:'注册失败，请联系管理员',err_code:e.code||'REGISTRATION_UNAVAILABLE'};}
 };
 return controller;
}
module.exports={...createController(),createController};
