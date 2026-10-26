<template>
  <div class="vdn-ext-panel">
    <div class="ext-toolbar">
      <el-input v-model="keyword" size="small" placeholder="搜索分机号" class="ext-search" @keyup.enter.native="load" />
      <el-button type="primary" size="small" icon="el-icon-plus" :disabled="!vdnId" @click="openAdd" />
      <el-button type="danger" size="small" icon="el-icon-delete" :disabled="!selection.length" @click="remove" />
    </div>
    <el-alert v-if="err" :title="err" type="error" show-icon :closable="false" class="mb" />
    <div class="ext-table-wrap">
    <el-table v-loading="loading" :data="rows" border stripe size="small" height="100%" @selection-change="onSel" @row-dblclick="openEdit">
      <el-table-column type="selection" width="48" />
      <el-table-column prop="num" label="分机号" width="120" />
      <el-table-column prop="device" label="设备" width="80" />
      <el-table-column prop="ch" label="通道" width="80" />
      <el-table-column prop="chGroup" label="通道组" min-width="120" show-overflow-tooltip />
      <el-table-column prop="agentMode" label="坐席模式" width="100" />
      <el-table-column prop="description" label="备注" min-width="140" show-overflow-tooltip />
      <el-table-column label="操作" width="96" align="center" fixed="right">
        <template slot-scope="{ row }">
          <span class="row-ops" @click.stop>
            <el-button type="text" icon="el-icon-edit" title="编辑" @click="openEdit(row)" />
            <el-switch :value="rowEnabled(row)" @change="(on) => setValid(row, on)" />
          </span>
        </template>
      </el-table-column>
    </el-table>
    </div>
    <el-dialog :title="dialogMode === 'edit' ? '编辑分机' : '新增分机'" :visible.sync="dialogVisible" width="min(480px, calc(100vw - 32px))" append-to-body :close-on-click-modal="!saving" :close-on-press-escape="!saving" :show-close="!saving" @close="closeDraft">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" size="small">
        <el-form-item label="分机号" prop="num">
          <div class="number-editor">
            <el-input v-model="form.num" :disabled="dialogMode === 'edit' || allocating || saving" maxlength="12" @input="numberChanged" @blur="checkNumber" />
            <el-button v-if="dialogMode === 'add'" icon="el-icon-refresh" :loading="allocating" :disabled="saving || !vdnId" @click="acquireNumber">自动获取</el-button>
          </div>
        </el-form-item>
        <el-form-item label="SIP 注册"><el-switch v-model="form.sipEnabled" :disabled="saving" /></el-form-item>
        <el-form-item label="设备类型">
          <el-select v-model="form.device" style="width: 100%">
            <el-option :value="0" label="0 通道组" />
            <el-option :value="1" label="1 通道" />
          </el-select>
        </el-form-item>
        <el-form-item label="通道号"><el-input v-model="form.ch" /></el-form-item>
        <el-form-item label="通道组">
          <el-select v-model="form.chGroup" filterable allow-create clearable style="width: 100%">
            <el-option v-for="g in groups" :key="g.name" :label="g.name" :value="g.name" />
          </el-select>
        </el-form-item>
        <el-form-item label="坐席模式"><el-input v-model="form.agentMode" /></el-form-item>
        <el-form-item label="备注"><el-input v-model="form.description" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" :disabled="saving" @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" size="small" :loading="saving" :disabled="allocating" @click="submit">保存</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
const BASE = '/server/api/smcicc/vdnadmin';

function emptyForm() {
  return {
    num: '',
    device: 0,
    ch: '',
    chGroup: '',
    description: '',
    agentMode: 0,
    callAgentRouterType: 0,
    callExternalRouterType: 0,
    sipEnabled: true,
  };
}

export default {
  name: 'SMCIccVdnExtensionPanel',
  props: {
    vdnId: { type: Number, default: 0 },
  },
  data() {
    return {
      loading: false,
      saving: false,
      allocating: false,
      reservation: null,
      requestGeneration: 0,
      err: '',
      keyword: '',
      rows: [],
      selection: [],
      groups: [],
      dialogVisible: false,
      dialogMode: 'add',
      oldNum: '',
      oldCh: '',
      form: emptyForm(),
      rules: {
        num: [{ required: true, message: '必填', trigger: 'blur' }, { pattern: /^[1-9]\d{2,11}$/, message: '请输入 3-12 位数字，且不能以 0 开头', trigger: 'blur' }],
      },
    };
  },
  watch: {
    vdnId: {
      immediate: true,
      handler() {
        this.dialogVisible = false;
        this.closeDraft();
        this.load();
        this.loadGroups();
      },
    },
  },
  beforeDestroy() { this.closeDraft(); },
  methods: {
    releaseReservation(reservation) {
      if (!reservation) return Promise.resolve();
      return this.$ajax.postJSON(`${BASE}/releaseExtension`, {
        vdnId: reservation.vdnId, reservationToken: reservation.reservationToken,
      }).catch(() => {});
    },
    closeDraft() {
      this.requestGeneration += 1;
      const reservation = this.reservation;
      this.reservation = null;
      this.allocating = false;
      this.releaseReservation(reservation);
    },
    numberChanged() {
      this.requestGeneration += 1;
      if (this.reservation && this.reservation.num !== this.form.num.trim()) {
        const reservation = this.reservation;
        this.reservation = null;
        this.releaseReservation(reservation);
      }
    },
    async acquireNumber() {
      if (this.allocating || this.saving || !this.vdnId) return;
      const generation = ++this.requestGeneration;
      const vdnId = this.vdnId;
      this.allocating = true;
      try {
        const data = await this.$ajax.postJSON(`${BASE}/acquireExtension`, {
          vdnId, reservationToken: this.reservation ? this.reservation.reservationToken : undefined,
        });
        if (!data || Number(data.result) !== 1 || !data.reservationToken) throw new Error('allocation failed');
        const reservation = { num: data.num, reservationToken: data.reservationToken, vdnId };
        if (generation !== this.requestGeneration || vdnId !== this.vdnId || !this.dialogVisible) {
          await this.releaseReservation(reservation);
          return;
        }
        this.form.num = data.num;
        this.reservation = reservation;
        if (this.$refs && this.$refs.formRef) this.$refs.formRef.clearValidate('num');
      } catch (e) {
        if (generation === this.requestGeneration) this.$message.error('获取分机号失败，请重试');
      } finally { if (generation === this.requestGeneration) this.allocating = false; }
    },
    async checkNumber() {
      if (this.dialogMode !== 'add' || this.reservation || !/^[1-9]\d{2,11}$/.test(this.form.num.trim())) return;
      const num = this.form.num.trim(), vdnId = this.vdnId, generation = this.requestGeneration;
      try {
        const data = await this.$ajax.postJSON(`${BASE}/checkExtensionNumber`, { num, vdnId });
        if (generation === this.requestGeneration && vdnId === this.vdnId && num === this.form.num.trim() && this.dialogVisible && data && data.available === false) this.$message.warning('分机号已存在');
      } catch (e) { /* Save still performs authoritative validation. */ }
    },
    load() {
      if (!this.vdnId) {
        this.rows = [];
        return;
      }
      this.loading = true;
      this.err = '';
      this.$ajax.postJSON(`${BASE}/loadExtensionList`, {
        vdnId: this.vdnId,
        'extensionBean.pageNum': 1,
        'extensionBean.pageSize': 500,
        'extensionBean.num': this.keyword.trim(),
      }).then((data) => {
        this.rows = Array.isArray(data && data.Rows) ? data.Rows : [];
      }).catch(() => {
        this.err = '加载分机失败';
        this.rows = [];
      }).finally(() => {
        this.loading = false;
      });
    },
    loadGroups() {
      if (!this.vdnId) {
        this.groups = [];
        return;
      }
      this.$ajax.postJSON(`${BASE}/getchGroupList`, { vdnId: this.vdnId }).then((data) => {
        const list = Array.isArray(data) ? data : [];
        this.groups = list.map((g) => ({ name: String(g.name || g.Name || '') })).filter((g) => g.name);
      }).catch(() => {
        this.groups = [];
      });
    },
    onSel(rows) {
      this.selection = rows || [];
    },
    openAdd() {
      this.closeDraft();
      this.dialogMode = 'add';
      this.oldNum = '';
      this.oldCh = '';
      this.form = emptyForm();
      this.dialogVisible = true;
    },
    openEdit(row) {
      this.closeDraft();
      this.dialogMode = 'edit';
      this.oldNum = String(row.num);
      this.oldCh = row.ch == null ? '' : String(row.ch);
      this.form = {
        num: String(row.num),
        device: Number(row.device || 0),
        ch: row.ch == null ? '' : String(row.ch),
        chGroup: row.chGroup || '',
        description: row.description || '',
        agentMode: row.agentMode == null ? 0 : Number(row.agentMode),
        callAgentRouterType: row.callAgentRouterType == null ? 0 : Number(row.callAgentRouterType),
        callExternalRouterType: row.callExternalRouterType == null ? 0 : Number(row.callExternalRouterType),
        sipEnabled: Number(row.sipEnabled) === 1,
      };
      this.dialogVisible = true;
    },
    submit() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        this.saving = true;
        const ext = {
          ...this.form,
          vdn: this.vdnId,
          device: Number(this.form.device),
          ch: this.form.ch === '' ? null : Number(this.form.ch),
          agentMode: Number(this.form.agentMode || 0),
        };
        const url = this.dialogMode === 'edit' ? `${BASE}/editExtension` : `${BASE}/addExtension`;
        const payload = { extensionJson: JSON.stringify(ext), vdnId: this.vdnId };
        if (this.dialogMode === 'add' && this.reservation && this.reservation.vdnId === this.vdnId && this.reservation.num === ext.num.trim()) payload.reservationToken = this.reservation.reservationToken;
        if (this.dialogMode === 'edit') {
          payload.oldNum = this.oldNum;
          payload.oldCh = this.oldCh;
        }
        this.$ajax.postJSON(url, payload).then((data) => {
          if (data && Number(data.result) === 1) {
            this.reservation = null;
            this.dialogVisible = false;
            this.load();
            return;
          }
          if (data && Number(data.result) === -2) this.$message.warning('分机号已存在');
          else if (data && Number(data.result) === -1) this.$message.warning('分机已被引用，不能改号');
          else this.$message.warning(data && data.msg ? data.msg : '保存失败');
        }).catch(() => {
          this.$message.error('保存失败');
        }).finally(() => {
          this.saving = false;
        });
      });
    },
    rowEnabled(row) {
      return Number(row.isValid) !== 0;
    },
    setValid(row, on) {
      const prev = this.rowEnabled(row);
      this.$set(row, 'isValid', on ? 1 : 0);
      this.$ajax.postJSON(`${BASE}/setExtensionValid`, {
        vdnId: this.vdnId,
        num: row.num,
        isValid: on ? 1 : 0,
      }).then((code) => {
        if (code === 1) return;
        this.$set(row, 'isValid', prev ? 1 : 0);
        this.$message.warning('启停失败');
      }).catch(() => {
        this.$set(row, 'isValid', prev ? 1 : 0);
        this.$message.error('启停失败');
      });
    },
    remove() {
      const nums = this.selection.map((r) => r.num).join(',');
      this.$confirm('删除选中的分机？', '分机', { type: 'warning' }).then(() => {
        this.$ajax.postJSON(`${BASE}/deleteExtension`, { nums, vdnId: this.vdnId }).then((data) => {
          if (data && Number(data.result) === 1) this.load();
          else this.$message.warning(data && data.num ? `分机已被引用：${data.num}` : '删除失败');
        });
      }).catch(() => {});
    },
  },
};
</script>

<style scoped>
.vdn-ext-panel {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.ext-toolbar {
  display: flex;
  flex: 0 0 auto;
  gap: 8px;
  margin-bottom: 12px;
}
.ext-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
}
.ext-search { width: 220px; }
.mb { margin-bottom: 12px; }
.number-editor { display: flex; gap: 8px; align-items: center; }
.number-editor .el-input { flex: 1; min-width: 0; }
.number-editor .el-button { flex: 0 0 auto; }
.row-ops {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
</style>
