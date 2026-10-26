<template>
  <div class="pass_page">
    <h1 class="top-title">
      {{$t('pass.title')}} 
      <div class="locale-wrap">
        <locale-select></locale-select>
      </div>
    </h1>
    <el-form
      ref="form"
      :model="$data"
      :rules="rules"
      inline
      label-position="top"
      itemWidth="440px"
      @submit.native.prevent="modify"
    >
      <el-form-item :label="$t('pass.password')" prop="password" required>
        <el-input
          type="password"
          size="small"
          v-model="password"
          required
          :required-tip="$t('pass.passwordTips')"
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('pass.repeatPassword')" prop="repeatPassword" required>
        <el-input
          type="password"
          size="small"
          v-model="repeatPassword"
          required
          :required-tip="$t('pass.repeatPasswordTips')"
        ></el-input>
      </el-form-item>

      <el-button type="primary" native-type="submit" :loading="saving" :disabled="saving">{{$t('pass.modify')}}</el-button>
      <el-button type="button" @click.prevent="toIndexPage" style="float:right;margin-right:12px;">{{$t('pass.toIndexPage')}}</el-button>
    </el-form>

  </div>
</template>

<script>
import localeSelect from '../../components/locale-select.vue';
import sha1 from 'sha1';

export default {
  name: 'pass_page',

  data() {
    return {
      // uid: '',
      password: '',
      repeatPassword: '',
      saving: false,
      rules: {
        password: [{ required: true, message: this.$t('pass.passwordTips'), trigger: 'blur' }],
        repeatPassword: [{ required: true, message: this.$t('pass.repeatPasswordTips'), trigger: 'blur' }]
      }
    };
  },
  components: {
    localeSelect
  },
  methods: {
    async modify() {
      if (this.saving) return;
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
        const current = await this.$ajax.getJSON('/server/api/getLoginUid');
        const passwordHash = sha1(this.password);
        const data = await this.$ajax.postJSON('/server/api/modifyPass', {
          password: passwordHash, repeat_password: passwordHash,
          ...(current.uid === 'admin' ? { omni_password: this.password } : {})
        });
        if (data && data.sync_pending) this.$tip.error(data.sync_message);
        else this.$tip.success(`${this.$t('pass.modifySucc')}`);
        if (!data || !data.sync_pending) setTimeout(() => this.toIndexPage(), 1000);
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
    toIndexPage(){
      location.href="/index.html";
    }
  },
};
</script>
<style>
  @import "../../assets/font/lato/Lato.css";
  @import '../../assets/css/reset.css';
  @import '../../assets/css/variable.css';
  .top-title{
    margin: 16px 0;
    line-height: 2.5;
    font-size: 18px;
    border-bottom: 1px solid #c5d9e8;
    position:relative;
  }
  .pass_page{
    width: 450px;
    margin: 100px auto;
  }
  .locale-wrap{
    position:absolute;
    right: 10px;
    top: -5px;
  }
</style>
