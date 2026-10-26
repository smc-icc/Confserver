<template>
  <div class="smcicc-page acd-manager-page">
    <system-list-toolbar
      :title="$t('smcicc.system.acd.title')"
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
      <el-table-column prop="myName" :label="$t('smcicc.system.acd.colMyName')" min-width="160" show-overflow-tooltip />
      <el-table-column prop="localIp" :label="$t('smcicc.system.acd.colLocalIp')" width="120" show-overflow-tooltip />
      <el-table-column prop="appId" :label="$t('smcicc.system.acd.colAppId')" width="120" align="center" />
      <el-table-column :label="$t('smcicc.system.acd.colOdbc')" min-width="120" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ odbcName(row) }}</template>
      </el-table-column>
      <el-table-column prop="poolSize" :label="$t('smcicc.system.acd.colPoolSize')" width="130" align="center" />
      <el-table-column :label="$t('smcicc.system.acd.colCompatReport')" width="150" align="center">
        <template slot-scope="{ row }">{{ compatText(row) }}</template>
      </el-table-column>
      <el-table-column :label="$t('smcicc.system.acd.colSyncHistory')" width="110" align="center">
        <template slot-scope="{ row }">{{ ynText(row.sync) }}</template>
      </el-table-column>
      <el-table-column :label="$t('smcicc.system.acd.colDbDebug')" width="120" align="center">
        <template slot-scope="{ row }">{{ ynText(row.dbDebugInfo) }}</template>
      </el-table-column>
      <el-table-column prop="logLevel" :label="$t('smcicc.system.acd.colLogLevel')" width="110" align="center" />
      <el-table-column prop="logCount" :label="$t('smcicc.system.acd.colLogCount')" width="130" align="center" />
      <el-table-column :label="$t('smcicc.system.acd.colLastDeployDate')" width="168" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ formatDeploy(row.lastDeployDate) }}</template>
      </el-table-column>
      <el-table-column :label="$t('smcicc.system.acd.colLastDeployUser')" min-width="120" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ deployName(row) }}</template>
      </el-table-column>
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="820px" append-to-body @closed="onDialogClosed">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="150px" size="small" class="acd-form">
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.myName')" prop="myName">
              <el-input v-model="form.myName" class="no-ime" maxlength="100" show-word-limit />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.runMode')" prop="runMode">
              <el-select v-model="form.runMode" style="width: 100%">
                <el-option v-for="o in runModeOptions" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.localIp')" prop="localIp">
              <el-input v-model="form.localIp" class="no-ime" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.appId')" prop="appId">
              <el-input v-model.number="form.appId" class="no-ime" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.cfgFocuComm')" prop="cfgFocuCommPid">
              <el-select v-model="form.cfgFocuCommPid" filterable clearable style="width: 100%">
                <el-option
                  v-for="c in focuCommList"
                  :key="c.pid"
                  :label="focuCommLabel(c)"
                  :value="Number(c.pid)"
                />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.cfgOdbc')" prop="cfgOdbcPid">
              <el-select v-model="form.cfgOdbcPid" filterable style="width: 100%">
                <el-option v-for="o in odbcList" :key="o.pid" :label="odbcLabel(o)" :value="Number(o.pid)" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="$t('smcicc.system.acd.note')">
          <el-input v-model="form.note" type="textarea" :rows="2" maxlength="200" show-word-limit />
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.poolSize')" prop="poolSize">
              <el-input v-model.number="form.poolSize" class="no-ime" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.clientCharset')" prop="clientCharset">
              <el-input v-model="form.clientCharset" :placeholder="$t('smcicc.system.acd.placeholderCharset')" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.syncHistory')" prop="sync">
              <el-select v-model.number="form.sync" style="width: 100%">
                <el-option v-for="o in ynOptions" :key="'sy' + o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.dbDebugInfo')" prop="dbDebugInfo">
              <el-select v-model.number="form.dbDebugInfo" style="width: 100%">
                <el-option v-for="o in ynOptions" :key="'db' + o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.compatAgentQueue')" prop="tIcipAcdAgentQueueRecord">
              <el-select v-model.number="form.tIcipAcdAgentQueueRecord" style="width: 100%">
                <el-option v-for="o in ynOptions" :key="'tq' + o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.compatCallRecord')" prop="tIcipAcdCallRecord">
              <el-select v-model.number="form.tIcipAcdCallRecord" style="width: 100%">
                <el-option v-for="o in ynOptions" :key="'tc' + o.value" :label="o.label" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="$t('smcicc.system.acd.ccsId')" prop="ccsId">
          <el-select v-model="form.ccsId" filterable clearable style="width: 100%">
            <el-option v-for="c in ccsList" :key="c.pid" :label="ccsLabel(c)" :value="Number(c.pid)" />
          </el-select>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.logLevel')" prop="logLevel">
              <el-select v-model="form.logLevel" filterable allow-create style="width: 100%">
                <el-option v-for="lv in logLevelOptions" :key="lv" :label="lv" :value="lv" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.acd.logCount')" prop="logCount">
              <el-input v-model.number="form.logCount" class="no-ime" />
            </el-form-item>
          </el-col>
        </el-row>
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

function emptyForm() {
  return {
    pid: null,
    myName: '',
    runMode: 'Master',
    localIp: '',
    appId: null,
    cfgFocuCommPid: null,
    cfgOdbcPid: null,
    note: '',
    poolSize: 5,
    clientCharset: 'utf8',
    sync: 1,
    dbDebugInfo: 0,
    tIcipAcdAgentQueueRecord: 0,
    tIcipAcdCallRecord: 0,
    ccsId: null,
    logLevel: 'INFO',
    logCount: 100,
  };
}

export default {
  name: 'SMCIccAcdManager',
  components: { SystemListToolbar },
  mixins: [systemListPageMixin],
  data() {
    return {
      loading: false,
      saving: false,
      deploying: false,
      err: '',
      rows: [],
      total: 0,
      page: 1,
      pageSize: 10,
      selection: [],
      dialogVisible: false,
      dialogMode: 'add',
      form: emptyForm(),
      focuCommList: [],
      odbcList: [],
      ccsList: [],
      logLevelOptions: ['INFO', 'DEBUG', 'WARN', 'ERROR'],
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    dialogTitle() {
      const action =
        this.dialogMode === 'edit' ? this.$t('operate.title.update') : this.$t('operate.title.add');
      return `${this.$t('smcicc.system.acd.dialogTitle')} - ${action}`;
    },
    runModeOptions() {
      return [
        { value: 'Master', label: this.$t('smcicc.system.acd.runModeMaster') },
        { value: 'Slave', label: this.$t('smcicc.system.acd.runModeSlave') },
      ];
    },
    ynOptions() {
      return [
        { value: 1, label: this.$t('smcicc.common.enabled') },
        { value: 0, label: this.$t('smcicc.common.disabled') },
      ];
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
      return {
        myName: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
        runMode: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        localIp: [{ validator: validateIp, trigger: 'blur' }],
        appId: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
        cfgFocuCommPid: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        cfgOdbcPid: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        poolSize: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
        clientCharset: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
        sync: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        dbDebugInfo: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        tIcipAcdAgentQueueRecord: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        tIcipAcdCallRecord: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        ccsId: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        logLevel: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
        logCount: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
      };
    },
  },
  mounted() {
    this.loadRefs();
    this.load();
  },
  methods: {
    focuCommLabel(c) {
      return `${c.ipAddress}:${c.port}`;
    },
    odbcLabel(o) {
      return o.odbcName || `PID ${o.pid}`;
    },
    ccsLabel(c) {
      return c.myName ? `${c.myName} (PID ${c.pid})` : `PID ${c.pid}`;
    },
    odbcName(row) {
      return (row.odbc && row.odbc.odbcName) || '';
    },
    compatText(row) {
      const a = Number(row.tIcipAcdAgentQueueRecord);
      const b = Number(row.tIcipAcdCallRecord);
      return a && b ? this.$t('smcicc.common.yes') : this.$t('smcicc.common.no');
    },
    ynText(v) {
      return Number(v) ? this.$t('smcicc.common.enabled') : this.$t('smcicc.common.disabled');
    },
    deployName(row) {
      if (row.deployUser && row.deployUser.name) return row.deployUser.name;
      return this.$t('smcicc.common.dash');
    },
    formatDeploy(v) {
      if (v == null || v === '') return this.$t('smcicc.common.dash');
      if (typeof v === 'string') return v.replace('T', ' ');
      try {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return String(v);
        const p = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;
      } catch {
        return String(v);
      }
    },
    loadRefs() {
      this.$ajax.postJSON(`${BASE}/getCfgFocuCommPid`, {}).then((d) => {
        this.focuCommList = Array.isArray(d) ? d : [];
      });
      this.$ajax.postJSON(`${BASE}/getOdbcList`, {}).then((d) => {
        this.odbcList = Array.isArray(d) ? d : [];
      });
      this.$ajax.postJSON(`${BASE}/getCcsList`, {}).then((d) => {
        this.ccsList = Array.isArray(d) ? d : [];
      });
    },
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        'acd.myName': '',
        'acd.runMode': '',
      };
    },
    listExportFileName() {
      return 'icc-acd';
    },
    async importListRecord(record) {
      const value = (key, fallback = '') => (record[key] == null || record[key] === '' ? fallback : record[key]);
      const payload = {
        'acd.pid': 0,
        'acd.cfgOdbcPid': Number(value('cfgOdbcPid', value('odbc.pid'))),
        'acd.cfgFocuCommPid': Number(value('cfgFocuCommPid', value('focuComm.pid'))),
        'acd.myName': String(value('myName')).trim(),
        'acd.appId': Number(value('appId')),
        'acd.runMode': String(value('runMode', 'Master')),
        'acd.localIp': String(value('localIp')).trim(),
        'acd.note': String(value('note')),
        'acd.poolSize': Number(value('poolSize', 5)),
        'acd.clientCharset': String(value('clientCharset', 'utf8')),
        'acd.sync': Number(value('sync', 1)),
        'acd.dbDebugInfo': Number(value('dbDebugInfo', 0)),
        'acd.tIcipAcdAgentQueueRecord': Number(value('tIcipAcdAgentQueueRecord', 0)),
        'acd.tIcipAcdCallRecord': Number(value('tIcipAcdCallRecord', 0)),
        'acd.ccsId': Number(value('ccsId')),
        'acd.logLevel': String(value('logLevel', 'INFO')),
        'acd.logCount': Number(value('logCount', 100)),
      };
      if (!payload['acd.myName'] || !payload['acd.localIp'] || !Number.isFinite(payload['acd.appId'])) return false;
      return (await this.$ajax.postJSON(`${BASE}/addAcd`, payload)) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadAcdList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.acd.loadFailed');
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
      this.form = emptyForm();
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    onDialogClosed() {
      this.resetForm();
    },
    mapRowToForm(r) {
      return {
        pid: r.pid != null ? r.pid : null,
        myName: r.myName != null ? String(r.myName) : '',
        runMode: r.runMode || 'Master',
        localIp: r.localIp != null ? String(r.localIp) : '',
        appId: r.appId != null ? Number(r.appId) : null,
        cfgFocuCommPid: r.cfgFocuCommPid != null ? Number(r.cfgFocuCommPid) : null,
        cfgOdbcPid: r.cfgOdbcPid != null ? Number(r.cfgOdbcPid) : null,
        note: r.note != null ? String(r.note) : '',
        poolSize: r.poolSize != null ? Number(r.poolSize) : 5,
        clientCharset: r.clientCharset != null ? String(r.clientCharset) : 'utf8',
        sync: r.sync != null ? Number(r.sync) : 1,
        dbDebugInfo: r.dbDebugInfo != null ? Number(r.dbDebugInfo) : 0,
        tIcipAcdAgentQueueRecord: r.tIcipAcdAgentQueueRecord != null ? Number(r.tIcipAcdAgentQueueRecord) : 0,
        tIcipAcdCallRecord: r.tIcipAcdCallRecord != null ? Number(r.tIcipAcdCallRecord) : 0,
        ccsId: r.ccsId != null ? Number(r.ccsId) : null,
        logLevel: r.logLevel != null ? String(r.logLevel) : 'INFO',
        logCount: r.logCount != null ? Number(r.logCount) : 100,
      };
    },
    acdPayload() {
      const f = this.form;
      return {
        'acd.pid': f.pid || 0,
        'acd.cfgOdbcPid': Number(f.cfgOdbcPid),
        'acd.cfgFocuCommPid': Number(f.cfgFocuCommPid),
        'acd.myName': String(f.myName || '').trim(),
        'acd.appId': Number(f.appId),
        'acd.runMode': f.runMode,
        'acd.localIp': String(f.localIp || '').trim(),
        'acd.note': String(f.note || ''),
        'acd.poolSize': Number(f.poolSize),
        'acd.clientCharset': String(f.clientCharset || ''),
        'acd.sync': Number(f.sync),
        'acd.dbDebugInfo': Number(f.dbDebugInfo),
        'acd.tIcipAcdAgentQueueRecord': Number(f.tIcipAcdAgentQueueRecord),
        'acd.tIcipAcdCallRecord': Number(f.tIcipAcdCallRecord),
        'acd.ccsId': Number(f.ccsId),
        'acd.logLevel': String(f.logLevel || ''),
        'acd.logCount': Number(f.logCount),
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
      this.dialogVisible = true;
      this.$ajax
        .postJSON(`${BASE}/getAcdByPid`, { pid: r.pid })
        .then((arr) => {
          const row = Array.isArray(arr) && arr.length ? arr[0] : null;
          if (!row) {
            this.$message.error(this.$t('smcicc.common.notFound'));
            this.dialogVisible = false;
            return;
          }
          this.form = this.mapRowToForm(row);
          this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
        })
        .catch(() => {
          this.$message.error(this.$t('smcicc.common.loadDetailFailed'));
          this.dialogVisible = false;
        });
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        const payload = this.acdPayload();
        const url = this.dialogMode === 'edit' ? `${BASE}/editAcd` : `${BASE}/addAcd`;
        this.saving = true;
        this.$ajax
          .postJSON(url, payload)
          .then((code) => {
            if (code === 1) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.dialogVisible = false;
              this.load();
            } else if (code === -1) {
              this.$message.warning(this.$t('smcicc.common.duplicateAppId'));
            } else {
              this.$message.error(this.$t('smcicc.common.saveFailed'));
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
      this.$confirm(this.$t('smcicc.system.acd.copyConfirm'), this.$t('smcicc.common.copy'), { type: 'info' })
        .then(() =>
          this.$ajax.postJSON(`${BASE}/copyAcd`, { pid: r.pid })
        )
        .then((ok) => {
          if (ok === true) {
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
      const ids = this.selection.map((x) => x.pid).filter((id) => id != null);
      const n = ids.length;
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteAcd`, { pids: ids.join(',') }))
        .then((ok) => {
          if (ok === true) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else {
            this.$message.warning(this.$t('smcicc.common.deleteFailed'));
          }
        })
        .catch(() => {});
    },
    doDeploy() {
      const r = this.singleSel;
      if (!r) return;
      this.deploying = true;
      this.$ajax
        .postJSON(`${BASE}/deployAcdXML`, { pid: r.pid })
        .then((res) => {
          if (res && res.result === true) {
            this.$message.success(res.msg || this.$t('smcicc.common.deploySuccess'));
            this.load();
          } else {
            this.$message.error((res && res.msg) || this.$t('smcicc.common.deployFailed'));
          }
        })
        .catch(() => this.$message.error(this.$t('smcicc.common.deployRequestFailed')))
        .finally(() => {
          this.deploying = false;
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
  font-size: 13px;
  color: #606266;
  margin: 0 0 12px;
  line-height: 1.5;
}
.toolbar {
  margin-bottom: 8px;
}
.actions {
  margin-bottom: 12px;
}
.actions .el-button {
  margin-right: 8px;
}
.mb {
  margin-bottom: 12px;
}
.pager {
  margin-top: 12px;
  text-align: right;
}
.acd-form {
  max-height: 70vh;
  overflow-y: auto;
}
</style>
