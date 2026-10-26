<template>
  <div class="smcicc-page sip-ext-page">
    <system-list-toolbar
      :title="$t('smcicc.system.sipExtNum.title')"
      :keyword.sync="filterKeyword"
      :importing="importing"
      :has-rows="listFilteredRows.length > 0"
      :has-selection="selection.length > 0"
      :add-disabled="!connected"
      :import-disabled="!connected"
      :delete-disabled="!connected"
      @search="handleListSearch"
      @clear="clearListSearch"
      @add="openAddItem"
      @import="importList"
      @export="exportList"
      @delete="doDelete"
    />

    <el-card shadow="never" class="db-card">
      <div slot="header" class="card-head">
        <span>{{ $t('smcicc.system.sipExtNum.dbConnection') }}</span>
        <span class="hint">{{ $t('smcicc.system.sipExtNum.dbHint') }}</span>
      </div>
      <el-form :inline="true" size="small" class="db-form">
        <el-form-item :label="$t('smcicc.system.sipExtNum.serverIp')">
          <el-input v-model="dbForm.ip" clearable :placeholder="$t('smcicc.system.sipExtNum.placeholderIp')" style="width: 160px" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sipExtNum.port')">
          <el-input v-model="dbForm.port" clearable :placeholder="$t('smcicc.system.sipExtNum.placeholderPort')" style="width: 80px" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sipExtNum.dbName')">
          <el-input v-model="dbForm.dbName" clearable :placeholder="$t('smcicc.system.sipExtNum.placeholderDbName')" style="width: 120px" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sipExtNum.account')">
          <el-input v-model="dbForm.userName" clearable autocomplete="username" style="width: 120px" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sipExtNum.password')">
          <el-input v-model="dbForm.password" type="password" show-password autocomplete="current-password" style="width: 120px" />
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="connLoading" @click="connectDb">{{ $t('smcicc.system.sipExtNum.connectDb') }}</el-button>
        </el-form-item>
      </el-form>
    </el-card>

    <el-alert v-if="err" :title="err" type="error" show-icon class="mb" :closable="false" />

    <el-table
      v-loading="loading"
      :data="listVisibleRows"
      border
      stripe
      size="small"
      max-height="480"
      @selection-change="onSel"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="userName" :label="$t('smcicc.system.sipExtNum.colExtNum')" min-width="160" show-overflow-tooltip />
      <el-table-column prop="password" :label="$t('smcicc.system.sipExtNum.colPassword')" min-width="160" show-overflow-tooltip />
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="total, sizes, prev, pager, next, jumper"
      :page-sizes="[10, 20, 50]"
      :current-page.sync="page"
      :page-size.sync="pageSize"
      :total="listFilteredTotal"
      :disabled="!connected"
      @size-change="setListPageSize"
      @current-change="setListPage"
    />

    <el-dialog :title="$t('smcicc.system.sipExtNum.batchDialogTitle')" :visible.sync="batchDlg" width="420px" append-to-body @closed="resetBatch">
      <el-form ref="batchRef" :model="batchForm" :rules="batchRules" label-width="120px" size="small">
        <el-form-item :label="$t('smcicc.system.sipExtNum.extFrom')" prop="extNum1">
          <el-input v-model="batchForm.extNum1" maxlength="9" show-word-limit :placeholder="$t('smcicc.system.sipExtNum.placeholderDigits9')" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sipExtNum.extTo')" prop="extNum2">
          <el-input v-model="batchForm.extNum2" maxlength="9" show-word-limit :placeholder="$t('smcicc.system.sipExtNum.placeholderExtGreater')" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sipExtNum.loginPassword')" prop="password">
          <el-input v-model="batchForm.password" maxlength="30" show-word-limit />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="batchDlg = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="submitBatch">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>

    <el-dialog :title="singleTitle" :visible.sync="singleDlg" width="400px" append-to-body @closed="resetSingle">
      <el-form ref="singleRef" :model="singleForm" :rules="singleRules" label-width="100px" size="small">
        <el-form-item :label="$t('smcicc.system.sipExtNum.extNum')" prop="extNum1">
          <el-input v-model="singleForm.extNum1" maxlength="30" show-word-limit />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sipExtNum.loginPassword')" prop="password">
          <el-input v-model="singleForm.password" maxlength="30" show-word-limit type="password" show-password />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="singleDlg = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="submitSingle">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import SystemListToolbar from './SystemListToolbar.vue';
import systemListPageMixin, { DEFAULT_LIST_LIMIT } from './systemListPageMixin';

const BASE = '/server/api/smcicc/systemadmin';

export default {
  name: 'SMCIccSipExtNumManager',
  components: { SystemListToolbar },
  mixins: [systemListPageMixin],
  data() {
    return {
      dbForm: {
        ip: '',
        port: '3306',
        dbName: '',
        userName: '',
        password: '',
      },
      fenjiNum: '',
      connected: false,
      connLoading: false,
      loading: false,
      saving: false,
      err: '',
      rows: [],
      total: 0,
      page: 1,
      pageSize: 10,
      selection: [],
      batchDlg: false,
      batchForm: { extNum1: '', extNum2: '', password: '' },
      singleDlg: false,
      singleMode: 'addItem',
      singleForm: { pid: null, extNum1: '', password: '' },
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    singleTitle() {
      const action =
        this.singleMode === 'edit'
          ? this.$t('operate.title.update')
          : this.singleMode === 'copy'
            ? this.$t('smcicc.common.copy')
            : this.$t('operate.title.add');
      return `${this.$t('smcicc.system.sipExtNum.dialogTitle')} - ${action}`;
    },
    batchRules() {
      const digits = (rule, val, cb) => {
        const s = String(val || '').trim();
        if (!/^\d+$/.test(s)) {
          cb(new Error(this.$t('smcicc.common.digitsOnly')));
          return;
        }
        cb();
      };
      return {
        extNum1: [
          { required: true, message: this.$t('smcicc.system.sipExtNum.extFromRequired'), trigger: 'blur' },
          { validator: digits, trigger: 'blur' },
        ],
        extNum2: [
          { required: true, message: this.$t('smcicc.system.sipExtNum.extToRequired'), trigger: 'blur' },
          { validator: digits, trigger: 'blur' },
        ],
      };
    },
    singleRules() {
      return {
        extNum1: [{ required: true, message: this.$t('smcicc.system.sipExtNum.extRequired'), trigger: 'blur' }],
      };
    },
  },
  mounted() {
    this.$ajax
      .getJSON('/server/api/smcicc/registry')
      .then((data) => {
        const k = data && data.kamailioDbDefaults;
        if (!k) return;
        if (!this.dbForm.ip && k.ip) this.dbForm.ip = k.ip;
        if (k.port) this.dbForm.port = String(k.port);
        if (!this.dbForm.dbName && k.dbName) this.dbForm.dbName = k.dbName;
        if (!this.dbForm.userName && k.userName) this.dbForm.userName = k.userName;
        if (!this.dbForm.password && k.password) this.dbForm.password = k.password;
      })
      .catch(() => {});
  },
  methods: {
    dbPayload() {
      return {
        ip: (this.dbForm.ip || '').trim().replace(/_/g, ''),
        port: (this.dbForm.port || '').trim() || '3306',
        dbName: (this.dbForm.dbName || '').trim(),
        userName: (this.dbForm.userName || '').trim(),
        password: this.dbForm.password != null ? String(this.dbForm.password) : '',
      };
    },
    listPayload() {
      return {
        ...this.dbPayload(),
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        fenjiNum: '',
      };
    },
    validateDb() {
      const p = this.dbPayload();
      if (!p.ip) {
        this.$message.warning(this.$t('smcicc.system.sipExtNum.ipEmpty'));
        return false;
      }
      if (!p.port) {
        this.$message.warning(this.$t('smcicc.system.sipExtNum.portEmpty'));
        return false;
      }
      if (!p.dbName) {
        this.$message.warning(this.$t('smcicc.system.sipExtNum.dbNameEmpty'));
        return false;
      }
      if (!p.userName) {
        this.$message.warning(this.$t('smcicc.system.sipExtNum.accountEmpty'));
        return false;
      }
      if (p.password === '') {
        this.$message.warning(this.$t('smcicc.system.sipExtNum.passwordEmpty'));
        return false;
      }
      return true;
    },
    connectDb() {
      if (!this.validateDb()) return;
      this.connLoading = true;
      this.err = '';
      this.page = 1;
      this.$ajax
        .postJSON(`${BASE}/connectionDB`, { ...this.listPayload(), fenjiNum: '' })
        .then((data) => {
          this.connected = !!data.isConnection;
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : 0);
          if (this.connected) {
            this.$message.success(this.$t('smcicc.common.connectSuccess'));
          } else {
            this.$message.warning(this.$t('smcicc.common.connectFailed'));
          }
        })
        .catch(() => {
          this.connected = false;
          this.err = this.$t('smcicc.system.sipExtNum.connectFailedDetail');
          this.rows = [];
          this.total = 0;
        })
        .finally(() => {
          this.connLoading = false;
        });
    },
    listReload() {
      return this.loadList();
    },
    listExportFileName() {
      return 'icc-sip-extension';
    },
    async importListRecord(record) {
      const extNum1 = String(record.userName || record.extNum1 || '').trim();
      const password = String(record.password || '');
      if (!this.connected || !extNum1 || !password) return false;
      const data = await this.$ajax.postJSON(`${BASE}/copySIPExtNum`, { extNum1, password });
      return !!(data && Number(data.result) > 0);
    },
    loadList() {
      if (!this.validateDb()) return;
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/connectionDB`, this.listPayload())
        .then((data) => {
          this.connected = !!data.isConnection;
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : 0);
          if (!this.connected) {
            this.$message.warning(this.$t('smcicc.common.connectFailed'));
          }
        })
        .catch(() => {
          this.err = this.$t('smcicc.common.loadFailed');
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
    resetBatch() {
      this.batchForm = { extNum1: '', extNum2: '', password: '' };
      this.$nextTick(() => this.$refs.batchRef && this.$refs.batchRef.clearValidate());
    },
    openBatchAdd() {
      this.resetBatch();
      this.batchDlg = true;
    },
    submitBatch() {
      this.$refs.batchRef.validate((ok) => {
        if (!ok) return;
        const n1 = BigInt(this.batchForm.extNum1.trim());
        const n2 = BigInt(this.batchForm.extNum2.trim());
        if (n2 <= n1) {
          this.$message.warning(this.$t('smcicc.system.sipExtNum.extRangeJavaHint'));
          return;
        }
        this.saving = true;
        this.$ajax
          .postJSON(`${BASE}/addSIPExtNum`, {
            extNum1: this.batchForm.extNum1.trim(),
            extNum2: this.batchForm.extNum2.trim(),
            password: this.batchForm.password,
          })
          .then((data) => this.handleAddResult(data, true))
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
    handleAddResult(data, isBatch) {
      const r = data && data.result;
      if (r > 0) {
        this.$message.success(isBatch ? this.$t('smcicc.system.sipExtNum.batchSuccess') : this.$t('smcicc.common.addSuccess'));
        this.batchDlg = false;
        this.fenjiNum = '';
        this.loadList();
        return;
      }
      if (r === -2) this.$message.warning(this.$t('smcicc.common.batchAddLimit'));
      else if (r === -3) this.$message.warning(this.$t('smcicc.common.extRangeInvalid'));
      else if (r === -100) this.$message.warning(this.$t('smcicc.common.addFailed'));
      else this.$message.warning(isBatch ? this.$t('smcicc.system.sipExtNum.batchFailed') : this.$t('smcicc.common.addFailed'));
    },
    resetSingle() {
      this.singleForm = { pid: null, extNum1: '', password: '' };
      this.$nextTick(() => this.$refs.singleRef && this.$refs.singleRef.clearValidate());
    },
    openAddItem() {
      this.singleMode = 'addItem';
      this.resetSingle();
      this.singleDlg = true;
    },
    openEdit() {
      const r = this.singleSel;
      if (!r) return;
      this.singleMode = 'edit';
      this.singleForm = {
        pid: r.id,
        extNum1: r.userName != null ? String(r.userName) : '',
        password: r.password != null ? String(r.password) : '',
      };
      this.singleDlg = true;
    },
    openCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.singleMode = 'copy';
      this.singleForm = {
        pid: null,
        extNum1: r.userName != null ? String(r.userName) : '',
        password: r.password != null ? String(r.password) : '',
      };
      this.singleDlg = true;
    },
    submitSingle() {
      this.$refs.singleRef.validate((ok) => {
        if (!ok) return;
        const ext = this.singleForm.extNum1.trim();
        if ((this.singleMode === 'addItem' || this.singleMode === 'copy') && ext.length > 30) {
          this.$message.warning(this.$t('smcicc.system.sipExtNum.extMaxLength'));
          return;
        }
        this.saving = true;
        let req;
        if (this.singleMode === 'edit') {
          req = this.$ajax.postJSON(`${BASE}/modifySIPExtNum`, {
            pid: this.singleForm.pid,
            extNum1: ext,
            password: this.singleForm.password,
          });
        } else {
          req = this.$ajax.postJSON(`${BASE}/copySIPExtNum`, {
            extNum1: ext,
            password: this.singleForm.password,
          });
        }
        req
          .then((data) => {
            const r = data && data.result;
            if (r > 0) {
              this.$message.success(
                this.singleMode === 'edit' ? this.$t('smcicc.common.saveSuccess') : this.$t('smcicc.common.addSuccess')
              );
              this.singleDlg = false;
              this.fenjiNum = '';
              this.loadList();
            } else if (r === -4) {
              this.$message.warning(this.$t('smcicc.common.duplicateExtNum'));
            } else if (r === -1 && this.singleMode !== 'edit') {
              this.$message.warning(this.$t('smcicc.system.sipExtNum.operationNeedDb'));
            } else {
              this.$message.warning(
                this.singleMode === 'edit' ? this.$t('smcicc.common.saveFailed') : this.$t('smcicc.common.addFailed')
              );
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
      const ids = this.selection.map((r) => r.id).filter((id) => id != null);
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n: ids.length }), this.$t('operate.delete'), { type: 'warning' })
        .then(() =>
          this.$ajax.postJSON(`${BASE}/deleteSubscriber`, {
            subscriberIds: ids.join(','),
          })
        )
        .then((ok) => {
          if (ok) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.fenjiNum = '';
            this.loadList();
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
.db-card {
  margin-bottom: 12px;
}
.card-head {
  display: flex;
  align-items: baseline;
  flex-wrap: wrap;
  gap: 8px;
}
.card-head .hint {
  font-size: 12px;
  color: #909399;
  font-weight: normal;
}
.db-form {
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
