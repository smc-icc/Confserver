<template>
  <div class="smcicc-page service-route-page">
    <system-list-toolbar
      :title="$t('smcicc.system.serviceRoute.title')"
      :keyword.sync="filterKeyword"
      :importing="importing"
      :has-rows="listFilteredRows.length > 0"
      :has-selection="selection.length > 0"
      :add-disabled="!vdnId"
      :import-disabled="!vdnId"
      :export-disabled="!vdnId"
      @search="handleListSearch"
      @clear="clearListSearch"
      @add="openAdd"
      @import="importList"
      @export="exportList"
      @delete="doDelete"
    >
      <template slot="title-side">
        <el-select
          v-if="!lockedVdnId"
          v-model="vdnId"
          class="title-vdn-select"
          size="small"
          filterable
          :placeholder="$t('smcicc.system.serviceRoute.placeholderSelectVdn')"
          @change="onVdnChange"
        >
          <el-option v-for="v in vdnOptions" :key="v.id" :label="`${v.id} ${v.name}`" :value="v.id" />
        </el-select>
      </template>
    </system-list-toolbar>

    <el-alert v-if="!vdnId" :title="$t('smcicc.system.serviceRoute.selectVdnFirst')" type="info" show-icon class="mb" :closable="false" />
    <el-alert v-if="err" :title="err" type="error" show-icon class="mb" :closable="false" />

    <el-table
      v-loading="loading"
      :data="listVisibleRows"
      border
      stripe
      size="small"
      max-height="520"
      @selection-change="onSel"
      @row-dblclick="openEdit"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="accessCodeName" :label="$t('smcicc.system.serviceRoute.colAccessCode')" min-width="120" show-overflow-tooltip />
      <el-table-column prop="calledCode" :label="$t('smcicc.system.serviceRoute.colCalledCode')" width="100" show-overflow-tooltip />
      <el-table-column :label="$t('smcicc.system.serviceRoute.colDeviceType')" min-width="180" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ deviceTypeLabel(row.deviceType) }}</template>
      </el-table-column>
      <el-table-column prop="text" :label="$t('smcicc.system.serviceRoute.colRouteTarget')" min-width="140" show-overflow-tooltip />
      <el-table-column prop="groupName" :label="$t('smcicc.system.serviceRoute.colAgentGroup')" min-width="100" show-overflow-tooltip />
      <el-table-column prop="trunkGroup" :label="$t('smcicc.system.serviceRoute.colTrunkGroup')" min-width="100" show-overflow-tooltip />
      <el-table-column prop="nodeId" :label="$t('smcicc.system.serviceRoute.colNodeId')" width="88" align="center" />
      <el-table-column prop="userId" :label="$t('smcicc.system.serviceRoute.colUserId')" width="100" align="center" />
      <el-table-column label="操作" width="96" align="center" fixed="right">
        <template slot-scope="{ row }">
          <span class="row-ops" @click.stop>
            <el-button type="text" icon="el-icon-edit" title="编辑" @click="openEdit(row)" />
            <el-switch :value="rowEnabled(row)" @change="(on) => setValid(row, on)" />
          </span>
        </template>
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="560px" append-to-body @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="130px" size="small">
        <el-form-item :label="$t('smcicc.system.serviceRoute.accessCode')" prop="accessCodeId">
          <el-select v-model="form.accessCodeId" filterable :placeholder="$t('smcicc.common.pleaseSelect')" style="width: 100%">
            <el-option v-for="ac in accessCodes" :key="ac.id" :label="ac.code" :value="ac.id" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.serviceRoute.calledCode')" prop="calledCode">
          <el-input v-model="form.calledCode" class="no-ime" maxlength="12" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.serviceRoute.deviceType')" prop="deviceType">
          <el-select v-model="form.deviceType" style="width: 100%" @change="onDeviceTypeChange">
            <el-option v-for="d in deviceTypes" :key="d.id" :label="d.label" :value="d.id" />
          </el-select>
        </el-form-item>

        <template v-if="form.deviceType === 1">
          <el-form-item :label="$t('smcicc.system.serviceRoute.ivrFlow')" prop="ivrFlowId">
            <el-select
              v-model="form.ivrFlowId"
              filterable
              allow-create
              default-first-option
              :placeholder="$t('smcicc.system.serviceRoute.placeholderIvrFlow')"
              style="width: 100%"
            >
              <el-option
                v-for="f in ivrFlowList"
                :key="f.id"
                :label="f.label || `${f.id} ${f.name || ''}`"
                :value="f.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('smcicc.system.serviceRoute.tasNodeId')" prop="nodeId">
            <el-select v-model="form.nodeId" filterable :placeholder="$t('smcicc.system.serviceRoute.placeholderTasMyId')" style="width: 100%">
              <el-option v-for="t in tasList" :key="t.myId" :label="`${t.myId} ${t.myName || ''}`" :value="t.myId" />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="form.deviceType === 2 || form.deviceType === 4">
          <el-form-item :label="$t('smcicc.system.serviceRoute.skillGroup')" prop="skillId">
            <el-select v-model="form.skillId" filterable :placeholder="$t('smcicc.common.pleaseSelect')" style="width: 100%">
              <el-option v-for="s in skillList" :key="s.id" :label="s.name" :value="s.id" />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="form.deviceType === 3">
          <el-form-item :label="$t('smcicc.system.serviceRoute.appMyId')" prop="appMyId">
            <el-input v-model.number="form.appMyId" class="no-ime" :placeholder="$t('smcicc.system.serviceRoute.placeholderAppMyId')" />
          </el-form-item>
          <el-form-item :label="$t('smcicc.system.serviceRoute.ivrFlow')" prop="ivrFlowId">
            <el-select
              v-model="form.ivrFlowId"
              filterable
              allow-create
              default-first-option
              :placeholder="$t('smcicc.system.serviceRoute.placeholderIvrFlow')"
              style="width: 100%"
            >
              <el-option
                v-for="f in ivrFlowList"
                :key="f.id"
                :label="f.label || `${f.id} ${f.name || ''}`"
                :value="f.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('smcicc.system.serviceRoute.tasNodeId')" prop="nodeId">
            <el-select v-model="form.nodeId" filterable :placeholder="$t('smcicc.system.serviceRoute.placeholderTasMyId')" style="width: 100%">
              <el-option v-for="t in tasList" :key="t.myId" :label="`${t.myId} ${t.myName || ''}`" :value="t.myId" />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="form.deviceType === 4">
          <el-form-item :label="$t('smcicc.system.serviceRoute.agentUser')" prop="userId">
            <el-select v-model="form.userId" filterable :placeholder="$t('smcicc.common.pleaseSelect')" style="width: 100%">
              <el-option v-for="u in userList" :key="u.id" :label="u.workNo" :value="u.id" />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="form.deviceType === 5">
          <el-alert
            type="warning"
            :closable="false"
            show-icon
            :title="$t('smcicc.system.serviceRoute.nodeIdCompatAlert')"
            class="mb-form"
          />
          <el-form-item :label="$t('smcicc.system.serviceRoute.appType')" prop="appTypeId">
            <el-select v-model="form.appTypeId" filterable :placeholder="$t('smcicc.common.pleaseSelect')" style="width: 100%">
              <el-option v-for="a in appTypes" :key="a.id" :label="a.name" :value="a.id" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('smcicc.system.serviceRoute.ivrFlow')" prop="ivrFlowId">
            <el-select
              v-model="form.ivrFlowId"
              filterable
              allow-create
              default-first-option
              :placeholder="$t('smcicc.system.serviceRoute.placeholderIvrFlow')"
              style="width: 100%"
            >
              <el-option
                v-for="f in ivrFlowList"
                :key="f.id"
                :label="f.label || `${f.id} ${f.name || ''}`"
                :value="f.id"
              />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('smcicc.system.serviceRoute.tasNodeIdCompat')" prop="nodeId">
            <el-select v-model="form.nodeId" filterable clearable :placeholder="$t('smcicc.system.serviceRoute.placeholderNodeCompat')" style="width: 100%">
              <el-option v-for="t in tasList" :key="t.myId" :label="`${t.myId} ${t.myName || ''}`" :value="t.myId" />
            </el-select>
          </el-form-item>
        </template>

        <template v-if="showGroupTrunk">
          <el-form-item :label="$t('smcicc.system.serviceRoute.agentGroup')">
            <el-select v-model="form.groupId" filterable clearable :placeholder="$t('smcicc.common.optional')" style="width: 100%">
              <el-option v-for="g in agentGroups" :key="g.id" :label="g.name" :value="g.id" />
            </el-select>
          </el-form-item>
          <el-form-item :label="$t('smcicc.system.serviceRoute.trunkGroup')">
            <el-select v-model="form.trunkGroupId" filterable clearable :placeholder="$t('smcicc.common.optional')" style="width: 100%">
              <el-option v-for="tg in trunkGroups" :key="tg.id" :label="tg.name" :value="tg.id" />
            </el-select>
          </el-form-item>
        </template>
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

const BASE = '/server/api/smcicc/vdnadmin';
const SYS = '/server/api/smcicc/systemadmin';

function emptyForm() {
  return {
    id: 0,
    accessCodeId: null,
    calledCode: '',
    deviceType: 5,
    ivrFlowId: null,
    appMyId: null,
    appTypeId: null,
    skillId: null,
    userId: -1,
    nodeId: null,
    groupId: -1,
    trunkGroupId: -1,
  };
}

export default {
  name: 'SMCIccServiceRouteManager',
  components: { SystemListToolbar },
  mixins: [systemListPageMixin],
  props: {
    lockedVdnId: { type: Number, default: 0 },
  },
  data() {
    return {
      loading: false,
      saving: false,
      err: '',
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      selection: [],
      vdnId: null,
      vdnOptions: [],
      accessCodes: [],
      agentGroups: [],
      trunkGroups: [],
      skillList: [],
      userList: [],
      appTypes: [],
      tasList: [],
      ivrFlowList: [],
      dialogVisible: false,
      dialogMode: 'add',
      form: emptyForm(),
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    deviceTypes() {
      return [1, 2, 3, 4, 5, 6].map((id) => ({
        id,
        label: this.$t(`smcicc.system.serviceRoute.deviceType${id}`),
      }));
    },
    dialogTitle() {
      const action =
        this.dialogMode === 'edit' ? this.$t('operate.title.update') : this.$t('operate.title.add');
      return `${this.$t('smcicc.system.serviceRoute.dialogTitle')} - ${action}`;
    },
    showGroupTrunk() {
      return this.form.deviceType === 1;
    },
    rules() {
      return {
        accessCodeId: [{ required: true, message: this.$t('smcicc.system.serviceRoute.accessCodeRequired'), trigger: 'change' }],
        calledCode: [{ required: true, message: this.$t('smcicc.system.serviceRoute.calledCodeRequired'), trigger: 'blur' }],
        deviceType: [{ required: true, message: this.$t('smcicc.system.serviceRoute.deviceTypeRequired'), trigger: 'change' }],
      };
    },
  },
  watch: {
    lockedVdnId(id) {
      if (id > 0 && id !== this.vdnId) {
        this.vdnId = id;
        this.onVdnChange();
      }
    },
  },
  mounted() {
    this.initVdn();
    this.loadLookups();
  },
  methods: {
    deviceTypeLabel(id) {
      const hit = this.deviceTypes.find((d) => d.id === Number(id));
      return hit ? hit.label : String(id);
    },
    initVdn() {
      if (this.lockedVdnId > 0) {
        this.vdnId = this.lockedVdnId;
      }
      const q = this.$route.query.vdnId;
      if (!this.lockedVdnId && q != null && q !== '') {
        const n = Number(q);
        if (!Number.isNaN(n) && n > 0) this.vdnId = n;
      }
      this.$ajax
        .postJSON(`${SYS}/loadVdnListJoin`, { page: 1, pagesize: 500, 'vdn.name': '' })
        .then((data) => {
          this.vdnOptions = Array.isArray(data.Rows) ? data.Rows : [];
          if (!this.vdnId && !this.lockedVdnId && this.vdnOptions.length) {
            this.vdnId = this.vdnOptions[0].id;
          }
          if (this.vdnId) {
            this.loadVdnScopedLookups();
            this.load();
          }
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.serviceRoute.loadVdnFailed');
        });
    },
    loadLookups() {
      this.$ajax.postJSON(`${SYS}/loadTasList`, {}).then((data) => {
        this.tasList = Array.isArray(data) ? data.filter((t) => t.myId != null && Number(t.myId) > 0) : [];
      }).catch(() => {
        this.tasList = [];
      });
      this.$ajax.postJSON(`${BASE}/loadAppTypeList`, {}).then((data) => {
        this.appTypes = Array.isArray(data) ? data : [];
      }).catch(() => {
        this.appTypes = [];
      });
    },
    loadVdnScopedLookups() {
      if (!this.vdnId) return;
      const vdnPayload = { vdnId: this.vdnId, key: '' };
      this.$ajax.postJSON(`${BASE}/loadAccessCodeListByVdnSelf`, vdnPayload).then((data) => {
        this.accessCodes = Array.isArray(data) ? data : [];
      }).catch(() => {
        this.accessCodes = [];
      });
      this.$ajax.postJSON(`${BASE}/loadAgentGroupList`, vdnPayload).then((data) => {
        this.agentGroups = Array.isArray(data) ? data : [];
      }).catch(() => {
        this.agentGroups = [];
      });
      this.$ajax.postJSON(`${BASE}/loadTrunkGroupList`, { key: '' }).then((data) => {
        this.trunkGroups = Array.isArray(data) ? data : [];
      }).catch(() => {
        this.trunkGroups = [];
      });
      this.$ajax.postJSON(`${BASE}/loadQueueSkillList`, vdnPayload).then((data) => {
        this.skillList = Array.isArray(data) ? data : [];
      }).catch(() => {
        this.skillList = [];
      });
      this.$ajax.postJSON(`${BASE}/loadUserList`, vdnPayload).then((data) => {
        this.userList = Array.isArray(data) ? data : [];
      }).catch(() => {
        this.userList = [];
      });
      this.$ajax.postJSON(`${BASE}/loadIvrFlowList`, { vdnId: this.vdnId }).then((data) => {
        const rows = data && Array.isArray(data.Rows) ? data.Rows : [];
        this.ivrFlowList = rows;
      }).catch(() => {
        this.ivrFlowList = [];
      });
    },
    onVdnChange() {
      this.filterKeyword = '';
      this.page = 1;
      this.loadVdnScopedLookups();
      this.load();
    },
    listPayload() {
      return {
        vdnId: this.vdnId,
        'serviceRouteBean.pageNum': 1,
        'serviceRouteBean.pageSize': DEFAULT_LIST_LIMIT,
        'serviceRouteBean.calledCode': '',
        'serviceRouteBean.accessCodeId': '',
      };
    },
    listExportFileName() {
      return `icc-service-routes-vdn-${this.vdnId || 'none'}`;
    },
    async importListRecord(record) {
      if (!this.vdnId) return false;
      const route = {
        id: 0,
        vdnId: this.vdnId,
        accessCodeId: Number(record.accessCodeId),
        calledCode: String(record.calledCode || '').trim(),
        deviceType: Number(record.deviceType),
        deviceId: Number(record.deviceId),
        userId: record.userId == null || record.userId === '' ? -1 : Number(record.userId),
        nodeId: record.nodeId == null || record.nodeId === '' ? -1 : Number(record.nodeId),
        groupId: record.groupId == null || record.groupId === '' ? -1 : Number(record.groupId),
        trunkGroupId: record.trunkGroupId == null || record.trunkGroupId === '' ? -1 : Number(record.trunkGroupId),
      };
      if (!route.calledCode || Number.isNaN(route.accessCodeId) || Number.isNaN(route.deviceType) || Number.isNaN(route.deviceId)) {
        return false;
      }
      const result = await this.$ajax.postJSON(`${BASE}/addServiceRoute`, {
        vdnId: this.vdnId,
        serviceRouteJson: JSON.stringify(route),
      });
      return result === 1 || result === true;
    },
    load() {
      if (!this.vdnId) return;
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadServiceRouteList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.serviceRoute.loadFailed');
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
    onDeviceTypeChange() {
      this.form.ivrFlowId = null;
      this.form.appMyId = null;
      this.form.appTypeId = null;
      this.form.skillId = null;
      this.form.userId = -1;
      this.form.nodeId = null;
    },
    rowToForm(row) {
      const dt = Number(row.deviceType);
      const f = emptyForm();
      f.id = row.id;
      f.accessCodeId = row.accessCodeId != null ? Number(row.accessCodeId) : null;
      f.calledCode = row.calledCode != null ? String(row.calledCode) : '';
      f.deviceType = dt;
      f.groupId = row.groupId != null ? Number(row.groupId) : -1;
      f.trunkGroupId = row.trunkGroupId != null ? Number(row.trunkGroupId) : -1;
      f.nodeId = row.nodeId != null && Number(row.nodeId) > 0 ? Number(row.nodeId) : null;
      if (dt === 1) {
        f.ivrFlowId = row.deviceId != null ? Number(row.deviceId) : null;
      } else if (dt === 2) {
        f.skillId = row.deviceId != null ? Number(row.deviceId) : null;
      } else if (dt === 3) {
        f.appMyId = row.deviceId != null ? Number(row.deviceId) : null;
        f.ivrFlowId = row.userId != null ? Number(row.userId) : null;
      } else if (dt === 4) {
        f.skillId = row.deviceId != null ? Number(row.deviceId) : null;
        f.userId = row.userId != null ? Number(row.userId) : -1;
      } else if (dt === 5) {
        f.appTypeId = row.deviceId != null ? Number(row.deviceId) : null;
        f.ivrFlowId = row.userId != null ? Number(row.userId) : null;
      }
      return f;
    },
    buildRoutePayload() {
      const f = this.form;
      const dt = Number(f.deviceType);
      let deviceId = -1;
      let userId = f.userId != null ? Number(f.userId) : -1;
      let nodeId = f.nodeId != null ? Number(f.nodeId) : -1;

      if (dt === 1) {
        deviceId = Number(f.ivrFlowId);
      } else if (dt === 2 || dt === 4) {
        deviceId = Number(f.skillId);
      } else if (dt === 3) {
        deviceId = Number(f.appMyId);
        userId = Number(f.ivrFlowId);
      } else if (dt === 5) {
        deviceId = Number(f.appTypeId);
        userId = Number(f.ivrFlowId);
      }

      return {
        id: f.id || 0,
        vdnId: this.vdnId,
        accessCodeId: f.accessCodeId,
        calledCode: String(f.calledCode || '').trim(),
        deviceType: dt,
        deviceId,
        userId,
        nodeId,
        groupId: f.groupId != null ? Number(f.groupId) : -1,
        trunkGroupId: f.trunkGroupId != null ? Number(f.trunkGroupId) : -1,
      };
    },
    validateBusiness(route) {
      const dt = route.deviceType;
      if (dt === 1) {
        if (!route.deviceId || route.deviceId <= 0) return this.$t('smcicc.system.serviceRoute.ivrFlowIdRequired');
        if (route.nodeId <= 0) return this.$t('smcicc.system.serviceRoute.tasNodeRequired');
      } else if (dt === 2) {
        if (!route.deviceId || route.deviceId <= 0) return this.$t('smcicc.system.serviceRoute.skillRequired');
      } else if (dt === 3) {
        if (route.deviceId < 0 || route.deviceId > 65535) return this.$t('smcicc.system.serviceRoute.appMyIdRange');
        if (!route.userId || route.userId <= 0) return this.$t('smcicc.system.serviceRoute.ivrFlowIdRequired');
        if (route.nodeId <= 0) return this.$t('smcicc.system.serviceRoute.tasNodeRequired');
      } else if (dt === 4) {
        if (!route.deviceId || route.deviceId <= 0) return this.$t('smcicc.system.serviceRoute.skillRequired');
        if (!route.userId || route.userId <= 0) return this.$t('smcicc.system.serviceRoute.agentRequired');
      } else if (dt === 5) {
        if (!route.deviceId || route.deviceId <= 0) return this.$t('smcicc.system.serviceRoute.appTypeRequired');
        if (!route.userId || route.userId <= 0) return this.$t('smcicc.system.serviceRoute.ivrFlowIdRequired');
      }
      return '';
    },
    openAdd() {
      this.loadVdnScopedLookups();
      this.dialogMode = 'add';
      this.resetForm();
      this.dialogVisible = true;
    },
    openEdit(row) {
      const r = row && typeof row === 'object' ? row : this.singleSel;
      if (!r) return;
      this.loadVdnScopedLookups();
      this.dialogMode = 'edit';
      this.form = this.rowToForm(r);
      this.dialogVisible = true;
    },
    doCopy() {
      const r = this.singleSel;
      if (!r || !this.vdnId) return;
      const route = this.rowToForm(r);
      route.id = 0;
      this.$ajax
        .postJSON(`${BASE}/copyServiceRoute`, {
          vdnId: this.vdnId,
          serviceRouteJson: JSON.stringify(this.buildRoutePayloadFromForm(route)),
        })
        .then((ok) => {
          if (ok) {
            this.$message.success(this.$t('smcicc.common.copySuccess'));
            this.load();
          } else {
            this.$message.error(this.$t('smcicc.common.copyFailed'));
          }
        })
        .catch(() => this.$message.error(this.$t('smcicc.common.copyFailed')));
    },
    buildRoutePayloadFromForm(f) {
      const dt = Number(f.deviceType);
      let deviceId = -1;
      let userId = f.userId != null ? Number(f.userId) : -1;
      let nodeId = f.nodeId != null ? Number(f.nodeId) : -1;
      if (dt === 1) deviceId = Number(f.ivrFlowId);
      else if (dt === 2 || dt === 4) deviceId = Number(f.skillId);
      else if (dt === 3) {
        deviceId = Number(f.appMyId);
        userId = Number(f.ivrFlowId);
      } else if (dt === 5) {
        deviceId = Number(f.appTypeId);
        userId = Number(f.ivrFlowId);
      }
      return {
        id: f.id || 0,
        vdnId: this.vdnId,
        accessCodeId: f.accessCodeId,
        calledCode: String(f.calledCode || '').trim(),
        deviceType: dt,
        deviceId,
        userId,
        nodeId,
        groupId: f.groupId != null ? Number(f.groupId) : -1,
        trunkGroupId: f.trunkGroupId != null ? Number(f.trunkGroupId) : -1,
      };
    },
    rowEnabled(row) {
      return Number(row.isValid) !== 0;
    },
    setValid(row, on) {
      const prev = this.rowEnabled(row);
      this.$set(row, 'isValid', on ? 1 : 0);
      this.$ajax.postJSON(`${BASE}/setServiceRouteValid`, {
        vdnId: this.vdnId,
        id: row.id,
        isValid: on ? 1 : 0,
      }).then((code) => {
        if (code === 1) return;
        this.$set(row, 'isValid', prev ? 1 : 0);
        this.$message.warning(this.$t('smcicc.common.saveFailed'));
      }).catch(() => {
        this.$set(row, 'isValid', prev ? 1 : 0);
        this.$message.error(this.$t('smcicc.common.saveFailed'));
      });
    },
    doDelete() {
      if (!this.selection.length) return;
      const n = this.selection.length;
      this.$confirm(this.$t('smcicc.system.serviceRoute.confirmDeleteRoute', { n }), this.$t('smcicc.common.confirm'), { type: 'warning' })
        .then(() => {
          const idList = this.selection.map((r) => r.id);
          return this.$ajax.postJSON(`${BASE}/deleteServiceRoutes`, { idList });
        })
        .then((ok) => {
          if (ok) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else {
            this.$message.error(this.$t('smcicc.common.deleteFailed'));
          }
        })
        .catch((e) => {
          if (e !== 'cancel') this.$message.error(this.$t('smcicc.common.deleteFailed'));
        });
    },
    submitForm() {
      this.$refs.formRef.validate((valid) => {
        if (!valid) return;
        const route = this.buildRoutePayload();
        const bizErr = this.validateBusiness(route);
        if (bizErr) {
          this.$message.warning(bizErr);
          return;
        }
        const action = this.dialogMode === 'edit' ? 'modifyServiceRoute' : 'addServiceRoute';
        this.saving = true;
        this.$ajax
          .postJSON(`${BASE}/${action}`, {
            vdnId: this.vdnId,
            serviceRouteJson: JSON.stringify(route),
          })
          .then((code) => {
            if (code === 1 || code === true) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.dialogVisible = false;
              this.load();
            } else if (code === -1) {
              this.$message.warning(this.$t('smcicc.system.serviceRoute.duplicateRoute'));
            } else {
              this.$message.error(this.$t('smcicc.common.saveFailed'));
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.saveFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
  },
};
</script>

<style scoped>
.row-ops {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.title-vdn-select {
  width: 180px;
  flex: 0 0 180px;
}
.page-title {
  font-size: 20px;
  margin: 0 0 8px;
}
.desc {
  color: #606266;
  margin-bottom: 12px;
  line-height: 1.5;
}
.toolbar {
  margin-bottom: 8px;
}
.actions {
  margin-bottom: 12px;
}
.mb {
  margin-bottom: 12px;
}
.mb-form {
  margin-bottom: 12px;
}
.pager {
  margin-top: 12px;
  text-align: right;
}
</style>
