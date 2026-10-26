<template>
  <section class="smcicc-page push-accounts-page">
    <header class="push-header">
      <h2>{{ $t('smcicc.menu.item.push-accounts') }}</h2>
      <el-button size="small" :disabled="busy" :loading="loading" @click="reload">{{ text('refresh') }}</el-button>
    </header>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" class="push-alert" role="alert" />
    <div v-if="ready" class="push-sync" role="status" aria-live="polite">
      <el-tag :type="sync && sync.pending === false ? 'success' : 'warning'" size="small">
        {{ text(sync && sync.pending === false ? 'synced' : (sync && sync.pending === true ? 'syncPending' : 'syncUnknown')) }}
      </el-tag>
      <span v-if="sync && sync.revision != null">{{ text('revision') }} {{ sync.revision }}</span>
      <span v-if="sync && sync.pending">{{ text('syncHint') }}</span>
      <el-button size="mini" :disabled="busy || loading" :loading="operation === 'sync'" @click="retrySync">{{ text('retrySync') }}</el-button>
    </div>
    <div v-loading="loading" class="push-workspace">
      <aside class="push-providers" :aria-label="text('providers')">
        <nav>
          <button v-for="item in platforms" :key="item.id" type="button" :data-provider="item.id"
            :class="{ active: selectedProvider === item.id }" :aria-current="selectedProvider === item.id ? 'page' : null"
            :disabled="busy || loading" @click="selectProvider(item.id)">
            <span class="provider-icon" aria-hidden="true">{{ item.name.slice(0, 1) }}</span>
            <span>{{ item.name }}</span><i class="el-icon-arrow-right" aria-hidden="true" />
          </button>
        </nav>
      </aside>
      <main v-if="platform && ready" class="push-detail">
        <header class="push-detail-header">
          <div><h3>{{ platform.name }}</h3><p class="push-hint">{{ platform.description }}</p></div>
          <el-button type="primary" size="small" :disabled="busy || loading" @click="newAccount">{{ text('addAccount') }}</el-button>
        </header>
        <p v-if="platform.capability" class="push-hint">{{ text('capability') }}: {{ capabilityLabel }}</p>
        <el-table :data="providerAccounts" size="small" row-key="id" class="push-account-list" :empty-text="text('noAccounts')">
          <el-table-column prop="name" :label="text('name')" min-width="140" />
          <el-table-column prop="bundle_id" :label="text('bundle')" min-width="200" />
          <el-table-column :label="text('enabled')" width="90">
            <template slot-scope="scope"><el-tag size="mini" :type="scope.row.enabled ? 'success' : 'info'">{{ text(scope.row.enabled ? 'on' : 'off') }}</el-tag></template>
          </el-table-column>
          <el-table-column :label="text('actions')" width="150">
            <template slot-scope="scope">
              <el-button type="text" size="small" :disabled="busy || loading" @click="editAccount(scope.row)">{{ text('edit') }}</el-button>
              <el-button type="text" size="small" class="push-delete" :disabled="busy || loading" @click="deleteAccount(scope.row)">{{ text('delete') }}</el-button>
            </template>
          </el-table-column>
        </el-table>
        <div class="push-editor-heading">
          <h3>{{ text(form.id ? 'editAccount' : 'addAccount') }}</h3>
          <el-tag v-if="form.id || dirty" size="small" :type="dirty ? 'warning' : 'success'">{{ text(dirty ? 'unsaved' : 'saved') }}</el-tag>
        </div>
        <el-form class="push-form" label-position="top" size="small" :disabled="busy || loading" @submit.native.prevent="save">
          <div class="push-common-fields">
            <el-form-item :label="text('name')" required><el-input v-model="form.name" maxlength="100" :label="text('name')" autocomplete="off" /></el-form-item>
            <el-form-item :label="text('bundle')" required><el-input v-model="form.bundle_id" maxlength="255" :label="text('bundle')" autocomplete="off" /></el-form-item>
          </div>
          <el-form-item :label="text('enabled')"><el-switch v-model="form.enabled" :aria-label="text('enabled')" /></el-form-item>
          <p class="push-hint">{{ text('uniqueHint') }}</p>
          <el-form-item v-for="field in editableFields" :key="selectedProvider + ':' + field.key" :required="field.required && form.enabled">
            <template slot="label">
              {{ field.label }} <el-tag v-if="field.secret" size="mini" :type="configured(field.key) ? 'success' : 'info'">{{ text(configured(field.key) ? 'configured' : 'notConfigured') }}</el-tag>
            </template>
            <el-select v-if="field.type === 'boolean'" v-model="form.fields[field.key]" :aria-label="field.label">
              <el-option :label="text('yes')" value="true" /><el-option :label="text('no')" value="false" />
            </el-select>
            <el-input v-else v-model="form.fields[field.key]" :type="field.type === 'pem' ? 'textarea' : (field.secret ? 'password' : 'text')" :rows="4"
              :show-password="field.secret && field.type !== 'pem'" :label="field.label" autocomplete="new-password"
              :placeholder="field.secret && configured(field.key) ? text('keepSecret') : ''" />
            <p v-if="field.secret" class="push-hint">{{ text(configured(field.key) ? 'keepSecret' : 'writeOnly') }}</p>
            <label v-if="field.type === 'json' || field.type === 'pem'" class="push-import">
              <span>{{ text(field.type === 'json' ? 'importJson' : 'importPem') }}</span>
              <input type="file" :accept="field.type === 'json' ? '.json,application/json' : '.p8,.pem,text/plain'"
                :disabled="busy || loading" :aria-label="field.label + ' ' + text('importFile')" @change="importCredential($event, field)" />
            </label>
          </el-form-item>
          <el-button type="primary" native-type="submit" :loading="operation === 'save'" :disabled="busy || loading">{{ text('save') }}</el-button>
        </el-form>
        <section class="push-test" :aria-label="text('testTitle')">
          <h3>{{ text('testTitle') }}</h3><p class="push-hint">{{ text('testHint') }}</p>
          <p v-if="!form.id || dirty || !form.enabled" class="push-hint">{{ text('saveBeforeTest') }}</p>
          <el-form label-position="top" size="small" :disabled="busy || loading || !canTest" @submit.native.prevent="sendTest">
            <el-form-item :label="text('deviceToken')" required><el-input v-model="testForm.token" type="password" show-password autocomplete="new-password" :label="text('deviceToken')" maxlength="4096" /></el-form-item>
            <el-form-item :label="text('notificationTitle')"><el-input v-model="testForm.title" maxlength="100" /></el-form-item>
            <el-form-item :label="text('notificationBody')"><el-input v-model="testForm.body" maxlength="300" /></el-form-item>
            <el-button native-type="submit" :disabled="busy || loading || !canTest" :loading="operation === 'test'">{{ text('sendTest') }}</el-button>
          </el-form>
          <el-alert v-if="testResult" :title="testResult" type="success" show-icon :closable="false" role="status" />
        </section>
      </main>
    </div>
  </section>
</template>

<script>
const API = '/server/api/smcicc/push-accounts';
const emptyForm = provider => ({ id: '', provider, name: '', bundle_id: 'com.smcloud.omniagent', enabled: true, fields: {} });
export default {
  name: 'PushAccounts',
  data() {
    return { platforms: [], accounts: [], sync: null, selectedProvider: '', form: emptyForm(''), configuredFields: [],
      cleanForm: '', testForm: { token: '', title: '', body: '' }, testResult: '', error: '',
      ready: false, loading: false, busy: false, operation: '' };
  },
  computed: {
    platform() { return this.platforms.find(item => item.id === this.selectedProvider); },
    providerAccounts() { return this.accounts.filter(item => item.provider === this.selectedProvider); },
    editableFields() { return this.platform ? this.platform.fields.filter(field => field.key !== 'bundle_id') : []; },
    dirty() { return !!this.cleanForm && JSON.stringify(this.form) !== this.cleanForm; },
    canTest() { return !!this.form.id && !this.dirty && this.form.enabled && this.ready; },
    capabilityLabel() {
      const capability = this.platform && this.platform.capability;
      return ['notification', 'data', 'voip'].includes(capability) ? this.text('capability_' + capability) : String(capability || '');
    },
  },
  mounted() { this.load(); },
  beforeDestroy() { this.form.fields = {}; this.testForm.token = ''; },
  methods: {
    text(key) { return this.$t('smcicc.pushAccounts.' + key); },
    configured(key) { return this.configuredFields.includes(key); },
    failure(error, key) { this.error = error && typeof error.err_msg === 'string' ? error.err_msg : this.text(key); },
    publicAccount(account) {
      const platform = account && this.platforms.find(item => item.id === account.provider);
      if (!platform || typeof account.id !== 'string' || !account.id || typeof account.name !== 'string' ||
        typeof account.bundle_id !== 'string' || typeof account.enabled !== 'boolean' || !Array.isArray(account.configured_fields)) throw new Error('Invalid account');
      const fields = {};
      platform.fields.forEach(field => {
        if (!field.secret && account.fields && typeof account.fields[field.key] === 'string') fields[field.key] = account.fields[field.key];
      });
      return { id: account.id, provider: account.provider, name: account.name, bundle_id: account.bundle_id,
        enabled: account.enabled, fields, configured_fields: account.configured_fields.filter(key => platform.fields.some(field => field.key === key)), updated_at: account.updated_at };
    },
    async load() {
      if (this.loading || this.busy) return;
      this.loading = true;
      this.ready = false;
      this.error = '';
      try {
        const [catalog, data] = await Promise.all([this.$ajax.getJSON(API + '/platforms'), this.$ajax.getJSON(API)]);
        if (!catalog || !Array.isArray(catalog.platforms) || !catalog.platforms.length || !data || !Array.isArray(data.accounts) ||
          !catalog.platforms.every(item => item && typeof item.id === 'string' && typeof item.name === 'string' && Array.isArray(item.fields) &&
            item.fields.every(field => field && typeof field.key === 'string' && typeof field.label === 'string'))) throw new Error('Invalid catalog');
        this.platforms = catalog.platforms;
        this.accounts = data.accounts.map(this.publicAccount);
        this.sync = data.sync || null;
        if (!this.platforms.some(item => item.id === this.selectedProvider)) this.selectedProvider = this.platforms[0].id;
        this.applyAccount(this.providerAccounts.find(item => item.id === this.form.id) || this.providerAccounts[0]);
        this.ready = true;
      } catch (error) { this.failure(error, 'loadFailed'); }
      finally { this.loading = false; }
    },
    async allowDiscard() {
      if (!this.dirty) return true;
      try { await this.$confirm(this.text('discardPrompt'), this.text('unsaved'), { type: 'warning', confirmButtonText: this.text('discard'), cancelButtonText: this.text('cancel') }); return true; }
      catch (_) { return false; }
    },
    async reload() { if (!this.busy && !this.loading && await this.allowDiscard()) return this.load(); },
    applyAccount(account) {
      const form = emptyForm(this.selectedProvider);
      if (account) Object.assign(form, { id: account.id, name: account.name, bundle_id: account.bundle_id, enabled: account.enabled });
      this.platform.fields.forEach(field => { form.fields[field.key] = field.key === 'bundle_id' ? form.bundle_id :
        (field.secret ? '' : (account && account.fields[field.key] != null ? String(account.fields[field.key]) : (field.type === 'boolean' ? 'false' : ''))); });
      this.form = form;
      this.configuredFields = account ? account.configured_fields.slice() : [];
      this.cleanForm = JSON.stringify(form);
      this.testForm = { token: '', title: '', body: '' };
      this.testResult = '';
    },
    async selectProvider(id) {
      if (this.busy || this.loading || !this.ready || id === this.selectedProvider || !await this.allowDiscard()) return;
      this.selectedProvider = id;
      this.error = '';
      this.applyAccount(this.providerAccounts[0]);
    },
    async newAccount() { if (this.ready && !this.busy && !this.loading && await this.allowDiscard()) { this.error = ''; this.applyAccount(); } },
    async editAccount(account) {
      if (!this.busy && !this.loading && await this.allowDiscard()) { this.error = ''; this.applyAccount(account); }
    },
    async importCredential(event, field) {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file || this.busy || this.loading) return;
      this.error = '';
      this.busy = true;
      try {
        if (file.size > 65536) throw new Error('File too large');
        const content = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = reader.onabort = () => reject(new Error('Read failed'));
          reader.readAsText(file);
        });
        if (field.type === 'json') {
          const value = JSON.parse(content);
          if (!value || typeof value !== 'object' || Array.isArray(value)) throw new Error('Invalid JSON');
          this.$set(this.form.fields, field.key, JSON.stringify(value));
          ['project_id', 'app_id'].forEach(key => {
            if (this.platform.fields.some(item => item.key === key) && !String(this.form.fields[key] || '').trim() &&
              (typeof value[key] === 'string' || typeof value[key] === 'number')) this.$set(this.form.fields, key, String(value[key]));
          });
        } else { this.$set(this.form.fields, field.key, content); }
      } catch (_) { this.error = this.text('importFailed'); }
      finally { this.busy = false; }
    },
    async save() {
      if (!this.ready || this.busy || this.loading) return;
      this.error = '';
      if (!this.form.name.trim() || !this.form.bundle_id.trim()) { this.error = this.text('requiredFields'); return; }
      const fields = {};
      for (const field of this.platform.fields) {
        const value = field.key === 'bundle_id' ? this.form.bundle_id.trim() : String(this.form.fields[field.key] || '');
        if (this.form.enabled && field.required && !value.trim() && !(field.secret && this.configured(field.key))) { this.error = this.text('requiredFields'); return; }
        if (field.type === 'json' && value.trim()) {
          try { const parsed = JSON.parse(value); if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) throw new Error('Invalid JSON'); }
          catch (_) { this.error = this.text('invalidJson'); return; }
        }
        fields[field.key] = value;
      }
      const body = { provider: this.form.provider, name: this.form.name.trim(), bundle_id: this.form.bundle_id.trim(), enabled: this.form.enabled, fields };
      if (this.form.id) body.id = this.form.id;
      this.busy = true;
      this.operation = 'save';
      try {
        const data = await this.$ajax.postJSON(API + '/save', body);
        const account = this.publicAccount(data && data.account);
        this.accounts = this.accounts.filter(item => item.id !== account.id).concat(account);
        this.sync = data.sync || null;
        this.applyAccount(account);
      } catch (error) { this.failure(error, 'saveFailed'); }
      finally { this.busy = false; this.operation = ''; }
    },
    async deleteAccount(account) {
      if (!this.ready || this.busy || this.loading) return;
      try { await this.$confirm(this.text('deletePrompt'), this.text('delete'), { type: 'warning', confirmButtonText: this.text('delete'), cancelButtonText: this.text('cancel') }); }
      catch (_) { return; }
      this.error = '';
      this.busy = true;
      this.operation = 'delete';
      try {
        const data = await this.$ajax.postJSON(API + '/delete', { id: account.id });
        if (!data || data.success !== true) throw new Error('Delete failed');
        this.accounts = this.accounts.filter(item => item.id !== account.id);
        this.sync = data.sync || null;
        if (this.form.id === account.id) this.applyAccount(this.providerAccounts[0]);
      } catch (error) { this.failure(error, 'deleteFailed'); }
      finally { this.busy = false; this.operation = ''; }
    },
    async retrySync() {
      if (!this.ready || this.busy || this.loading) return;
      this.error = '';
      this.busy = true;
      this.operation = 'sync';
      try {
        const data = await this.$ajax.postJSON(API + '/sync', {});
        if (!data || !data.sync || typeof data.sync.pending !== 'boolean') throw new Error('Invalid sync');
        this.sync = data.sync;
        if (data.sync.pending) this.error = this.text('syncFailed');
      } catch (error) { this.failure(error, 'syncFailed'); }
      finally { this.busy = false; this.operation = ''; }
    },
    async sendTest() {
      if (this.busy || this.loading || !this.canTest) return;
      this.error = '';
      this.testResult = '';
      if (!this.testForm.token.trim()) { this.error = this.text('tokenRequired'); return; }
      this.busy = true;
      this.operation = 'test';
      try {
        const data = await this.$ajax.postJSON(API + '/test', { id: this.form.id, token: this.testForm.token.trim(), title: this.testForm.title, body: this.testForm.body });
        if (!data || data.accepted !== true) throw new Error('Not accepted');
        this.testResult = this.text('providerAccepted');
      } catch (error) { this.failure(error, 'testFailed'); }
      finally { this.testForm.token = ''; this.busy = false; this.operation = ''; }
    },
  },
};
</script>

<style scoped>
.push-header, .push-detail-header, .push-editor-heading, .push-sync { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.push-header { margin-bottom: 20px; }
.push-header h2 { margin: 0; font-size: 18px; }
.push-alert { margin-bottom: 12px; }
.push-sync { flex-wrap: wrap; justify-content: flex-start; margin-bottom: 16px; color: #667085; font-size: 13px; }
.push-workspace { display: grid; grid-template-columns: 200px minmax(0, 1fr); min-height: 440px; border: 1px solid #e4e7ed; border-radius: 6px; overflow: hidden; }
.push-providers { padding: 12px 8px; border-right: 1px solid #e4e7ed; background: #f8fafc; }
.push-providers button { display: flex; align-items: center; gap: 8px; width: 100%; padding: 12px 10px; border: 0; border-radius: 4px; background: transparent; color: #475467; text-align: left; cursor: pointer; }
.push-providers button.active { color: #2459b3; background: #eaf1fd; font-weight: 600; }
.push-providers button:focus-visible { outline: 2px solid #409eff; outline-offset: -2px; }
.push-providers button:disabled { cursor: default; opacity: .65; }
.push-providers .el-icon-arrow-right { margin-left: auto; }
.provider-icon { display: inline-flex; justify-content: center; align-items: center; flex: 0 0 24px; height: 24px; border-radius: 5px; background: #e4eaf5; color: #43659b; font-size: 12px; }
.push-detail { padding: 20px 24px; min-width: 0; }
.push-detail h3 { font-size: 15px; margin: 0 0 10px; }
.push-hint { margin: 8px 0; font-size: 12px; color: #667085; line-height: 1.6; }
.push-account-list { margin: 16px 0 24px; }
.push-delete { color: #d14343; }
.push-editor-heading { justify-content: flex-start; margin-bottom: 16px; }
.push-editor-heading h3 { margin: 0; }
.push-form, .push-test { max-width: 760px; }
.push-common-fields { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
.push-import { display: flex; flex-wrap: wrap; align-items: center; gap: 10px; margin-top: 8px; color: #43659b; font-size: 12px; }
.push-import input { max-width: 100%; font-size: 12px; }
.push-test { margin-top: 28px; border-top: 1px solid #e4e7ed; padding-top: 20px; }
.push-test .el-alert { margin-top: 14px; }
@media (max-width: 900px) {
  .push-workspace { grid-template-columns: 160px minmax(0, 1fr); }
  .push-detail { padding: 16px; }
  .push-common-fields { grid-template-columns: 1fr; gap: 0; }
}
@media (max-width: 600px) {
  .push-workspace { grid-template-columns: minmax(0, 1fr); }
  .push-providers { border-right: 0; border-bottom: 1px solid #e4e7ed; }
  .push-providers nav { display: grid; grid-template-columns: 1fr 1fr; }
  .push-detail-header { align-items: flex-start; }
}
</style>
