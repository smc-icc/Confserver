<template>
  <main class="admin_pass_page">
    <section class="setup-card" aria-labelledby="setup-title">
      <div class="setup-toolbar">
        <span class="setup-brand">SMC · ICC</span>
        <locale-select></locale-select>
      </div>
      <h1 id="setup-title">{{$t('pass.adminTitle')}}</h1>
      <p class="setup-description">{{$t('pass.adminSetupDescription')}}</p>
      <el-form ref="form" :model="$data" :rules="rules" label-position="top"
        :hide-required-asterisk="true" @submit.native.prevent="modify">
        <el-form-item :label="$t('pass.adminEmailLabel')" prop="email">
          <el-input v-model.trim="email" type="email" autocomplete="email" maxlength="254"
            :placeholder="$t('pass.adminEmailPlaceholder')" :disabled="saving"></el-input>
        </el-form-item>
        <el-form-item :label="$t('pass.adminPasswordLabel')" prop="password">
          <el-input v-model="password" type="password" autocomplete="new-password" show-password
            :placeholder="$t('pass.adminPasswordPlaceholder')" :disabled="saving"></el-input>
        </el-form-item>
        <el-form-item :label="$t('pass.adminRepeatLabel')" prop="repeatPassword">
          <el-input v-model="repeatPassword" type="password" autocomplete="new-password" show-password
            :placeholder="$t('pass.adminRepeatPlaceholder')" :disabled="saving"></el-input>
        </el-form-item>
        <el-button class="setup-submit" type="primary" native-type="submit"
          :loading="saving" :disabled="saving">{{$t('pass.adminSetupSubmit')}}</el-button>
      </el-form>
      <p class="setup-footnote">{{$t('pass.adminSetupHint')}}</p>
    </section>
  </main>
</template>

<script>
import localeSelect from '../../components/locale-select.vue';
import sha1 from 'sha1';

export default {
  name: 'admin_pass_page',

  data() {
    return {
      email: '',
      password: '',
      repeatPassword: '',
      saving: false,
      rules: {
        email: [
          { required: true, message: this.$t('pass.adminEmailRequired'), trigger: 'blur' },
          { type: 'email', max: 254, message: this.$t('pass.adminEmailInvalid'), trigger: 'blur' }
        ],
        password: [{ required: true, message: this.$t('pass.passwordTips'), trigger: 'blur' }],
        repeatPassword: [{ required: true, message: this.$t('pass.repeatPasswordTips'), trigger: 'blur' }]
      }
    };
  },
  computed: {
    redirectUrl(){
      var key = 'redirect_url=';
      var idx = location.search.indexOf(key);
      if(idx > -1){
        return decodeURIComponent(location.search.substring(idx + key.length));
      }else{
        return '/';
      }
    }
  },
  components: {
    localeSelect
  },
  methods: {
    async modify() {
      if (this.saving) return;
      // Element UI validates asynchronously; the legacy synchronous guard
      // returned before sending the first-admin request when no model existed.
      this.saving = true;
      let loading;
      try {
        const valid = await new Promise(resolve => this.$refs.form.validate(resolve));
        if (!valid) return;
        if (!this.checkRepeatPwdValid()) {
          this.$tip.error(`${this.$t('pass.passwordDiff')}`);
          return;
        }
        loading = this.$Loading.show();
        const passwordHash = sha1(this.password);
        const result = await this.$ajax.postJSON('/server/api/adminModifyPass', {
          email: this.email.trim().toLowerCase(), password: passwordHash, repeat_password: passwordHash, omni_password: this.password
        });
        if (result && result.sync_pending) this.$tip.error(result.sync_message);
        else this.$tip.success(`${this.$t('pass.modifySucc')}`);
        setTimeout(() => this.toLoginPage(), 1000);
      } catch (err) {
        this.$tip.error(`${this.$t('pass.modifyFailed')}: ${err.err_msg || err.message}`);
      } finally {
        if (loading) loading.hide();
        this.saving = false;
      }
    },
    checkRepeatPwdValid(){
      return this.repeatPassword === this.password;
    },
    toLoginPage(){
      location.href=this.redirectUrl + (this.redirectUrl.indexOf('?') === -1?'?':'&') + "user=admin";
    }
  },
};
</script>
<style>
@import "../../assets/font/lato/Lato.css";
@import '../../assets/css/reset.css';
@import '../../assets/css/variable.css';
.admin_pass_page {
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 20px;
  background: #f4f6fa;
  color: #202a3a;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", "Microsoft YaHei", sans-serif;
}
.admin_pass_page .setup-card {
  width: 560px;
  max-width: 100%;
  box-sizing: border-box;
  padding: 36px 40px;
  background: #fff;
  border: 1px solid #e5e9f0;
  border-radius: 16px;
  box-shadow: 0 12px 40px rgba(29, 45, 75, .06);
}
.admin_pass_page .setup-toolbar { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 28px; }
.admin_pass_page .setup-brand { font-size: 14px; font-weight: 700; letter-spacing: 2px; color: #5258d9; }
.admin_pass_page h1 { margin: 0 0 12px; font-size: 24px; font-weight: 600; line-height: 1.5; }
.admin_pass_page .setup-description { color: #667085; font-size: 14px; line-height: 1.7; margin: 0 0 28px; }
.admin_pass_page .el-form-item { display: block; width: 100%; margin-bottom: 24px; }
.admin_pass_page .el-form-item__label { display: block; float: none; text-align: left; line-height: 22px; padding: 0 0 8px; font-size: 14px; color: #344054; }
.admin_pass_page .el-input { width: 100%; }
.admin_pass_page .el-form .el-input__inner { height: 46px !important; line-height: 46px !important; border-radius: 8px; font-size: 15px; }
.admin_pass_page .setup-submit { width: 100%; min-height: 46px; margin-top: 4px; border-radius: 8px; font-size: 15px; }
.admin_pass_page .setup-footnote { margin: 20px 0 0; color: #667085; font-size: 12px; line-height: 1.8; }
@media (max-width: 600px) {
  .admin_pass_page { padding: 20px 16px; align-items: flex-start; }
  .admin_pass_page .setup-card { padding: 28px 22px; }
  .admin_pass_page h1 { font-size: 21px; }
}
</style>
