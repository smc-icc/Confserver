<template>
  <div class="smcicc-page access-machine-page">
    <system-list-toolbar
      :title="$t('smcicc.system.accessMachine.title')"
      :keyword.sync="filterKeyword"
      :importing="importing"
      :has-rows="listFilteredRows.length > 0"
      :has-selection="selection.length > 0"
      @search="handleListSearch"
      @clear="clearListSearch"
      @add="openAdd"
      @import="importList"
      @export="exportList"
      @delete="doDelete"
    />

    <el-alert v-if="err" :title="err" type="error" show-icon class="mb" :closable="false" />

    <el-table
      v-loading="loading"
      :data="listVisibleRows"
      border
      stripe
      size="small"
      max-height="520"
      @selection-change="onSel"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="ipAddress" :label="$t('smcicc.system.accessMachine.colIp')" min-width="140" show-overflow-tooltip />
      <el-table-column prop="port" :label="$t('smcicc.system.accessMachine.colPort')" width="90" />
      <el-table-column :label="$t('smcicc.system.accessMachine.colRunMode')" min-width="160">
        <template slot-scope="scope">
          {{ runModeText(scope.row.runMode) }}
        </template>
      </el-table-column>
      <el-table-column prop="note" :label="$t('smcicc.system.accessMachine.colNote')" min-width="200" show-overflow-tooltip />
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="total, sizes, prev, pager, next, jumper"
      :page-sizes="[10, 20, 50]"
      :current-page.sync="page"
      :page-size.sync="pageSize"
      :total="listFilteredTotal"
      @size-change="setListPageSize"
      @current-change="setListPage"
    />

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="440px" append-to-body @closed="onDialogClosed">
      <p v-if="dialogMode === 'copy'" class="copy-hint">{{ $t('smcicc.system.accessMachine.copyHint') }}</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="small">
        <el-form-item :label="$t('smcicc.system.accessMachine.ipAddress')" prop="ipAddress">
          <el-input v-model="form.ipAddress" class="no-ime" :placeholder="$t('smcicc.system.accessMachine.placeholderIpv4')" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.accessMachine.port')" prop="port">
          <el-input v-model="form.port" class="no-ime" maxlength="5" :placeholder="$t('smcicc.system.accessMachine.placeholderPortRange')" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.accessMachine.runMode')" prop="runMode">
          <el-select v-model="form.runMode" style="width: 100%">
            <el-option :label="$t('smcicc.system.accessMachine.runModeMaster')" value="Master" />
            <el-option :label="$t('smcicc.system.accessMachine.runModeSlave')" value="Slave" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.accessMachine.note')" prop="note">
          <el-input v-model="form.note" type="textarea" :rows="2" :placeholder="$t('smcicc.common.optional')" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="dialogVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="submitForm">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import SystemListToolbar from './SystemListToolbar.vue';
import systemListPageMixin, { DEFAULT_LIST_LIMIT } from './systemListPageMixin';

const BASE = '/server/api/smcicc/systemadmin';

const IPV4 =
  /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;

export default {
  name: 'SMCIccAccessMachineManager',
  components: { SystemListToolbar },
  mixins: [systemListPageMixin],
  data() {
    return {
      loading: false,
      saving: false,
      err: '',
      rows: [],
      total: 0,
      page: 1,
      pageSize: 10,
      selection: [],
      dialogVisible: false,
      dialogMode: 'add',
      form: {
        pid: null,
        ipAddress: '',
        port: '',
        runMode: 'Master',
        note: '',
      },
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    dialogTitle() {
      let action;
      if (this.dialogMode === 'edit') action = this.$t('operate.title.update');
      else if (this.dialogMode === 'copy') action = this.$t('smcicc.common.copy');
      else action = this.$t('operate.title.add');
      return `${this.$t('smcicc.system.accessMachine.dialogTitle')} - ${action}`;
    },
    rules() {
      const validateIp = (rule, value, cb) => {
        const v = String(value ?? '').trim();
        if (!v) {
          cb(new Error(this.$t('smcicc.system.accessMachine.ipRequired')));
          return;
        }
        if (!IPV4.test(v)) {
          cb(new Error(this.$t('smcicc.system.accessMachine.ipInvalid')));
          return;
        }
        cb();
      };
      const validatePort = (rule, value, cb) => {
        const s = String(value ?? '').trim();
        if (s === '') {
          cb(new Error(this.$t('smcicc.system.accessMachine.portRequired')));
          return;
        }
        if (!/^\d+$/.test(s)) {
          cb(new Error(this.$t('smcicc.system.accessMachine.portNumeric')));
          return;
        }
        const n = Number(s);
        if (n < 0 || n > 65535) {
          cb(new Error(this.$t('smcicc.system.accessMachine.portRange')));
          return;
        }
        cb();
      };
      return {
        ipAddress: [{ validator: validateIp, trigger: 'blur' }],
        port: [{ validator: validatePort, trigger: 'blur' }],
        runMode: [{ required: true, message: this.$t('smcicc.system.accessMachine.runModeRequired'), trigger: 'change' }],
      };
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    runModeText(v) {
      if (v === 'Master' || v === 'master') return this.$t('smcicc.system.accessMachine.runModeMaster');
      if (v === 'Slave' || v === 'slave') return this.$t('smcicc.system.accessMachine.runModeSlave');
      return v != null && String(v) !== '' ? String(v) : this.$t('smcicc.system.accessMachine.runModeUnknown');
    },
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        ipAddress: '',
        port: -1,
        runMode: '',
      };
    },
    listExportFileName() {
      return 'icc-comm';
    },
    async importListRecord(record) {
      const payload = {
        ipAddress: String(record.ipAddress || '').trim(),
        port: Number(record.port),
        runMode: String(record.runMode || 'Master'),
        note: String(record.note || ''),
      };
      if (!IPV4.test(payload.ipAddress) || !Number.isInteger(payload.port) || payload.port < 0 || payload.port > 65535) {
        return false;
      }
      return (await this.$ajax.postJSON(`${BASE}/addAccessMachine`, payload)) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadAccessMachineList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.accessMachine.loadFailed');
          this.rows = [];
          this.total = 0;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    onSel(rows) {
      this.selection = rows || [];
    },
    defaultForm() {
      return {
        pid: null,
        ipAddress: '',
        port: '',
        runMode: 'Master',
        note: '',
      };
    },
    resetForm() {
      this.form = this.defaultForm();
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    onDialogClosed() {
      this.resetForm();
    },
    rowToForm(r) {
      return {
        pid: r.pid != null ? r.pid : null,
        ipAddress: r.ipAddress != null ? String(r.ipAddress) : '',
        port: r.port != null ? String(r.port) : '',
        runMode: r.runMode === 'Slave' || r.runMode === 'slave' ? 'Slave' : 'Master',
        note: r.note != null ? String(r.note) : '',
      };
    },
    openAdd() {
      this.dialogMode = 'add';
      this.resetForm();
      this.dialogVisible = true;
    },
    openEdit() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'edit';
      this.form = this.rowToForm(r);
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    openCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'copy';
      const f = this.rowToForm(r);
      f.pid = null;
      this.form = f;
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    submitSuccessMessage() {
      if (this.dialogMode === 'edit') return this.$t('smcicc.common.saveSuccess');
      if (this.dialogMode === 'copy') return this.$t('smcicc.common.copySuccess');
      return this.$t('smcicc.common.addSuccess');
    },
    submitFailMessage() {
      if (this.dialogMode === 'edit') return this.$t('smcicc.common.saveFailed');
      if (this.dialogMode === 'copy') return this.$t('smcicc.common.copyFailed');
      return this.$t('smcicc.common.addFailed');
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        const ipAddress = String(this.form.ipAddress).trim();
        const port = Number(String(this.form.port).trim());
        const runMode = String(this.form.runMode || 'Master');
        const note = String(this.form.note ?? '').trim();
        this.saving = true;
        let url;
        let payload;
        if (this.dialogMode === 'edit') {
          url = `${BASE}/modifyAccessMachine`;
          payload = { pid: this.form.pid, ipAddress, port, runMode, note };
        } else if (this.dialogMode === 'copy') {
          url = `${BASE}/copyAccessMachine`;
          payload = { ipAddress, port, runMode, note };
        } else {
          url = `${BASE}/addAccessMachine`;
          payload = { ipAddress, port, runMode, note };
        }
        this.$ajax
          .postJSON(url, payload)
          .then((data) => {
            if (data === 1) {
              this.$message.success(this.submitSuccessMessage());
              this.dialogVisible = false;
              this.load();
            } else if (data === -2) {
              this.$message.warning(this.$t('smcicc.system.accessMachine.duplicateIpPort'));
            } else {
              this.$message.warning(this.submitFailMessage());
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
    doDelete() {
      if (!this.selection.length) return;
      const ids = this.selection.map((r) => r.pid).filter((id) => id != null);
      const n = ids.length;
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteAccessMachine`, { accessMachineIds: ids.join(',') }))
        .then((ok) => {
          if (ok === true || ok === 1) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else {
            this.$message.warning(this.$t('smcicc.common.deleteFailed'));
          }
        })
        .catch(() => {});
    },
  },
};
</script>

<style scoped>
.page-title {
  font-size: 20px;
  margin: 0 0 8px;
}
.desc {
  color: #606266;
  font-size: 13px;
  margin-bottom: 12px;
  line-height: 1.5;
}
.toolbar {
  margin-bottom: 8px;
}
.actions {
  margin-bottom: 12px;
}
.actions .el-button + .el-button {
  margin-left: 8px;
}
.mb {
  margin-bottom: 12px;
}
.pager {
  margin-top: 16px;
}
.no-ime {
  ime-mode: disabled;
}
.copy-hint {
  margin: 0 0 12px;
  padding: 8px 10px;
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  border-radius: 4px;
}
</style>
