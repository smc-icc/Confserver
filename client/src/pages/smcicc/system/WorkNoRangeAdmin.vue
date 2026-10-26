<template>
  <section class="workno-admin">
    <header class="heading"><h2>工号号段</h2><el-button size="small" :loading="loading" @click="load">刷新</el-button></header>
    <el-alert v-if="error" :title="error" type="error" show-icon :closable="false" />
    <h3>待审核申请</h3>
    <el-table :data="requests" size="small" border empty-text="没有待审核申请">
      <el-table-column prop="vdnId" label="VDN" width="80" />
      <el-table-column label="号段" min-width="140"><template slot-scope="{ row }">{{ row.startNo }}–{{ row.endNo }}</template></el-table-column>
      <el-table-column prop="reason" label="理由" min-width="180" show-overflow-tooltip />
      <el-table-column label="操作" width="180">
        <template slot-scope="{ row }">
          <el-button type="text" @click="review(row, 'approve')">通过</el-button>
          <el-button type="text" @click="review(row, 'reject')">拒绝</el-button>
        </template>
      </el-table-column>
    </el-table>
    <h3>有效号段</h3>
    <el-table :data="ranges" size="small" border empty-text="没有有效号段，各 VDN 使用自动分配">
      <el-table-column label="类型" width="100"><template slot-scope="{ row }">{{ row.kind === 'shield' ? '全局屏蔽' : `VDN ${row.vdnId}` }}</template></el-table-column>
      <el-table-column label="号段" min-width="140"><template slot-scope="{ row }">{{ row.startNo }}–{{ row.endNo }}</template></el-table-column>
      <el-table-column label="操作" width="100"><template slot-scope="{ row }"><el-button type="text" @click="revoke(row)">撤回</el-button></template></el-table-column>
    </el-table>
    <div class="forms">
      <el-form label-width="72px" size="small" @submit.native.prevent="grant">
        <h3>直接划给 VDN</h3>
        <el-form-item label="VDN"><el-input v-model="grantForm.vdnId" /></el-form-item>
        <el-form-item label="起始号"><el-input v-model="grantForm.startNo" /></el-form-item>
        <el-form-item label="结束号"><el-input v-model="grantForm.endNo" /></el-form-item>
        <el-button type="primary" size="small" native-type="submit" :loading="busy">授权</el-button>
      </el-form>
      <el-form label-width="72px" size="small" @submit.native.prevent="shield">
        <h3>全局屏蔽</h3>
        <el-form-item label="起始号"><el-input v-model="shieldForm.startNo" /></el-form-item>
        <el-form-item label="结束号"><el-input v-model="shieldForm.endNo" /></el-form-item>
        <el-button type="primary" size="small" native-type="submit" :loading="busy">屏蔽</el-button>
      </el-form>
    </div>
  </section>
</template>
<script>
const API = '/server/api/smcicc/workno/admin';
export default {
  name: 'WorkNoRangeAdmin',
  data: () => ({ loading: false, busy: false, error: '', requests: [], ranges: [], grantForm: { vdnId: '', startNo: '', endNo: '' }, shieldForm: { startNo: '', endNo: '' } }),
  created() { this.load(); },
  methods: {
    async load() {
      this.loading = true; this.error = '';
      try {
        const data = await this.$ajax.getJSON(API);
        this.requests = data.requests || [];
        this.ranges = data.ranges || [];
      } catch (error) { this.error = error.err_msg || error.message || '加载失败'; }
      finally { this.loading = false; }
    },
    async run(fn) {
      if (this.busy) return;
      this.busy = true; this.error = '';
      try { await fn(); await this.load(); } catch (error) { this.error = error.err_msg || error.message || '操作失败'; }
      finally { this.busy = false; }
    },
    review(row, decision) {
      const note = decision === 'reject' ? window.prompt('请填写拒绝说明') : '';
      if (decision === 'reject' && !note) return;
      this.run(() => this.$ajax.postJSON(`${API}/review`, { id: row.id, decision, note: note || '' }));
    },
    grant() { this.run(() => this.$ajax.postJSON(`${API}/grant`, this.grantForm)); },
    shield() { this.run(() => this.$ajax.postJSON(`${API}/shield`, this.shieldForm)); },
    revoke(row) { this.run(() => this.$ajax.postJSON(`${API}/revoke`, { id: row.id })); },
  },
};
</script>
<style scoped>
.workno-admin { padding: 8px 0 24px; color: #202b3c; }
.heading { display: flex; justify-content: space-between; align-items: center; }
h3 { margin: 20px 0 8px; font-size: 15px; }
.forms { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; max-width: 760px; }
</style>
