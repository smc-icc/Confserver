<template>
  <div class="smcicc-page odbc-page">
    <system-list-toolbar
      :title="$t('smcicc.system.odbc.title')"
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
      ref="table"
      v-loading="loading"
      :data="listVisibleRows"
      border
      stripe
      size="small"
      max-height="520"
      @selection-change="onSel"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="odbcName" :label="$t('smcicc.system.odbc.colOdbcName')" min-width="130" show-overflow-tooltip />
      <el-table-column prop="dbType" :label="$t('smcicc.system.odbc.colDbType')" width="120" show-overflow-tooltip />
      <el-table-column prop="dbName" :label="$t('smcicc.system.odbc.colDbName')" min-width="100" show-overflow-tooltip />
      <el-table-column prop="loginId" :label="$t('smcicc.system.odbc.colLoginId')" min-width="100" show-overflow-tooltip />
      <el-table-column prop="loginPwd" :label="$t('smcicc.system.odbc.colLoginPwd')" min-width="100" show-overflow-tooltip />
      <el-table-column prop="dbCharSet" :label="$t('smcicc.system.odbc.colDbCharSet')" width="110" show-overflow-tooltip />
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="440px" append-to-body @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="132px" size="small">
        <el-form-item :label="$t('smcicc.system.odbc.odbcName')" prop="odbcName">
          <el-input v-model="form.odbcName" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.odbc.dbType')" prop="dbType">
          <el-select v-model="form.dbType" :placeholder="$t('smcicc.common.pleaseSelect')" style="width: 100%">
            <el-option v-for="t in dbTypes" :key="t" :label="t" :value="t" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.odbc.dbName')" prop="dbName">
          <el-input v-model="form.dbName" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.odbc.loginId')" prop="loginId">
          <el-input v-model="form.loginId" autocomplete="off" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.odbc.loginPwd')" prop="loginPwd">
          <el-input v-model="form.loginPwd" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.odbc.dbCharSet')" prop="dbCharSet">
          <el-select v-model="form.dbCharSet" :placeholder="$t('smcicc.common.pleaseSelect')" style="width: 100%">
            <el-option v-for="c in charsets" :key="c" :label="c" :value="c" />
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
  name: 'SMCIccOdbcManager',
  components: { SystemListToolbar },
  mixins: [systemListPageMixin],
  data() {
    return {
      dbTypes: ['MySQL', 'Oracle', 'MS SQLServer'],
      charsets: ['UTF-8', 'GB2312', 'GBK'],
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
        odbcName: '',
        dbType: 'MySQL',
        dbName: '',
        loginId: '',
        loginPwd: '',
        dbCharSet: 'UTF-8',
      },
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    dialogTitle() {
      const action =
        this.dialogMode === 'edit' ? this.$t('operate.title.update') : this.$t('operate.title.add');
      return `${this.$t('smcicc.system.odbc.dialogTitle')} - ${action}`;
    },
    rules() {
      return {
        odbcName: [{ required: true, message: this.$t('smcicc.system.odbc.odbcNameRequired'), trigger: 'blur' }],
        dbType: [{ required: true, message: this.$t('smcicc.system.odbc.dbTypeRequired'), trigger: 'change' }],
        dbName: [{ required: true, message: this.$t('smcicc.system.odbc.dbNameRequired'), trigger: 'blur' }],
        loginId: [{ required: true, message: this.$t('smcicc.system.odbc.loginIdRequired'), trigger: 'blur' }],
        loginPwd: [{ required: true, message: this.$t('smcicc.system.odbc.loginPwdRequired'), trigger: 'blur' }],
        dbCharSet: [{ required: true, message: this.$t('smcicc.system.odbc.dbCharSetRequired'), trigger: 'change' }],
      };
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        odbc: { odbcName: '', dbType: '', dbName: '' },
      };
    },
    listExportFileName() {
      return 'icc-odbc';
    },
    async importListRecord(record) {
      const odbc = {
        odbcName: String(record.odbcName || '').trim(),
        dbType: String(record.dbType || 'MySQL').trim(),
        dbName: String(record.dbName || '').trim(),
        loginId: String(record.loginId || '').trim(),
        loginPwd: String(record.loginPwd || ''),
        dbCharSet: String(record.dbCharSet || 'UTF-8').trim(),
      };
      if (!odbc.odbcName || !odbc.dbName || !odbc.loginId || !odbc.loginPwd) return false;
      return (await this.$ajax.postJSON(`${BASE}/addOdbc`, { odbc })) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadOdbcList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.odbc.loadFailed');
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
      this.form = {
        pid: null,
        odbcName: '',
        dbType: 'MySQL',
        dbName: '',
        loginId: '',
        loginPwd: '',
        dbCharSet: 'UTF-8',
      };
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
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
        pid: r.pid,
        odbcName: r.odbcName != null ? String(r.odbcName) : '',
        dbType: r.dbType != null ? String(r.dbType) : 'MySQL',
        dbName: r.dbName != null ? String(r.dbName) : '',
        loginId: r.loginId != null ? String(r.loginId) : '',
        loginPwd: r.loginPwd != null ? String(r.loginPwd) : '',
        dbCharSet: r.dbCharSet != null ? String(r.dbCharSet) : 'UTF-8',
      };
      this.dialogVisible = true;
    },
    odbcBody() {
      return {
        pid: this.form.pid,
        odbcName: this.form.odbcName.trim(),
        dbType: this.form.dbType,
        dbName: this.form.dbName.trim(),
        loginId: this.form.loginId.trim(),
        loginPwd: this.form.loginPwd,
        dbCharSet: this.form.dbCharSet,
      };
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        this.saving = true;
        const url = this.dialogMode === 'edit' ? `${BASE}/editOdbc` : `${BASE}/addOdbc`;
        const payload = { odbc: this.odbcBody() };
        this.$ajax
          .postJSON(url, payload)
          .then((data) => {
            if (data === 1) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.dialogVisible = false;
              this.load();
            } else if (data === -2) {
              this.$message.warning(this.$t('smcicc.system.odbc.duplicateOdbcName'));
            } else {
              this.$message.warning(this.$t('smcicc.common.saveFailed'));
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
    doCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.$confirm(this.$t('smcicc.system.odbc.copyConfirm'), this.$t('smcicc.common.copy'), { type: 'info' })
        .then(() => this.$ajax.postJSON(`${BASE}/copyOdbc`, { odbc: { pid: r.pid } }))
        .then((ok) => {
          if (ok) {
            this.$message.success(this.$t('smcicc.common.copySuccess'));
            this.load();
          } else {
            this.$message.warning(this.$t('smcicc.common.copyFailed'));
          }
        })
        .catch(() => {});
    },
    doDelete() {
      if (!this.selection.length) return;
      const pids = this.selection.map((r) => r.pid).filter((id) => id != null);
      const n = pids.length;
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteOdbc`, { pids: pids.join(',') }))
        .then((ok) => {
          if (ok) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else {
            this.$message.warning(this.$t('smcicc.common.deleteFailed'));
          }
        })
        .catch((e) => {
          if (e === 'cancel') return;
        });
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
</style>
