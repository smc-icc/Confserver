<template>
  <div class="smcicc-page vdn-manager-page">
    <el-alert v-if="vdnErr" :title="vdnErr" type="error" show-icon class="vdn-page-alert" :closable="false" />
    <section class="vdn-config-panel">
      <el-tabs v-model="workspaceTab" class="vdn-workspace-tabs" @tab-click="onWorkspaceTab">
        <el-tab-pane :label="$t('smcicc.vdnWorkspace.basic')" name="basic">
          <div class="vdn-basic-split">
      <section class="vdn-parameters-section">
        <header class="vdn-section-header">
          <h2>{{ activeVdn ? activeVdn.name : $t('smcicc.system.vdn.paramsTitle') }}</h2>
          <el-button
            type="primary"
            icon="el-icon-check"
            :title="$t('smcicc.system.vdn.saveParameters')"
            :aria-label="$t('smcicc.system.vdn.saveParameters')"
            :loading="vdnSaving"
            :disabled="!activeVdn || vdnDetailLoading"
            @click="submitVdn"
          />
        </header>
        <div v-if="activeVdn" v-loading="vdnDetailLoading" class="vdn-parameters-body">
          <el-form ref="vdnFormRef" :model="vdnForm" :rules="vdnRules" label-width="150px" size="small" class="vdn-parameters-form">
            <el-form-item :label="$t('smcicc.system.vdn.vdnId')" prop="idStr">
              <el-input v-model="vdnForm.idStr" class="no-ime" disabled maxlength="12" />
            </el-form-item>
            <el-form-item :label="$t('smcicc.system.vdn.vdnName')" prop="name">
              <el-input v-model="vdnForm.name" class="no-ime" maxlength="100" />
            </el-form-item>
            <el-form-item :label="$t('smcicc.system.vdn.parentVdn')" prop="parentId">
              <el-select v-model="vdnForm.parentId" filterable style="width: 100%" :placeholder="$t('smcicc.system.vdn.placeholderParent')">
                <el-option :value="-1" :label="$t('smcicc.system.vdn.parentRoot')" />
                <el-option v-for="item in parentOptions" :key="item.id" :label="`${item.id} ${item.name}`" :value="item.id" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="itrAvailable" :label="$t('smcicc.system.vdn.itrDefaultFlow')">
              <el-select v-model="vdnForm.itrDefaultFlowId" filterable style="width: 100%" :placeholder="$t('smcicc.system.vdn.itrDefaultFlowPlaceholder')">
                <el-option :value="0" :label="$t('smcicc.system.vdn.itrDefaultFlowEnv')" />
                <el-option v-for="flow in itrFlowOptions" :key="flow.id" :label="`${flow.id} ${flow.name || ''}`" :value="flow.id" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.startRecord')">
              <el-select v-model="vdnForm.startRecord" style="width: 100%">
                <el-option :value="0" :label="$t('smcicc.common.no')" />
                <el-option :value="1" :label="$t('smcicc.common.yes')" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.recordWorkNo')">
              <el-select v-model="vdnForm.recordWorkNo" :disabled="Number(vdnForm.startRecord) !== 1" style="width: 100%">
                <el-option :value="0" :label="$t('smcicc.system.vdn.recordWorkNoOff')" />
                <el-option :value="1" :label="$t('smcicc.system.vdn.recordWorkNoOn')" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.realTimeSpeechRecog')">
              <el-select v-model="vdnForm.realTimeSpeechRecog" style="width: 100%">
                <el-option :value="0" :label="$t('smcicc.common.no')" />
                <el-option :value="1" :label="$t('smcicc.common.yes')" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="iccAvailable && Number(vdnForm.realTimeSpeechRecog) === 1" :label="$t('smcicc.system.vdn.asrEngine')">
              <el-select v-model="vdnForm.asrEngine" style="width: 100%">
                <el-option value="ali" label="Ali（阿里云）" />
                <el-option value="funasr" label="FunASR" />
                <el-option value="whisper" label="Whisper" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.sipExtStatusSupport')">
              <el-select v-model="vdnForm.sipExtStatusSupport" style="width: 100%">
                <el-option :value="0" :label="$t('smcicc.system.vdn.sipExtOff')" />
                <el-option :value="1" :label="$t('smcicc.system.vdn.sipExtOn')" />
              </el-select>
            </el-form-item>
            <el-form-item v-if="nodeOptionsAvailable" class="vdn-form-wide" :label="$t('smcicc.system.vdn.publishNodes')">
              <div class="vdn-check-list">
                <el-checkbox-group v-model="vdnForm.nodeIds">
                  <el-checkbox v-for="node in tasNodeOptions" :key="node.myId" :label="node.myId">{{ node.myId }} {{ node.myName || '' }}</el-checkbox>
                </el-checkbox-group>
              </div>
            </el-form-item>
            <el-form-item v-if="iccAvailable" class="vdn-form-wide" :label="$t('smcicc.system.vdn.accessCodes')">
              <div class="vdn-check-list">
                <el-checkbox-group v-model="vdnForm.accessSelected">
                  <el-checkbox v-for="ac in vdnAccessOptions" :key="ac.id" :label="ac.id">{{ ac.code }} ({{ ac.id }})</el-checkbox>
                </el-checkbox-group>
                <span v-if="!vdnAccessOptions.length" class="vdn-muted">{{ $t('smcicc.system.vdn.noAccessCodes') }}</span>
              </div>
            </el-form-item>
          </el-form>
        </div>
        <div v-else class="vdn-config-empty">{{ $t('smcicc.system.vdn.noVdnSelected') }}</div>
      </section>

      <section class="vdn-admin-section">
        <header class="vdn-admin-toolbar">
          <h3>{{ $t('smcicc.system.vdn.adminTitle') }}</h3>
          <el-form :inline="true" size="small" class="vdn-admin-search" @submit.native.prevent="searchUsers">
            <el-input v-model="userFilterKeyword" :placeholder="$t('smcicc.system.vdn.searchAdminPlaceholder')" :aria-label="$t('smcicc.system.vdn.searchAdminPlaceholder')" @keyup.enter.native="searchUsers">
              <i
                slot="suffix"
                :class="userFilterKeyword ? 'el-icon-circle-close vdn-search-icon' : 'el-icon-search vdn-search-icon'"
                :title="userFilterKeyword ? $t('operate.clear') : $t('operate.search')"
                @click.stop="userFilterKeyword ? clearUserSearch() : searchUsers()"
              />
            </el-input>
          </el-form>
          <div class="vdn-admin-actions">
            <el-button type="primary" icon="el-icon-plus" :title="$t('operate.add')" :aria-label="$t('operate.add')" :disabled="!activeVdn" @click="openUserAdd" />
            <el-button type="primary" icon="el-icon-upload2" :title="$t('operate.import')" :aria-label="$t('operate.import')" :loading="userImporting" :disabled="!activeVdn" @click="triggerUserImport" />
            <el-button type="primary" icon="el-icon-download" :title="$t('operate.export')" :aria-label="$t('operate.export')" :disabled="!filteredUserRows.length" @click="exportUsers" />
            <el-button type="danger" icon="el-icon-delete" :title="$t('operate.delete')" :aria-label="$t('operate.delete')" :disabled="!activeVdn || !userSelection.length" @click="doUserDelete" />
            <input ref="userImportFile" class="vdn-import-file" type="file" accept=".csv,text/csv" @change="importUsers" />
          </div>
        </header>
        <el-alert v-if="userErr" :title="userErr" type="error" show-icon class="vdn-admin-alert" :closable="false" />
        <div class="vdn-admin-table-wrap">
          <el-table
            v-loading="userLoading"
            :data="filteredUserRows"
            border
            stripe
            size="small"
            height="100%"
            @selection-change="onUserSel"
            @row-dblclick="openUserEdit"
          >
            <el-table-column type="selection" width="48" />
            <el-table-column type="index" :label="$t('smcicc.system.sysUser.colSequence')" width="72" align="center" />
            <el-table-column prop="id" :label="$t('smcicc.system.sysUser.colId')" width="90" show-overflow-tooltip />
            <el-table-column prop="workNo" :label="$t('smcicc.system.vdn.colAdminWorkNo')" min-width="140" show-overflow-tooltip />
            <el-table-column prop="name" :label="$t('smcicc.system.vdn.colAdminName')" min-width="160" show-overflow-tooltip />
          </el-table>
        </div>
      </section>
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('smcicc.vdnWorkspace.extension')" v-if="iccAvailable" name="ext" :disabled="!activeVdn">
          <vdn-extension-panel v-if="workspaceTab === 'ext' && activeVdn" :vdn-id="Number(activeVdn.id)" />
        </el-tab-pane>
        <el-tab-pane :label="$t('smcicc.vdnWorkspace.agent')" name="agent" :disabled="!activeVdn">
          <agent-user-manager v-if="workspaceTab === 'agent' && activeVdn" :locked-vdn-id="Number(activeVdn.id)" />
        </el-tab-pane>
        <el-tab-pane label="渠道管理" name="channels" :disabled="!activeVdn">
          <vdn-channel-manager v-if="workspaceTab === 'channels' && activeVdn" :key="activeVdn.id" :vdn-id="Number(activeVdn.id)" />
        </el-tab-pane>
        <el-tab-pane :label="$t('smcicc.vdnWorkspace.ivr')" v-if="canUseDesigner" name="ivr" :disabled="!activeVdn">
          <div v-if="workspaceTab === 'ivr'" class="vdn-embed-designer">
            <enterprise-flow-frame tool="ivr" />
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('smcicc.vdnWorkspace.itr')" v-if="canUseDesigner" name="itr" :disabled="!activeVdn">
          <div v-if="workspaceTab === 'itr'" class="vdn-embed-designer">
            <enterprise-flow-frame tool="itr" />
          </div>
        </el-tab-pane>
        <el-tab-pane :label="$t('smcicc.vdnWorkspace.route')" v-if="routingAvailable" name="route" :disabled="!activeVdn">
          <div v-if="workspaceTab === 'route' && activeVdn" class="vdn-tab-body">
            <el-radio-group v-model="routeKind" size="small" class="vdn-route-switch" @change="pushWorkspaceQuery">
              <el-radio-button label="voice">{{ $t('smcicc.vdnWorkspace.voiceRoute') }}</el-radio-button>
              <el-radio-button label="media">{{ $t('smcicc.vdnWorkspace.mediaRoute') }}</el-radio-button>
            </el-radio-group>
            <service-route-manager v-if="routeKind === 'voice'" :locked-vdn-id="Number(activeVdn.id)" />
            <omni-org-bind v-else :locked-vdn-id="Number(activeVdn.id)" />
          </div>
        </el-tab-pane>
      </el-tabs>
    </section>

    <!-- VDN 表单 -->
    <el-dialog :title="vdnDialogTitle" :visible.sync="vdnDialogVisible" width="520px" append-to-body @closed="onVdnDialogClosed">
      <el-form ref="vdnDialogFormRef" :model="vdnForm" :rules="vdnRules" label-width="120px" size="small">
        <el-form-item :label="$t('smcicc.system.vdn.vdnId')" prop="idStr">
          <el-input v-model="vdnForm.idStr" class="no-ime" :disabled="vdnDialogMode === 'edit'" maxlength="12" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.vdn.vdnName')" prop="name">
          <el-input v-model="vdnForm.name" class="no-ime" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.vdn.parentVdn')" prop="parentId">
          <el-select v-model="vdnForm.parentId" filterable style="width: 100%" :placeholder="$t('smcicc.system.vdn.placeholderParent')">
            <el-option :value="-1" :label="$t('smcicc.system.vdn.parentRoot')" />
            <el-option
              v-for="item in parentOptions"
              :key="item.id"
              :label="`${item.id} ${item.name}`"
              :value="item.id"
            />
          </el-select>
        </el-form-item>
        <el-form-item v-if="nodeOptionsAvailable" :label="$t('smcicc.system.vdn.publishNodes')">
          <div class="ac-wrap">
            <el-checkbox-group v-model="vdnForm.nodeIds">
              <el-checkbox v-for="node in tasNodeOptions" :key="node.myId" :label="node.myId">
                {{ node.myId }} {{ node.myName || '' }}
              </el-checkbox>
            </el-checkbox-group>
            <p class="hint">{{ $t('smcicc.system.vdn.publishNodesHint') }}</p>
          </div>
        </el-form-item>
        <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.startRecord')">
          <el-select v-model="vdnForm.startRecord" style="width: 100%">
            <el-option :value="0" :label="$t('smcicc.common.no')" />
            <el-option :value="1" :label="$t('smcicc.common.yes')" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.realTimeSpeechRecog')">
          <el-select v-model="vdnForm.realTimeSpeechRecog" style="width: 100%">
            <el-option :value="0" :label="$t('smcicc.common.no')" />
            <el-option :value="1" :label="$t('smcicc.common.yes')" />
          </el-select>
          <p class="hint">{{ $t('smcicc.system.vdn.realTimeSpeechRecogHint') }}</p>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.vdn.asrEngine')" v-if="iccAvailable && Number(vdnForm.realTimeSpeechRecog) === 1">
          <el-select v-model="vdnForm.asrEngine" style="width: 100%">
            <el-option value="ali" label="Ali（阿里云）" />
            <el-option value="funasr" label="FunASR" />
            <el-option value="whisper" label="Whisper" />
          </el-select>
          <p class="hint">{{ $t('smcicc.system.vdn.asrEngineHint') }}</p>
        </el-form-item>
        <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.recordWorkNo')">
          <el-select v-model="vdnForm.recordWorkNo" :disabled="Number(vdnForm.startRecord) !== 1" style="width: 100%">
            <el-option :value="0" :label="$t('smcicc.system.vdn.recordWorkNoOff')" />
            <el-option :value="1" :label="$t('smcicc.system.vdn.recordWorkNoOn')" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.sipExtStatusSupport')">
          <el-select v-model="vdnForm.sipExtStatusSupport" style="width: 100%">
            <el-option :value="0" :label="$t('smcicc.system.vdn.sipExtOff')" />
            <el-option :value="1" :label="$t('smcicc.system.vdn.sipExtOn')" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="itrAvailable" :label="$t('smcicc.system.vdn.itrDefaultFlow')">
          <el-select v-model="vdnForm.itrDefaultFlowId" filterable style="width: 100%" :placeholder="$t('smcicc.system.vdn.itrDefaultFlowPlaceholder')">
            <el-option :value="0" :label="$t('smcicc.system.vdn.itrDefaultFlowEnv')" />
            <el-option
              v-for="flow in itrFlowOptions"
              :key="flow.id"
              :label="`${flow.id} ${flow.name || ''}`"
              :value="flow.id"
            />
          </el-select>
          <p class="hint">{{ $t('smcicc.system.vdn.itrDefaultFlowHint') }}</p>
        </el-form-item>
        <el-form-item v-if="iccAvailable" :label="$t('smcicc.system.vdn.accessCodes')">
          <div class="ac-wrap">
            <el-checkbox-group v-model="vdnForm.accessSelected">
              <el-checkbox v-for="ac in vdnAccessOptions" :key="ac.id" :label="ac.id">{{ ac.code }} ({{ ac.id }})</el-checkbox>
            </el-checkbox-group>
            <p v-if="!vdnAccessOptions.length" class="hint">{{ $t('smcicc.system.vdn.noAccessCodes') }}</p>
          </div>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="vdnDialogVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="vdnSaving" @click="submitVdn">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>

    <!-- VDN 管理员表单 -->
    <el-dialog :title="userDialogTitle" :visible.sync="userDialogVisible" width="400px" append-to-body @closed="onUserDialogClosed">
      <el-form ref="userFormRef" :model="userForm" :rules="userRules" label-width="140px" size="small">
        <el-form-item :label="$t('smcicc.system.vdn.adminWorkNo')" prop="workNo">
          <el-input v-model="userForm.workNo" class="no-ime" :disabled="userDialogMode === 'edit'" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.vdn.adminName')" prop="name">
          <el-input v-model="userForm.name" class="no-ime" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.vdn.adminPassword')" prop="password">
          <el-input v-model="userForm.password" type="password" show-password autocomplete="new-password" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="userDialogVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="userSaving" @click="submitUser">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import ServiceRouteManager from './ServiceRouteManager.vue';
import AgentUserManager from './AgentUserManager.vue';
import VdnChannelManager from './VdnChannelManager.vue';
import VdnExtensionPanel from './VdnExtensionPanel.vue';
import OmniOrgBind from '../OmniOrgBind.vue';
import EnterpriseFlowFrame from '@/common/EnterpriseFlowFrame.vue';
import { moduleAvailable, productModules, refreshModules } from '@/community/modules';


const VDN_TABS = ['basic', 'route', 'ivr', 'itr', 'ext', 'agent', 'channels'];
const BASE = '/server/api/smcicc/systemadmin';

function normVdn(r) {
  const id = r.id != null ? Number(r.id) : Number(r.ID);
  if (Number.isNaN(id)) return null;
  const parentId = r.parentId != null ? Number(r.parentId) : Number(r.ParentId != null ? r.ParentId : -1);
  return {
    id,
    name: r.name != null ? String(r.name) : String(r.Name || ''),
    parentId: Number.isNaN(parentId) ? -1 : parentId,
    startRecord: r.startRecord != null ? Number(r.startRecord) : 0,
    realTimeSpeechRecog: r.realTimeSpeechRecog != null ? Number(r.realTimeSpeechRecog) : 0,
    recordWorkNo: r.recordWorkNo != null ? Number(r.recordWorkNo) : 0,
    sipExtStatusSupport: r.sipExtStatusSupport != null ? Number(r.sipExtStatusSupport) : 0,
    itrDefaultFlowId: r.itrDefaultFlowId != null ? Number(r.itrDefaultFlowId) : 0,
    asrEngine: r.asrEngine != null ? String(r.asrEngine) : 'ali',
  };
}

function normUser(r) {
  const id = r.id != null ? Number(r.id) : Number(r.ID);
  if (Number.isNaN(id)) return null;
  return {
    id,
    workNo: r.workNo != null ? String(r.workNo) : String(r.WorkNO || ''),
    name: r.name != null ? String(r.name) : String(r.Name || ''),
    password: r.password != null ? String(r.password) : String(r.PassWord || ''),
  };
}

function emptyVdnForm() {
  return {
    idStr: '',
    name: '',
    parentId: -1,
    nodeIds: [],
    accessSelected: [],
    startRecord: 0,
    realTimeSpeechRecog: 0,
    asrEngine: 'ali',
    recordWorkNo: 0,
    sipExtStatusSupport: 1,
    itrDefaultFlowId: 0,
  };
}

function emptyUserForm() {
  return {
    id: 0,
    workNo: '',
    name: '',
    password: '',
  };
}

export default {
  name: 'SMCIccVdnManager',
  components: {
    ServiceRouteManager,
    AgentUserManager,
    VdnExtensionPanel,
    VdnChannelManager,
    OmniOrgBind,
    EnterpriseFlowFrame,
  },
  data() {
    return {
      workspaceTab: 'basic',
      routeKind: 'voice',
      workspaceSyncing: false,
      vdnLoading: false,
      vdnDetailLoading: false,
      vdnSaving: false,
      vdnImporting: false,
      vdnErr: '',
      vdnRows: [],
      vdnTotal: 0,
      vdnPage: 1,
      vdnPageSize: 10000,
      vdnFilterName: '',
      vdnSelection: [],
      activeVdn: null,
      vdnDialogVisible: false,
      vdnDialogMode: 'add',
      vdnForm: emptyVdnForm(),
      vdnBasic: null,
      vdnAccessOptions: [],
      vdnAccessAllIdsCsv: '',
      allVdnOptions: [],
      tasNodeOptions: [],
      itrFlowOptions: [],
      userLoading: false,
      userSaving: false,
      userImporting: false,
      userErr: '',
      userRows: [],
      userTotal: 0,
      userPage: 1,
      userPageSize: 10000,
      userFilterKeyword: '',
      userSelection: [],
      userDialogVisible: false,
      userDialogMode: 'add',
      userForm: emptyUserForm(),
      pendingVdnId: null,
    };
  },
  computed: {
    iccAvailable() { return moduleAvailable('icc'); },
    itrAvailable() { return moduleAvailable('itr'); },
    nodeOptionsAvailable() { return this.iccAvailable || this.canUseDesigner; },
    routingAvailable() { return moduleAvailable('icc') || moduleAvailable('itr'); },
    canUseDesigner() { return productModules.canDesign && moduleAvailable('flow-designer'); },
    filteredUserRows() {
      const keyword = String(this.userFilterKeyword || '').trim().toLowerCase();
      if (!keyword) return this.userRows;
      return this.userRows.filter((row) =>
        [row.id, row.workNo, row.name].some((value) =>
          String(value == null ? '' : value).toLowerCase().includes(keyword)
        )
      );
    },
    vdnDialogTitle() {
      let action;
      if (this.vdnDialogMode === 'edit') action = this.$t('operate.title.update');
      else if (this.vdnDialogMode === 'copy') action = this.$t('smcicc.common.copy');
      else action = this.$t('operate.title.add');
      return `${this.$t('smcicc.system.vdn.dialogVdnTitle')} — ${action}`;
    },
    parentOptions() {
      const currentId = Number(this.vdnForm.idStr);
      return this.allVdnOptions.filter((item) => !currentId || item.id !== currentId);
    },
    userDialogTitle() {
      let action;
      if (this.userDialogMode === 'edit') action = this.$t('operate.title.update');
      else if (this.userDialogMode === 'copy') action = this.$t('smcicc.common.copy');
      else action = this.$t('operate.title.add');
      return `${this.$t('smcicc.system.vdn.dialogAdminTitle')} — ${action}`;
    },
    vdnRules() {
      const ruleVdnId = (rule, value, cb) => {
        const s = String(value ?? '').trim();
        if (!s) {
          cb(new Error(this.$t('smcicc.system.vdn.vdnIdRequired')));
          return;
        }
        if (!/^\d+$/.test(s)) {
          cb(new Error(this.$t('smcicc.system.vdn.vdnIdDigits')));
          return;
        }
        cb();
      };
      return {
        idStr: [{ validator: ruleVdnId, trigger: 'blur' }],
        name: [{ required: true, message: this.$t('smcicc.system.vdn.vdnNameRequired'), trigger: 'blur' }],
      };
    },
    userRules() {
      return {
        workNo: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
        name: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
        password: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
      };
    },
  },
  created() {
    this.applyWorkspaceQuery(this.$route.query);
    if (this.$route.query.vdnId) this.pendingVdnId = Number(this.$route.query.vdnId);
  },
  async mounted() {
    // Resolve capabilities before starting optional ICC/ITR requests.
    try { await refreshModules(); } catch { /* Base VDN management remains available. */ }
    this.applyWorkspaceQuery(this.$route.query);
    this.loadVdnList();
  },
  watch: {
    '$route.query': {
      handler(query) {
        this.applyWorkspaceQuery(query || {});
        this.consumeSidebarQuery(query || {});
      },
    },
  },
  methods: {
    applyWorkspaceQuery(q) {
      let tab = VDN_TABS.includes(q.tab) ? q.tab : 'basic';
      if ((tab === 'ext' && !this.iccAvailable) || (tab === 'route' && !this.routingAvailable) || (['ivr','itr'].includes(tab) && !this.canUseDesigner)) tab = 'basic';
      this.workspaceSyncing = true;
      this.workspaceTab = tab;
      this.routeKind = q.route === 'media' || !this.iccAvailable ? 'media' : 'voice';
      this.$nextTick(() => {
        this.workspaceSyncing = false;
      });
    },
    onWorkspaceTab(pane) {
      if (pane && pane.name) this.workspaceTab = pane.name;
      this.$nextTick(() => this.pushWorkspaceQuery());
    },
    pushWorkspaceQuery() {
      if (this.workspaceSyncing) return;
      const query = { ...this.$route.query, tab: this.workspaceTab };
      if (this.workspaceTab === 'route') query.route = this.routeKind;
      else delete query.route;
      const same = query.tab === this.$route.query.tab && (query.route || '') === (this.$route.query.route || '');
      if (same) return;
      this.$router.replace({ path: this.$route.path, query }).catch(() => {});
    },
    notifyVdnMenu() {
      this.$root.$emit('smcicc-vdn-menu-refresh');
    },
    consumeSidebarQuery(query) {
      const q = query || {};
      if (q.vdnId) {
        const id = Number(q.vdnId);
        if (!Number.isNaN(id) && (!this.activeVdn || Number(this.activeVdn.id) !== id)) {
          const hit = this.vdnRows.find((row) => Number(row.id) === id);
          if (hit) this.onVdnRowClick(hit);
          else {
            this.pendingVdnId = id;
            if (!this.vdnLoading) this.loadVdnList();
          }
        }
      }
      const targetId = q.vdnId ? Number(q.vdnId) : 0;
      const vdnReady = !targetId || (this.activeVdn && Number(this.activeVdn.id) === targetId);
      if ((q.vdnCmd || q.add) && !vdnReady && q.vdnId) return;
      if (q.add && this._vdnAddStamp !== q.add) {
        this._vdnAddStamp = q.add;
        const next = { ...q };
        delete next.add;
        this.$router.replace({ path: this.$route.path, query: next }).catch(() => {});
        this.openVdnAdd();
      }
      if (q.vdnCmd && q.vdnCmdAt && this._vdnCmdStamp !== q.vdnCmdAt) {
        this._vdnCmdStamp = q.vdnCmdAt;
        const cmd = q.vdnCmd;
        const next = { ...q };
        delete next.vdnCmd;
        delete next.vdnCmdAt;
        delete next.add;
        this.$router.replace({ path: this.$route.path, query: next }).catch(() => {});
        this.runSidebarCmd(cmd);
      }
    },
    runSidebarCmd(cmd) {
      if (cmd === 'export') {
        this.exportVdns();
        return;
      }
      if (cmd === 'delete') {
        if (!this.activeVdn) return;
        this.vdnSelection = [this.activeVdn];
        this.doVdnDelete();
        return;
      }
      if (cmd === 'import') {
        const file = this.$root.__vdnImportFile;
        this.$root.__vdnImportFile = null;
        if (file) this.importVdns(file);
      }
    },
    formatOnOff(val) {
      return Number(val) === 1 ? this.$t('smcicc.common.on') : this.$t('smcicc.common.off');
    },
    formatRecordWorkNo(val) {
      return Number(val) === 1 ? this.$t('smcicc.common.yes') : this.$t('smcicc.common.no');
    },
    formatItrFlow(val) {
      const id = Number(val) || 0;
      if (id <= 0) return this.$t('smcicc.system.vdn.itrDefaultFlowEnvShort');
      const hit = this.itrFlowOptions.find((f) => Number(f.id) === id);
      return hit && hit.name ? `${id} ${hit.name}` : String(id);
    },
    accessAssignString(ids) {
      if (!ids || !ids.length) return '';
      return ids.map((x) => `${x};`).join('');
    },
    searchUsers() {
      this.userFilterKeyword = String(this.userFilterKeyword || '').trim();
    },
    clearUserSearch() {
      this.userFilterKeyword = '';
    },
    triggerUserImport() {
      if (this.$refs.userImportFile) this.$refs.userImportFile.click();
    },
    parseCsv(text) {
      const rows = [];
      let row = [];
      let cell = '';
      let quoted = false;
      const source = String(text || '').replace(/^\uFEFF/, '');
      for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if (char === '"') {
          if (quoted && source[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            quoted = !quoted;
          }
        } else if (char === ',' && !quoted) {
          row.push(cell.trim());
          cell = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
          if (char === '\r' && source[i + 1] === '\n') i += 1;
          row.push(cell.trim());
          if (row.some((value) => value !== '')) rows.push(row);
          row = [];
          cell = '';
        } else {
          cell += char;
        }
      }
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      return rows;
    },
    readFile(file) {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsText(file, 'UTF-8');
      });
    },
    csvCell(value) {
      return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
    },
    downloadCsv(filename, headers, rows) {
      const lines = rows.map((row) => row.map(this.csvCell).join(','));
      const blob = new Blob([`\uFEFF${headers.join(',')}\r\n${lines.join('\r\n')}`], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    async importVdns(event) {
      const input = event && event.target;
      const file = input && input.files ? input.files[0] : event;
      if (input) input.value = '';
      if (!file) return;
      this.vdnImporting = true;
      try {
        const csvRows = this.parseCsv(await this.readFile(file));
        const headers = (csvRows.shift() || []).map((header) => header.trim().toLowerCase());
        const findColumn = (aliases) => headers.findIndex((header) => aliases.includes(header));
        const idIndex = findColumn(['id', 'vdnid', 'vdn编号']);
        const nameIndex = findColumn(['name', 'vdnname', 'vdn名称']);
        const parentIndex = findColumn(['parentid', 'parentvdn', '父vdn']);
        if (idIndex < 0 || nameIndex < 0 || !csvRows.length) {
          this.$message.warning(this.$t('smcicc.system.vdn.importVdnInvalid'));
          return;
        }
        let success = 0;
        let duplicate = 0;
        let failed = 0;
        let lastAddedId = null;
        for (const values of csvRows) {
          const id = Number(String(values[idIndex] || '').trim());
          const name = String(values[nameIndex] || '').trim();
          const parentId = parentIndex >= 0 && String(values[parentIndex] || '').trim() !== ''
            ? Number(values[parentIndex])
            : -1;
          if (!Number.isInteger(id) || !name || !Number.isInteger(parentId)) {
            failed += 1;
            continue;
          }
          try {
            const code = await this.$ajax.postJSON(`${BASE}/addVdn`, {
              'vdn.id': id,
              'vdn.name': name,
              'vdn.parentId': parentId,
              nodeIds: [],
              accessCodeIdsAssign: '',
              accessCodeIds: '',
            });
            if (code === 1) {
              success += 1;
              lastAddedId = id;
            } else if (code === -2 || code === -3) duplicate += 1;
            else failed += 1;
          } catch {
            failed += 1;
          }
        }
        this.$message.success(this.$t('smcicc.system.vdn.importResult', { success, duplicate, failed }));
        this.pendingVdnId = lastAddedId;
        this.notifyVdnMenu();
        this.loadVdnList();
      } catch {
        this.$message.error(this.$t('smcicc.system.vdn.importFailed'));
      } finally {
        this.vdnImporting = false;
      }
    },
    exportVdns() {
      const rows = this.vdnRows.map((row) => [
        row.id,
        row.name,
        row.parentId,
        row.startRecord,
        row.realTimeSpeechRecog,
        row.asrEngine,
        row.recordWorkNo,
        row.sipExtStatusSupport,
        row.itrDefaultFlowId,
      ]);
      this.downloadCsv(
        `icc-vdns-${new Date().toISOString().slice(0, 10)}.csv`,
        ['id', 'name', 'parentId', 'startRecord', 'realTimeSpeechRecog', 'asrEngine', 'recordWorkNo', 'sipExtStatusSupport', 'itrDefaultFlowId'],
        rows
      );
    },
    async importUsers(event) {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file || !this.activeVdn) return;
      this.userImporting = true;
      try {
        const csvRows = this.parseCsv(await this.readFile(file));
        const headers = (csvRows.shift() || []).map((header) => header.trim().toLowerCase());
        const findColumn = (aliases) => headers.findIndex((header) => aliases.includes(header));
        const workNoIndex = findColumn(['workno', 'account', '管理员工号', '登录账号']);
        const passwordIndex = findColumn(['password', '登录密码', '密码']);
        const nameIndex = findColumn(['name', '管理员名称', '姓名']);
        if (workNoIndex < 0 || passwordIndex < 0 || nameIndex < 0 || !csvRows.length) {
          this.$message.warning(this.$t('smcicc.system.vdn.importAdminInvalid'));
          return;
        }
        let success = 0;
        let duplicate = 0;
        let failed = 0;
        for (const values of csvRows) {
          const user = {
            id: 0,
            workNo: String(values[workNoIndex] || '').trim(),
            password: String(values[passwordIndex] || ''),
            name: String(values[nameIndex] || '').trim(),
            vdnId: Number(this.activeVdn.id),
          };
          if (!user.workNo || !user.password || !user.name) {
            failed += 1;
            continue;
          }
          try {
            const code = await this.$ajax.postJSON(`${BASE}/addVdnUser`, { user });
            if (code === 1) success += 1;
            else if (code === -2) duplicate += 1;
            else failed += 1;
          } catch {
            failed += 1;
          }
        }
        this.$message.success(this.$t('smcicc.system.vdn.importResult', { success, duplicate, failed }));
        this.loadUserList();
      } catch {
        this.$message.error(this.$t('smcicc.system.vdn.importFailed'));
      } finally {
        this.userImporting = false;
      }
    },
    exportUsers() {
      if (!this.activeVdn) return;
      const rows = this.filteredUserRows.map((row) => [row.id, row.workNo, row.password, row.name]);
      this.downloadCsv(
        `icc-vdn-${this.activeVdn.id}-admins-${new Date().toISOString().slice(0, 10)}.csv`,
        ['id', 'workNo', 'password', 'name'],
        rows
      );
    },
    searchVdn() {
      this.vdnPage = 1;
      this.loadVdnList();
    },
    loadVdnList() {
      this.vdnLoading = true;
      this.vdnErr = '';
      const name = (this.vdnFilterName || '').trim();
      this.$ajax
        .postJSON(`${BASE}/loadVdnListJoin`, {
          page: this.vdnPage,
          pagesize: this.vdnPageSize,
          'vdn.name': name,
        })
        .then((data) => {
          const raw = Array.isArray(data.Rows) ? data.Rows : [];
          this.vdnRows = raw.map(normVdn).filter((r) => r != null);
          this.vdnTotal = Number(data.Total != null ? data.Total : this.vdnRows.length);
          this.syncVdnCurrentAfterLoad();
        })
        .catch((err) => {
          const msg =
            (err && (err.err_msg || err.message)) ||
            (typeof err === 'string' ? err : '');
          this.vdnErr = msg
            ? this.$t('smcicc.system.vdn.loadVdnFailedDetail', { msg })
            : this.$t('smcicc.system.vdn.loadVdnFailed');
          this.vdnRows = [];
          this.vdnTotal = 0;
        })
        .finally(() => {
          this.vdnLoading = false;
        });
    },
    syncVdnCurrentAfterLoad() {
      if (!this.vdnRows.length) {
        this.activeVdn = null;
        this.vdnSelection = [];
        this.userRows = [];
        this.userTotal = 0;
        this.resetVdnForm();
        return;
      }
      const targetId = this.pendingVdnId != null
        ? Number(this.pendingVdnId)
        : this.activeVdn
          ? Number(this.activeVdn.id)
          : Number(this.vdnRows[0].id);
      const hit = this.vdnRows.find((row) => Number(row.id) === targetId) || this.vdnRows[0];
      this.pendingVdnId = null;
      this.onVdnRowClick(hit);
      this.applyWorkspaceQuery(this.$route.query);
      const nextQuery = { ...this.$route.query, vdnId: String(hit.id) };
      const sameVdn = String(this.$route.query.vdnId || '') === String(hit.id);
      if (!sameVdn && !this.$route.query.vdnCmd) {
        this.$router.replace({ path: this.$route.path, query: nextQuery }).catch(() => {});
      }
      this.consumeSidebarQuery(nextQuery);
    },
    onVdnSel(rows) {
      this.vdnSelection = rows || [];
    },
    async onVdnRowClick(row) {
      if (!row) return;
      this.activeVdn = row;
      this.vdnSelection = [row];
      this.vdnDialogMode = 'edit';
      this.resetVdnForm();
      this.vdnForm.idStr = String(row.id);
      this.vdnForm.name = row.name;
      this.vdnForm.parentId = Number(row.parentId != null ? row.parentId : -1);
      this.vdnForm.startRecord = Number(row.startRecord) === 1 ? 1 : 0;
      this.vdnForm.realTimeSpeechRecog = Number(row.realTimeSpeechRecog) === 1 ? 1 : 0;
      this.vdnForm.asrEngine = row.asrEngine != null ? String(row.asrEngine) : 'ali';
      this.vdnForm.recordWorkNo = Number(row.recordWorkNo) === 1 ? 1 : 0;
      this.vdnForm.sipExtStatusSupport = Number(row.sipExtStatusSupport) === 1 ? 1 : 0;
      this.vdnForm.itrDefaultFlowId = Number(row.itrDefaultFlowId) > 0 ? Number(row.itrDefaultFlowId) : 0;
      this.userPage = 1;
      this.userFilterKeyword = '';
      this.userSelection = [];
      this.loadUserList();
      this.vdnDetailLoading = true;
      try {
        await Promise.all([
          this.loadAccessForEdit(row.id),
          this.loadAllVdnOptions(),
          this.loadTasNodeOptions(),
          this.loadItrFlowOptions(),
          this.loadNodeBindList(row.id),
          this.loadVdnBasic(row.id),
        ]);
      } catch {
        this.$message.warning(this.$t('smcicc.system.vdn.configLoadFailed'));
      } finally {
        this.vdnDetailLoading = false;
      }
    },
    loadUserList() {
      if (!this.activeVdn) {
        this.userRows = [];
        this.userTotal = 0;
        return;
      }
      this.userLoading = true;
      this.userErr = '';
      this.$ajax
        .postJSON(`${BASE}/loadUserByVdn`, {
          page: this.userPage,
          pagesize: this.userPageSize,
          vdnId: this.activeVdn.id,
        })
        .then((data) => {
          const raw = Array.isArray(data.Rows) ? data.Rows : [];
          this.userRows = raw.map(normUser).filter((r) => r != null);
          this.userTotal = Number(data.Total != null ? data.Total : this.userRows.length);
        })
        .catch(() => {
          this.userErr = this.$t('smcicc.system.vdn.loadAdminFailed');
          this.userRows = [];
          this.userTotal = 0;
        })
        .finally(() => {
          this.userLoading = false;
        });
    },
    onUserSel(rows) {
      this.userSelection = rows || [];
    },
    resetVdnForm() {
      this.vdnForm = emptyVdnForm();
      this.vdnBasic = null;
      this.vdnAccessOptions = [];
      this.vdnAccessAllIdsCsv = '';
      this.tasNodeOptions = [];
      this.$nextTick(() => {
        if (this.$refs.vdnFormRef) this.$refs.vdnFormRef.clearValidate();
        if (this.$refs.vdnDialogFormRef) this.$refs.vdnDialogFormRef.clearValidate();
      });
    },
    onVdnDialogClosed() {
      if (this.activeVdn) this.onVdnRowClick(this.activeVdn);
      else this.resetVdnForm();
    },
    async loadAllVdnOptions() {
      const data = await this.$ajax.postJSON(`${BASE}/loadAllVdns`, {});
      const rows = Array.isArray(data.Rows) ? data.Rows : [];
      this.allVdnOptions = rows.map(normVdn).filter((r) => r != null);
    },
    async loadTasNodeOptions() {
      if (!this.nodeOptionsAvailable) { this.tasNodeOptions = []; return; }
      const rows = await this.$ajax.postJSON(`${BASE}/loadTasList`, {});
      this.tasNodeOptions = (Array.isArray(rows) ? rows : [])
        .map((row) => ({
          myId: Number(row.myId),
          myName: String(row.myName || ''),
        }))
        .filter((row) => !Number.isNaN(row.myId) && row.myId > 0);
    },
    async loadItrFlowOptions() {
      if (!this.itrAvailable && !this.canUseDesigner) { this.itrFlowOptions = []; return; }
      try {
        const res = await this.$axios.get('/api/smcicc/itrflow/list');
        const data = (res.data && res.data.data) || res.data || {};
        const items = Array.isArray(data.items) ? data.items : [];
        this.itrFlowOptions = items
          .map((x) => ({ id: Number(x.id), name: String(x.name || '') }))
          .filter((x) => Number.isInteger(x.id) && x.id > 0);
      } catch {
        this.itrFlowOptions = [];
      }
    },
    async loadVdnBasic(vdnId) {
      const data = await this.$ajax.getJSON('/server/api/smcicc/vdnadmin/loadBasicInfo', { vdnId });
      this.vdnBasic = data && typeof data === 'object' ? data : null;
      if (this.vdnBasic) {
        this.vdnForm.startRecord = Number(this.vdnBasic.startRecord) === 1 ? 1 : 0;
        this.vdnForm.realTimeSpeechRecog = Number(this.vdnBasic.realTimeSpeechRecog) === 1 ? 1 : 0;
        this.vdnForm.asrEngine = this.vdnBasic.asrEngine != null ? String(this.vdnBasic.asrEngine) : 'ali';
        this.vdnForm.recordWorkNo = Number(this.vdnBasic.recordWorkNo) === 1 ? 1 : 0;
        this.vdnForm.sipExtStatusSupport = Number(this.vdnBasic.sipExtStatusSupport) === 1 ? 1 : 0;
      }
    },
    async loadNodeBindList(vdnId) {
      if (!this.nodeOptionsAvailable) { this.vdnForm.nodeIds = []; return; }
      const data = await this.$ajax.postJSON(`${BASE}/loadVdnNodeBindList`, { vdnId });
      const rows = Array.isArray(data.Rows) ? data.Rows : [];
      this.vdnForm.nodeIds = rows
        .map((row) => Number(row.nodeId))
        .filter((nodeId) => !Number.isNaN(nodeId) && nodeId > 0);
    },
    async loadAccessForAdd() {
      if (!this.iccAvailable) { this.vdnAccessOptions = []; this.vdnAccessAllIdsCsv = ''; return; }
      const data = await this.$ajax.postJSON(`${BASE}/loadAccessCodeListByNotAssign`, {});
      const rows = Array.isArray(data.Rows) ? data.Rows : [];
      this.vdnAccessOptions = rows.map((x) => ({ id: Number(x.id), code: String(x.code || '') }));
      this.vdnAccessAllIdsCsv = typeof data.ids === 'string' ? data.ids : rows.map((x) => x.id).join(',');
    },
    async loadAccessForEdit(vdnId) {
      if (!this.iccAvailable) { this.vdnAccessOptions = []; this.vdnAccessAllIdsCsv = ''; return; }
      const data = await this.$ajax.postJSON(`${BASE}/loadAccessCodeListByNotAssignSelf`, { vdnId });
      const rows = Array.isArray(data.Rows) ? data.Rows : [];
      this.vdnAccessOptions = rows.map((x) => ({ id: Number(x.id), code: String(x.code || '') }));
      this.vdnAccessAllIdsCsv = typeof data.ids === 'string' ? data.ids : rows.map((x) => x.id).join(',');
      const chk = await this.$ajax.postJSON(`${BASE}/checkAccessCodeByVdnId`, { vdnId });
      const s = chk && chk.accessCodeIds != null ? String(chk.accessCodeIds) : '';
      const selected = s
        .split(/[;,]/)
        .map((x) => Number(String(x).trim()))
        .filter((x) => !Number.isNaN(x) && x > 0);
      this.vdnForm.accessSelected = selected;
    },
    async openVdnAdd() {
      this.vdnDialogMode = 'add';
      this.resetVdnForm();
      this.vdnDialogVisible = true;
      try {
        await Promise.all([this.loadAccessForAdd(), this.loadAllVdnOptions(), this.loadTasNodeOptions(), this.loadItrFlowOptions()]);
      } catch {
        this.$message.warning(this.$t('smcicc.system.vdn.configLoadFailed'));
      }
    },
    openVdnEdit() {
      const row = this.vdnSelection.length === 1 ? this.vdnSelection[0] : null;
      if (row) this.onVdnRowClick(row);
    },
    async openVdnCopy() {
      const r = this.vdnSelection.length === 1 ? this.vdnSelection[0] : null;
      if (!r) return;
      this.vdnDialogMode = 'copy';
      this.resetVdnForm();
      this.vdnDialogVisible = true;
      try {
        await Promise.all([this.loadAccessForAdd(), this.loadAllVdnOptions(), this.loadTasNodeOptions(), this.loadItrFlowOptions(), this.loadNodeBindList(r.id)]);
        const one = await this.$ajax.postJSON(`${BASE}/selectOneByVdnId`, { vdnId: r.id });
        const v = one && one.vdn ? one.vdn : null;
        if (v) {
          this.vdnForm.idStr = '';
          this.vdnForm.name = v.name ? `${v.name}_copy` : '';
          this.vdnForm.parentId = v.parentId != null ? Number(v.parentId) : -1;
          this.vdnForm.itrDefaultFlowId = Number(v.itrDefaultFlowId) > 0 ? Number(v.itrDefaultFlowId) : 0;
          this.vdnForm.startRecord = Number(r.startRecord) === 1 ? 1 : 0;
          this.vdnForm.realTimeSpeechRecog = Number(r.realTimeSpeechRecog) === 1 ? 1 : 0;
          this.vdnForm.asrEngine = r.asrEngine != null ? String(r.asrEngine) : 'ali';
          this.vdnForm.recordWorkNo = Number(r.recordWorkNo) === 1 ? 1 : 0;
          this.vdnForm.sipExtStatusSupport = Number(r.sipExtStatusSupport) === 1 ? 1 : 0;
        }
      } catch {
        this.$message.warning(this.$t('smcicc.system.vdn.copyDataLoadFailed'));
      }
    },
    submitVdn() {
      const formRef = this.vdnDialogVisible ? this.$refs.vdnDialogFormRef : this.$refs.vdnFormRef;
      if (!formRef) return;
      formRef.validate(async (ok) => {
        if (!ok) return;
        const id = Number(String(this.vdnForm.idStr).trim());
        const name = String(this.vdnForm.name || '').trim();
        const assign = this.accessAssignString(this.vdnForm.accessSelected);
        const payload = {
          'vdn.id': id,
          'vdn.name': name,
          'vdn.parentId': Number(this.vdnForm.parentId != null ? this.vdnForm.parentId : -1),
          nodeIds: this.vdnForm.nodeIds,
          accessCodeIdsAssign: assign,
          accessCodeIds: this.vdnAccessAllIdsCsv,
          startRecord: Number(this.vdnForm.startRecord) ? 1 : 0,
          realTimeSpeechRecog: Number(this.vdnForm.realTimeSpeechRecog) ? 1 : 0,
          asrEngine: this.vdnForm.asrEngine || 'ali',
          recordWorkNo: Number(this.vdnForm.startRecord) === 1 && Number(this.vdnForm.recordWorkNo) ? 1 : 0,
          sipExtStatusSupport: Number(this.vdnForm.sipExtStatusSupport) ? 1 : 0,
          itrDefaultFlowId: Number(this.vdnForm.itrDefaultFlowId) > 0 ? Number(this.vdnForm.itrDefaultFlowId) : 0,
        };
        // Omit hidden fields instead of submitting empty/default values over
        // configurations retained for a later licensed upgrade.
        if (!this.iccAvailable) {
          for (const key of ['accessCodeIdsAssign', 'accessCodeIds', 'startRecord', 'realTimeSpeechRecog', 'asrEngine', 'recordWorkNo', 'sipExtStatusSupport']) delete payload[key];
        }
        if (!this.nodeOptionsAvailable) delete payload.nodeIds;
        if (!this.itrAvailable) delete payload.itrDefaultFlowId;
        this.vdnSaving = true;
        try {
          if (this.vdnDialogMode === 'edit') {
            const res = await this.$ajax.postJSON(`${BASE}/editVdn`, payload);
            if (res && res.result === 1) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.pendingVdnId = id;
              this.notifyVdnMenu();
              this.loadVdnList();
              if (this.activeVdn && this.activeVdn.id === id) {
                this.activeVdn = { ...this.activeVdn, name };
              }
            } else if (res && res.result === -4 && Array.isArray(res.list)) {
              this.$message.warning(this.$t('smcicc.system.vdn.accessCodeInUse', { list: res.list.join(',') }));
            } else if (res && res.result === -5) {
              this.$message.warning(this.$t('smcicc.system.vdn.parentSelf'));
            } else if (res && res.result === -6) {
              this.$message.warning(this.$t('smcicc.system.vdn.parentNotExist'));
            } else if (res && res.result === -7) {
              this.$message.warning(this.$t('smcicc.system.vdn.parentCycle'));
            } else {
              this.$message.warning(this.$t('smcicc.common.saveFailed'));
            }
          } else {
            const code = await this.$ajax.postJSON(`${BASE}/addVdn`, payload);
            if (code === 1) {
              this.$message.success(
                this.vdnDialogMode === 'copy' ? this.$t('smcicc.common.copySuccess') : this.$t('smcicc.common.addSuccess')
              );
              this.pendingVdnId = id;
              this.activeVdn = null;
              this.vdnDialogVisible = false;
              this.notifyVdnMenu();
              this.loadVdnList();
            } else if (code === -2) {
              this.$message.warning(this.$t('smcicc.system.vdn.duplicateVdnId'));
            } else if (code === -3) {
              this.$message.warning(this.$t('smcicc.system.vdn.duplicateVdnName'));
            } else if (code === -5) {
              this.$message.warning(this.$t('smcicc.system.vdn.parentSelf'));
            } else if (code === -6) {
              this.$message.warning(this.$t('smcicc.system.vdn.parentNotExist'));
            } else if (code === -7) {
              this.$message.warning(this.$t('smcicc.system.vdn.parentCycle'));
            } else {
              this.$message.warning(this.$t('smcicc.common.saveFailed'));
            }
          }
        } catch {
          this.$message.error(this.$t('smcicc.common.requestFailed'));
        } finally {
          this.vdnSaving = false;
        }
      });
    },
    deleteTreeNode(row) {
      this.onVdnRowClick(row);
      this.vdnSelection = [row];
      this.doVdnDelete();
    },
    doVdnDelete() {
      if (!this.vdnSelection.length && this.activeVdn) this.vdnSelection = [this.activeVdn];
      if (!this.vdnSelection.length) return;
      const ids = this.vdnSelection.map((x) => x.id);
      const n = ids.length;
      this.$confirm(this.$t('smcicc.system.vdn.confirmDeleteVdn', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteVdn`, { vdnIds: ids.join(',') }))
        .then((res) => {
          const fail = res && Array.isArray(res.data) ? res.data : [];
          if (!fail.length) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            if (this.activeVdn && ids.includes(this.activeVdn.id)) {
              this.activeVdn = null;
              this.pendingVdnId = null;
              this.userRows = [];
              this.userTotal = 0;
            }
            this.notifyVdnMenu();
            this.loadVdnList();
          } else {
            this.$message.warning(this.$t('smcicc.system.vdn.vdnDeleteBlocked', { list: fail.join(',') }));
          }
        })
        .catch(() => {});
    },
    resetUserForm() {
      this.userForm = emptyUserForm();
      this.$nextTick(() => this.$refs.userFormRef && this.$refs.userFormRef.clearValidate());
    },
    onUserDialogClosed() {
      this.resetUserForm();
    },
    openUserAdd() {
      if (!this.activeVdn) return;
      this.userDialogMode = 'add';
      this.resetUserForm();
      this.userDialogVisible = true;
    },
    openUserEdit(row) {
      const u = row && row.id != null
        ? row
        : this.userSelection.length === 1
          ? this.userSelection[0]
          : null;
      if (!u || !this.activeVdn) return;
      this.userDialogMode = 'edit';
      this.userForm = {
        id: u.id,
        workNo: u.workNo,
        name: u.name,
        password: u.password || '',
      };
      this.userDialogVisible = true;
      this.$nextTick(() => this.$refs.userFormRef && this.$refs.userFormRef.clearValidate());
    },
    openUserCopy() {
      const u = this.userSelection.length === 1 ? this.userSelection[0] : null;
      if (!u || !this.activeVdn) return;
      this.userDialogMode = 'copy';
      this.userForm = {
        id: 0,
        workNo: u.workNo ? `${u.workNo}_copy` : '',
        name: u.name ? `${u.name}_copy` : '',
        password: u.password || '',
      };
      this.userDialogVisible = true;
      this.$nextTick(() => this.$refs.userFormRef && this.$refs.userFormRef.clearValidate());
    },
    userPayload() {
      const f = this.userForm;
      return {
        user: {
          id: Number(f.id) || 0,
          workNo: String(f.workNo || '').trim(),
          name: String(f.name || '').trim(),
          password: String(f.password || ''),
          vdnId: this.activeVdn ? Number(this.activeVdn.id) : -1,
        },
      };
    },
    submitUser() {
      this.$refs.userFormRef.validate((ok) => {
        if (!ok || !this.activeVdn) return;
        let url = `${BASE}/addVdnUser`;
        if (this.userDialogMode === 'edit') url = `${BASE}/editVdnUser`;
        if (this.userDialogMode === 'copy') url = `${BASE}/copyVdnUser`;
        this.userSaving = true;
        this.$ajax
          .postJSON(url, this.userPayload())
          .then((code) => {
            if (code === 1) {
              this.$message.success(
                this.userDialogMode === 'edit'
                  ? this.$t('smcicc.common.saveSuccess')
                  : this.userDialogMode === 'copy'
                    ? this.$t('smcicc.common.copySuccess')
                    : this.$t('smcicc.common.addSuccess')
              );
              this.userDialogVisible = false;
              this.loadUserList();
            } else if (code === -2) {
              this.$message.warning(this.$t('smcicc.system.vdn.duplicateAdminWorkNo'));
            } else {
              this.$message.warning(this.$t('smcicc.common.operationFailed'));
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.userSaving = false;
          });
      });
    },
    doUserDelete() {
      if (!this.userSelection.length || !this.activeVdn) return;
      const ids = this.userSelection.map((x) => x.id);
      const n = ids.length;
      this.$confirm(this.$t('smcicc.system.vdn.confirmDeleteAdmin', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteVdnUser`, { userIds: ids.join(',') }))
        .then((n) => {
          if (Number(n) > 0) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.loadUserList();
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
.vdn-manager-page {
  display: flex;
  flex: 1 1 auto !important;
  flex-direction: column;
  gap: 12px;
  min-height: 0;
  width: 100% !important;
  padding: 16px !important;
  overflow: hidden;
  background: var(--cfg-bg, #f4f7fb);
}
.vdn-page-alert {
  flex: 0 0 auto;
}
.vdn-list-panel,
.vdn-config-panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--cfg-border, #e4e7ed);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(34, 35, 41, 0.06);
}
.vdn-list-panel {
  display: flex;
  flex-direction: column;
}
.vdn-list-toolbar,
.vdn-section-header,
.vdn-admin-toolbar {
  flex: 0 0 auto;
  border-bottom: 1px solid var(--cfg-border, #e4e7ed);
  background: var(--cfg-surface-raised, #f7f9fc);
}
.vdn-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 12px;
}
.vdn-list-title {
  min-width: 0;
  overflow: hidden;
  color: var(--cfg-heading, #222329);
  font-size: 14px;
  font-weight: 650;
  line-height: 32px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vdn-list-actions,
.vdn-admin-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}
.vdn-list-actions .el-button,
.vdn-admin-actions .el-button {
  width: 30px;
  min-width: 30px;
  height: 30px;
  margin: 0;
  padding: 7px 0;
}
.vdn-import-file {
  display: none;
}
.vdn-list-alert {
  flex: 0 0 auto;
  margin: 10px;
}
.vdn-add-btn {
  font-size: 18px;
  padding: 4px;
  color: #457ff5;
}
.vdn-tree {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  padding: 4px 0 8px;
  background: transparent;
}
.vdn-tree /deep/ .el-tree-node__content {
  height: 36px;
}
.vdn-tree-node {
  display: flex;
  flex: 1;
  align-items: center;
  min-width: 0;
  padding-right: 6px;
  gap: 8px;
}
.vdn-tree-label {
  min-width: 0;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vdn-tree-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}
.vdn-tree-actions .el-button {
  margin: 0;
  padding: 0 3px;
  font-size: 14px;
}
.vdn-tree-delete {
  color: #f56c6c;
}
.vdn-list {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  padding: 6px 0;
}
.vdn-list-item {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 0;
  border-left: 3px solid transparent;
  color: var(--cfg-text, #565b66);
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
}
.vdn-list-item:hover {
  background: #f3f6fb;
}
.vdn-list-item.active {
  border-left-color: var(--cfg-accent, #457ff5);
  color: var(--cfg-accent, #457ff5);
  background: #eaf2ff;
}
.vdn-list-item i {
  flex: 0 0 auto;
  font-size: 16px;
}
.vdn-list-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vdn-empty-hint,
.vdn-config-empty {
  display: flex;
  min-height: 120px;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  padding: 20px;
  color: var(--cfg-muted, #909399);
  font-size: 13px;
  text-align: center;
}
.vdn-splitter {
  position: relative;
  min-height: 0;
  cursor: col-resize;
}
.vdn-splitter::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 3px;
  width: 2px;
  border-radius: 2px;
  background: var(--cfg-border, #e4e7ed);
  content: '';
  transition: background-color 160ms ease, width 160ms ease;
}
.vdn-splitter:hover::before,
.vdn-is-resizing .vdn-splitter::before {
  left: 2px;
  width: 4px;
  background: var(--cfg-accent, #457ff5);
}
.vdn-splitter-grip {
  position: absolute;
  top: 50%;
  left: 0;
  width: 8px;
  height: 44px;
  transform: translateY(-50%);
}
.vdn-config-panel {
  display: flex;
  flex: 1 1 auto;
  flex-direction: column;
}
.vdn-workspace-tabs {
  display: flex;
  flex: 1;
  min-height: 0;
  flex-direction: column;
}
.vdn-workspace-tabs /deep/ .el-tabs__header {
  margin: 0;
  padding: 0 12px;
}
.vdn-workspace-tabs /deep/ .el-tabs__content {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 0;
  overflow: auto;
  padding: 12px;
}
.vdn-workspace-tabs /deep/ .el-tab-pane {
  flex: 1 1 auto;
  min-height: 0;
}
.vdn-basic-split {
  display: grid;
  grid-template-rows: minmax(280px, 56%) minmax(200px, 1fr);
  min-height: 640px;
}
.vdn-route-switch {
  margin-bottom: 12px;
}
.vdn-embed-designer {
  min-height: 720px;
}
.vdn-embed-designer /deep/ .flow-plugin-frame {
  margin: 0;
  width: 100%;
  min-height: 680px;
}
.vdn-parameters-section,
.vdn-admin-section {
  display: flex;
  min-width: 0;
  min-height: 0;
  flex-direction: column;
  overflow: hidden;
}
.vdn-parameters-section {
  border-bottom: 1px solid var(--cfg-border, #e4e7ed);
}
.vdn-section-header {
  display: flex;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 18px;
}
.vdn-section-header h2,
.vdn-admin-toolbar h3 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--cfg-heading, #222329);
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vdn-section-header h2 {
  font-size: 18px;
  line-height: 1.4;
}
.vdn-section-header .el-button {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 8px 0;
}
.vdn-parameters-body {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  padding: 16px 18px 4px;
}
.vdn-parameters-form {
  display: grid;
  grid-template-columns: repeat(2, minmax(280px, 1fr));
  column-gap: 18px;
}
.vdn-parameters-form .el-form-item {
  min-width: 0;
  margin-bottom: 14px;
}
.vdn-parameters-form .vdn-form-wide {
  grid-column: 1 / -1;
}
.vdn-check-list {
  min-height: 32px;
  padding: 5px 10px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
  background: #fff;
}
.vdn-check-list .el-checkbox {
  margin-right: 18px;
  margin-left: 0;
}
.vdn-muted {
  color: var(--cfg-muted, #909399);
  font-size: 12px;
}
.vdn-admin-toolbar {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 12px;
  min-height: 52px;
  padding: 9px 14px;
}
.vdn-admin-toolbar h3 {
  justify-self: start;
  font-size: 15px;
}
.vdn-admin-search {
  grid-column: 2;
  margin: 0;
  justify-self: center;
}
.vdn-admin-search .el-input {
  width: 240px;
}
.vdn-search-icon {
  color: #8a94a6;
  cursor: pointer;
}
.vdn-search-icon:hover {
  color: var(--cfg-accent, #457ff5);
}
.vdn-admin-actions {
  grid-column: 3;
  justify-self: end;
}
.vdn-admin-alert {
  flex: 0 0 auto;
  margin: 8px 10px;
}
.vdn-admin-table-wrap {
  min-height: 0;
  flex: 1 1 auto;
  overflow: hidden;
}
.ac-wrap {
  max-height: 220px;
  overflow: auto;
  padding: 8px 12px;
  border-radius: 8px;
}
.ac-wrap .el-checkbox {
  display: block;
  margin-left: 0;
  margin-bottom: 6px;
}
.hint {
  font-size: 12px;
  margin: 0;
}
@media (max-width: 1100px) {
  .vdn-manager-page {
    gap: 10px;
    padding: 10px !important;
  }
  .vdn-list-toolbar {
    padding: 10px 8px;
  }
  .vdn-list-actions,
  .vdn-admin-actions {
    gap: 2px;
  }
  .vdn-list-actions .el-button,
  .vdn-admin-actions .el-button {
    width: 27px;
    min-width: 27px;
    height: 28px;
    padding: 6px 0;
  }
  .vdn-parameters-form {
    grid-template-columns: minmax(280px, 1fr);
  }
  .vdn-parameters-form .vdn-form-wide {
    grid-column: auto;
  }
  .vdn-admin-search .el-input {
    width: 160px;
  }
  .vdn-admin-toolbar {
    gap: 8px;
    padding: 8px;
  }
  .vdn-admin-toolbar h3 {
    font-size: 14px;
  }
}
</style>
