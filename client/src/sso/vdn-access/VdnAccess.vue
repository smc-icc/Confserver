<template>
  <main class="registration-page" v-loading="loading" :aria-busy="loading || busy || sending">
    <section v-if="submitted" class="registration-card receipt">
      <el-alert :title="text('registrationSubmitted')" type="success" show-icon :closable="false" role="status" />
      <p><a href="/login.html">{{ text('backToLogin') }}</a></p>
    </section>
    <section v-else class="registration-card">
      <h1>{{ text('registerAccount') }}</h1>
      <p class="hint">{{ text('registrationHint') }}</p>
      <el-alert v-if="!loading && !ready" :title="text('deliveryNotReady')" type="warning" show-icon :closable="false" />
      <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" role="alert" />
      <el-form label-position="top" :disabled="busy || sending || loading" @submit.native.prevent="submitRegistration">
        <el-form-item :label="text('name')" required><el-input v-model.trim="form.name" maxlength="80" autocomplete="name" /></el-form-item>
        <el-form-item :label="text('company')" required><el-input v-model.trim="form.company" maxlength="200" autocomplete="organization" /></el-form-item>
        <el-form-item :label="text('phone')" required><el-input v-model.trim="form.phone" maxlength="32" type="tel" autocomplete="tel" @input="invalidateVerification" /></el-form-item>
        <el-form-item :label="text('contactEmail')" required><el-input v-model.trim="form.email" maxlength="254" type="email" autocomplete="email" @input="invalidateVerification" /></el-form-item>
        <el-form-item :label="text('password')" required><el-input v-model="form.password" type="password" maxlength="128" autocomplete="new-password" /><p class="hint">{{ text('passwordRequirement') }}</p></el-form-item>
        <el-form-item :label="text('sendCaptcha')"><div class="captcha-row"><el-input v-model.trim="captcha" maxlength="16" autocomplete="off" /><button type="button" :disabled="busy || sending" :aria-label="text('refreshCaptcha')" @click="refreshCaptcha"><img :src="captchaUrl" :alt="text('refreshCaptcha')" /></button></div></el-form-item>
        <el-button class="send-codes" native-type="button" :loading="sending" :disabled="!ready || cooldown > 0 || busy" @click="sendCodes">{{ cooldown > 0 ? text('resendAfter') + ' ' + cooldown + 's' : text('sendCodes') }}</el-button>
        <el-form-item :label="text('phoneCode')" required><el-input v-model.trim="form.phone_code" maxlength="6" inputmode="numeric" autocomplete="one-time-code" /></el-form-item>
        <el-form-item :label="text('emailCode')" required><el-input v-model.trim="form.email_code" maxlength="6" inputmode="numeric" autocomplete="off" /></el-form-item>
        <el-button type="primary" native-type="submit" :loading="busy" :disabled="!ready || !verificationId || sending">{{ text('submitRegistration') }}</el-button>
        <a class="login-link" href="/login.html">{{ text('haveAccount') }}</a>
      </el-form>
    </section>
  </main>
</template>
<script>
import { createPortalApi } from './api';
export default {
  name: 'VdnAccess',
  data: () => ({ form:{name:'',company:'',phone:'',email:'',password:'',phone_code:'',email_code:''},captcha:'',captchaUrl:'',verificationId:'',ready:false,submitted:false,loading:false,sending:false,busy:false,error:'',cooldown:0,deadline:0,timer:null }),
  created(){this.refreshCaptcha();this.loadReadiness();},
  beforeDestroy(){clearInterval(this.timer);this.form.password='';this.form.phone_code='';this.form.email_code='';},
  methods:{
    text(key){return this.$t('smcicc.vdnAccess.'+key);},api(){return this.$portalApi||createPortalApi();},
    refreshCaptcha(){this.captcha='';this.captchaUrl='/web/captcha?v='+Date.now()+'-'+Math.random();},
    invalidateVerification(){this.verificationId='';this.form.phone_code='';this.form.email_code='';},
    async loadReadiness(){this.loading=true;try{const r=await this.api().readiness();this.ready=r.ready===true&&r.sms===true&&r.email===true;}catch{this.ready=false;}finally{this.loading=false;}},
    failure(e){const messages={DELIVERY_NOT_READY:'deliveryNotReady',DELIVERY_FAILED:'deliveryFailed',VERIFICATION_INVALID:'verificationInvalid',CONTACT_EXISTS:'contactExists',CAPTCHA_INVALID:'captchaInvalid',RATE_LIMITED:'rateLimited'};this.error=this.text(messages[e&&e.code]||(Number(e&&e.status)===429?'rateLimited':Number(e&&e.status)===400?'registrationInvalid':'requestFailed'));},
    async sendCodes(){
      if(this.sending||this.busy||this.loading||!this.ready||this.cooldown>0)return;
      if(!this.form.phone.trim()||!/^\S+@[^\s@]+\.[^\s@]+$/.test(this.form.email)||!this.captcha){this.error=this.text('verificationFieldsRequired');return;}
      this.sending=true;this.error='';this.invalidateVerification();
      try{const r=await this.api().verification({phone:this.form.phone,email:this.form.email,captcha:this.captcha});if(typeof r.verification_id!=='string'||!/^[a-f0-9]{64}$/.test(r.verification_id))throw Error('Invalid verification response');this.verificationId=r.verification_id;this.deadline=Date.now()+60000;this.cooldown=60;clearInterval(this.timer);this.timer=setInterval(()=>{this.cooldown=Math.max(0,Math.ceil((this.deadline-Date.now())/1000));if(!this.cooldown)clearInterval(this.timer);},1000);}catch(e){this.failure(e);}finally{this.refreshCaptcha();this.sending=false;}
    },
    async submitRegistration(){
      if(this.busy||this.sending||this.loading||!this.ready||!this.verificationId)return;
      const f=this.form;if(!f.name||!f.company||!/^\d{6}$/.test(f.phone_code)||!/^\d{6}$/.test(f.email_code)||f.password.length<12||!/[a-z]/i.test(f.password)||!/[0-9]/.test(f.password)){this.error=this.text('registrationInvalid');return;}
      this.busy=true;this.error='';try{const r=await this.api().register({...f,verification_id:this.verificationId});if(r.registered!==true||r.status!=='pending')throw Error('Invalid registration response');this.submitted=true;clearInterval(this.timer);}catch(e){this.failure(e);}finally{this.form.password='';this.form.phone_code='';this.form.email_code='';this.busy=false;}
    }
  }
};
</script>
<style scoped>
.registration-page {
  min-height: 100vh;
  min-height: 100dvh;
  box-sizing: border-box;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  padding: 40px 20px 64px;
  background: #f4f6fa;
  color: #202a3a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
.registration-card {
  width: min(680px, 100%);
  box-sizing: border-box;
  padding: 34px 42px 40px;
  background: #fff;
  border: 1px solid #e5e9f0;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(29, 45, 75, .06);
}
.registration-card h1 {
  margin: 0;
  font-size: 28px;
  line-height: 38px;
  font-weight: 600;
  letter-spacing: -.4px;
}
.registration-card > .hint {
  margin: 8px 0 24px;
  color: #667085;
  font-size: 14px;
  line-height: 22px;
}
.registration-card > .el-alert { margin-bottom: 20px; }
.registration-card form {
  box-sizing: border-box;
  padding: 26px 28px 24px;
  background: #fbfcff;
  border: 1px solid #edf0f5;
  border-radius: 14px;
}
.registration-card .el-form-item {
  display: block;
  width: 100%;
  margin: 0 0 20px;
}
.registration-card .el-form-item__label {
  display: block;
  float: none;
  line-height: 22px;
  padding: 0 0 8px;
  color: #344054;
  font-size: 14px;
  font-weight: 500;
}
.registration-card .el-form-item__content { line-height: normal; }
.registration-card .el-input { width: 100%; }
.registration-card .el-input__inner {
  height: 46px !important;
  line-height: 46px !important;
  border-radius: 8px;
  font-size: 15px;
  background: #fff;
}
.registration-card .el-input__inner:focus {
  border-color: #4657d5;
  box-shadow: 0 0 0 3px rgba(70, 87, 213, .1);
}
.registration-card .hint {
  color: #667085;
  font-size: 12px;
  line-height: 18px;
}
.registration-card .captcha-row {
  display: flex;
  align-items: center;
  gap: 12px;
}
.registration-card .captcha-row .el-input { flex: 1; min-width: 0; }
.registration-card .captcha-row button {
  flex: 0 0 120px;
  height: 46px;
  padding: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  background: #f4f6fa;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  cursor: pointer;
}
.registration-card .captcha-row img { display: block; width: 100%; height: 100%; object-fit: contain; }
.registration-card .captcha-row button:disabled { cursor: wait; opacity: .6; }
.registration-card .send-codes {
  width: 100%;
  height: 42px;
  margin: -2px 0 20px;
  border-radius: 8px;
  color: #4657d5;
  background: #eef0ff;
  border-color: #d9ddff;
}
.registration-card > form > .el-button[type="submit"] {
  width: 100%;
  height: 46px;
  margin-top: 4px;
  border-radius: 8px;
  font-size: 15px;
  font-weight: 600;
  background: #4657d5;
  border-color: #4657d5;
}
.registration-card .login-link {
  display: block;
  margin-top: 18px;
  color: #4657d5;
  font-size: 14px;
  line-height: 20px;
  text-align: center;
  text-decoration: none;
}
.registration-card .login-link:hover { color: #3848c2; text-decoration: underline; }
.registration-card.receipt { margin-top: 40px; text-align: center; }
.registration-card.receipt p { margin: 20px 0 0; }
.registration-card a { color: #4657d5; }
@media (max-width: 620px) {
  .registration-page { padding: 24px 16px 40px; }
  .registration-card { padding: 26px 20px 28px; }
  .registration-card form { padding: 22px 18px 20px; }
  .registration-card h1 { font-size: 24px; line-height: 34px; }
  .registration-card .captcha-row button { flex-basis: 108px; }
}
</style>
