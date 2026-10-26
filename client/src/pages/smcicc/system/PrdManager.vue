<template>
  <div class="smcicc-page prd-manager-page">
    <system-list-toolbar
      :title="$t('smcicc.system.prd.title')"
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
      <el-table-column prop="pid" :label="$t('smcicc.system.prd.colPid')" width="100" />
      <el-table-column prop="isxPid" :label="$t('smcicc.system.prd.colIsxPid')" width="120" />
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
      <p v-if="dialogMode === 'copy'" class="copy-hint">{{ $t('smcicc.system.prd.copyHint') }}</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="small">
        <el-form-item :label="$t('smcicc.system.prd.pid')" prop="pid">
          <el-input v-model="form.pid" class="no-ime" maxlength="9" :placeholder="$t('smcicc.system.prd.placeholderPidRequired')" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.prd.isxPid')" prop="isxPid">
          <el-select
            v-model="form.isxPid"
            filterable
            clearable
            :placeholder="$t('smcicc.system.prd.placeholderIsxOptional')"
            style="width: 100%"
          >
            <el-option v-for="o in isxOptions" :key="'isx-' + o.pid" :label="String(o.pid)" :value="o.pid" />
          </el-select>
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

export default {
  name: 'SMCIccPrdManager',
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
      isxOptions: [],
      dialogVisible: false,
      dialogMode: 'add',
      form: {
        pid: '',
        oldPid: null,
        isxPid: 0,
      },
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
      return `${this.$t('smcicc.system.prd.dialogTitle')} - ${action}`;
    },
    rules() {
      const validatePid = (rule, value, cb) => {
        const s = String(value ?? '').trim();
        if (s === '') {
          cb(new Error(this.$t('smcicc.system.prd.pidRequired')));
          return;
        }
        if (!/^\d+$/.test(s)) {
          cb(new Error(this.$t('smcicc.system.prd.pidNonNegative')));
          return;
        }
        cb();
      };
      const validateIsxPid = (rule, value, cb) => {
        if (value === null || value === undefined || value === '') {
          cb();
          return;
        }
        const n = Number(value);
        if (Number.isNaN(n) || n < 0 || !Number.isInteger(n)) {
          cb(new Error(this.$t('smcicc.system.prd.isxNonNegative')));
          return;
        }
        cb();
      };
      return {
        pid: [{ validator: validatePid, trigger: 'blur' }],
        isxPid: [{ validator: validateIsxPid, trigger: 'change' }],
      };
    },
  },
  mounted() {
    this.loadIsxList();
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
    loadIsxList() {
      this.$ajax
        .getJSON(`${BASE}/loadIsxList`)
        .then((data) => {
          const rows = (Array.isArray(data) ? data : []).map((r) => ({
            pid: Number(r.pid),
          }));
          const seen = new Set(rows.map((r) => r.pid));
          const withZero = seen.has(0) ? rows : [{ pid: 0 }, ...rows];
          withZero.sort((a, b) => a.pid - b.pid);
          this.isxOptions = withZero;
        })
        .catch(() => {
          this.isxOptions = [{ pid: 0 }];
        });
    },
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        prd: { pid: '' },
      };
    },
    listExportFileName() {
      return 'icc-prd';
    },
    async importListRecord(record) {
      const pid = Number(record.pid);
      const isxPid = Number(record.isxPid || 0);
      if (!Number.isInteger(pid) || pid <= 0 || !Number.isInteger(isxPid) || isxPid < 0) return false;
      return (await this.$ajax.postJSON(`${BASE}/addPrd`, { prd: { pid, isxPid } })) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadPrdList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.prd.loadFailed');
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
        pid: '',
        oldPid: null,
        isxPid: 0,
      };
    },
    resetForm() {
      this.form = this.defaultForm();
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
        pid: r.pid != null ? String(r.pid) : '',
        oldPid: r.pid != null ? Number(r.pid) : null,
        isxPid: r.isxPid != null ? Number(r.isxPid) : 0,
      };
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    openCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'copy';
      this.form = {
        pid: r.pid != null ? String(r.pid) : '',
        oldPid: null,
        isxPid: r.isxPid != null ? Number(r.isxPid) : 0,
      };
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        const pidNum = Number(String(this.form.pid).trim());
        if ((this.dialogMode === 'add' || this.dialogMode === 'copy') && pidNum === 0) {
          this.$message.warning(this.$t('smcicc.system.prd.pidZeroNotAllowed'));
          return;
        }
        let isx = this.form.isxPid;
        if (isx === null || isx === undefined || isx === '') isx = 0;
        isx = Number(isx);
        if (Number.isNaN(isx)) isx = 0;

        this.saving = true;
        const prd = { pid: pidNum, isxPid: isx };

        let req;
        if (this.dialogMode === 'edit') {
          req = this.$ajax.postJSON(`${BASE}/editPrd`, {
            prd,
            oldPid: this.form.oldPid,
          });
        } else {
          req = this.$ajax.postJSON(`${BASE}/addPrd`, { prd });
        }

        req
          .then((data) => {
            if (data === 1) {
              this.$message.success(this.$t(this.successMsgKey()));
              this.dialogVisible = false;
              this.load();
            } else if (data === -2) {
              this.$message.warning(this.$t('smcicc.system.prd.duplicatePid'));
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
      const pids = this.selection.map((r) => r.pid).filter((id) => id != null);
      const n = pids.length;
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deletePrd`, { pids: pids.join(',') }))
        .then((data) => {
          const result = data && Number(data.result);
          if (result > 0) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else if (data && data.prd) {
            this.$message.warning(this.$t('smcicc.system.prd.deleteReferenced', { prd: data.prd }));
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
