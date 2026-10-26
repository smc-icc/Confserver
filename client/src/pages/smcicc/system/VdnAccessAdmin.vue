<template>
  <section class="vdn-access-admin" :aria-busy="loading || busy">
    <header class="admin-heading"><div><h2>{{ text('adminTitle') }}</h2><p class="hint">{{ text('adminHint') }}</p></div><el-button size="small" :loading="loading" :disabled="busy" @click="refresh">{{ text('refresh') }}</el-button></header>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" role="alert" />
    <el-alert v-if="notice" :title="notice" type="success" show-icon :closable="false" role="status" />
    <div v-loading="loading" class="admin-content">
      <template v-if="ready && !forbidden">
        <section class="admin-card"><div class="admin-heading"><h3>{{ text('requestsTitle') }}</h3>
          <el-select v-model="statusFilter" size="small" :aria-label="text('status')" :disabled="loading || busy" @change="refresh">
            <el-option :label="text('allStatuses')" value="" /><el-option v-for="status in statuses" :key="status" :label="text(status)" :value="status" />
          </el-select></div>
          <el-table :data="pageRequests" size="small" :empty-text="text('noRequests')" class="requests-table">
            <el-table-column :label="text('applicant')" min-width="190"><template slot-scope="scope"><strong>{{ applicant(scope.row).name || applicant(scope.row).uid }}</strong><div class="hint">{{ applicant(scope.row).email }}</div></template></el-table-column>
            <el-table-column :label="text('kind')" min-width="145"><template slot-scope="scope">{{ text(scope.row.kind) }}<div>{{ scope.row.vdn_name || scope.row.vdn_id }}</div></template></el-table-column>
            <el-table-column :label="text('status')" min-width="145"><template slot-scope="scope"><el-tag :type="statusType(scope.row.status)" size="small">{{ statusLabel(scope.row.status) }}</el-tag><div v-if="scope.row.projection_pending" class="sync-pending">{{ text('syncPending') }}</div></template></el-table-column>
            <el-table-column prop="created_at" :label="text('createdAt')" min-width="165" />
            <el-table-column :label="text('actions')" min-width="180"><template slot-scope="scope"><el-button type="text" :disabled="busy || loading" @click="openReview(scope.row)">{{ text(scope.row.status === 'pending' ? 'review' : 'details') }}</el-button><el-button v-if="scope.row.status === 'approved' && scope.row.projection_pending" type="text" :disabled="busy || loading" @click="retry(scope.row)">{{ text('retrySync') }}</el-button></template></el-table-column>
          </el-table>
          <el-pagination v-if="requests.length > 10" layout="total, prev, pager, next" :current-page.sync="requestPage" :page-size="10" :total="requests.length" />
          <p v-if="requests.length >= requestLimit" class="hint">{{ text('listLimitHint') }}</p>
        </section>
        <section class="admin-card"><h3>{{ text('directGrant') }}</h3><p class="hint">{{ text('directGrantHint') }}</p>
          <el-form label-position="top" size="small" :disabled="busy || loading" @submit.native.prevent="grant">
            <div class="form-grid"><el-form-item :label="text('accountSearch')"><div class="search-row"><el-input v-model="accountQuery" maxlength="100" :placeholder="text('minQuery')" @input="clearAccountSearch" @keyup.enter.native.prevent="searchAccounts" /><el-button :loading="searching" :disabled="accountQuery.trim().length < 3 || busy || loading || searching" @click="searchAccounts">{{ text('search') }}</el-button></div></el-form-item>
              <el-form-item :label="text('account')" required><el-select v-model="grantForm.uid" :placeholder="text('selectAccount')" @change="grantForm.identity_verified = false"><el-option v-for="account in accounts" :key="account.uid" :value="account.uid" :label="accountLabel(account)" /></el-select></el-form-item>
              <el-form-item :label="text('vdnId')" required><el-input v-model.trim="grantForm.vdn_id" inputmode="numeric" maxlength="10" @input="grantForm.identity_verified = false" /></el-form-item>
              <el-form-item :label="text('note')"><el-input v-model.trim="grantForm.note" maxlength="1000" /></el-form-item></div>
            <p v-if="searchComplete && !accounts.length" class="hint">{{ text('noAccounts') }}</p>
            <el-form-item><el-checkbox v-model="grantForm.identity_verified">{{ text('identityCheck') }}</el-checkbox></el-form-item>
            <el-button type="primary" native-type="submit" :loading="operation === 'grant'" :disabled="!grantForm.uid || !validId(grantForm.vdn_id) || !grantForm.identity_verified || busy || loading">{{ text('grant') }}</el-button>
          </el-form>
        </section>
        <section class="admin-card"><div class="admin-heading"><h3>{{ text('grantsTitle') }}</h3></div>
          <el-form :inline="true" size="small" :disabled="busy || loading" @submit.native.prevent="refresh"><el-form-item :label="text('vdnId')"><el-input v-model.trim="grantVdnFilter" :placeholder="text('optionalVdn')" inputmode="numeric" maxlength="10" /></el-form-item><el-form-item><el-button native-type="submit">{{ text('filter') }}</el-button></el-form-item></el-form>
          <el-form label-position="top" size="small" :disabled="busy || loading"><el-form-item :label="text('revokeNote')"><el-input v-model.trim="revokeNote" maxlength="1000" :placeholder="text('revokeHint')" /></el-form-item></el-form>
          <el-table :data="pageGrants" size="small" :empty-text="text('noGrants')">
            <el-table-column :label="text('account')" min-width="220"><template slot-scope="scope"><strong>{{ scope.row.name || scope.row.uid }}</strong><div class="hint">{{ scope.row.uid }}</div><div class="hint">{{ scope.row.email }}</div></template></el-table-column>
            <el-table-column :label="text('vdnId')" min-width="130"><template slot-scope="scope">{{ scope.row.vdn_id }}<div>{{ scope.row.vdn_name }}</div></template></el-table-column>
            <el-table-column :label="text('status')" min-width="110"><template slot-scope="scope"><el-tag size="small" :type="scope.row.state === 'active' ? 'success' : 'info'">{{ text(scope.row.state === 'active' ? 'active' : 'revoked') }}</el-tag></template></el-table-column>
            <el-table-column :label="text('source')" min-width="100"><template slot-scope="scope">{{ text(['request', 'direct', 'legacy'].includes(scope.row.source) ? scope.row.source : 'unknown') }}</template></el-table-column>
            <el-table-column :label="text('actions')" width="110"><template slot-scope="scope"><el-button v-if="scope.row.state === 'active'" type="text" class="revoke-button" :disabled="busy || loading" @click="revoke(scope.row)">{{ text('revoke') }}</el-button></template></el-table-column>
          </el-table>
          <el-pagination v-if="grants.length > 10" layout="total, prev, pager, next" :current-page.sync="grantPage" :page-size="10" :total="grants.length" />
        </section>
      </template>
    </div>
    <el-dialog :title="text(selected && selected.status === 'pending' ? 'review' : 'details')" :visible.sync="reviewVisible" width="min(640px, 94vw)" :close-on-click-modal="false" :close-on-press-escape="!busy" :show-close="!busy" :before-close="closeReview">
      <template v-if="selected">
        <dl class="review-details"><dt>{{ text('applicant') }}</dt><dd>{{ applicant(selected).name }} · {{ applicant(selected).uid }}</dd><dt>{{ text('contactEmail') }}</dt><dd>{{ applicant(selected).email || '—' }}<p class="hint">{{ text('unverifiedEmail') }}</p></dd><dt>{{ text('kind') }}</dt><dd>{{ text(selected.kind) }} · {{ selected.vdn_name || selected.vdn_id }}</dd><dt>{{ text('organization') }}</dt><dd>{{ selected.organization }}</dd><dt>{{ text('reason') }}</dt><dd class="prewrap">{{ selected.reason }}</dd><dt>{{ text('status') }}</dt><dd>{{ statusLabel(selected.status) }}<span v-if="selected.projection_pending"> · {{ text('syncPending') }}</span></dd><dt v-if="selected.result_vdn_id">{{ text('resultVdn') }}</dt><dd v-if="selected.result_vdn_id">{{ selected.result_vdn_id }}</dd><dt v-if="selected.review_note">{{ text('reviewNote') }}</dt><dd v-if="selected.review_note" class="prewrap">{{ selected.review_note }}</dd></dl>
        <el-form v-if="selected.status === 'pending'" label-position="top" size="small" :disabled="busy || loading" @submit.native.prevent="review('approve')">
          <el-form-item v-if="selected.kind === 'new'" :label="text('newVdnId')" required><el-input v-model.trim="reviewForm.vdn_id" inputmode="numeric" maxlength="10" /></el-form-item>
          <el-form-item :label="text('reviewNote')"><el-input v-model.trim="reviewForm.note" type="textarea" :rows="3" maxlength="1000" /><p class="hint">{{ text('rejectNoteHint') }}</p></el-form-item>
          <el-form-item><el-checkbox v-model="reviewForm.identity_verified">{{ text('identityCheck') }}</el-checkbox></el-form-item>
        </el-form>
        <p v-if="reviewError" class="review-error" role="alert">{{ reviewError }}</p>
      </template>
      <span slot="footer"><el-button :disabled="busy" @click="reviewVisible = false">{{ text('close') }}</el-button><template v-if="selected && selected.status === 'pending'"><el-button type="danger" :disabled="busy || loading" @click="review('reject')">{{ text('reject') }}</el-button><el-button type="primary" :disabled="busy || loading || !reviewForm.identity_verified || (selected.kind === 'new' && !validId(reviewForm.vdn_id))" :loading="operation === 'review'" @click="review('approve')">{{ text('approve') }}</el-button></template></span>
    </el-dialog>
  </section>
</template>

<script>
const API = '/server/api/smcicc/vdn-access/admin';
const emptyGrant = () => ({ uid: '', vdn_id: '', identity_verified: false, note: '' });
export default {
  name: 'VdnAccessAdmin',
  data() {
    return { requests: [], grants: [], accounts: [], ready: false, forbidden: false, loading: false, busy: false, searching: false,
      operation: '', error: '', notice: '', statusFilter: 'pending', statuses: ['pending', 'approved', 'rejected', 'withdrawn'],
      requestLimit: 100, requestPage: 1, grantPage: 1, grantVdnFilter: '', accountQuery: '', searchComplete: false, searchSerial: 0,
      grantForm: emptyGrant(), revokeNote: '', selected: null, reviewVisible: false, reviewError: '', reviewForm: { note: '', vdn_id: '', identity_verified: false } };
  },
  computed: {
    pageRequests() { return this.requests.slice((this.requestPage - 1) * 10, this.requestPage * 10); },
    pageGrants() { return this.grants.slice((this.grantPage - 1) * 10, this.grantPage * 10); }
  },
  created() { this.refresh(); },
  beforeDestroy() { this.searchSerial += 1; },
  methods: {
    text(key) { return this.$t('smcicc.vdnAccess.' + key); },
    validId(value) { return /^\d+$/.test(String(value)) && Number.isSafeInteger(Number(value)) && Number(value) > 0 && Number(value) <= 2147483647; },
    applicant(item) { return item.applicant || {}; },
    accountLabel(account) { return (account.name || account.uid) + ' · ' + (account.email || account.uid) + (account.legacy ? ' · ' + this.text('legacy') : ''); },
    statusType(status) { return { approved: 'success', rejected: 'danger', withdrawn: 'info', pending: 'warning' }[status] || 'info'; },
    statusLabel(status) { return this.text(this.statuses.includes(status) ? status : 'unknown'); },
    failure(error) {
      // The shared ajax wrapper drops HTTP status and throws statusText instead.
      const status = Number(error && (error.ret_code || error.status)) || ({ Forbidden: 403, Unauthorized: 401 }[error && error.message] || 0);
      if (status === 403 || status === 401 || !status) {
        this.ready = false; this.forbidden = status === 403 || status === 401; this.requests = []; this.grants = []; this.accounts = [];
        this.grantForm = emptyGrant(); this.selected = null; this.reviewVisible = false; this.searchSerial += 1;
      }
      this.error = this.text(status === 403 ? 'forbidden' : status === 401 ? 'sessionExpired' : status === 409 ? 'conflict' : 'requestFailed');
    },
    async readLists() {
      const values = await Promise.all([
        this.$ajax.getJSON(API + '/requests', { status: this.statusFilter, limit: this.requestLimit }),
        this.$ajax.getJSON(API + '/grants', this.grantVdnFilter ? { vdn_id: Number(this.grantVdnFilter) } : {})
      ]);
      this.requests = Array.isArray(values[0].items) ? values[0].items : [];
      this.grants = Array.isArray(values[1].items) ? values[1].items : [];
      this.requestPage = Math.min(this.requestPage, Math.max(1, Math.ceil(this.requests.length / 10)));
      this.grantPage = Math.min(this.grantPage, Math.max(1, Math.ceil(this.grants.length / 10)));
      this.ready = true; this.forbidden = false;
    },
    async refresh() {
      if (this.loading || this.busy) return;
      this.error = '';
      if (this.grantVdnFilter && !this.validId(this.grantVdnFilter)) { this.error = this.text('invalidVdnId'); return; }
      this.loading = true;
      try { await this.readLists(); } catch (error) { this.failure(error); }
      finally { this.loading = false; }
    },
    openReview(item) {
      if (!this.ready || this.busy || this.loading) return;
      this.selected = item; this.reviewForm = { note: '', vdn_id: '', identity_verified: false }; this.reviewError = ''; this.reviewVisible = true;
    },
    closeReview(done) { if (!this.busy) done(); },
    async mutate(action, body) {
      this.error = ''; this.notice = ''; this.busy = true; this.operation = action;
      try {
        const result = await this.$ajax.postJSON(API + '/' + action, body);
        this.notice = this.text(result && (result.projection_pending || (result.request && result.request.projection_pending)) ? 'savedSyncPending' : 'saved');
        if (action === 'review') this.reviewVisible = false;
        if (action === 'grant') this.grantForm = emptyGrant();
        await this.readLists();
      } catch (error) { this.failure(error); if (this.reviewVisible) this.reviewError = this.error; }
      finally { this.busy = false; this.operation = ''; }
    },
    async review(decision) {
      if (!this.ready || this.busy || this.loading || !this.selected || this.selected.status !== 'pending' || !['approve', 'reject'].includes(decision)) return;
      this.reviewError = '';
      const f = this.reviewForm;
      if (decision === 'approve' && (!f.identity_verified || (this.selected.kind === 'new' && !this.validId(f.vdn_id)))) { this.reviewError = this.text('identityRequired'); return; }
      if (decision === 'reject' && !f.note.trim()) { this.reviewError = this.text('rejectNoteHint'); return; }
      await this.mutate('review', { id: this.selected.id, decision, ...(decision === 'approve' && this.selected.kind === 'new' ? { vdn_id: Number(f.vdn_id) } : {}), note: f.note.trim(), identity_verified: decision === 'approve' && f.identity_verified === true });
    },
    clearAccountSearch() { this.searchSerial += 1; this.accounts = []; this.searchComplete = false; this.grantForm.uid = ''; this.grantForm.identity_verified = false; },
    async searchAccounts() {
      if (!this.ready || this.busy || this.loading || this.searching) return;
      const query = this.accountQuery.trim();
      if (query.length < 3) { this.clearAccountSearch(); return; }
      const serial = ++this.searchSerial; this.searching = true; this.error = '';
      this.accounts = []; this.grantForm.uid = ''; this.grantForm.identity_verified = false;
      try {
        const data = await this.$ajax.getJSON(API + '/accounts', { query });
        if (serial === this.searchSerial && this.ready) { this.accounts = Array.isArray(data.items) ? data.items : []; this.searchComplete = true; }
      } catch (error) { if (serial === this.searchSerial) this.failure(error); }
      finally { this.searching = false; }
    },
    async grant() {
      if (!this.ready || this.busy || this.loading) return;
      const f = this.grantForm;
      if (!f.identity_verified || !this.validId(f.vdn_id) || !this.accounts.some(a => a.uid === f.uid)) { this.error = this.text('identityRequired'); return; }
      await this.mutate('grant', { uid: f.uid, vdn_id: Number(f.vdn_id), identity_verified: true, note: f.note.trim() });
    },
    async revoke(item) {
      if (!this.ready || this.busy || this.loading || item.state !== 'active') return;
      if (!this.revokeNote.trim()) { this.error = this.text('revokeHint'); return; }
      this.busy = true;
      try { await this.$confirm(this.text('revokeWarning'), this.text('revoke'), { type: 'warning', confirmButtonText: this.text('revoke'), cancelButtonText: this.text('cancel') }); }
      catch (_) { this.busy = false; return; }
      await this.mutate('revoke', { uid: item.uid, vdn_id: item.vdn_id, note: this.revokeNote.trim() });
    },
    async retry(item) {
      if (!this.ready || this.busy || this.loading || !item.projection_pending || item.status !== 'approved') return;
      await this.mutate('retry', { id: item.id });
    }
  }
};
</script>

<style scoped>
.vdn-access-admin { color: #202b3c; padding: 4px 0 24px; }.admin-heading { display: flex; align-items: center; justify-content: space-between; flex-wrap: wrap; gap: 12px; margin-bottom: 16px; }
h2 { margin: 0; font-size: 22px; }h3 { font-size: 16px; margin: 0 0 12px; }.admin-heading h3 { margin: 0; }.hint { font-size: 12px; color: #667085; line-height: 1.6; margin: 6px 0; overflow-wrap: anywhere; }
.admin-content { min-height: 100px; }.admin-card { border: 1px solid #e4e7ed; border-radius: 8px; padding: 20px 24px; margin-top: 20px; background: #fff; min-width: 0; }.form-grid { display: grid; grid-template-columns: 1fr 1fr; column-gap: 20px; }.el-select { max-width: 100%; }.form-grid .el-select { width: 100%; }.search-row { display: flex; gap: 8px; }.search-row .el-input { min-width: 0; }
.el-pagination { margin-top: 16px; overflow-x: auto; }.el-alert { margin-bottom: 12px; }.revoke-button, .review-error { color: #c43b3b; }.sync-pending { color: #996115; font-size: 12px; }.review-details { margin: 0 0 20px; }.review-details dt { color: #667085; margin-top: 12px; font-size: 12px; }.review-details dd { margin: 4px 0 0; overflow-wrap: anywhere; }.prewrap { white-space: pre-wrap; }.el-checkbox { white-space: normal; height: auto; line-height: 1.7; }
@media (max-width: 760px) { .form-grid { grid-template-columns: minmax(0, 1fr); }.admin-card { padding: 16px; } }
</style>
