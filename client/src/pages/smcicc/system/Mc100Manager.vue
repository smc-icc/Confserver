<template>
  <div class="smcicc-page mc100-manager-page">
    <system-list-toolbar
      :title="$t('smcicc.system.mc100.title')"
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
      <el-table-column prop="ip" :label="$t('smcicc.system.mc100.colIp')" min-width="160" show-overflow-tooltip />
      <el-table-column prop="port" :label="$t('smcicc.system.mc100.colPort')" width="100" />
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="400px" append-to-body @closed="onDialogClosed">
      <p v-if="dialogMode === 'copy'" class="copy-hint">{{ $t('smcicc.system.mc100.copyHint') }}</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="88px" size="small">
        <el-form-item :label="$t('smcicc.system.mc100.ip')" prop="ip">
          <el-input v-model="form.ip" class="no-ime" :placeholder="$t('smcicc.system.mc100.placeholderIpv4')" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.mc100.port')" prop="port">
          <el-input v-model="form.port" class="no-ime" maxlength="5" :placeholder="$t('smcicc.system.mc100.placeholderPortRange')" />
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
  name: 'SMCIccMc100Manager',
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
      form: { pid: null, ip: '', port: '' },
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    dialogTitle() {
      const modeKey = {
        add: 'operate.title.add',
        edit: 'operate.title.update',
        copy: 'smcicc.common.copy',
      };
      const action = modeKey[this.dialogMode] ? this.$t(modeKey[this.dialogMode]) : '';
      return `${this.$t('smcicc.system.mc100.dialogTitle')} - ${action}`;
    },
    rules() {
      const validateIp = (rule, value, cb) => {
        const v = String(value ?? '').trim();
        if (!v) {
          cb(new Error(this.$t('smcicc.system.mc100.ipRequired')));
          return;
        }
        if (!IPV4.test(v)) {
          cb(new Error(this.$t('smcicc.system.mc100.ipInvalid')));
          return;
        }
        cb();
      };
      const validatePort = (rule, value, cb) => {
        const s = String(value ?? '').trim();
        if (s === '') {
          cb(new Error(this.$t('smcicc.system.mc100.portRequired')));
          return;
        }
        if (!/^\d+$/.test(s)) {
          cb(new Error(this.$t('smcicc.system.mc100.portInteger')));
          return;
        }
        const n = Number(s);
        if (n < 0 || n > 65535) {
          cb(new Error(this.$t('smcicc.system.mc100.portRange')));
          return;
        }
        cb();
      };
      return {
        ip: [{ validator: validateIp, trigger: 'blur' }],
        port: [{ validator: validatePort, trigger: 'blur' }],
      };
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    successMsgKey() {
      if (this.dialogMode === 'edit') return 'smcicc.common.saveSuccess';
      if (this.dialogMode === 'copy') return 'smcicc.common.copySuccess';
      return 'smcicc.common.addSuccess';
    },
    failMsgKey() {
      if (this.dialogMode === 'edit') return 'smcicc.common.saveFailed';
      if (this.dialogMode === 'copy') return 'smcicc.common.copyFailed';
      return 'smcicc.common.addFailed';
    },
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        ip: '',
        port: '',
      };
    },
    listExportFileName() {
      return 'icc-mc100';
    },
    async importListRecord(record) {
      const ip = String(record.ip || '').trim();
      const port = Number(record.port);
      if (!IPV4.test(ip) || !Number.isInteger(port) || port < 0 || port > 65535) return false;
      return (await this.$ajax.postJSON(`${BASE}/addMc100`, { ip, port })) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadMc100List`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.mc100.loadFailed');
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
    resetForm() {
      this.form = { pid: null, ip: '', port: '' };
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    onDialogClosed() {
      this.resetForm();
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
      this.form = {
        pid: r.pid != null ? r.pid : null,
        ip: r.ip != null ? String(r.ip) : '',
        port: r.port != null ? String(r.port) : '',
      };
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    openCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'copy';
      this.form = {
        pid: null,
        ip: r.ip != null ? String(r.ip) : '',
        port: r.port != null ? String(r.port) : '',
      };
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        const ip = String(this.form.ip).trim();
        const port = Number(String(this.form.port).trim());
        this.saving = true;
        let url;
        let payload;
        if (this.dialogMode === 'edit') {
          url = `${BASE}/modifyMc100`;
          payload = { ip, port, mc100: { pid: this.form.pid } };
        } else if (this.dialogMode === 'copy') {
          url = `${BASE}/copyMc100`;
          payload = { ip, port };
        } else {
          url = `${BASE}/addMc100`;
          payload = { ip, port };
        }
        this.$ajax
          .postJSON(url, payload)
          .then((data) => {
            if (data === 1) {
              this.$message.success(this.$t(this.successMsgKey()));
              this.dialogVisible = false;
              this.load();
            } else if (data === -2) {
              this.$message.warning(this.$t('smcicc.system.mc100.duplicateIpPort'));
            } else {
              this.$message.warning(this.$t(this.failMsgKey()));
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
        .then(() => this.$ajax.postJSON(`${BASE}/deleteMc100`, { mc100Ids: ids.join(',') }))
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
