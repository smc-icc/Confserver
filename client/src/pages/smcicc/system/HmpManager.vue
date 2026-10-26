<template>
  <div class="smcicc-page hmp-manager-page">
    <system-list-toolbar
      :title="$t('smcicc.system.hmp.title')"
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
      <el-table-column prop="myName" :label="$t('smcicc.system.hmp.colMyName')" min-width="160" show-overflow-tooltip />
      <el-table-column prop="localIp" :label="$t('smcicc.system.hmp.colLocalIp')" min-width="120" show-overflow-tooltip />
      <el-table-column prop="rtpPort" :label="$t('smcicc.system.hmp.colPort')" width="88" />
      <el-table-column prop="filePath" :label="$t('smcicc.system.hmp.colFilePath')" min-width="180" show-overflow-tooltip />
      <el-table-column prop="mode" :label="$t('smcicc.system.hmp.colMode')" width="110" />
      <el-table-column prop="baudRate" :label="$t('smcicc.system.hmp.colBaudRate')" min-width="140" show-overflow-tooltip />
      <el-table-column :label="$t('smcicc.system.hmp.colFocuComm')" min-width="140" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ focuCommText(row) }}</template>
      </el-table-column>
      <el-table-column prop="myId" :label="$t('smcicc.system.hmp.colMyId')" width="120" />
      <el-table-column :label="$t('smcicc.system.hmp.colLogStyle')" width="130">
        <template slot-scope="{ row }">{{ logStyleLabel(row.logStyle) }}</template>
      </el-table-column>
      <el-table-column :label="$t('smcicc.system.hmp.colLastDeployDate')" width="160">
        <template slot-scope="{ row }">{{ formatDeployTime(row.lastDeployDate) }}</template>
      </el-table-column>
      <el-table-column :label="$t('smcicc.system.hmp.colLastDeployUser')" width="120" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ deployUserName(row) }}</template>
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="820px" append-to-body top="4vh" @closed="onDialogClosed">
      <p v-if="dialogMode === 'copy'" class="copy-hint">{{ $t('smcicc.system.hmp.copyHint') }}</p>
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px" size="small" class="hmp-form">
        <div class="form-section">{{ $t('smcicc.system.hmp.sectionNetwork') }}</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.myName')" prop="myName">
              <el-input v-model="form.myName" readonly />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.myId')" prop="myId">
              <el-input v-model="form.myId" class="no-ime" maxlength="5" :placeholder="$t('smcicc.system.hmp.placeholderDigits')" @input="syncMyName" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.runMode')" prop="runMode">
              <el-select v-model="form.runMode" style="width: 100%" @change="syncMyName">
                <el-option :label="$t('smcicc.system.hmp.runModeMaster')" value="Master" />
                <el-option :label="$t('smcicc.system.hmp.runModeSlave')" value="Slave" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.cfgFocuComm')" prop="cfgFocuCommPid">
              <el-select v-model="form.cfgFocuCommPid" filterable clearable :placeholder="$t('smcicc.common.pleaseSelect')" style="width: 100%">
                <el-option
                  v-for="c in focuCommList"
                  :key="c.pid"
                  :label="c.ipAndPort || `${c.ipAddress}:${c.port}`"
                  :value="Number(c.pid)"
                />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.localIp')" prop="localIp">
              <el-input v-model="form.localIp" class="no-ime" :placeholder="$t('smcicc.system.hmp.placeholderIpv4')" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.note')" prop="note">
              <el-input v-model="form.note" />
            </el-form-item>
          </el-col>
        </el-row>

        <div class="form-section">{{ $t('smcicc.system.hmp.sectionFax') }}</div>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.rtpPort')" prop="rtpPort">
              <el-input v-model="form.rtpPort" class="no-ime" maxlength="5" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.channelCount')" prop="channelCount">
              <el-input v-model="form.channelCount" class="no-ime" maxlength="9" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.mode')" prop="mode">
              <el-select v-model="form.mode" style="width: 100%">
                <el-option :label="$t('smcicc.system.hmp.modeG711')" value="G711" />
                <el-option :label="$t('smcicc.system.hmp.modeT38')" value="T38" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.t30UseEcm')" prop="t30UseEcm">
              <el-select v-model="form.t30UseEcm" style="width: 100%">
                <el-option :label="$t('smcicc.system.hmp.ecmEnable')" :value="1" />
                <el-option :label="$t('smcicc.common.disabled')" :value="0" />
              </el-select>
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.identifier')" prop="identifier">
              <el-input v-model="form.identifier" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.t30SetMaxRetries')" prop="t30SetMaxRetries">
              <el-input v-model="form.t30SetMaxRetries" class="no-ime" maxlength="9" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.pageHeaderInfo')" prop="pageHeaderInfo">
              <el-input v-model="form.pageHeaderInfo" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item :label="$t('smcicc.system.hmp.t30SetReceiverNotReady')" prop="t30SetReceiverNotReady">
              <el-input v-model="form.t30SetReceiverNotReady" class="no-ime" maxlength="9" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-form-item :label="$t('smcicc.system.hmp.filePath')" prop="filePath">
          <el-input v-model="form.filePath" class="slash" />
        </el-form-item>

        <div class="baud-label">{{ $t('smcicc.system.hmp.baudLabel') }}</div>
        <el-form-item label-width="0" prop="baudSelected">
          <el-checkbox-group v-model="form.baudSelected" class="baud-group">
            <el-checkbox v-for="b in baudOptions" :key="b.v" :label="b.v">{{ b.l }}</el-checkbox>
          </el-checkbox-group>
        </el-form-item>

        <div class="form-section">{{ $t('smcicc.system.hmp.sectionLog') }}</div>
        <el-row :gutter="12">
          <el-col :span="8">
            <el-form-item :label="$t('smcicc.system.hmp.logStyle')" prop="logStyle">
              <el-select v-model="form.logStyle" style="width: 100%">
                <el-option :label="$t('smcicc.system.hmp.logStyleFile')" value="FILE" />
                <el-option :label="$t('smcicc.system.hmp.logStyleConsole')" value="CONSOLE" />
                <el-option :label="$t('smcicc.system.hmp.logStyleBoth')" value="BOTH" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="$t('smcicc.system.hmp.logLevel')" prop="logLevel">
              <el-select v-model="form.logLevel" style="width: 100%">
                <el-option label="DEBUG" value="DEBUG" />
                <el-option label="INFO" value="INFO" />
                <el-option label="ALARM" value="ALARM" />
                <el-option label="ERROR" value="ERROR" />
                <el-option label="FATAL" value="FATAL" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="8">
            <el-form-item :label="$t('smcicc.system.hmp.logCache')" prop="logCache">
              <el-select v-model="form.logCache" style="width: 100%">
                <el-option :label="$t('smcicc.common.yes')" value="yes" />
                <el-option :label="$t('smcicc.common.no')" value="no" />
              </el-select>
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

const BAUD_OPTIONS = [
  { v: '0x01', l: 'V.27(2400 and 4800bps)' },
  { v: '0x02', l: 'V.29(9600 and 7200bps)' },
  { v: '0x08', l: 'V.34(up to 33600bps)' },
  { v: '0x10', l: 'IAF(no bit rate limit)' },
  { v: '0x04', l: 'V.17(14400, 12000, 9600 and 7200bps)' },
];

function emptyForm() {
  return {
    pid: null,
    cfgFocuCommPid: null,
    myName: '',
    myId: '',
    runMode: 'Master',
    note: '',
    localIp: '',
    rtpPort: '',
    channelCount: '',
    mode: 'G711',
    t30UseEcm: 1,
    identifier: '',
    pageHeaderInfo: '',
    t30SetMaxRetries: '10',
    t30SetReceiverNotReady: '3',
    filePath: '',
    baudSelected: [],
    logStyle: 'FILE',
    logLevel: 'INFO',
    logCache: 'yes',
  };
}

function parseBaud(str) {
  if (!str) return [];
  return String(str)
    .split('|')
    .map((s) => s.trim())
    .filter(Boolean);
}

export default {
  name: 'SMCIccHmpManager',
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
      baudOptions: BAUD_OPTIONS,
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
      return `${this.$t('smcicc.system.hmp.dialogTitle')} - ${action}`;
    },
    rules() {
      const validateIp = (rule, value, cb) => {
        const v = String(value ?? '').trim();
        if (!v) {
          cb(new Error(this.$t('smcicc.system.hmp.localIpEmpty')));
          return;
        }
        if (!IPV4.test(v)) {
          cb(new Error(this.$t('smcicc.system.hmp.localIpInvalid')));
          return;
        }
        cb();
      };
      const validateRtp = (rule, value, cb) => {
        const s = String(value ?? '').trim();
        if (s === '') {
          cb(new Error(this.$t('smcicc.system.hmp.rtpPortEmpty')));
          return;
        }
        if (!/^\d+$/.test(s)) {
          cb(new Error(this.$t('smcicc.system.hmp.portPositiveInt')));
          return;
        }
        const n = Number(s);
        if (n < 0 || n > 65535) {
          cb(new Error(this.$t('smcicc.system.hmp.portRange')));
          return;
        }
        cb();
      };
      const validatePosInt = (msgEmpty, allowZero = false) => (rule, value, cb) => {
        const s = String(value ?? '').trim();
        if (s === '') {
          cb(new Error(msgEmpty));
          return;
        }
        if (!/^\d+$/.test(s)) {
          cb(new Error(this.$t('smcicc.system.hmp.nonNegativeInt')));
          return;
        }
        const n = Number(s);
        if (allowZero ? n < 0 : n <= 0) {
          cb(new Error(allowZero ? this.$t('smcicc.system.hmp.geZero') : this.$t('smcicc.system.hmp.positiveInt')));
          return;
        }
        cb();
      };
      const validateBaud = (rule, value, cb) => {
        if (!value || !Array.isArray(value) || value.length === 0) {
          cb(new Error(this.$t('smcicc.system.hmp.baudEmpty')));
          return;
        }
        cb();
      };
      return {
        myId: [{ validator: validatePosInt(this.$t('smcicc.system.hmp.myIdEmpty'), false), trigger: 'blur' }],
        runMode: [{ required: true, message: this.$t('smcicc.system.hmp.runModeRequired'), trigger: 'change' }],
        cfgFocuCommPid: [{ required: true, message: this.$t('smcicc.system.hmp.focuCommRequired'), trigger: 'change' }],
        localIp: [{ validator: validateIp, trigger: 'blur' }],
        rtpPort: [{ validator: validateRtp, trigger: 'blur' }],
        channelCount: [{ validator: validatePosInt(this.$t('smcicc.system.hmp.channelCountEmpty'), false), trigger: 'blur' }],
        identifier: [{ required: true, message: this.$t('smcicc.system.hmp.identifierEmpty'), trigger: 'blur' }],
        pageHeaderInfo: [{ required: true, message: this.$t('smcicc.system.hmp.pageHeaderEmpty'), trigger: 'blur' }],
        t30SetMaxRetries: [{ validator: validatePosInt(this.$t('smcicc.system.hmp.retriesEmpty'), true), trigger: 'blur' }],
        t30SetReceiverNotReady: [{ validator: validatePosInt(this.$t('smcicc.system.hmp.receiverNotReadyEmpty'), true), trigger: 'blur' }],
        filePath: [{ required: true, message: this.$t('smcicc.system.hmp.filePathEmpty'), trigger: 'blur' }],
        baudSelected: [{ validator: validateBaud, trigger: 'change' }],
      };
    },
  },
  mounted() {
    this.loadFocuComm();
    this.load();
  },
  methods: {
    logStyleLabel(s) {
      const x = String(s || '').toLowerCase();
      if (x === 'file') return this.$t('smcicc.system.hmp.logStyleFile');
      if (x === 'console') return this.$t('smcicc.system.hmp.logStyleConsole');
      if (x === 'both') return this.$t('smcicc.system.hmp.logStyleBoth');
      return s || '-';
    },
    focuCommText(row) {
      if (row.focuComm && row.focuComm.ipAndPort) return row.focuComm.ipAndPort;
      return '-';
    },
    deployUserName(row) {
      if (row.deployUser && row.deployUser.name) return row.deployUser.name;
      return '-';
    },
    formatDeployTime(v) {
      if (v == null || v === '') return '-';
      if (typeof v === 'string') return v;
      try {
        const d = new Date(v);
        if (Number.isNaN(d.getTime())) return String(v);
        const pad = (n) => String(n).padStart(2, '0');
        return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
      } catch {
        return String(v);
      }
    },
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        hmp: { myName: '', runMode: '' },
      };
    },
    listExportFileName() {
      return 'icc-hmp';
    },
    async importListRecord(record) {
      const hmp = {
        cfgFocuCommPid: Number(record.cfgFocuCommPid || record['focuComm.pid']),
        myName: String(record.myName || '').trim(),
        myId: Number(record.myId),
        runMode: String(record.runMode || 'Master'),
        note: String(record.note || ''),
        localIp: String(record.localIp || '').trim(),
        rtpPort: Number(record.rtpPort),
        channelCount: Number(record.channelCount),
        mode: String(record.mode || 'G711'),
        t30UseEcm: Number(record.t30UseEcm == null || record.t30UseEcm === '' ? 1 : record.t30UseEcm),
        filePath: String(record.filePath || '').trim(),
        identifier: String(record.identifier || '').trim(),
        pageHeaderInfo: String(record.pageHeaderInfo || '').trim(),
        t30SetMaxRetries: Number(record.t30SetMaxRetries || 0),
        t30SetReceiverNotReady: Number(record.t30SetReceiverNotReady || 0),
        baudRate: String(record.baudRate || ''),
        logStyle: String(record.logStyle || 'FILE'),
        logLevel: String(record.logLevel || 'INFO'),
        logCache: String(record.logCache || 'yes'),
      };
      if (!hmp.myName || !hmp.myId || !hmp.localIp || !hmp.rtpPort || !hmp.filePath) return false;
      return (await this.$ajax.postJSON(`${BASE}/addHmp`, { hmp })) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadHmpList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.hmp.loadFailed');
          this.rows = [];
          this.total = 0;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    loadFocuComm() {
      this.$ajax
        .postJSON(`${BASE}/getCfgFocuCommPid`, {})
        .then((data) => {
          this.focuCommList = Array.isArray(data) ? data : [];
        })
        .catch(() => {
          this.focuCommList = [];
        });
    },
    onSel(rows) {
      this.selection = rows || [];
    },
    syncMyName() {
      const prefix =
        this.form.runMode === 'Slave'
          ? this.$t('smcicc.system.hmp.moduleNameSlave')
          : this.$t('smcicc.system.hmp.moduleNameMaster');
      const id = String(this.form.myId ?? '').trim();
      this.form.myName = `${prefix}${id}`;
    },
    resetForm() {
      this.form = emptyForm();
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    onDialogClosed() {
      this.resetForm();
    },
    applyEntity(h) {
      if (!h) return;
      this.form = {
        pid: h.pid != null ? h.pid : null,
        cfgFocuCommPid: h.cfgFocuCommPid != null ? Number(h.cfgFocuCommPid) : null,
        myName: h.myName != null ? String(h.myName) : '',
        myId: h.myId != null ? String(h.myId) : '',
        runMode: h.runMode === 'Slave' ? 'Slave' : 'Master',
        note: h.note != null ? String(h.note) : '',
        localIp: h.localIp != null ? String(h.localIp) : '',
        rtpPort: h.rtpPort != null ? String(h.rtpPort) : '',
        channelCount: h.channelCount != null ? String(h.channelCount) : '',
        mode: h.mode === 'T38' ? 'T38' : 'G711',
        t30UseEcm: Number(h.t30UseEcm) === 0 ? 0 : 1,
        identifier: h.identifier != null ? String(h.identifier) : '',
        pageHeaderInfo: h.pageHeaderInfo != null ? String(h.pageHeaderInfo) : '',
        t30SetMaxRetries: h.t30SetMaxRetries != null ? String(h.t30SetMaxRetries) : '10',
        t30SetReceiverNotReady: h.t30SetReceiverNotReady != null ? String(h.t30SetReceiverNotReady) : '3',
        filePath: h.filePath != null ? String(h.filePath) : '',
        baudSelected: parseBaud(h.baudRate),
        logStyle: ['FILE', 'CONSOLE', 'BOTH'].includes(h.logStyle) ? h.logStyle : 'FILE',
        logLevel: h.logLevel || 'INFO',
        logCache: h.logCache === 'no' ? 'no' : 'yes',
      };
      this.syncMyName();
    },
    openAdd() {
      this.dialogMode = 'add';
      this.resetForm();
      this.syncMyName();
      this.dialogVisible = true;
    },
    openEdit() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'edit';
      this.loading = true;
      this.$ajax
        .postJSON(`${BASE}/getHmpByPid`, { pid: r.pid })
        .then((data) => {
          const arr = Array.isArray(data) ? data : [];
          if (!arr.length) {
            this.$message.error(this.$t('smcicc.common.notFound'));
            return;
          }
          this.applyEntity(arr[0]);
          this.dialogVisible = true;
        })
        .catch(() => this.$message.error(this.$t('smcicc.common.loadDetailFailed')))
        .finally(() => {
          this.loading = false;
        });
    },
    openCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'copy';
      this.loading = true;
      this.$ajax
        .postJSON(`${BASE}/getHmpByPid`, { pid: r.pid })
        .then((data) => {
          const arr = Array.isArray(data) ? data : [];
          if (!arr.length) {
            this.$message.error(this.$t('smcicc.common.notFound'));
            return;
          }
          this.applyEntity(arr[0]);
          this.form.pid = null;
          this.dialogVisible = true;
        })
        .catch(() => this.$message.error(this.$t('smcicc.common.loadDetailFailed')))
        .finally(() => {
          this.loading = false;
        });
    },
    buildHmpPayload() {
      const baudRate = (this.form.baudSelected || []).join('|');
      return {
        pid: this.form.pid,
        cfgFocuCommPid: Number(this.form.cfgFocuCommPid),
        myName: String(this.form.myName || '').trim(),
        myId: Number(String(this.form.myId).trim()),
        runMode: this.form.runMode,
        note: String(this.form.note || ''),
        localIp: String(this.form.localIp || '').trim(),
        rtpPort: Number(String(this.form.rtpPort).trim()),
        channelCount: Number(String(this.form.channelCount).trim()),
        mode: this.form.mode,
        t30UseEcm: Number(this.form.t30UseEcm),
        filePath: String(this.form.filePath || '').trim(),
        identifier: String(this.form.identifier || '').trim(),
        pageHeaderInfo: String(this.form.pageHeaderInfo || '').trim(),
        t30SetMaxRetries: Number(String(this.form.t30SetMaxRetries).trim()),
        t30SetReceiverNotReady: Number(String(this.form.t30SetReceiverNotReady).trim()),
        baudRate,
        logStyle: this.form.logStyle,
        logLevel: this.form.logLevel,
        logCache: this.form.logCache,
      };
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        const hmp = this.buildHmpPayload();
        const url = this.dialogMode === 'edit' ? `${BASE}/editHmp` : `${BASE}/addHmp`;
        const payload = { hmp };
        if (this.dialogMode === 'edit' && !hmp.pid) {
          this.$message.error(this.$t('smcicc.common.missingPrimaryKey'));
          return;
        }
        if (this.dialogMode !== 'edit') {
          delete payload.hmp.pid;
        }
        this.saving = true;
        this.$ajax
          .postJSON(url, payload)
          .then((code) => {
            if (code === -1) {
              this.$message.error(this.$t('smcicc.system.hmp.duplicateMyId'));
              return;
            }
            if (code === 1) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.dialogVisible = false;
              this.load();
              return;
            }
            this.$message.error(this.$t('smcicc.common.saveFailed'));
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
    doDelete() {
      if (!this.selection.length) return;
      const n = this.selection.length;
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => {
          const pids = this.selection.map((r) => r.pid).join(',');
          return this.$ajax.postJSON(`${BASE}/deleteHmp`, { pids });
        })
        .then((ok) => {
          if (ok) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else {
            this.$message.error(this.$t('smcicc.common.deleteFailed'));
          }
        })
        .catch(() => {});
    },
    doDeployXml() {
      const r = this.singleSel;
      if (!r) return;
      this.deploying = true;
      this.$ajax
        .postJSON(`${BASE}/deployHmpXML`, { pid: r.pid })
        .then((res) => {
          if (res && res.result) {
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
.desc {
  color: #666;
  font-size: 13px;
  margin-bottom: 12px;
}
.mb {
  margin-bottom: 12px;
}
.actions {
  margin-bottom: 12px;
}
.pager {
  margin-top: 12px;
}
.copy-hint {
  color: #e6a23c;
  margin: 0 0 12px;
  font-size: 13px;
}
.form-section {
  font-weight: 600;
  margin: 8px 0 12px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ebeef5;
}
.hmp-form {
  max-height: 70vh;
  overflow-y: auto;
  padding-right: 8px;
}
.baud-label {
  margin: 0 0 8px 140px;
  font-size: 13px;
  color: #606266;
}
.baud-group {
  margin-left: 12px;
  line-height: 1.8;
}
.baud-group .el-checkbox {
  margin-right: 12px;
  margin-bottom: 4px;
  display: inline-block;
  width: 48%;
  margin-left: 0;
}
</style>
