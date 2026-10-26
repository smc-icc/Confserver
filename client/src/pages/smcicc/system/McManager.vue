<template>
  <div class="smcicc-page mc-manager-page">
    <system-list-toolbar
      :title="$t('smcicc.system.mc.title')"
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
      <el-table-column prop="pid" :label="$t('smcicc.system.mc.colPid')" width="72" />
      <el-table-column prop="ipAddressPort" :label="$t('smcicc.system.mc.colIpPort')" min-width="160" show-overflow-tooltip />
      <el-table-column prop="savePath" :label="$t('smcicc.system.mc.colSavePath')" min-width="220" show-overflow-tooltip />
      <el-table-column prop="beatCycle" :label="$t('smcicc.system.mc.colBeatCycle')" width="150" />
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="560px" append-to-body @closed="onDialogClosed">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="150px" size="small">
        <el-row :gutter="8" class="ip-row">
          <el-col :span="14">
            <el-form-item :label="$t('smcicc.system.mc.ipAddress')" prop="localIp">
              <el-input v-model="form.localIp" class="no-ime" :placeholder="$t('smcicc.system.mc.placeholderIpv4')" />
            </el-form-item>
          </el-col>
          <el-col :span="10">
            <el-form-item :label="$t('smcicc.system.mc.port')" prop="port" label-width="56px">
              <el-input v-model="form.port" class="no-ime" :placeholder="$t('smcicc.system.mc.placeholderPortRange')" maxlength="5" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="$t('smcicc.system.mc.savePath')" prop="savePath">
          <el-input v-model="form.savePath" :placeholder="$t('smcicc.system.mc.placeholderRequired')" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.mc.beatCycle')" prop="beatCycle">
          <el-input v-model="form.beatCycle" class="no-ime" style="width: 100px" />
          <span class="hint">{{ $t('smcicc.system.mc.hintBeatCycle') }}</span>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.mc.checkTone')">
          <el-checkbox v-model="form.isCheckTone">{{ $t('smcicc.system.mc.checkToneEnable') }}</el-checkbox>
          <el-input-number v-model="form.checkTone" :min="0" :controls="false" class="num-inline" />
          <span class="hint">{{ $t('smcicc.system.mc.hintCheckTone') }}</span>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.mc.autoDeleteLog')">
          <el-checkbox v-model="form.isAutoDeleteLogFile">{{ $t('smcicc.system.mc.autoDeleteLogEnable') }}</el-checkbox>
          <el-input-number v-model="form.autoDeleteLogFile" :min="0" :controls="false" class="num-inline" />
          <span class="hint">{{ $t('smcicc.system.mc.hintAutoDeleteLog') }}</span>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.mc.invokeSyncFun')">
          <el-checkbox v-model="form.isInvokeSyncFun">{{ $t('smcicc.system.mc.invokeSyncFunEnable') }}</el-checkbox>
          <el-input-number v-model="form.invokeSyncFun" :min="0" :controls="false" class="num-inline" />
          <span class="hint">{{ $t('smcicc.system.mc.hintInvokeSyncFun') }}</span>
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

function ipv4Ok(s) {
  const parts = String(s || '').split('.');
  if (parts.length !== 4) return false;
  return parts.every((p) => /^\d{1,3}$/.test(p) && Number(p) >= 0 && Number(p) <= 255);
}

function splitHostPort(ipPort) {
  const str = String(ipPort || '');
  const idx = str.lastIndexOf(':');
  if (idx <= 0) return { host: str, port: '' };
  return { host: str.slice(0, idx), port: str.slice(idx + 1) };
}

export default {
  name: 'SMCIccMcManager',
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
        localIp: '',
        port: '',
        savePath: '',
        beatCycle: 1,
        isCheckTone: false,
        checkTone: 1,
        isAutoDeleteLogFile: false,
        autoDeleteLogFile: 30,
        isInvokeSyncFun: false,
        invokeSyncFun: 1,
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
      return `${this.$t('smcicc.system.mc.dialogTitle')} - ${action}`;
    },
    rules() {
      const validatePort = (rule, value, cb) => {
        const p = String(value ?? '').trim();
        if (p === '') {
          cb(new Error(this.$t('smcicc.system.mc.portRequired')));
          return;
        }
        const n = Number(p);
        if (!/^\d+$/.test(p) || n < 0 || n > 65535) {
          cb(new Error(this.$t('smcicc.system.mc.portRange')));
          return;
        }
        cb();
      };
      const validateIp = (rule, value, cb) => {
        const v = String(value ?? '').trim();
        if (!v) {
          cb(new Error(this.$t('smcicc.system.mc.ipRequired')));
          return;
        }
        if (!ipv4Ok(v)) {
          cb(new Error(this.$t('smcicc.system.mc.localIpInvalid')));
          return;
        }
        cb();
      };
      return {
        localIp: [{ validator: validateIp, trigger: 'blur' }],
        port: [{ validator: validatePort, trigger: 'blur' }],
        savePath: [{ required: true, message: this.$t('smcicc.system.mc.savePathRequired'), trigger: 'blur' }],
        beatCycle: [
          { required: true, message: this.$t('smcicc.system.mc.beatCycleRequired'), trigger: 'blur' },
          {
            validator: (rule, value, cb) => {
              const v = String(value ?? '').trim();
              if (v === '' || !/^\d+$/.test(v)) {
                cb(new Error(this.$t('smcicc.system.mc.nonNegativeInteger')));
                return;
              }
              cb();
            },
            trigger: 'blur',
          },
        ],
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
        localIp: '',
      };
    },
    listExportFileName() {
      return 'icc-mc';
    },
    async importListRecord(record) {
      const mc = {
        ipAddressPort: String(record.ipAddressPort || '').trim(),
        savePath: String(record.savePath || '').trim(),
        beatCycle: Number(record.beatCycle || 0),
        isCheckTone: Number(record.isCheckTone || 0),
        checkTone: Number(record.checkTone || 0),
        isAutoDeleteLogFile: Number(record.isAutoDeleteLogFile || 0),
        autoDeleteLogFile: Number(record.autoDeleteLogFile || 0),
        isInvokeSyncFun: Number(record.isInvokeSyncFun || 0),
        invokeSyncFun: Number(record.invokeSyncFun || 0),
      };
      if (!mc.ipAddressPort || !mc.savePath) return false;
      return (await this.$ajax.postJSON(`${BASE}/addMc`, { mc })) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadMcList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.mc.loadFailed');
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
        localIp: '',
        port: '',
        savePath: '',
        beatCycle: 1,
        isCheckTone: false,
        checkTone: 1,
        isAutoDeleteLogFile: false,
        autoDeleteLogFile: 30,
        isInvokeSyncFun: false,
        invokeSyncFun: 1,
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
      const { host, port } = splitHostPort(r.ipAddressPort);
      return {
        pid: r.pid != null ? r.pid : null,
        localIp: host,
        port,
        savePath: r.savePath != null ? String(r.savePath) : '',
        beatCycle: r.beatCycle != null ? r.beatCycle : 1,
        isCheckTone: Number(r.isCheckTone) === 1,
        checkTone: r.checkTone != null ? Number(r.checkTone) : 1,
        isAutoDeleteLogFile: Number(r.isAutoDeleteLogFile) === 1,
        autoDeleteLogFile: r.autoDeleteLogFile != null ? Number(r.autoDeleteLogFile) : 30,
        isInvokeSyncFun: Number(r.isInvokeSyncFun) === 1,
        invokeSyncFun: r.invokeSyncFun != null ? Number(r.invokeSyncFun) : 1,
      };
    },
    mcPayload() {
      const ipAddressPort = `${String(this.form.localIp).trim()}:${String(this.form.port).trim()}`;
      return {
        pid: this.form.pid,
        ipAddressPort,
        savePath: String(this.form.savePath || '').trim(),
        beatCycle: Number(this.form.beatCycle),
        isCheckTone: this.form.isCheckTone ? 1 : 0,
        checkTone: Number(this.form.checkTone) || 0,
        isAutoDeleteLogFile: this.form.isAutoDeleteLogFile ? 1 : 0,
        autoDeleteLogFile: Number(this.form.autoDeleteLogFile) || 0,
        isInvokeSyncFun: this.form.isInvokeSyncFun ? 1 : 0,
        invokeSyncFun: Number(this.form.invokeSyncFun) || 0,
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
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        this.saving = true;
        const mc = this.mcPayload();
        const payload = { mc };
        let url = `${BASE}/addMc`;
        if (this.dialogMode === 'edit') {
          url = `${BASE}/editMc`;
        } else {
          delete mc.pid;
        }
        this.$ajax
          .postJSON(url, payload)
          .then((data) => {
            if (data === 1) {
              this.$message.success(this.$t(this.successMsgKey()));
              this.dialogVisible = false;
              this.load();
            } else if (data === -1) {
              this.$message.warning(this.$t('smcicc.system.mc.duplicateIpPort'));
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
        .then(() => this.$ajax.postJSON(`${BASE}/deleteMc`, { pids: pids.join(',') }))
        .then((data) => {
          const result = data && Number(data.result);
          if (result > 0) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else if (data && data.mcPid) {
            this.$message.warning(this.$t('smcicc.system.mc.mcInUse', { pids: data.mcPid }));
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
.hint {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
.ip-row {
  margin-bottom: 0;
}
.ip-row .el-col {
  margin-bottom: 0;
}
.num-inline {
  width: 100px;
  margin-left: 8px;
  vertical-align: middle;
}
.num-inline >>> .el-input__inner {
  text-align: left;
}
</style>
