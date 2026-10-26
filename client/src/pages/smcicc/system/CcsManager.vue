<template>
  <div
    class="smcicc-page ccs-manager-page"
    :style="{ gridTemplateColumns: splitWidth + 'px 8px minmax(0, 1fr)' }"
  >
    <section class="ccs-list-panel">
      <div class="ccs-list-toolbar">
        <span class="ccs-list-title">{{ $t('smcicc.system.ccs.listTitle') }}</span>
        <div class="ccs-list-actions">
          <el-button type="primary" icon="el-icon-plus" :title="$t('operate.add')" @click="openAddDialog" />
          <el-button type="primary" icon="el-icon-upload2" :title="$t('operate.import')" @click="triggerImport" />
          <el-button type="primary" icon="el-icon-download" :title="$t('operate.export')" :disabled="!tabList.length" @click="exportCcs" />
          <el-button type="danger" icon="el-icon-delete" :title="$t('operate.delete')" :disabled="!activePid" @click="doDelete" />
        </div>
        <input ref="importInput" type="file" accept=".csv,text/csv" class="ccs-import-input" @change="importCcs" />
      </div>
      <el-alert v-if="err" :title="err" type="error" show-icon class="ccs-list-alert" :closable="false" />
      <div v-if="!tabList.length" class="empty-hint">{{ $t('smcicc.system.ccs.emptyHint') }}</div>
      <div v-else class="ccs-list">
        <button
          v-for="t in tabList"
          :key="t.pid"
          type="button"
          class="ccs-list-item"
          :class="{ active: String(t.pid) === activePidStr }"
          @click="selectCcs(t)"
        >
          <i class="el-icon-service" aria-hidden="true" />
          <span>{{ tabLabel(t) }}</span>
        </button>
      </div>
    </section>

    <div class="ccs-splitter" role="separator" aria-orientation="vertical" @mousedown="startResize">
      <span class="ccs-splitter-grip" aria-hidden="true" />
    </div>

    <section class="ccs-config-panel">
      <header class="ccs-config-header">
        <h2>{{ activeCcsName }}</h2>
        <div class="ccs-config-actions">
          <el-button
            type="primary"
            icon="el-icon-check"
            :title="$t('smcicc.system.ccs.saveChanges')"
            :aria-label="$t('smcicc.system.ccs.saveChanges')"
            :loading="saving"
            :disabled="!activePid || !loaded"
            @click="save"
          />
        </div>
      </header>
      <div v-if="activePid && loaded" v-loading="loadingDetail" class="ccs-config-body">
      <el-form
        ref="mainForm"
        :model="f"
        label-width="150px"
        size="small"
        class="ccs-main-form"
        :validate-on-rule-change="false"
      >
        <el-collapse v-model="collapseNames">
          <el-collapse-item :title="$t('smcicc.system.ccs.sectionNet')" name="net">
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.moduleName')">
                  <el-input :value="moduleDisplayName" readonly />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.myId')" prop="myId" :rules="requiredRules">
                  <el-input v-model.number="f.myId" class="no-ime" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.runModeLabel')" prop="runMode" :rules="requiredSelectRules">
                  <el-select v-model="f.runMode" style="width: 100%">
                    <el-option v-for="o in runModeOptions" :key="o.value" :label="$t(o.labelKey)" :value="o.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.focuComm')" prop="cfgFocuCommPid" :rules="requiredSelectRules">
                  <el-select v-model="f.cfgFocuCommPid" filterable clearable style="width: 100%">
                    <el-option
                      v-for="c in focuCommList"
                      :key="c.pid"
                      :label="focuCommLabel(c)"
                      :value="Number(c.pid)"
                    />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.localIp')" prop="myName" :rules="localIpRules">
                  <el-input v-model="f.myName" class="no-ime" :placeholder="$t('smcicc.system.ccs.localIpPlaceholder')" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.note')">
                  <el-input v-model="f.note" maxlength="100" show-word-limit />
                </el-form-item>
              </el-col>
            </el-row>
          </el-collapse-item>

          <el-collapse-item :title="$t('smcicc.system.ccs.sectionDb')" name="db">
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.odbcSource')" prop="cfgOdbcPid" :rules="requiredSelectRules">
                  <el-select v-model="f.cfgOdbcPid" filterable style="width: 100%" @change="onOdbcChange">
                    <el-option v-for="o in odbcList" :key="o.pid" :label="odbcLabel(o)" :value="Number(o.pid)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.dbType')">
                  <el-input :value="odbcDbType" readonly />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.dbCharset')">
                  <el-input :value="odbcDbCharSet" readonly />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.connectKeepAliveLabel')" prop="connectKeepAlive" :rules="requiredSelectRules">
                  <el-select v-model.number="f.connectKeepAlive" style="width: 100%">
                    <el-option v-for="o in connectKeepAliveOptions" :key="o.value" :label="$t(o.labelKey)" :value="o.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.poolSize')" prop="poolSize" :rules="requiredRules">
                  <el-input v-model.number="f.poolSize" class="no-ime" />
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.supportReport')" prop="supportReport" :rules="requiredSelectRules">
                  <el-select v-model.number="f.supportReport" style="width: 100%">
                    <el-option v-for="o in enableOptions" :key="'sr' + o.value" :label="$t(o.labelKey)" :value="o.value" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.syncHistory')" prop="sync" :rules="requiredSelectRules">
                  <el-select v-model.number="f.sync" style="width: 100%">
                    <el-option v-for="o in enableOptions" :key="'sy' + o.value" :label="$t(o.labelKey)" :value="o.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.poolLength')" prop="poolLength" :rules="requiredRules">
                  <el-input v-model.number="f.poolLength" class="no-ime" />
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.debugInfo')" prop="debugInfo" :rules="requiredSelectRules">
                  <el-select v-model.number="f.debugInfo" style="width: 100%">
                    <el-option v-for="o in enableOptions" :key="'db' + o.value" :label="$t(o.labelKey)" :value="o.value" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.slowSqlThreshold')" prop="elapsed" :rules="requiredRules">
                  <el-input v-model.number="f.elapsed" class="no-ime" />
                  <span class="hint-inline">{{ $t('smcicc.system.ccs.slowSqlHint') }}</span>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="compat-block">
              <el-checkbox v-model="isCcsCompatible">{{ $t('smcicc.system.ccs.compatCsReport') }}</el-checkbox>
              <div class="compat-checks">
                <el-checkbox
                  v-for="ck in compatTableKeys"
                  :key="ck.k"
                  v-model="f[ck.k]"
                  :true-label="1"
                  :false-label="0"
                >{{ $t(ck.labelKey) }}</el-checkbox>
              </div>
            </div>
          </el-collapse-item>

          <el-collapse-item :title="$t('smcicc.system.ccs.sectionVoice')" name="voice">
            <el-form-item :label="$t('smcicc.system.ccs.defaultWaitingMusic')" prop="defaultWaitingMusic" :rules="requiredSelectRules">
              <el-select v-model="f.defaultWaitingMusic" filterable clearable style="width: 100%">
                <el-option v-for="v in voiceList" :key="'dw' + v.id" :label="v.text" :value="String(v.id)" />
              </el-select>
            </el-form-item>
            <el-form-item :label="$t('smcicc.system.ccs.defaultWaitingAgentMusic')" prop="defaultWaitingAgentMusic" :rules="requiredSelectRules">
              <el-select v-model="f.defaultWaitingAgentMusic" filterable clearable style="width: 100%">
                <el-option v-for="v in voiceList" :key="'da' + v.id" :label="v.text" :value="String(v.id)" />
              </el-select>
            </el-form-item>
            <div class="sub-title">{{ $t('smcicc.system.ccs.workerNumVoice') }}</div>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.workerNumBeforeZh')" prop="voiceFileWorkerNumChinese" :rules="requiredSelectRules">
                  <el-select v-model="f.voiceFileWorkerNumChinese" filterable clearable style="width: 100%">
                    <el-option v-for="v in voiceList" :key="'wnc' + v.id" :label="v.text" :value="String(v.id)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.workerNumBeforeEn')" prop="voiceFileWorkerNumEnglish" :rules="requiredSelectRules">
                  <el-select v-model="f.voiceFileWorkerNumEnglish" filterable clearable style="width: 100%">
                    <el-option v-for="v in voiceList" :key="'wne' + v.id" :label="v.text" :value="String(v.id)" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <el-row :gutter="12">
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.workerNumAfterZh')" prop="voiceFileServiceForYouChinese" :rules="requiredSelectRules">
                  <el-select v-model="f.voiceFileServiceForYouChinese" filterable clearable style="width: 100%">
                    <el-option v-for="v in voiceList" :key="'syc' + v.id" :label="v.text" :value="String(v.id)" />
                  </el-select>
                </el-form-item>
              </el-col>
              <el-col :span="12">
                <el-form-item :label="$t('smcicc.system.ccs.workerNumAfterEn')" prop="voiceFileServiceForYouEnglish" :rules="requiredSelectRules">
                  <el-select v-model="f.voiceFileServiceForYouEnglish" filterable clearable style="width: 100%">
                    <el-option v-for="v in voiceList" :key="'sye' + v.id" :label="v.text" :value="String(v.id)" />
                  </el-select>
                </el-form-item>
              </el-col>
            </el-row>
            <div class="sub-title">{{ $t('smcicc.system.ccs.workerNumDigits') }}</div>
            <el-table :data="numGridRows" border size="mini" class="num-grid" max-height="320">
              <el-table-column prop="idx" :label="$t('smcicc.system.ccs.colIndex')" width="56" align="center" />
              <el-table-column :label="$t('smcicc.system.ccs.colChinese')">
                <template slot-scope="{ row }">
                  <el-select v-model="f[row.chKey]" filterable clearable size="mini" style="width: 100%">
                    <el-option v-for="v in voiceList" :key="row.chKey + v.id" :label="v.text" :value="String(v.id)" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column :label="$t('smcicc.system.ccs.colEnglish')">
                <template slot-scope="{ row }">
                  <el-select v-model="f[row.enKey]" filterable clearable size="mini" style="width: 100%">
                    <el-option v-for="v in voiceList" :key="row.enKey + v.id" :label="v.text" :value="String(v.id)" />
                  </el-select>
                </template>
              </el-table-column>
            </el-table>
          </el-collapse-item>

          <el-collapse-item :title="$t('smcicc.system.ccs.sectionCh')" name="ch">
            <el-checkbox v-model="channelStatusEnable">{{ $t('smcicc.system.ccs.channelStatusEnable') }}</el-checkbox>
            <div class="sub-table-wrap">
              <div class="sub-actions">
                <el-button type="success" size="mini" @click="openChDialog('add')">{{ $t('operate.add') }}</el-button>
                <el-button type="warning" size="mini" :disabled="chSel.length !== 1" @click="openChDialog('edit')">{{ $t('operate.modify') }}</el-button>
                <el-button type="danger" size="mini" :disabled="!chSel.length" @click="deleteChRows">{{ $t('operate.delete') }}</el-button>
              </div>
              <el-table :data="chRows" border size="small" @selection-change="(r) => (chSel = r)">
                <el-table-column type="selection" width="44" />
                <el-table-column prop="value" :label="$t('smcicc.system.ccs.chStatusLabel')" min-width="200">
                  <template slot-scope="{ row }">{{ chValueText(row.value) }}</template>
                </el-table-column>
                <el-table-column prop="myId" :label="$t('smcicc.system.ccs.recvAppId')" width="180" />
              </el-table>
            </div>
          </el-collapse-item>

          <el-collapse-item :title="$t('smcicc.system.ccs.sectionAg')" name="ag">
            <el-checkbox v-model="agentStatusEnable">{{ $t('smcicc.system.ccs.agentStatusEnable') }}</el-checkbox>
            <div class="sub-table-wrap">
              <div class="sub-actions">
                <el-button type="success" size="mini" @click="openAgDialog('add')">{{ $t('operate.add') }}</el-button>
                <el-button type="warning" size="mini" :disabled="agSel.length !== 1" @click="openAgDialog('edit')">{{ $t('operate.modify') }}</el-button>
                <el-button type="danger" size="mini" :disabled="!agSel.length" @click="deleteAgRows">{{ $t('operate.delete') }}</el-button>
              </div>
              <el-table :data="agRows" border size="small" @selection-change="(r) => (agSel = r)">
                <el-table-column type="selection" width="44" />
                <el-table-column prop="value" :label="$t('smcicc.system.ccs.agStatusLabel')" min-width="280">
                  <template slot-scope="{ row }">{{ agValueText(row.value) }}</template>
                </el-table-column>
                <el-table-column prop="myId" :label="$t('smcicc.system.ccs.recvAppId')" width="180" />
              </el-table>
            </div>
          </el-collapse-item>

          <el-collapse-item :title="$t('smcicc.system.ccs.sectionRec')" name="rec">
            <el-form-item :label="$t('smcicc.system.ccs.recordPath')" prop="agentRecordFilePath" :rules="pathRules">
              <el-input ref="pathInput" v-model="f.agentRecordFilePath" type="textarea" :rows="2" class="path-input" />
              <el-dropdown trigger="click" @command="(c) => insertVar('path', c)">
                <el-button size="mini" type="primary" plain>{{ $t('smcicc.system.ccs.insertVar') }}</el-button>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item v-for="x in recordPathVars" :key="x.id" :command="x.id">{{ x.text }}</el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </el-form-item>
            <el-form-item :label="$t('smcicc.system.ccs.recordFileName')" prop="agentRecordFileName" :rules="nameRules">
              <el-input ref="nameInput" v-model="f.agentRecordFileName" type="textarea" :rows="2" />
              <el-dropdown trigger="click" @command="(c) => insertVar('name', c)">
                <el-button size="mini" type="primary" plain>{{ $t('smcicc.system.ccs.insertVar') }}</el-button>
                <el-dropdown-menu slot="dropdown">
                  <el-dropdown-item v-for="x in recordNameVars" :key="x.id" :command="x.id">{{ x.text }}</el-dropdown-item>
                </el-dropdown-menu>
              </el-dropdown>
            </el-form-item>
          </el-collapse-item>

          <el-collapse-item :title="$t('smcicc.system.ccs.sectionOther')" name="other">
            <el-form-item :label="$t('smcicc.system.ccs.reloginLabel')" prop="relogin" :rules="requiredSelectRules">
              <el-select v-model="f.relogin" style="width: 100%">
                <el-option v-for="o in reloginOptions" :key="o.value" :label="$t(o.labelKey)" :value="o.value" />
              </el-select>
            </el-form-item>
            <el-form-item label="">
              <el-checkbox v-model="callInBool">{{ $t('smcicc.system.ccs.callInPopup') }}</el-checkbox>
              <el-checkbox v-model="callOutBool">{{ $t('smcicc.system.ccs.callOutPopup') }}</el-checkbox>
            </el-form-item>
            <el-form-item :label="$t('smcicc.system.ccs.ttsMyId')" prop="ttsMyId" :rules="requiredRules">
              <el-input v-model.number="f.ttsMyId" class="no-ime" />
            </el-form-item>
            <el-form-item :label="$t('smcicc.system.ccs.logStyleLabel')" prop="logStyle" :rules="requiredSelectRules">
              <el-select v-model="f.logStyle" style="width: 100%">
                <el-option v-for="o in logStyleOptions" :key="o.value" :label="$t(o.labelKey)" :value="o.value" />
              </el-select>
            </el-form-item>
          </el-collapse-item>

          <el-collapse-item :title="$t('smcicc.system.ccs.sectionPub')" name="pub">
            <el-form-item :label="$t('smcicc.system.ccs.lastDeployDate')">
              <el-input :value="formatDeploy(f.lastDeployDate)" readonly />
            </el-form-item>
            <el-form-item :label="$t('smcicc.system.ccs.lastDeployUser')">
              <el-input :value="deployUserText" readonly />
            </el-form-item>
          </el-collapse-item>
        </el-collapse>

      </el-form>
      </div>
      <div v-else class="ccs-config-empty">{{ $t('smcicc.system.ccs.emptyHint') }}</div>
    </section>

    <el-dialog :title="$t('smcicc.system.ccs.addDialogTitle')" :visible.sync="addVisible" width="420px" append-to-body @closed="resetAdd">
      <el-form ref="addFormRef" :model="addForm" :rules="addRules" label-width="120px" size="small">
        <el-form-item :label="$t('smcicc.system.ccs.focuCommField')" prop="cfgFocuCommPid">
          <el-select v-model="addForm.cfgFocuCommPid" filterable style="width: 100%">
            <el-option v-for="c in focuCommList" :key="'a' + c.pid" :label="focuCommLabel(c)" :value="Number(c.pid)" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.ccs.myId')" prop="myId">
          <el-input v-model.number="addForm.myId" class="no-ime" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.ccs.runModeLabel')" prop="runMode">
          <el-select v-model="addForm.runMode" style="width: 100%">
            <el-option v-for="o in runModeOptions" :key="'ar' + o.value" :label="$t(o.labelKey)" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.ccs.localIp')" prop="myName">
          <el-input v-model="addForm.myName" class="no-ime" :placeholder="$t('smcicc.system.ccs.localIpPlaceholder')" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.ccs.note')">
          <el-input v-model="addForm.note" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="addVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="addSaving" @click="submitAdd">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>

    <el-dialog :title="chDialogTitle" :visible.sync="chDialogVisible" width="480px" append-to-body>
      <el-form ref="chFormRef" :model="chForm" label-width="140px" size="small">
        <el-form-item :label="$t('smcicc.system.ccs.chStatusLabel')" prop="value" :rules="requiredSelectRules">
          <el-select v-model.number="chForm.value" style="width: 100%">
            <el-option v-for="o in ccs4ChValueOptions" :key="'cv' + o.value" :label="$t(o.labelKey)" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.ccs.appId')" prop="myId" :rules="requiredRules">
          <el-input v-model.number="chForm.myId" class="no-ime" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="chDialogVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="chSaving" @click="submitCh">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>

    <el-dialog :title="agDialogTitle" :visible.sync="agDialogVisible" width="520px" append-to-body>
      <el-form ref="agFormRef" :model="agForm" label-width="160px" size="small">
        <el-form-item :label="$t('smcicc.system.ccs.agStatusLabel')" prop="value" :rules="requiredSelectRules">
          <el-select v-model.number="agForm.value" filterable style="width: 100%">
            <el-option v-for="o in ccs4AgValueOptions" :key="'av' + o.value" :label="$t(o.labelKey)" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.ccs.appId')" prop="myId" :rules="requiredRules">
          <el-input v-model.number="agForm.myId" class="no-ime" />
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="agDialogVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="agSaving" @click="submitAg">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
const BASE = '/server/api/smcicc/systemadmin';
const IPV4 =
  /^(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/;

import {
  VOICE_NUM_SUFFIXES,
  assembleTabTitle,
  RUN_MODE_OPTIONS,
  CONNECT_KEEP_ALIVE_OPTIONS,
  ENABLE_OPTIONS,
  RELOGIN_OPTIONS,
  LOG_STYLE_OPTIONS,
  CCS4_CH_VALUE_OPTIONS,
  CCS4_AG_VALUE_OPTIONS,
  RECORD_PATH_VARS,
  RECORD_NAME_VARS,
  mapOptionLabels,
  mapRecordVars,
} from './ccsConstants';

function emptyForm() {
  const o = {
    pid: null,
    cfgFocuCommPid: null,
    cfgOdbcPid: null,
    myName: '',
    myId: null,
    runMode: 'Master',
    note: '',
    connectKeepAlive: 1,
    poolSize: 10,
    supportReport: 0,
    sync: 0,
    poolLength: 100,
    debugInfo: 0,
    elapsed: 5,
    tIcipAgStateTrkRecord: 0,
    tIcipAgSkillSignRecord: 0,
    tIcipAgGroupSignRecord: 0,
    tIcipAgCallRecord: 0,
    tIcipBaseCdr: 0,
    defaultWaitingMusic: '',
    defaultWaitingAgentMusic: '',
    voiceFileWorkerNumChinese: '',
    voiceFileWorkerNumEnglish: '',
    voiceFileServiceForYouChinese: '',
    voiceFileServiceForYouEnglish: '',
    relogin: 'REJECT',
    callIn: 0,
    callOut: 0,
    ttsMyId: 1,
    logStyle: 'FILE',
    channelStatusFlag: 'Disable',
    agentStatusFlag: 'Disable',
    agentRecordFilePath: '',
    agentRecordFileName: '',
    lastDeployDate: null,
    deployUser: null,
  };
  VOICE_NUM_SUFFIXES.forEach((suf) => {
    o[`voiceFileNum${suf}Chinese`] = '';
    o[`voiceFileNum${suf}English`] = '';
  });
  return o;
}

function applyEntity(data) {
  const t = emptyForm();
  Object.keys(t).forEach((k) => {
    if (data[k] !== undefined && data[k] !== null) {
      t[k] = data[k];
    }
  });
  const voicePick = [
    'defaultWaitingMusic',
    'defaultWaitingAgentMusic',
    'voiceFileWorkerNumChinese',
    'voiceFileWorkerNumEnglish',
    'voiceFileServiceForYouChinese',
    'voiceFileServiceForYouEnglish',
  ];
  voicePick.forEach((k) => {
    if (data[k] != null) t[k] = String(data[k]);
  });
  VOICE_NUM_SUFFIXES.forEach((suf) => {
    const ck = `voiceFileNum${suf}Chinese`;
    const ek = `voiceFileNum${suf}English`;
    if (data[ck] != null) t[ck] = String(data[ck]);
    if (data[ek] != null) t[ek] = String(data[ek]);
  });
  if (data.ttsMyId == null || data.ttsMyId === -1) t.ttsMyId = 1;
  ['tIcipAgStateTrkRecord', 'tIcipAgSkillSignRecord', 'tIcipAgGroupSignRecord', 'tIcipAgCallRecord', 'tIcipBaseCdr'].forEach((k) => {
    t[k] = Number(data[k]) ? 1 : 0;
  });
  t.callIn = Number(data.callIn) ? 1 : 0;
  t.callOut = Number(data.callOut) ? 1 : 0;
  if (!t.channelStatusFlag) t.channelStatusFlag = 'Disable';
  if (!t.agentStatusFlag) t.agentStatusFlag = 'Disable';
  return t;
}

function buildFlatCcs(f) {
  const o = {};
  const set = (k, v) => {
    o[`ccs.${k}`] = v;
  };
  set('pid', f.pid);
  set('cfgFocuCommPid', Number(f.cfgFocuCommPid));
  set('cfgOdbcPid', Number(f.cfgOdbcPid));
  set('myName', String(f.myName || '').trim());
  set('myId', Number(f.myId));
  set('runMode', f.runMode);
  set('note', String(f.note || ''));
  set('connectKeepAlive', Number(f.connectKeepAlive));
  set('poolSize', Number(f.poolSize));
  set('supportReport', Number(f.supportReport));
  set('sync', Number(f.sync));
  set('poolLength', Number(f.poolLength));
  set('debugInfo', Number(f.debugInfo));
  set('elapsed', Number(f.elapsed));
  set('tIcipAgStateTrkRecord', f.tIcipAgStateTrkRecord ? 1 : 0);
  set('tIcipAgSkillSignRecord', f.tIcipAgSkillSignRecord ? 1 : 0);
  set('tIcipAgGroupSignRecord', f.tIcipAgGroupSignRecord ? 1 : 0);
  set('tIcipAgCallRecord', f.tIcipAgCallRecord ? 1 : 0);
  set('tIcipBaseCdr', f.tIcipBaseCdr ? 1 : 0);
  set('defaultWaitingMusic', String(f.defaultWaitingMusic ?? ''));
  set('defaultWaitingAgentMusic', String(f.defaultWaitingAgentMusic ?? ''));
  set('voiceFileWorkerNumChinese', String(f.voiceFileWorkerNumChinese ?? ''));
  set('voiceFileWorkerNumEnglish', String(f.voiceFileWorkerNumEnglish ?? ''));
  set('voiceFileServiceForYouChinese', String(f.voiceFileServiceForYouChinese ?? ''));
  set('voiceFileServiceForYouEnglish', String(f.voiceFileServiceForYouEnglish ?? ''));
  VOICE_NUM_SUFFIXES.forEach((suf) => {
    set(`voiceFileNum${suf}Chinese`, String(f[`voiceFileNum${suf}Chinese`] ?? ''));
    set(`voiceFileNum${suf}English`, String(f[`voiceFileNum${suf}English`] ?? ''));
  });
  set('relogin', String(f.relogin || ''));
  set('callIn', Number(f.callIn) ? 1 : 0);
  set('callOut', Number(f.callOut) ? 1 : 0);
  set('ttsMyId', Number(f.ttsMyId));
  set('logStyle', String(f.logStyle || ''));
  set('channelStatusFlag', f.channelStatusFlag === 'Enable' ? 'Enable' : 'Disable');
  set('agentStatusFlag', f.agentStatusFlag === 'Enable' ? 'Enable' : 'Disable');
  set('agentRecordFilePath', String(f.agentRecordFilePath || '').replace(/\\/g, '/'));
  set('agentRecordFileName', String(f.agentRecordFileName || ''));
  return o;
}

export default {
  name: 'SMCIccCcsManager',
  data() {
    return {
      err: '',
      tabList: [],
      activePidStr: '',
      loadingDetail: false,
      saving: false,
      deploying: false,
      loaded: false,
      f: emptyForm(),
      collapseNames: ['net', 'db', 'voice', 'ch', 'ag', 'rec', 'other', 'pub'],
      focuCommList: [],
      odbcList: [],
      voiceList: [],
      odbcDbType: '',
      odbcDbCharSet: '',
      chRows: [],
      agRows: [],
      chSel: [],
      agSel: [],
      chDialogVisible: false,
      agDialogVisible: false,
      chMode: 'add',
      agMode: 'add',
      chForm: { pid: null, value: null, myId: null },
      agForm: { pid: null, value: null, myId: null },
      chSaving: false,
      agSaving: false,
      addVisible: false,
      addSaving: false,
      addForm: { cfgFocuCommPid: null, myId: null, runMode: 'Master', myName: '', note: '' },
      splitWidth: 276,
      resizing: false,
    };
  },
  computed: {

    pathRules() {
      return [
        { required: true, message: this.$t('smcicc.common.required') },
        { max: 255, message: this.$t('smcicc.system.ccs.validation.maxLength255') },
      ];
    },
    nameRules() {
      return [
        { required: true, message: this.$t('smcicc.common.required') },
        { max: 255, message: this.$t('smcicc.system.ccs.validation.maxLength255') },
      ];
    },
    addRules() {
      return {
        cfgFocuCommPid: [{ required: true, message: this.$t('smcicc.common.requiredSelect') }],
        myId: [{ required: true, message: this.$t('smcicc.common.required') }],
        runMode: [{ required: true, message: this.$t('smcicc.common.requiredSelect') }],
        myName: [{ validator: this.ruleIp, trigger: 'blur' }],
      };
    },
    activePid() {
      const n = Number(this.activePidStr);
      return Number.isFinite(n) && n > 0 ? n : 0;
    },
    activeCcsName() {
      const row = this.tabList.find((t) => String(t.pid) === this.activePidStr);
      return row ? this.tabLabel(row) : this.$t('smcicc.system.ccs.title');
    },
    moduleDisplayName() {
      return assembleTabTitle(this.f.runMode, this.f.myId, this.$t.bind(this));
    },
    runModeOptions() {
      return mapOptionLabels(RUN_MODE_OPTIONS, this.$t.bind(this));
    },
    connectKeepAliveOptions() {
      return mapOptionLabels(CONNECT_KEEP_ALIVE_OPTIONS, this.$t.bind(this));
    },
    enableOptions() {
      return mapOptionLabels(ENABLE_OPTIONS, this.$t.bind(this));
    },
    reloginOptions() {
      return mapOptionLabels(RELOGIN_OPTIONS, this.$t.bind(this));
    },
    logStyleOptions() {
      return mapOptionLabels(LOG_STYLE_OPTIONS, this.$t.bind(this));
    },
    ccs4ChValueOptions() {
      return mapOptionLabels(CCS4_CH_VALUE_OPTIONS, this.$t.bind(this));
    },
    ccs4AgValueOptions() {
      return mapOptionLabels(CCS4_AG_VALUE_OPTIONS, this.$t.bind(this));
    },
    recordPathVars() {
      return mapRecordVars(RECORD_PATH_VARS, this.$t.bind(this));
    },
    recordNameVars() {
      return mapRecordVars(RECORD_NAME_VARS, this.$t.bind(this));
    },
    requiredRules() {
      return [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }];
    },
    requiredSelectRules() {
      return [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }];
    },
    localIpRules() {
      return [
        { required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' },
        { validator: this.validateIp, trigger: 'blur' },
      ];
    },
    pathRules() {
      return [
        { required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' },
        { max: 255, message: this.$t('smcicc.system.ccs.validation.maxLength255'), trigger: 'blur' },
      ];
    },
    nameRules() {
      return [
        { required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' },
        { max: 255, message: this.$t('smcicc.system.ccs.validation.maxLength255'), trigger: 'blur' },
      ];
    },
    addRules() {
      return {
        cfgFocuCommPid: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        myId: [{ required: true, message: this.$t('smcicc.common.required'), trigger: 'blur' }],
        runMode: [{ required: true, message: this.$t('smcicc.common.requiredSelect'), trigger: 'change' }],
        myName: [{ validator: this.validateIp, trigger: 'blur' }],
      };
    },
    compatKeys() {
      return [
        { k: 'tIcipAgStateTrkRecord', label: this.$t('smcicc.system.ccs.compat.tIcipAgStateTrkRecord') },
        { k: 'tIcipAgSkillSignRecord', label: this.$t('smcicc.system.ccs.compat.tIcipAgSkillSignRecord') },
        { k: 'tIcipAgGroupSignRecord', label: this.$t('smcicc.system.ccs.compat.tIcipAgGroupSignRecord') },
        { k: 'tIcipAgCallRecord', label: this.$t('smcicc.system.ccs.compat.tIcipAgCallRecord') },
        { k: 'tIcipBaseCdr', label: this.$t('smcicc.system.ccs.compat.tIcipBaseCdr') },
      ];
    },
    deployUserText() {
      if (this.f.deployUser && this.f.deployUser.name) return this.f.deployUser.name;
      return this.$t('smcicc.system.ccs.notDeployed');
    },
    numGridRows() {
      return VOICE_NUM_SUFFIXES.map((suf) => ({
        idx: suf,
        chKey: `voiceFileNum${suf}Chinese`,
        enKey: `voiceFileNum${suf}English`,
      }));
    },
    isCcsCompatible: {
      get() {
        return (
          this.f.tIcipAgStateTrkRecord &&
          this.f.tIcipAgSkillSignRecord &&
          this.f.tIcipAgGroupSignRecord &&
          this.f.tIcipAgCallRecord &&
          this.f.tIcipBaseCdr
        );
      },
      set(v) {
        const n = v ? 1 : 0;
        this.f.tIcipAgStateTrkRecord = n;
        this.f.tIcipAgSkillSignRecord = n;
        this.f.tIcipAgGroupSignRecord = n;
        this.f.tIcipAgCallRecord = n;
        this.f.tIcipBaseCdr = n;
      },
    },
    channelStatusEnable: {
      get() {
        return this.f.channelStatusFlag === 'Enable';
      },
      set(v) {
        this.f.channelStatusFlag = v ? 'Enable' : 'Disable';
      },
    },
    agentStatusEnable: {
      get() {
        return this.f.agentStatusFlag === 'Enable';
      },
      set(v) {
        this.f.agentStatusFlag = v ? 'Enable' : 'Disable';
      },
    },
    callInBool: {
      get() {
        return !!Number(this.f.callIn);
      },
      set(v) {
        this.f.callIn = v ? 1 : 0;
      },
    },
    callOutBool: {
      get() {
        return !!Number(this.f.callOut);
      },
      set(v) {
        this.f.callOut = v ? 1 : 0;
      },
    },
    chDialogTitle() {
      return this.chMode === 'add' ? this.$t('smcicc.system.ccs.chDialogAdd') : this.$t('smcicc.system.ccs.chDialogEdit');
    },
    agDialogTitle() {
      return this.agMode === 'add' ? this.$t('smcicc.system.ccs.agDialogAdd') : this.$t('smcicc.system.ccs.agDialogEdit');
    },
  },
  watch: {
    activePidStr() {
      this.loadActiveDetail();
    },
  },
  mounted() {
    this.loadRefs();
    this.refreshTabs();
  },
  beforeDestroy() {
    this.stopResize();
  },
  methods: {
    startResize(e) {
      if (e.button !== 0) return;
      this.resizing = true;
      document.body.classList.add('ccs-is-resizing');
      window.addEventListener('mousemove', this.resizeSplit);
      window.addEventListener('mouseup', this.stopResize);
      e.preventDefault();
    },
    resizeSplit(e) {
      if (!this.resizing) return;
      const root = this.$el;
      if (!root) return;
      const rect = root.getBoundingClientRect();
      const maxWidth = Math.max(320, rect.width - 520);
      this.splitWidth = Math.round(Math.min(maxWidth, Math.max(200, e.clientX - rect.left - 16)));
    },
    stopResize() {
      if (!this.resizing && !document.body.classList.contains('ccs-is-resizing')) return;
      this.resizing = false;
      document.body.classList.remove('ccs-is-resizing');
      window.removeEventListener('mousemove', this.resizeSplit);
      window.removeEventListener('mouseup', this.stopResize);
    },
    validateIp(rule, value, cb) {
      const v = String(value ?? '').trim();
      if (!v) {
        cb(new Error(this.$t('smcicc.system.ccs.validation.localIpRequired')));
        return;
      }
      if (!IPV4.test(v)) {
        cb(new Error(this.$t('smcicc.system.ccs.validation.ipInvalid')));
        return;
      }
      cb();
    },
    tabLabel(t) {
      return assembleTabTitle(t.runMode, t.myId, this.$t.bind(this));
    },
    selectCcs(t) {
      if (!t || t.pid == null) return;
      this.activePidStr = String(t.pid);
    },
    triggerImport() {
      if (this.$refs.importInput) this.$refs.importInput.click();
    },
    importCcs(e) {
      const input = e && e.target;
      const file = input && input.files && input.files[0];
      if (!file) return;
      this.$message.info(this.$t('smcicc.system.ccs.messages.importUnsupported'));
      input.value = '';
    },
    exportCcs() {
      if (!this.tabList.length) return;
      const rows = [['PID', this.$t('smcicc.system.ccs.title')], ...this.tabList.map((t) => [t.pid, this.tabLabel(t)])];
      const csv = rows
        .map((row) => row.map((v) => `"${String(v == null ? '' : v).replace(/"/g, '""')}"`).join(','))
        .join('\r\n');
      const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'ccs-services.csv';
      link.click();
      URL.revokeObjectURL(url);
    },
    focuCommLabel(c) {
      return `${c.ipAddress}:${c.port}`;
    },
    odbcLabel(o) {
      return o.odbcName || this.$t('smcicc.system.ccs.messages.pidLabel', { pid: o.pid });
    },
    chValueText(v) {
      const x = this.ccs4ChValueOptions.find((o) => o.value === Number(v));
      return x ? this.$t(x.labelKey) : String(v);
    },
    agValueText(v) {
      const x = this.ccs4AgValueOptions.find((o) => o.value === Number(v));
      return x ? this.$t(x.labelKey) : String(v);
    },
    formatDeploy(v) {
      if (v == null || v === '') return this.$t('smcicc.system.ccs.notDeployed');
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
    onOdbcChange() {
      const pid = this.f.cfgOdbcPid;
      const row = this.odbcList.find((x) => Number(x.pid) === Number(pid));
      if (row) {
        this.odbcDbType = row.dbType || '';
        this.odbcDbCharSet = row.dbCharSet || '';
      } else {
        this.odbcDbType = '';
        this.odbcDbCharSet = '';
      }
    },
    insertVar(kind, id) {
      const token = `{${id}}`;
      if (kind === 'path') {
        const el = this.$refs.pathInput;
        if (!el) return;
        const ta = el.$el.querySelector('textarea') || el.$el;
        const v = this.f.agentRecordFilePath || '';
        const start = ta.selectionStart ?? v.length;
        const end = ta.selectionEnd ?? v.length;
        const next = v.slice(0, start) + token + v.slice(end);
        this.f.agentRecordFilePath = next;
        this.$nextTick(() => {
          ta.focus();
          const pos = start + token.length;
          ta.setSelectionRange(pos, pos);
        });
      } else {
        const el = this.$refs.nameInput;
        if (!el) return;
        const ta = el.$el.querySelector('textarea') || el.$el;
        const v = this.f.agentRecordFileName || '';
        const start = ta.selectionStart ?? v.length;
        const end = ta.selectionEnd ?? v.length;
        const next = v.slice(0, start) + token + v.slice(end);
        this.f.agentRecordFileName = next;
        this.$nextTick(() => {
          ta.focus();
          const pos = start + token.length;
          ta.setSelectionRange(pos, pos);
        });
      }
    },
    loadRefs() {
      this.$ajax.postJSON(`${BASE}/loadFocuCommList`, {}).then((d) => {
        this.focuCommList = Array.isArray(d) ? d : [];
      });
      this.$ajax.postJSON(`${BASE}/loadCcsOdbcList`, {}).then((d) => {
        this.odbcList = Array.isArray(d) ? d : [];
      });
      this.$ajax.postJSON(`${BASE}/loadSysVoiceList`, {}).then((d) => {
        this.voiceList = Array.isArray(d) ? d : [];
      });
    },
    refreshTabs() {
      this.err = '';
      return this.$ajax
        .postJSON(`${BASE}/loadCcsRunModeList`, {})
        .then((data) => {
          this.tabList = Array.isArray(data) ? data : [];
          if (this.tabList.length) {
            const exists = this.tabList.some((t) => String(t.pid) === this.activePidStr);
            if (!exists) {
              this.activePidStr = String(this.tabList[0].pid);
            }
          } else {
            this.activePidStr = '';
            this.loaded = false;
          }
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.ccs.messages.loadListFailed');
          this.tabList = [];
        });
    },
    loadActiveDetail() {
      const pid = this.activePid;
      if (!pid) {
        this.loaded = false;
        return;
      }
      this.loadingDetail = true;
      this.err = '';
      Promise.all([
        this.$ajax.postJSON(`${BASE}/loadCcs`, { pid }),
        this.$ajax.postJSON(`${BASE}/loadCcs4ChList`, { ccsPid: pid }),
        this.$ajax.postJSON(`${BASE}/loadCcs4AgList`, { ccsPid: pid }),
      ])
        .then(([ccs, ch, ag]) => {
          if (!ccs) {
            this.$message.error(this.$t('smcicc.system.ccs.messages.notFound'));
            this.loaded = false;
            return;
          }
          this.f = applyEntity(ccs);
          this.onOdbcChange();
          this.chRows = Array.isArray(ch.Rows) ? ch.Rows : [];
          this.agRows = Array.isArray(ag.Rows) ? ag.Rows : [];
          this.loaded = true;
          this.$nextTick(() => {
            if (this.$refs.mainForm) this.$refs.mainForm.clearValidate();
          });
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.ccs.messages.loadDetailFailed');
          this.loaded = false;
        })
        .finally(() => {
          this.loadingDetail = false;
        });
    },
    reloadCurrent() {
      this.loadActiveDetail();
    },
    save() {
      const mainForm = this.$refs.mainForm;
      if (!mainForm) return;
      mainForm.validate((ok) => {
        if (!ok) return;
        const payload = buildFlatCcs(this.f);
        this.saving = true;
        this.$ajax
          .postJSON(`${BASE}/modifyCcs`, payload)
          .then((res) => {
            if (res && res.result === -2) {
              this.$message.error(this.$t('smcicc.system.ccs.validation.duplicateMyId'));
              return;
            }
            if (res && res.result === 1 && res.ccs) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.f = applyEntity(res.ccs);
              this.onOdbcChange();
              this.refreshTabs();
              this.$nextTick(() => {
                if (this.$refs.mainForm) this.$refs.mainForm.clearValidate();
              });
              return;
            }
            this.$message.error(this.$t('smcicc.common.saveFailed'));
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.saveFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
    openAddDialog() {
      this.addForm = { cfgFocuCommPid: null, myId: null, runMode: 'Master', myName: '', note: '' };
      this.addVisible = true;
      this.$nextTick(() => this.$refs.addFormRef && this.$refs.addFormRef.clearValidate());
    },
    resetAdd() {},
    submitAdd() {
      this.$refs.addFormRef.validate((ok) => {
        if (!ok) return;
        const p = {
          'ccs.cfgFocuCommPid': Number(this.addForm.cfgFocuCommPid),
          'ccs.myId': Number(this.addForm.myId),
          'ccs.runMode': this.addForm.runMode,
          'ccs.myName': String(this.addForm.myName).trim(),
          'ccs.note': String(this.addForm.note || ''),
        };
        this.addSaving = true;
        this.$ajax
          .postJSON(`${BASE}/addCcs`, p)
          .then((id) => {
            if (id === -2) {
              this.$message.error(this.$t('smcicc.system.ccs.validation.duplicateMyId'));
              return;
            }
            if (id > 0) {
              this.$message.success(this.$t('smcicc.common.addSuccess'));
              this.addVisible = false;
              this.refreshTabs().then(() => {
                this.activePidStr = String(id);
              });
              return;
            }
            this.$message.error(this.$t('smcicc.common.saveFailed'));
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.saveFailed')))
          .finally(() => {
            this.addSaving = false;
          });
      });
    },
    doCopy() {
      const pid = this.activePid;
      if (!pid) return;
      this.$confirm(this.$t('smcicc.system.ccs.messages.copyConfirm'), this.$t('smcicc.common.copy'), { type: 'info' })
        .then(() => this.$ajax.postJSON(`${BASE}/copyCcs`, { pid }))
        .then((row) => {
          if (row && row.pid) {
            this.$message.success(this.$t('smcicc.common.copySuccess'));
            this.refreshTabs().then(() => {
              this.activePidStr = String(row.pid);
            });
          } else {
            this.$message.error(this.$t('smcicc.common.copyFailed'));
          }
        })
        .catch(() => {});
    },
    doDeploy() {
      const pid = this.activePid;
      if (!pid) return;
      this.deploying = true;
      this.$ajax
        .postJSON(`${BASE}/deployCcsXML`, { pid })
        .then((res) => {
          if (res && res.result) {
            this.$message.success(res.msg || this.$t('smcicc.common.deploySuccess'));
            this.loadActiveDetail();
          } else {
            this.$message.error((res && res.msg) || this.$t('smcicc.common.deployFailed'));
          }
        })
        .catch(() => this.$message.error(this.$t('smcicc.common.deployFailed')))
        .finally(() => {
          this.deploying = false;
        });
    },
    doDelete() {
      const pid = this.activePid;
      if (!pid) return;
      this.$confirm(this.$t('smcicc.system.ccs.messages.deleteConfirm'), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteCcs`, { pid }))
        .then((code) => {
          const c = code != null ? String(code) : '';
          if (c === '0') {
            this.$message.success(this.$t('smcicc.common.deleted'));
            this.loaded = false;
            this.refreshTabs().then(() => {
              if (this.tabList.length) this.loadActiveDetail();
            });
          } else if (c && c !== '-1') {
            this.$message.warning(this.$t('smcicc.system.ccs.validation.cannotDelete', { code }));
          } else {
            this.$message.error(this.$t('smcicc.common.deleteFailed'));
          }
        })
        .catch(() => {});
    },
    openChDialog(mode) {
      const pid = this.activePid;
      if (!pid) return;
      this.chMode = mode;
      if (mode === 'add') {
        this.chForm = { pid: null, value: 1, myId: null };
      } else {
        const r = this.chSel.length === 1 ? this.chSel[0] : null;
        if (!r) {
          this.$message.warning(this.$t('smcicc.system.ccs.validation.selectOneRecord'));
          return;
        }
        this.chForm = { pid: r.pid, value: Number(r.value), myId: Number(r.myId) };
      }
      this.chDialogVisible = true;
      this.$nextTick(() => this.$refs.chFormRef && this.$refs.chFormRef.clearValidate());
    },
    submitCh() {
      this.$refs.chFormRef.validate((ok) => {
        if (!ok) return;
        const pid = this.activePid;
        const url = this.chMode === 'add' ? `${BASE}/addCcs4Ch` : `${BASE}/modifyCcs4Ch`;
        const payload =
          this.chMode === 'add'
            ? {
                'ccs4Ch.cfgCcsPid': pid,
                'ccs4Ch.value': Number(this.chForm.value),
                'ccs4Ch.myId': Number(this.chForm.myId),
              }
            : {
                'ccs4Ch.pid': this.chForm.pid,
                'ccs4Ch.cfgCcsPid': pid,
                'ccs4Ch.value': Number(this.chForm.value),
                'ccs4Ch.myId': Number(this.chForm.myId),
              };
        this.chSaving = true;
        this.$ajax
          .postJSON(url, payload)
          .then((code) => {
            if (code === -2) {
              this.$message.error(this.$t('smcicc.system.ccs.validation.duplicateRecord'));
              return Promise.reject(new Error('dup'));
            }
            if (code === 1) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.chDialogVisible = false;
              return this.$ajax.postJSON(`${BASE}/loadCcs4ChList`, { ccsPid: pid });
            }
            this.$message.error(this.$t('smcicc.common.saveFailed'));
            return Promise.reject(new Error('save'));
          })
          .then((data) => {
            if (data && data.Rows) this.chRows = data.Rows;
          })
          .catch((e) => {
            if (e && (e.message === 'dup' || e.message === 'save')) return;
            this.$message.error(this.$t('smcicc.common.saveFailed'));
          })
          .finally(() => {
            this.chSaving = false;
          });
      });
    },
    deleteChRows() {
      const pid = this.activePid;
      if (!this.chSel.length) return;
      const idList = this.chSel.map((r) => r.pid);
      this.$confirm(this.$t('smcicc.system.ccs.messages.deleteChConfirm'), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteCcs4Chs`, { idList }))
        .then((ok) => {
          if (ok) {
            this.$message.success(this.$t('smcicc.common.deleted'));
            return this.$ajax.postJSON(`${BASE}/loadCcs4ChList`, { ccsPid: pid });
          }
          this.$message.error(this.$t('smcicc.common.deleteFailed'));
        })
        .then((data) => {
          if (data && data.Rows) this.chRows = data.Rows;
        })
        .catch(() => {});
    },
    openAgDialog(mode) {
      const pid = this.activePid;
      if (!pid) return;
      this.agMode = mode;
      if (mode === 'add') {
        this.agForm = { pid: null, value: 1, myId: null };
      } else {
        const r = this.agSel.length === 1 ? this.agSel[0] : null;
        if (!r) {
          this.$message.warning(this.$t('smcicc.system.ccs.validation.selectOneRecord'));
          return;
        }
        this.agForm = { pid: r.pid, value: Number(r.value), myId: Number(r.myId) };
      }
      this.agDialogVisible = true;
      this.$nextTick(() => this.$refs.agFormRef && this.$refs.agFormRef.clearValidate());
    },
    submitAg() {
      this.$refs.agFormRef.validate((ok) => {
        if (!ok) return;
        const pid = this.activePid;
        const url = this.agMode === 'add' ? `${BASE}/addCcs4Ag` : `${BASE}/modifyCcs4Ag`;
        const payload =
          this.agMode === 'add'
            ? {
                'ccs4Ag.cfgCcsPid': pid,
                'ccs4Ag.value': Number(this.agForm.value),
                'ccs4Ag.myId': Number(this.agForm.myId),
              }
            : {
                'ccs4Ag.pid': this.agForm.pid,
                'ccs4Ag.cfgCcsPid': pid,
                'ccs4Ag.value': Number(this.agForm.value),
                'ccs4Ag.myId': Number(this.agForm.myId),
              };
        this.agSaving = true;
        this.$ajax
          .postJSON(url, payload)
          .then((code) => {
            if (code === -2) {
              this.$message.error(this.$t('smcicc.system.ccs.validation.duplicateRecord'));
              return Promise.reject(new Error('dup'));
            }
            if (code === 1) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.agDialogVisible = false;
              return this.$ajax.postJSON(`${BASE}/loadCcs4AgList`, { ccsPid: pid });
            }
            this.$message.error(this.$t('smcicc.common.saveFailed'));
            return Promise.reject(new Error('save'));
          })
          .then((data) => {
            if (data && data.Rows) this.agRows = data.Rows;
          })
          .catch((e) => {
            if (e && (e.message === 'dup' || e.message === 'save')) return;
            this.$message.error(this.$t('smcicc.common.saveFailed'));
          })
          .finally(() => {
            this.agSaving = false;
          });
      });
    },
    deleteAgRows() {
      const pid = this.activePid;
      if (!this.agSel.length) return;
      const idList = this.agSel.map((r) => r.pid);
      this.$confirm(this.$t('smcicc.system.ccs.messages.deleteAgConfirm'), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteCcs4Ags`, { idList }))
        .then((ok) => {
          if (ok) {
            this.$message.success(this.$t('smcicc.common.deleted'));
            return this.$ajax.postJSON(`${BASE}/loadCcs4AgList`, { ccsPid: pid });
          }
          this.$message.error(this.$t('smcicc.common.deleteFailed'));
        })
        .then((data) => {
          if (data && data.Rows) this.agRows = data.Rows;
        })
        .catch(() => {});
    },
  },
};
</script>

<style scoped>
.ccs-manager-page {
  display: grid;
  flex: 1 1 auto !important;
  flex-direction: initial !important;
  grid-template-columns: 276px 8px minmax(0, 1fr);
  gap: 16px;
  min-height: 0;
  padding: 16px !important;
  width: 100% !important;
  overflow: hidden;
  background: var(--cfg-bg, #f4f7fb);
}
.ccs-list-panel,
.ccs-config-panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--cfg-border, #e4e7ed);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(34, 35, 41, 0.06);
}
.ccs-list-panel {
  display: flex;
  flex-direction: column;
}
.ccs-list-toolbar {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  gap: 4px;
  padding: 12px;
  border-bottom: 1px solid var(--cfg-border, #e4e7ed);
  background: var(--cfg-surface-raised, #f7f9fc);
}
.ccs-list-title {
  min-width: 0;
  overflow: hidden;
  color: var(--cfg-heading, #222329);
  font-size: 14px;
  font-weight: 650;
  line-height: 32px;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ccs-list-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}
.ccs-list-toolbar .el-button {
  width: 30px;
  min-width: 30px;
  height: 30px;
  margin: 0;
  padding: 7px 0;
}
.ccs-import-input {
  display: none;
}
.ccs-list-alert {
  flex: 0 0 auto;
  margin: 10px;
}
.ccs-list {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  padding: 6px 0;
}
.ccs-list-item {
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
.ccs-list-item:hover {
  background: #f3f6fb;
}
.ccs-list-item.active {
  border-left-color: var(--cfg-accent, #457ff5);
  color: var(--cfg-accent, #457ff5);
  background: #eaf2ff;
}
.ccs-list-item i {
  flex: 0 0 auto;
  font-size: 16px;
}
.ccs-list-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ccs-splitter {
  position: relative;
  min-height: 0;
  cursor: col-resize;
}
.ccs-splitter::before {
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
.ccs-splitter:hover::before,
.ccs-is-resizing .ccs-splitter::before {
  left: 2px;
  width: 4px;
  background: var(--cfg-accent, #457ff5);
}
.ccs-splitter-grip {
  position: absolute;
  top: 50%;
  left: 0;
  width: 8px;
  height: 44px;
  transform: translateY(-50%);
}
.ccs-config-panel {
  display: flex;
  flex-direction: column;
}
.ccs-config-header {
  display: flex;
  flex: 0 0 auto;
  min-height: 56px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 10px 18px;
  border-bottom: 1px solid var(--cfg-border, #e4e7ed);
  background: var(--cfg-surface-raised, #f7f9fc);
}
.ccs-config-header h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--cfg-heading, #222329);
  font-size: 18px;
  font-weight: 650;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.ccs-config-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
}
.ccs-config-actions .el-button + .el-button {
  margin-left: 0;
}
.ccs-config-actions .el-button {
  width: 34px;
  min-width: 34px;
  height: 34px;
  padding: 8px 0;
}
.ccs-config-body {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
  padding: 16px 18px;
}
.ccs-config-empty {
  display: flex;
  flex: 1 1 auto;
  align-items: center;
  justify-content: center;
  color: var(--cfg-muted, #909399);
  font-size: 13px;
}
.empty-hint {
  margin: 12px;
  padding: 24px 12px;
  color: #909399;
  background: #f5f7fa;
  border-radius: 4px;
  text-align: center;
}
.ccs-main-form {
  padding-bottom: 24px;
}
.sub-title {
  font-weight: 600;
  margin: 12px 0 8px;
  padding-bottom: 6px;
  border-bottom: 1px solid #ebeef5;
}
.compat-block {
  margin-top: 8px;
  padding: 10px;
  background: #fafafa;
  border-radius: 4px;
}
.compat-checks {
  margin-top: 8px;
  display: flex;
  flex-wrap: wrap;
  gap: 8px 16px;
}
.compat-checks .el-checkbox {
  margin-right: 0;
}
.hint-inline {
  margin-left: 8px;
  color: #909399;
  font-size: 12px;
}
.num-grid {
  width: 100%;
  max-width: 720px;
}
.sub-table-wrap {
  margin-top: 8px;
}
.sub-actions {
  margin-bottom: 8px;
}
.path-input {
  font-family: monospace;
}
@media (max-width: 900px) {
  .ccs-manager-page {
    grid-template-columns: 220px 8px minmax(0, 1fr);
    gap: 10px;
    padding: 10px;
    width: 100% !important;
  }
  .ccs-config-header {
    padding: 10px 12px;
  }
  .ccs-config-body {
    padding: 12px;
  }
}
</style>
