<template>
  <section class="registration-notifications" v-loading="loading">
    <header class="page-heading">
      <div><h1>注册通知配置</h1><p>配置注册验证码、申请回执和审核结果的发送服务。</p></div>
      <el-button :disabled="busy || loading" @click="load">刷新配置</el-button>
    </header>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" role="alert" />
    <el-alert v-if="notice" :title="notice" type="success" show-icon :closable="false" role="status" />
    <template v-if="loaded">
      <div class="readiness"><el-tag :type="readiness.sms ? 'success' : 'warning'">短信：{{ readiness.sms ? '参数已就绪' : '待配置' }}</el-tag><el-tag :type="readiness.email ? 'success' : 'warning'">邮件：{{ readiness.email ? '参数已就绪' : '待配置' }}</el-tag><span>参数就绪后，请测试确认实际收件。</span></div>
      <el-alert v-if="!writable" title="配置加密密钥不可用，请联系运维配置后刷新。" type="warning" :closable="false" show-icon />
      <p v-if="source === 'legacy'" class="hint">当前兼容读取原有发送配置。保存后，注册通知将使用本页的独立配置。</p>
      <el-form label-position="top" size="small" :disabled="busy || loading || !writable" @submit.native.prevent="save">
        <div class="config-grid">
          <section class="config-card" aria-label="注册短信配置">
            <h2>注册短信</h2>
            <el-form-item label="启用注册短信"><el-switch v-model="form.sms.enabled" aria-label="启用注册短信" /></el-form-item>
            <el-form-item label="短信接入方式">
              <el-select v-model="form.sms.provider" aria-label="短信接入方式" @change="onSmsProviderChange">
                <el-option label="通用 HTTP 短信网关" value="generic" />
                <el-option label="阿里云短信（直接接入）" value="aliyun" />
              </el-select>
            </el-form-item>
            <p v-if="form.sms.provider === 'aliyun'" class="hint">直接连接阿里云国内短信接口，由服务端生成签名。AccessKey 加密保存，不在页面回显。请使用具有短信发送权限的 RAM 用户 AccessKey。</p>
            <p v-else class="hint">使用通用 HTTP 短信网关，以 POST JSON 发送。网关需适配短信服务商接口；请求地址中的密钥应改放到鉴权请求头或附加参数。</p>
            <el-form-item :label="form.sms.provider === 'aliyun' ? '阿里云接口地址' : '网关地址'" :required="form.sms.enabled"><el-input v-model="form.sms.endpoint" :placeholder="form.sms.provider === 'aliyun' ? 'https://dysmsapi.aliyuncs.com/' : 'https://短信网关地址/send'" maxlength="2048" aria-label="短信网关地址" /></el-form-item>
            <template v-if="form.sms.provider === 'aliyun'">
              <el-form-item label="AccessKey ID" :required="form.sms.enabled">
                <el-tag size="mini" :type="configured.accessKeyId ? 'success' : 'info'">{{ configured.accessKeyId ? '已配置（不回显）' : '未配置' }}</el-tag>
                <el-input v-model.trim="form.sms.access_key_id" type="password" show-password maxlength="256" autocomplete="new-password" placeholder="首次必填；留空保留已保存的 AccessKey ID" aria-label="AccessKey ID" />
              </el-form-item>
              <el-form-item label="AccessKey Secret" :required="form.sms.enabled">
                <el-tag size="mini" :type="configured.accessKeySecret ? 'success' : 'info'">{{ configured.accessKeySecret ? '已配置（不回显）' : '未配置' }}</el-tag>
                <el-input v-model.trim="form.sms.access_key_secret" type="password" show-password maxlength="512" autocomplete="new-password" placeholder="首次或更换 ID 时必填；留空保留 Secret" aria-label="AccessKey Secret" />
                <el-checkbox v-model="form.sms.clear_access_key">清除已保存的 AccessKey（需先关闭短信）</el-checkbox>
              </el-form-item>
            </template>
            <el-form-item label="短信签名" :required="form.sms.enabled && form.sms.provider === 'aliyun'"><el-input v-model="form.sms.sign_name" maxlength="100" aria-label="短信签名" /></el-form-item>
            <el-form-item label="注册验证码模板 ID" :required="form.sms.enabled"><el-input v-model="form.sms.registration_template_id" maxlength="200" aria-label="注册验证码模板 ID" /></el-form-item>
            <el-form-item label="申请及审核通知模板 ID" :required="form.sms.enabled"><el-input v-model="form.sms.registration_notice_template_id" maxlength="200" aria-label="申请及审核通知模板 ID" /></el-form-item>
            <p v-if="form.sms.provider === 'aliyun'" class="hint">模板 Code 形如 SMS_123456。验证码模板变量为 code；申请及审核通知请使用不含变量的通知模板，不要填验证码模板。</p>
            <template v-if="form.sms.provider !== 'aliyun'">
            <el-form-item label="鉴权请求头（JSON 对象）">
              <el-tag size="mini" :type="configured.headers ? 'success' : 'info'">{{ configured.headers ? '已配置' : '未配置' }}</el-tag>
              <el-input v-model="form.sms.headers_json" type="textarea" :rows="3" :disabled="form.sms.clear_headers" placeholder="留空保留原值；例如包含 Authorization 的 JSON 对象" autocomplete="off" aria-label="短信鉴权请求头" />
              <el-checkbox v-model="form.sms.clear_headers">清除已保存的请求头</el-checkbox>
            </el-form-item>
            <el-form-item label="附加请求参数（JSON 对象）">
              <el-tag size="mini" :type="configured.body ? 'success' : 'info'">{{ configured.body ? '已配置' : '未配置' }}</el-tag>
              <el-input v-model="form.sms.body_json" type="textarea" :rows="3" :disabled="form.sms.clear_body" placeholder="留空保留原值；例如网关要求的应用标识或密钥" autocomplete="off" aria-label="短信附加请求参数" />
              <el-checkbox v-model="form.sms.clear_body">清除已保存的附加参数</el-checkbox>
            </el-form-item>
            <p class="hint">网关请求包含 to、content、text、template_id；验证码另带 template_params.code。短信网关返回成功应表示服务商已受理。</p>
            </template>
          </section>
          <section class="config-card" aria-label="注册邮件配置">
            <h2>注册邮件</h2>
            <el-form-item label="启用注册邮件"><el-switch v-model="form.email.enabled" aria-label="启用注册邮件" /></el-form-item>
            <el-form-item label="SMTP 服务器" :required="form.email.enabled"><el-input v-model="form.email.host" placeholder="smtp.example.com" maxlength="253" aria-label="SMTP 服务器" /></el-form-item>
            <div class="smtp-row">
              <el-form-item label="SMTP 端口" :required="form.email.enabled"><el-input-number v-model="form.email.port" :min="1" :max="65535" controls-position="right" aria-label="SMTP 端口" /></el-form-item>
              <el-form-item label="连接安全"><el-select v-model="form.email.security" aria-label="SMTP 连接安全"><el-option label="TLS（通常为 465）" value="tls" /><el-option label="STARTTLS（通常为 587）" value="starttls" /></el-select></el-form-item>
            </div>
            <el-form-item label="SMTP 用户名" :required="form.email.enabled"><el-input v-model="form.email.username" maxlength="254" autocomplete="off" aria-label="SMTP 用户名" /></el-form-item>
            <el-form-item label="SMTP 密码 / 授权码">
              <el-tag size="mini" :type="configured.password ? 'success' : 'info'">{{ configured.password ? '已配置' : '未配置' }}</el-tag>
              <el-input v-model="form.email.password" type="password" show-password :disabled="form.email.clear_password" maxlength="4096" autocomplete="new-password" placeholder="留空保留已保存的密码或授权码" aria-label="SMTP 密码或授权码" />
              <el-checkbox v-model="form.email.clear_password">清除已保存的密码</el-checkbox>
            </el-form-item>
            <el-form-item label="发件人邮箱" :required="form.email.enabled"><el-input v-model="form.email.from_email" maxlength="254" placeholder="sender@example.com" aria-label="发件人邮箱" /></el-form-item>
            <el-form-item label="发件人名称"><el-input v-model="form.email.from_name" maxlength="100" aria-label="发件人名称" /></el-form-item>
            <p class="hint">请使用邮件服务商提供的 SMTP 授权码。凭据加密保存，已保存的密码与短信鉴权参数不会回显。</p>
          </section>
        </div>
        <div class="save-bar"><el-button type="primary" native-type="submit" :disabled="busy || loading || !writable" :loading="operation === 'save'">保存配置</el-button><span>{{ dirty ? '有尚未保存的修改，请保存后测试。' : '保存后即时生效，无需重启服务。' }}</span></div>
      </el-form>
      <section class="test-card" aria-label="测试发送">
        <h2>测试发送</h2><p class="hint">使用已保存的配置，发送带“测试”标识的验证码或审核通过通知。测试不会创建账号或改变审批状态。</p>
        <div v-for="channel in ['sms', 'email']" :key="channel" class="test-row">
          <label :for="'registration-test-' + channel">{{ channel === 'sms' ? '测试手机号' : '测试邮箱' }}</label>
          <el-input :id="'registration-test-' + channel" v-model="testForm[channel]" :disabled="busy || loading" :placeholder="channel === 'sms' ? '请输入接收短信的手机号' : '请输入接收邮件的邮箱'" :maxlength="254" />
          <el-button :disabled="!canTest(channel)" @click="sendTest(channel, 'verification')">测试验证码</el-button>
          <el-button :disabled="!canTest(channel)" @click="sendTest(channel, 'approved')">测试审核通知</el-button>
        </div>
        <el-alert v-if="testResult" :title="testResult" type="success" show-icon :closable="false" role="status" />
      </section>
    </template>
  </section>
</template>

<script>
const API = '/server/api/smcicc/registration-notifications';
const empty = () => ({ sms: { provider: 'generic', access_key_id: '', access_key_secret: '', clear_access_key: false, enabled: false, endpoint: '', sign_name: '', registration_template_id: '', registration_notice_template_id: '', headers_json: '', body_json: '', clear_headers: false, clear_body: false }, email: { enabled: false, host: '', port: 465, security: 'tls', username: '', password: '', clear_password: false, from_email: '', from_name: '细语全媒体智能客服平台' } });
export default {
  name: 'RegistrationNotifications',
  data: () => ({ form: empty(), revision: 0, source: '', writable: false, loaded: false, loading: false, busy: false, operation: '', clean: '', readiness: { sms: false, email: false }, configured: { headers: false, body: false, password: false, accessKeyId: false, accessKeySecret: false }, error: '', notice: '', testResult: '', testForm: { sms: '', email: '' } }),
  computed: { dirty() { return !!this.clean && JSON.stringify(this.form) !== this.clean; } },
  mounted() { this.load(); },
  beforeDestroy() { this.form = empty(); this.testForm = { sms: '', email: '' }; },
  methods: {
    async request(method, suffix = '', data) {
      let response;
      try { response = await this.$axios.request({ method, url: '/pages' + API + suffix, ...(data === undefined ? {} : { data }) }); }
      catch (error) { throw error && error.response && error.response.data || error; }
      const result = response && response.data;
      if (!result || result.ret_code !== 200 || result.data == null) throw result || {};
      return result.data;
    },
    canTest(channel) { return this.loaded && !this.loading && !this.busy && !this.dirty && this.readiness[channel] === true; },
    failure(e) {
      const status = e && (e.ret_code || e.status || e.response && e.response.status);
      this.error = e && typeof e.err_msg === 'string' ? e.err_msg : status === 403 ? '仅超级管理员可管理注册通知配置。' : '操作未完成，请检查配置或网络后重试。';
    },
    apply(data) {
      if (!data || !Number.isSafeInteger(data.revision) || !data.sms || !data.email || !data.readiness) throw new Error('Invalid configuration');
      const f = empty(), s = data.sms, e = data.email;
      ['provider', 'enabled', 'endpoint', 'sign_name', 'registration_template_id', 'registration_notice_template_id'].forEach(k => { if (typeof s[k] === typeof f.sms[k]) f.sms[k] = s[k]; });
      ['enabled', 'host', 'port', 'security', 'username', 'from_email', 'from_name'].forEach(k => { if (typeof e[k] === typeof f.email[k]) f.email[k] = e[k]; });
      this.form = f; this.revision = data.revision; this.source = data.source; this.writable = data.writable === true;
      this.configured = { headers: s.headers_configured === true, body: s.body_configured === true, password: e.password_configured === true, accessKeyId: s.access_key_id_configured === true, accessKeySecret: s.access_key_secret_configured === true };
      this.readiness = { sms: data.readiness.sms === true, email: data.readiness.email === true };
      this.clean = JSON.stringify(f); this.loaded = true;
    },
    async load() {
      if (this.busy || this.loading) return;
      this.loading = true; this.loaded = false; this.error = ''; this.notice = ''; this.testResult = '';
      try { this.apply(await this.request('GET')); } catch (e) { this.failure(e); } finally { this.loading = false; }
    },
    onSmsProviderChange(provider) {
      this.form.sms.access_key_id = ''; this.form.sms.access_key_secret = ''; this.form.sms.clear_access_key = false;
      if (provider === 'aliyun') this.form.sms.endpoint = 'https://dysmsapi.aliyuncs.com/';
      else if (/dysmsapi\.aliyuncs\.com/.test(this.form.sms.endpoint)) this.form.sms.endpoint = '';
    },
    payload() {
      const s = this.form.sms, e = this.form.email;
      const sms = { provider: s.provider, enabled: s.enabled, endpoint: s.endpoint.trim(), sign_name: s.sign_name, registration_template_id: s.registration_template_id, registration_notice_template_id: s.registration_notice_template_id, clear_headers: s.clear_headers, clear_body: s.clear_body };
      if (s.provider === 'aliyun') {
        if (!sms.endpoint || sms.endpoint === 'dysmsapi.aliyuncs.com') sms.endpoint = 'https://dysmsapi.aliyuncs.com/';
        if (!/^https:\/\/dysmsapi\.aliyuncs\.com\/?$/.test(sms.endpoint)) throw {err_msg: '阿里云接口地址应填写 https://dysmsapi.aliyuncs.com/。'};
        if (s.enabled && (!s.access_key_id.trim() && !this.configured.accessKeyId || s.clear_access_key)) throw {err_msg:'请填写阿里云 AccessKey ID；清除凭据前需先关闭短信。'};
        if (s.enabled && (!s.access_key_secret.trim() && (!this.configured.accessKeySecret || s.access_key_id.trim()))) throw {err_msg:'请填写阿里云 AccessKey Secret；更换 ID 时必须填写配套 Secret。'};
        if (s.access_key_id.trim()) sms.access_key_id = s.access_key_id.trim();
        if (s.access_key_secret.trim()) sms.access_key_secret = s.access_key_secret.trim();
        sms.clear_access_key = s.clear_access_key;
        if (s.enabled && !s.sign_name.trim()) throw {err_msg:'请填写阿里云已审核通过的短信签名。'};
        if (s.enabled && (!/^SMS_\d+$/.test(s.registration_template_id.trim()) || !/^SMS_\d+$/.test(s.registration_notice_template_id.trim()))) throw {err_msg:'阿里云验证码和通知模板 Code 应为 SMS_ 开头的编号。'};
      } else if (s.enabled) {
        if (!/^https?:\/\//.test(sms.endpoint)) throw {err_msg:'短信网关地址需包含 https://，例如 https://sms.example.com/send。直接连接阿里云请选择“阿里云短信”。'};
        if (/^https?:\/\/dysmsapi\.aliyuncs\.com\/?$/.test(sms.endpoint)) throw {err_msg:'请将短信接入方式切换为“阿里云短信”，并填写 AccessKey。'};
      }
      if (s.enabled && (!s.registration_template_id.trim() || !s.registration_notice_template_id.trim())) throw {err_msg:'请填写注册验证码模板 ID 和申请及审核通知模板 ID。'};
      for (const name of s.provider === 'aliyun' ? [] : ['headers', 'body']) {
        const raw = s[name + '_json'].trim();
        if (raw && !s['clear_' + name]) {
          let value; try { value = JSON.parse(raw); } catch { throw { err_msg: '短信请求头和附加参数必须为有效的 JSON 对象。' }; }
          if (!value || typeof value !== 'object' || Array.isArray(value) || (name === 'headers' && Object.values(value).some(v => typeof v !== 'string'))) throw { err_msg: '短信请求头和附加参数必须为 JSON 对象，请求头的值须为字符串。' };
          sms[name] = value;
        }
      }
      const email = { enabled: e.enabled, host: e.host, port: e.port, security: e.security, username: e.username, from_email: e.from_email, from_name: e.from_name, clear_password: e.clear_password };
      if (e.password && !e.clear_password) email.password = e.password;
      if (e.enabled) {
        if (!e.host.trim() || /[\s/@\\]/.test(e.host) || /^(localhost|127\.)/.test(e.host)) throw {err_msg:'SMTP 服务器请填写有效主机名，不包含 smtp:// 等协议前缀。'};
        if (!e.username.trim() || (!e.password && !this.configured.password) || e.clear_password) throw {err_msg:'启用邮件后请填写 SMTP 用户名和密码/授权码；暂不配置邮件可以先关闭邮件。'};
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e.from_email)) throw {err_msg:'请填写有效的发件人邮箱。'};
      }
      return { revision: this.revision, sms, email };
    },
    async save() {
      if (!this.loaded || !this.writable || this.busy || this.loading) return;
      this.error = ''; this.notice = ''; this.testResult = '';
      let payload; try { payload = this.payload(); } catch (e) { this.failure(e); return; }
      this.busy = true; this.operation = 'save';
      try { this.apply(await this.request('POST', '/save', payload)); this.notice = '注册通知配置已保存并生效。请测试确认实际收件。'; } catch (e) { this.failure(e); } finally { this.busy = false; this.operation = ''; }
    },
    async sendTest(channel, purpose) {
      if (!this.canTest(channel)) return;
      const to = this.testForm[channel].trim();
      if (!(channel === 'sms' ? /^\+?[1-9][0-9]{7,14}$/.test(to) : /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to))) { this.error = '请填写有效的测试手机号或邮箱。'; return; }
      this.busy = true; this.operation = 'test'; this.error = ''; this.testResult = ''; this.notice = '';
      try { const r = await this.request('POST', '/test', { channel, purpose, to }); if (!r || r.success !== true) throw new Error('Not accepted'); this.testResult = '发送服务已受理测试请求，请确认目标手机或邮箱是否收到。'; } catch (e) { this.failure(e); } finally { this.busy = false; this.operation = ''; }
    },
  },
};
</script>

<style scoped>
.registration-notifications { max-width: 1280px; padding: 24px; color: #303133; }
.page-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; margin-bottom: 20px; }
h1 { font-size: 22px; margin: 0 0 8px; } h2 { font-size: 17px; margin: 0 0 20px; }
p { line-height: 1.7; margin: 0; } .page-heading p,.hint,.save-bar span,.readiness span { color: #606266; font-size: 13px; }
.readiness { display: flex; gap: 12px; align-items: center; flex-wrap: wrap; margin: 20px 0; }
.config-grid { display: grid; grid-template-columns: minmax(0,1fr) minmax(0,1fr); gap: 20px; margin-top: 20px; }
.config-card,.test-card { border: 1px solid #e4e7ed; border-radius: 6px; padding: 24px; background: #fff; }
.hint { margin-bottom: 16px; } .smtp-row { display: grid; grid-template-columns: 160px minmax(0,1fr); gap: 16px; }
.el-form-item .el-tag { margin-bottom: 8px; } .el-checkbox { margin-top: 8px; } .el-select { width: 100%; }
.save-bar { display: flex; align-items: center; gap: 16px; margin: 24px 0; } .test-card { margin-top: 12px; }
.test-row { display: flex; align-items: center; gap: 12px; margin: 16px 0; } .test-row label { flex: 0 0 80px; font-size: 14px; } .test-row .el-input { max-width: 360px; } .test-row .el-button + .el-button { margin-left: 0; }
.el-alert { margin: 12px 0; }
@media (max-width: 900px) { .config-grid { grid-template-columns: 1fr; } .test-row { flex-wrap: wrap; } .test-row .el-input { flex: 1; min-width: 160px; max-width: none; } }
@media (max-width: 520px) { .registration-notifications { padding: 12px; } .config-card,.test-card { padding: 16px; } .smtp-row { grid-template-columns: 1fr; gap: 0; } .save-bar { align-items: flex-start; flex-direction: column; } }
</style>
