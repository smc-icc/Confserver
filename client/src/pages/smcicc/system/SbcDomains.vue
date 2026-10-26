<template>
  <section class="sbc-domains" v-loading="loading">
    <header class="page-heading">
      <div>
        <h1>SIP 域名</h1>
        <p>配置话机注册和呼入时接受的内部域名与公网域名。保存后立即用于路由判断，无需重启。</p>
      </div>
      <el-button :disabled="busy || loading" @click="load">刷新配置</el-button>
    </header>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" role="alert" />
    <el-alert v-if="notice" :title="notice" type="success" show-icon :closable="false" role="status" />
    <el-form v-if="loaded" label-position="top" size="small" :disabled="busy || loading" @submit.native.prevent="save">
      <section class="config-card" aria-label="SIP 域名">
        <el-form-item label="内部域名" required>
          <el-input v-model="form.internal" maxlength="253" autocomplete="off" aria-label="内部域名" placeholder="cloud-sbc.internal.invalid" />
        </el-form-item>
        <el-form-item label="公网域名" required>
          <el-input v-model="form.publicDomain" maxlength="253" autocomplete="off" aria-label="公网域名" placeholder="omni.seami.cloud" />
        </el-form-item>
        <p class="hint">话机对外注册使用公网域名，目录里保存的可以是内部域名。两个名字互相认可，不能填 IP、端口或通配符。</p>
        <p v-if="source === 'default'" class="hint">当前使用内置默认值。保存后写入本机配置。</p>
      </section>
      <div class="save-bar">
        <el-button type="primary" native-type="submit" :disabled="busy || loading || !dirty" :loading="busy">保存配置</el-button>
        <span>{{ dirty ? '有尚未保存的修改。' : '已与当前生效配置一致。' }}</span>
      </div>
    </el-form>
  </section>
</template>

<script>
const API = '/server/api/smcicc/manager/sbc-domains';
export default {
  name: 'SbcDomains',
  data: () => ({ form: { internal: '', publicDomain: '' }, clean: '', source: '', loaded: false, loading: false, busy: false, error: '', notice: '' }),
  computed: { dirty() { return this.loaded && JSON.stringify(this.form) !== this.clean; } },
  mounted() { this.load(); },
  methods: {
    failure(e) {
      const status = e && (e.ret_code || e.status);
      this.error = e && typeof e.err_msg === 'string' ? e.err_msg : status === 403 ? '仅超级管理员可配置 SIP 域名。' : '操作未完成，请稍后重试。';
    },
    apply(data) {
      if (!data || typeof data.internal !== 'string' || typeof data.publicDomain !== 'string') throw new Error('Invalid configuration');
      this.form = { internal: data.internal, publicDomain: data.publicDomain };
      this.source = data.source || '';
      this.clean = JSON.stringify(this.form);
      this.loaded = true;
    },
    async load() {
      if (this.busy || this.loading) return;
      this.loading = true; this.loaded = false; this.error = ''; this.notice = '';
      try {
        const response = await this.$axios.get('/pages' + API);
        const result = response && response.data;
        if (!result || result.ret_code !== 200) throw result || {};
        this.apply(result.data);
      } catch (e) { this.failure(e && e.response && e.response.data || e); }
      finally { this.loading = false; }
    },
    async save() {
      if (!this.dirty || this.busy || this.loading) return;
      this.busy = true; this.error = ''; this.notice = '';
      try {
        const response = await this.$axios.post('/pages' + API + '/save', { internal: this.form.internal.trim(), publicDomain: this.form.publicDomain.trim() });
        const result = response && response.data;
        if (!result || result.ret_code !== 200) throw result || {};
        this.apply(result.data);
        this.notice = 'SIP 域名已保存，新的注册和呼入立即按此判断。';
      } catch (e) { this.failure(e && e.response && e.response.data || e); }
      finally { this.busy = false; }
    },
  },
};
</script>

<style scoped>
.sbc-domains { max-width: 720px; padding: 24px; color: #303133; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
h1 { font-size: 22px; margin: 0 0 8px; }
p { line-height: 1.7; margin: 0; }
.page-heading p, .hint, .save-bar span { color: #606266; font-size: 13px; }
.config-card { border: 1px solid #e4e7ed; border-radius: 6px; padding: 24px; background: #fff; }
.hint { margin-top: 8px; }
.save-bar { display: flex; align-items: center; gap: 16px; margin: 24px 0; }
.el-alert { margin: 12px 0; }
@media (max-width: 520px) { .sbc-domains { padding: 12px; } .save-bar { align-items: flex-start; flex-direction: column; } }
</style>
