<template>
  <main class="login-page">
    <section class="login-card" aria-labelledby="login-title">
      <div class="login-toolbar">
        <span class="login-brand">细语全媒体智能客服平台</span>
        <locale-select></locale-select>
      </div>
      <header class="login-heading">
        <h1 id="login-title">{{ $t('login.welcomeTitle') }}</h1>
        <p>{{ $t('login.platformDescription') }}</p>
      </header>
      <el-alert v-if="loginNotice" class="login-status" :title="loginNotice" :type="loginNoticeType" show-icon :closable="false" role="status" />
      <el-form ref="form" :model="$data" :rules="rules" label-position="top"
        :hide-required-asterisk="true" @submit.native.prevent="login">
        <el-form-item :label="$t('login.loginIdentifier')" prop="uid" for="login-username">
          <el-input id="login-username" v-model.trim="uid" autocomplete="username"
            :placeholder="$t('login.userNamePlaceholder')" :disabled="saving"></el-input>
        </el-form-item>
        <el-form-item :label="$t('login.password')" prop="password" for="login-password">
          <el-input id="login-password" v-model="password" type="password" show-password
            autocomplete="current-password" :placeholder="$t('login.passwordPlaceholder')"
            :disabled="saving"></el-input>
        </el-form-item>
        <el-form-item :label="$t('login.captcha')" prop="captcha" for="login-captcha">
          <div class="login-captcha-row">
            <el-input id="login-captcha" v-model.trim="captcha" type="text" autocomplete="off"
              :placeholder="$t('login.captchaPlaceholder')" :disabled="saving"></el-input>
            <button class="login-captcha-refresh" type="button" :disabled="saving"
              :title="$t('login.refreshCaptcha')" :aria-label="$t('login.refreshCaptcha')" @click="reloadCaptcha">
              <img :src="captchaUrl" :alt="$t('login.captcha')" />
            </button>
          </div>
        </el-form-item>
        <p class="login-captcha-hint">{{ $t('login.captchaHint') }}</p>
        <el-button class="login-submit" type="primary" native-type="submit" :loading="saving"
          :disabled="saving">{{ $t('login.login') }}</el-button>
      </el-form>
      <nav class="login-captcha-hint login-portal-links" aria-label="VDN 账户与申请">
        <a href="/vdn-access.html#/register">注册帐号</a>
      </nav>
    </section>
  </main>
</template>

<script>
import localeSelect from '../../components/locale-select.vue';
import sha1 from 'sha1';
export default {
  name: 'loginPage',
  components: { localeSelect },
  data() {
    return {
      uid: '', password: '', captcha: '', saving: false, enableLdap: false, loginNotice: '', loginNoticeType: 'info',
      captchaUrl: `/web/captcha?${Math.random()}`,
      rules: {
        uid: [
          { required: true, message: this.$t('login.loginIdentifierRequired'), trigger: 'blur' },
          { pattern: /^(?:[a-zA-Z0-9_]+|\+[1-9]\d{6,14}|[^\s@]+@[^\s@]+\.[^\s@]+)$/, max: 254, message: this.$t('login.loginIdentifierInvalid'), trigger: 'blur' }
        ],
        password: [{ required: true, message: this.$t('login.passwordTips'), trigger: 'blur' }],
        captcha: [{ required: true, message: this.$t('login.captchaTips'), trigger: 'blur' }]
      }
    };
  },
  computed: {
    redirectUrl() { return this.getQueryParam('redirect_url', '/'); }
  },
  methods: {
    checkEnableLdap() {
      this.$ajax.getJSON('/server/api/isEnableLdap')
        .then(data => { this.enableLdap = data.enableLdap || false; })
        .catch(() => {});
    },
    async login() {
      if (this.saving) return;
      this.saving = true; this.loginNotice = '';
      try {
        const valid = await new Promise(resolve => this.$refs.form.validate(resolve));
        if (!valid) return;
        const password = !this.enableLdap || this.uid === 'admin' ? sha1(this.password) : this.password;
        const data = await this.$ajax.postJSON('/server/api/login', {
          uid: this.uid, password, captcha: this.captcha
        });
        this.loginNotice = this.$t('login.statusSuccess'); this.loginNoticeType = 'success';
        this.$cookie.set('ticket', data.ticket);
        const redirectUrl = this.redirectUrl;
        location.href = redirectUrl + (redirectUrl.indexOf('?') === -1 ? '?' : '&') + 'ticket=' + data.ticket;
      } catch (err) {
        const status = err && err.data && err.data.login_status;
        const messages = { account_disabled: 'statusAccountDisabled', application_rejected: 'statusApplicationRejected', pending_review: 'statusReviewPending', application_required: 'statusApplicationRequired', not_authorized: 'statusAccessDenied', invalid_credentials: 'statusInvalidCredentials', invalid_captcha: 'statusInvalidCaptcha' };
        this.loginNotice = this.$t('login.' + (messages[status] || 'statusUnknownError'));
        this.loginNoticeType = status === 'pending_review' ? 'info' : ['application_required', 'not_authorized'].includes(status) ? 'warning' : 'error';
        this.reloadCaptcha();
      } finally {
        this.saving = false;
      }
    },
    getQueryParam(key, def) {
      return key ? new URLSearchParams(window.location.search).get(key) || def : def;
    },
    reloadCaptcha() {
      this.captcha = '';
      this.captchaUrl = `/web/captcha?${Math.random()}`;
      this.$refs.form.clearValidate('captcha');
    }
  },
  mounted() {
    this.uid = this.getQueryParam('user', '');
    this.checkEnableLdap();
  }
};
</script>

<style>
@import '../../assets/font/lato/Lato.css';
@import '../../assets/css/reset.css';
@import '../../assets/css/variable.css';
.login-page {
  min-height: 100vh;
  min-height: 100dvh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: #f4f6fa;
  color: #202a3a;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Microsoft YaHei', sans-serif;
}
.login-page .login-status { margin-bottom: 20px; }
.login-page .login-card {
  width: 460px;
  max-width: 100%;
  padding: 32px 40px 40px;
  background: #fff;
  border: 1px solid #e5e9f0;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(29, 45, 75, .06);
}
.login-page .login-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 32px; }
.login-page .login-brand { font-size: 15px; line-height: 24px; font-weight: 700; letter-spacing: .8px; color: #4657d5; }
.login-page .login-toolbar .el-input__inner { height: 34px !important; line-height: 34px !important; border-radius: 7px; font-size: 13px; }
.login-page .login-toolbar .el-input__icon { line-height: 34px; }
.login-page .login-heading { margin-bottom: 28px; }
.login-page h1 { margin: 0; font-size: 26px; line-height: 36px; font-weight: 600; letter-spacing: -.4px; }
.login-page .login-heading p { margin: 8px 0 0; color: #667085; font-size: 14px; line-height: 22px; }
.login-page .el-form-item { display: block; width: 100%; margin: 0 0 24px; }
.login-page .el-form-item__label { display: block; float: none; text-align: left; line-height: 22px; padding: 0 0 8px; font-size: 14px; font-weight: 500; color: #344054; }
.login-page .el-form-item__content { line-height: normal; }
.login-page .el-input { width: 100%; }
.login-page .el-form .el-input__inner { height: 46px !important; line-height: 46px !important; border-radius: 8px; font-size: 15px; padding-left: 14px; }
.login-page .el-form .el-input__inner:focus { border-color: #4657d5; box-shadow: 0 0 0 3px rgba(70, 87, 213, .1); }
.login-page .el-form .el-input__icon { line-height: 46px; }
.login-page .el-form-item__error { line-height: 18px; padding-top: 4px; }
.login-page .login-captcha-row { display: flex; align-items: center; gap: 12px; }
.login-page .login-captcha-row .el-input { flex: 1; min-width: 0; }
.login-page .login-captcha-refresh { flex: 0 0 120px; height: 46px; padding: 0; display: flex; align-items: center; justify-content: center; overflow: hidden; background: #f4f6fa; border: 1px solid #dcdfe6; border-radius: 8px; cursor: pointer; }
.login-page .login-captcha-refresh img { display: block; width: 100%; height: 100%; object-fit: contain; }
.login-page .login-captcha-refresh:focus-visible { outline: 3px solid rgba(70, 87, 213, .4); outline-offset: 2px; }
.login-page .login-captcha-refresh:disabled { cursor: wait; opacity: .6; }
.login-page .login-captcha-hint { margin: -2px 0 24px; color: #667085; font-size: 12px; line-height: 18px; }
.login-page .login-portal-links { margin: 16px 0 0; text-align: center; }
.login-page .login-portal-links a { color: #4657d5; font-size: 14px; text-decoration: none; }
.login-page .login-portal-links a:hover { color: #3848c2; text-decoration: underline; }
.login-page .login-submit { width: 100%; height: 46px; border-radius: 8px; font-size: 15px; font-weight: 600; background: #4657d5; border-color: #4657d5; }
.login-page .login-submit:hover, .login-page .login-submit:focus { background: #3848c2; border-color: #3848c2; }
.login-page .login-submit.is-disabled { background: #8290e4; border-color: #8290e4; }
@media (max-width: 520px) {
  .login-page { padding: 24px 16px; }
  .login-page .login-card { padding: 26px 24px 30px; }
  .login-page .login-toolbar { margin-bottom: 28px; }
  .login-page h1 { font-size: 24px; }
  .login-page .login-captcha-refresh { flex-basis: 108px; }
}
@media (max-height: 640px) { .login-page { align-items: flex-start; } }
</style>
