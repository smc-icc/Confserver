<template>
  <div class="page_server_manage">
    <!-- 服务列表 -->
    <div class="table_head" style="height: 50px">
      <h4 style="float: left">
        {{ this.$t("serverList.title.serverList") }}
        <i
          class="el-icon-refresh-right"
          style="cursor: pointer"
          @click="getServerList()"
        ></i>
      </h4>
      <span class="btn_group" style="float: right" v-if="!isApplication">
        <el-button type="primary" size="small" @click="manageK8S">{{
          $t("operate.k8s")
        }}</el-button>
        &nbsp;
        <el-button
          type="primary"
          size="small"
          @click="configServer"
          :disabled="isNormal"
          >{{ $t("operate.server") }}</el-button
        >
        &nbsp;
        <el-button
          type="primary"
          size="small"
          @click="manageServant"
          :disabled="isNormal"
          >{{ $t("operate.servant") }}</el-button
        >
        &nbsp;
        <el-button
          type="primary"
          size="small"
          @click="viewTemplate"
          :disabled="isNormal"
          >{{ $t("operate.viewTemplate") }}</el-button
        >
        &nbsp;
        <el-button
          type="primary"
          size="small"
          @click="privateTemplateManage"
          :disabled="isNormal"
          >{{ $t("operate.privateTemplateManage") }}</el-button
        >
        &nbsp;
        <el-button
          type="primary"
          size="small"
          @click="startServer"
          :disabled="isNormal"
          >{{ $t("operate.startServer") }}</el-button
        >
        &nbsp;
        <el-button
          type="primary"
          size="small"
          @click="restartServer"
          :disabled="isNormal"
          >{{ $t("operate.restartServer") }}</el-button
        >
        &nbsp;
        <el-button
          type="primary"
          size="small"
          @click="stopServer"
          :disabled="isNormal"
          >{{ $t("operate.stopServer") }}</el-button
        >
        &nbsp;
        <el-button
          type="primary"
          size="small"
          @click="showMoreCmd"
          :disabled="isNormal"
          >{{ $t("operate.more") }}</el-button
        >
      </span>
    </div>

    <div v-if="serverList" ref="serverListLoading">
      <el-table :data="serverList" :empty-text="$t('common.nodata')">
        <el-table-column>
          <template slot="head" slot-scope="props">
            <el-checkbox v-model="isCheckedAll"></el-checkbox>
          </template>
          <template slot-scope="scope">
            <el-checkbox
              v-model="scope.row.isChecked"
              @change="checkChange(scope.row)"
            ></el-checkbox>
          </template>
        </el-table-column>
        <el-table-column :label="$t('deployService.form.subtype')">
          <template slot-scope="scope">
            <el-tooltip
              class="item"
              effect="dark"
              v-if="scope.row.SubType == 'normal'"
              content="Normal Server"
              placement="top"
            >
              <i class="el-icon-menu"></i>
            </el-tooltip>
            <el-tooltip
              class="item"
              effect="dark"
              v-if="scope.row.SubType == 'tars'"
              content="Tars Server(manage by tarsnode)"
              placement="top"
            >
              <i class="el-icon-monitor"></i>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('deployService.form.app')"
          prop="ServerApp"
        ></el-table-column>
        <el-table-column
          :label="$t('deployService.form.serviceName')"
          prop="ServerName"
        >
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="readPodLog(scope.row.PodName)"
              >{{ scope.row.ServerName }}
              <el-tooltip
                class="item"
                effect="dark"
                v-if="scope.row.Source['tars.io/CloudInstall']"
                :content="
                  scope.row.Source['tars.io/CloudInstall'].group +
                  '/' +
                  scope.row.Source['tars.io/CloudInstall'].name +
                  ':' +
                  scope.row.Source['tars.io/CloudInstall'].version
                "
                placement="top-start"
              >
                <i
                  class="el-icon-cloudy"
                  style="cursor: pointer"
                  @click="goMarket(scope.row)"
                ></i>
              </el-tooltip>
            </el-button>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.th.podName')"
          prop="PodName"
        >
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="gotoLog(scope.row)">{{
              scope.row.PodName
            }}</el-button>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.th.podIP')"
          prop="PodIp"
        ></el-table-column>
        <el-table-column title="pid">
          <template slot-scope="scope" v-if="scope.row.SubType == 'tars'">
            {{ scope.row.Pid }}
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.th.ip')"
          prop="NodeIp"
        ></el-table-column>
        <el-table-column
          :label="$t('serverList.table.th.version')"
          prop="ServiceVersion"
        ></el-table-column>
        <el-table-column :label="$t('serverList.table.th.configStatus')">
          <template slot-scope="scope">
            <span :style="getState(scope.row.SettingState)">{{
              scope.row.SettingState
            }}</span>
          </template>
        </el-table-column>
        <el-table-column :label="$t('serverList.table.th.currStatus')">
          <template slot-scope="scope">
            <span :style="getState(scope.row.PresentState)">{{
              scope.row.PresentState
            }}</span>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.th.currMessage')"
          width="120px"
        >
          <template slot-scope="scope">
            <el-tooltip
              class="tooltip"
              placement="top"
              :content="scope.row.PresentMessage || ''"
            >
              <el-button size="mini" type="text"
                ><span class="over" @click="describePod(scope.row)">{{
                  scope.row.PresentMessage
                }}</span>
              </el-button>
            </el-tooltip>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.th.createTime')"
          prop="CreateTime"
        ></el-table-column>
        <el-table-column :label="$t('operate.operates')" width="160">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="deletePod(scope.row)"
              >{{ $t("operate.deletePod") }}
            </el-button>
            <el-button size="mini" type="text" @click="viewEvent(scope.row)"
              >{{ $t("operate.viewEvent") }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </div>

    <!-- 服务实时状态 -->
    <div class="table_head">
      <h4 v-if="serverNotifyList && showOthers">
        {{ this.$t("serverList.title.serverStatus") }}
        <i class="el-icon-refresh-right" @click="getServerNotifyList()"
          >&#xec08;</i
        >
      </h4>
    </div>
    <el-table
      v-if="serverNotifyList && showOthers"
      :data="serverNotifyList"
      stripe
      :empty-text="$t('common.nodata')"
      ref="serverNotifyListLoading"
    >
      <el-table-column :label="$t('common.time')" width="160px">
        <template slot-scope="scope">
          <span style="white-space: nowrap">{{
            scope.row._source.timeStr
          }}</span>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.serviceID')"
        prop="AppServer"
      >
        <template slot-scope="scope">
          <span style="white-space: nowrap">{{
            scope.row._source.app + "." + scope.row._source.server
          }}</span>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.podName')"
        prop="PodName"
      >
        <template slot-scope="scope">
          <span style="white-space: nowrap">{{
            scope.row._source.podName
          }}</span>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.source')"
        prop="NotifySource"
      >
        <template slot-scope="scope">
          <span style="white-space: nowrap">{{
            scope.row._source.source
          }}</span>
        </template>
      </el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.result')"
        prop="NotifyMessage"
      >
        <template slot-scope="scope">
          <span :style="statusStyle(scope.row._source.message)">{{
            scope.row._source.message
          }}</span>
        </template>
      </el-table-column>
    </el-table>

    <div style="margin-bottom: 20px">
      <el-pagination
        align="right"
        style="float: right"
        :current-page="notifyPagination.page"
        @change="notifyGotoPage"
        :total="notifyPagination.total"
      >
      </el-pagination>
    </div>

    <!-- 编辑服务弹窗 -->
    <el-dialog
      :visible.sync="configModal.show"
      :label="$t('serverList.dlg.title.editService')"
      width="800px"
      :footShow="!!configModal.model"
      @on-confirm="saveConfig"
      @close="closeConfigModal"
      @on-cancel="closeConfigModal"
    >
      <el-form
        v-if="!!configModal.model"
        ref="configForm"
        itemWidth="360px"
        :columns="2"
        class="two-columns"
      >
        <el-form-item :label="$t('common.template')" required>
          <el-select
            size="small"
            v-model="configModal.model.ServerTemplate"
            v-if="
              configModal.model.templates && configModal.model.templates.length
            "
            required
          >
            <el-option
              v-for="t in configModal.model.templates"
              :key="t.TemplateName"
              :value="t.TemplateName"
              >{{ t.TemplateName }}
            </el-option>
          </el-select>
          <span v-else>{{ configModal.model.ServerTemplate }}</span>
        </el-form-item>
        <el-form-item :label="$t('serverList.dlg.asyncThread')" required>
          <el-input
            size="small"
            v-model="configModal.model.AsyncThread"
            :placeholder="$t('serverList.dlg.placeholder.thread')"
            required
            :pattern="'^[1-9][0-9]*$'"
            :pattern-tip="$t('serverList.dlg.placeholder.thread')"
          ></el-input>
        </el-form-item>
        <el-form-item
          :label="$t('serverList.dlg.privateTemplate')"
          labelWidth="150px"
          itemWidth="724px"
        >
          <el-input
            size="large"
            type="textarea"
            :rows="10"
            v-model="configModal.model.ServerProfile"
          ></el-input>
        </el-form-item>
      </el-form>
      <div v-else class="loading-placeholder" ref="configFormLoading"></div>
    </el-dialog>

    <!-- Servant管理弹窗 -->
    <el-dialog
      :visible.sync="servantModal.show"
      :label="$t('serverList.table.servant.title')"
      width="1200px"
      :footShow="false"
      @close="closeServantModal"
    >
      <el-button
        size="small"
        type="primary"
        class="tbm16"
        @click="configServant()"
        >{{ $t("operate.add") }}
        Servant
      </el-button>
      <el-table
        v-if="servantModal.model"
        :data="servantModal.model"
        :empty-text="$t('common.nodata')"
      >
        <el-table-column title="OBJ" prop="Name"></el-table-column>
        <el-table-column
          :label="$t('deployService.table.th.port')"
          prop="Port"
        ></el-table-column>
        <el-table-column
          :label="$t('deployService.table.th.protocol')"
          width="150px"
        >
          <template slot-scope="props">
            <el-radio
              v-model="props.row.IsTars"
              :label="true"
              v-if="props.row.IsTars"
              >TARS</el-radio
            >
            <el-radio v-model="props.row.IsTars" :label="false" v-else
              >NOT TARS</el-radio
            >
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('deployService.form.portType')"
          width="150px"
        >
          <template slot-scope="props">
            <el-radio
              v-model="props.row.IsTcp"
              :label="true"
              v-if="props.row.IsTcp"
              >TCP</el-radio
            >
            <el-radio v-model="props.row.IsTcp" :label="false" v-else
              >UDP</el-radio
            >
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('deployService.table.th.threads')"
          width="80px"
        >
          <template slot-scope="props">{{ props.row.Threads }}</template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.servant.connections')"
          width="140px"
        >
          <template slot-scope="props">{{ props.row.Connections }}</template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.servant.capacity')"
          width="140px"
        >
          <template slot-scope="props">{{ props.row.Capacity }}</template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.servant.timeout')"
          width="140px"
        >
          <template slot-scope="props">{{ props.row.Timeout }}</template>
        </el-table-column>
        <el-table-column :label="$t('operate.operates')" width="90px">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="configServant(scope.row.AdapterId)"
              >{{ $t("operate.update") }}
            </el-button>
            <el-button size="mini" type="text"
              class="danger"
              @click="deleteServant(scope.row.AdapterId)"
            >
              {{ $t("operate.delete") }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
      <div v-else class="loading-placeholder" ref="servantModalLoading"></div>
    </el-dialog>

    <!-- Servant新增弹窗 -->
    <el-dialog
      :visible.sync="servantAddModal.show"
      :label="
        servantAddModal.isNew
          ? `${$t('operate.title.add')} Servant`
          : `${$t('operate.title.update')} Servant`
      "
      width="1200px"
      :footShow="!!servantAddModal.model"
      @on-confirm="saveServantAdd"
      @close="closeServantAddModal"
      @on-cancel="closeServantAddModal"
    >
      <el-form
        ref="servantAddForm"
        v-if="servantAddModal.model && servantAddModal.model.ServerServant"
      >
        <el-table :data="servantAddModal.model.ServerServant">
          <el-table-column title="OBJ" width="150px">
            <template slot="head" slot-scope="props">
              <span class="required">{{ props.column.title }}</span>
            </template>
            <template slot-scope="props">
              <el-input
                size="small"
                v-model="props.row.Name"
                :placeholder="$t('deployService.form.placeholder')"
                required
                :required-tip="$t('deployService.form.objTips')"
                pattern="^[a-zA-Z0-9]+$"
                :pattern-tip="$t('deployService.form.placeholder')"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('deployService.table.th.port')"
            width="100px"
          >
            <template slot="head" slot-scope="props">
              <span class="required">{{ props.column.title }}</span>
            </template>
            <template slot-scope="props">
              <el-input
                size="small"
                type="number"
                :min="1"
                :max="30000"
                v-model="props.row.Port"
                placeholder="1-30000"
                required
                :required-tip="$t('deployService.table.tips.empty')"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('deployService.form.portType')"
            width="150px"
          >
            <template slot="head" slot-scope="props">
              <span class="required">{{ props.column.title }}</span>
            </template>
            <template slot-scope="props">
              <el-radio v-model="props.row.IsTcp" :label="true">TCP</el-radio>
              <el-radio v-model="props.row.IsTcp" :label="false"
                >UDP</el-radio
              >
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('deployService.table.th.protocol')"
            width="180px"
          >
            <template slot="head" slot-scope="props">
              <span class="required">{{ props.column.title }}</span>
            </template>
            <template slot-scope="props">
              <el-radio v-model="props.row.IsTars" :label="true"
                >TARS</el-radio
              >
              <el-radio v-model="props.row.IsTars" :label="false"
                >NOT TARS</el-radio
              >
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('deployService.table.th.threads')"
            width="80px"
          >
            <template slot="head" slot-scope="props">
              <span class="required">{{ props.column.title }}</span>
            </template>
            <template slot-scope="props">
              <el-input
                size="small"
                type="number"
                :min="0"
                v-model="props.row.Threads"
                required
                :required-tip="$t('deployService.table.tips.empty')"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('serverList.table.servant.connections')"
            width="140px"
          >
            <template slot="head" slot-scope="props">
              <span class="required">{{ props.column.title }}</span>
            </template>
            <template slot-scope="props">
              <el-input
                size="small"
                type="number"
                :min="0"
                v-model="props.row.Connections"
                required
                :required-tip="$t('deployService.table.tips.empty')"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('serverList.table.servant.capacity')"
            width="140px"
          >
            <template slot="head" slot-scope="props">
              <span class="required">{{ props.column.title }}</span>
            </template>
            <template slot-scope="props">
              <el-input
                size="small"
                type="number"
                :min="0"
                v-model="props.row.Capacity"
                required
                :required-tip="$t('deployService.table.tips.empty')"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column
            :label="$t('serverList.table.servant.timeout')"
            width="140px"
          >
            <template slot-scope="props">
              <el-input
                size="small"
                type="number"
                :min="0"
                v-model="props.row.Timeout"
              ></el-input>
            </template>
          </el-table-column>
          <el-table-column :label="$t('operate.operates')" width="60px">
            <template slot-scope="props">
              <el-button size="mini" type="text"
                @click="addAdapter(props.row)"
                v-if="
                  props.$index ===
                  servantAddModal.model.ServerServant.length - 1
                "
              >
                {{ $t("operate.add") }}
              </el-button>
              <el-button size="mini" type="text"
                v-else
                class="danger"
                @click="
                  servantAddModal.model.ServerServant.splice(props.$index, 1)
                "
                >{{ $t("operate.delete") }}
              </el-button>
            </template>
          </el-table-column>
        </el-table>
      </el-form>
    </el-dialog>

    <!-- Servant编辑弹窗 -->
    <el-dialog
      :visible.sync="servantDetailModal.show"
      :label="
        servantDetailModal.isNew
          ? `${$t('operate.title.add')} Servant`
          : `${$t('operate.title.update')} Servant`
      "
      width="800px"
      :footShow="!!servantDetailModal.model"
      @on-confirm="saveServantDetail"
      @close="closeServantDetailModal"
      @on-cancel="closeServantDetailModal"
    >
      <el-form
        v-if="
          servantDetailModal.model &&
          servantDetailModal.model.ServerServant.length === 1
        "
        ref="servantDetailForm"
        itemWidth="360px"
        :columns="2"
        class="two-columns"
      >
        <el-form-item :label="$t('serverList.servant.objName')" required>
          <el-input
            size="small"
            v-model="servantDetailModal.model.ServerServant[0].Name"
            :placeholder="$t('serverList.servant.c')"
            required
            pattern="^[A-Za-z0-9]+$"
            :pattern-tip="$t('serverList.servant.obj')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('deployService.table.th.port')" required>
          <el-input
            size="small"
            type="number"
            :min="1"
            :max="30000"
            v-model="servantDetailModal.model.ServerServant[0].Port"
            placeholder="1-30000"
            required
            :required-tip="$t('deployService.table.tips.empty')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('serverList.servant.numOfThread')" required>
          <el-input
            size="small"
            type="number"
            v-model="servantDetailModal.model.ServerServant[0].Threads"
            :placeholder="$t('serverList.servant.thread')"
            required
            pattern="^[1-9][0-9]*$"
            :pattern-tip="$t('serverList.servant.thread')"
          ></el-input>
        </el-form-item>
        <el-form-item
          :label="$t('serverList.servant.connections')"
          labelWidth="150px"
        >
          <el-input
            size="small"
            type="number"
            v-model="servantDetailModal.model.ServerServant[0].Connections"
          ></el-input>
        </el-form-item>
        <el-form-item
          :label="$t('serverList.servant.lengthOfQueue')"
          labelWidth="150px"
        >
          <el-input
            size="small"
            type="number"
            v-model="servantDetailModal.model.ServerServant[0].Capacity"
          ></el-input>
        </el-form-item>
        <el-form-item
          :label="$t('serverList.servant.queueTimeout')"
          labelWidth="150px"
        >
          <el-input
            size="small"
            type="number"
            v-model="servantDetailModal.model.ServerServant[0].Timeout"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('serverList.servant.protocol')" required>
          <el-radio
            v-model="servantDetailModal.model.ServerServant[0].IsTars"
            :label="true"
            >TARS</el-radio
          >
          <el-radio
            v-model="servantDetailModal.model.ServerServant[0].IsTars"
            :label="false"
            >NOT TARS</el-radio
          >
        </el-form-item>
        <el-form-item :label="$t('deployService.form.portType')" required>
          <el-radio
            v-model="servantDetailModal.model.ServerServant[0].IsTcp"
            :label="true"
            >TCP</el-radio
          >
          <el-radio
            v-model="servantDetailModal.model.ServerServant[0].IsTcp"
            :label="false"
            >UDP</el-radio
          >
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- K8S编辑弹窗 -->
    <k8sManager ref="k8s"></k8sManager>

    <!-- 更多命令弹窗 -->
    <el-dialog
      :visible.sync="moreCmdModal.show"
      :label="$t('operate.title.more')"
      width="700px"
      class="more-cmd"
      @on-confirm="invokeMoreCmd"
      @close="closeMoreCmdModal"
      @on-cancel="closeMoreCmdModal"
    >
      <el-form v-if="moreCmdModal.model" ref="moreCmdForm">
        <el-form-item itemWidth="100%">
          <el-radio v-model="moreCmdModal.model.selected" label="setloglevel">
            {{ $t("serverList.servant.logLevel") }}
          </el-radio>
          <el-select
            size="small"
            :disabled="moreCmdModal.model.selected !== 'setloglevel'"
            v-model="moreCmdModal.model.setloglevel"
          >
            <el-option v-for="l in logLevels" :key="l" :value="l">{{
              l
            }}</el-option>
          </el-select>
        </el-form-item>
        <el-form-item itemWidth="100%">
          <el-radio v-model="moreCmdModal.model.selected" label="loadconfig">
            {{ $t("serverList.servant.pushFile") }}
          </el-radio>
          <el-select
            size="small"
            :placeholder="
              moreCmdModal.model.configs && moreCmdModal.model.configs.length
                ? $t('pub.dlg.defaultValue')
                : $t('pub.dlg.noConfFile')
            "
            :disabled="
              !(
                moreCmdModal.model.configs && moreCmdModal.model.configs.length
              ) || moreCmdModal.model.selected !== 'loadconfig'
            "
            v-model="moreCmdModal.model.loadconfig"
            :required="moreCmdModal.model.selected === 'loadconfig'"
          >
            <el-option
              v-for="l in moreCmdModal.model.configs"
              :key="l.filename"
              :value="l.filename"
            >
              {{ l.filename }}
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item itemWidth="100%">
          <el-radio v-model="moreCmdModal.model.selected" label="command">
            {{ $t("serverList.servant.sendCommand") }}
          </el-radio>
          <el-input
            size="small"
            :disabled="moreCmdModal.model.selected !== 'command'"
            v-model="moreCmdModal.model.command"
            :required="moreCmdModal.model.selected === 'command'"
          ></el-input>
        </el-form-item>
        <el-form-item itemWidth="100%">
          <el-radio v-model="moreCmdModal.model.selected" label="connection">
            {{ $t("serverList.servant.serviceLink") }}
          </el-radio>
        </el-form-item>
      </el-form>
    </el-dialog>

    <!-- 查看弹窗 -->
    <el-dialog
      :visible.sync="detailModal.show"
      :label="detailModal.title"
      width="700px"
      :footShow="false"
      @close="closeDetailModal"
    >
      <div style="padding: 20px 0 0">
        <pre v-if="detailModal.model && detailModal.model.detail">{{
          detailModal.model.detail || $t("cfg.msg.empty")
        }}</pre>
        <div class="detail-loading" ref="detailModalLoading"></div>
      </div>
    </el-dialog>

    <el-dialog
      :visible.sync="showPodYaml"
      title="Pod"
      width="70%"
      :footShow="false"
      @close="closePodYaml"
    >
      <div style="padding: 20px 0 0">
        <yaml-editor
          v-if="showPodYaml"
          v-model="podYaml"
          style="margin: 1px"
          ref="yamlEdit"
        ></yaml-editor>
      </div>
    </el-dialog>

    <log ref="log"></log>

    <el-dialog :visible.sync="dialogCommandVisible" width="80%">
      <span v-html="commandHTML"></span>
      <span slot="footer" class="dialog-footer">
        <el-button @click="dialogCommandVisible = false">{{
          $t("common.cancel")
        }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import wrapper from "@/components/section-wrappper";
import moment from "moment";
import k8sManager from "@/k8s/inc/k8s/index";
import YamlEditor from "@/components/editor/yaml-editor";
import jsYaml from "js-yaml";
import log from "@/k8s/inc/log";

export default {
  name: "ServerManage",
  components: {
    wrapper,
    k8sManager,
    YamlEditor,
    log,
  },
  data() {
    return {
      // 当前页面信息
      serverData: {
        level: 5,
        application: "",
        server_name: "",
        set_name: "",
        set_area: "",
        set_group: "",
      },

      commandHTML: "",
      dialogCommandVisible: false,
      // 服务列表
      isreloadlist: true,
      reloadTask: null,
      reloadlist: null,
      serverList: [],

      // 操作历史列表
      serverNotifyList: [],

      // 分页
      notifyPagination: {
        page: 1,
        size: 10,
        total: 1,
      },

      // 默认参数
      defaultObj: {},

      configModal: {
        show: false,
        model: null,
      },

      // 新增servant
      servantAddModal: {
        show: false,
        isNew: true,
        model: null,
      },

      // 编辑servant
      servantModal: {
        show: false,
        model: null,
        currentServer: null,
      },
      servantDetailModal: {
        show: false,
        isNew: true,
        model: null,
      },

      // 查看弹窗
      detailModal: {
        show: false,
        title: "",
        model: null,
      },

      // 更多命令
      logLevels: ["NONE", "DEBUG", "TARS", "INFO", "WARN", "ERROR"],
      moreCmdModal: {
        show: false,
        model: null,
        currentServer: null,
      },

      showPodYaml: false,
      podYaml: null,

      isCheckedAll: false,
      checkedList: [],
    };
  },
  props: ["treeid"],
  computed: {
    isApplication() {
      return this.treeid.indexOf(".") == -1;
    },
    showOthers() {
      return this.serverData.level === 5;
    },
    isEndpointValid() {
      if (
        !this.servantDetailModal.model ||
        !this.servantDetailModal.model.endpoint
      ) {
        return false;
      }
      return this.checkServantEndpoint(this.servantDetailModal.model.endpoint);
    },
    isNormal() {
      return this.serverData.server_type === "normal";
    },
  },
  methods: {
    gotoLog(data) {
      let url = `/logview.html?History=false&NodeIP=${data.NodeIp}&ServerApp=${data.ServerApp}&ServerName=${data.ServerName}&PodName=${data.PodName}`;
      window.open(url);
    },
    closePodYaml() {
      this.podYaml = null;
    },
    readPodLog(PodName) {
      this.$refs.log.show(PodName);
    },
    describePod(row) {
      const loading = this.$loading.show();
      this.$ajax
        .getJSON("/k8s/api/describe_pod", {
          PodName: row.PodName,
        })
        .then((data) => {
          this.podYaml = jsYaml.dump(data);
          this.showPodYaml = true;

          this.$nextTick(() => {
            this.$refs.yamlEdit.readonly();
            loading.hide();
          });
        })
        .catch((err) => {
          loading.hide();
        });
    },
    // 状态对应class
    getState(state) {
      let result = state;
      switch (`${state}`) {
        case "Active":
          result = "color: green";
          break;
        case "Inactive":
        case "Activating":
        case "Deactivating":
        case "Unknown":
          result = "color: red";
          break;
      }

      return result;
    },
    reloadServerList() {
      let that = this;

      if (this.$parent.BTabs.length > 0) {
        let allPath = this.$parent.BTabs[0].path;
        let path = allPath.substring(allPath.lastIndexOf("/") + 1);

        if (path === "manage" || !that.reloadTask) {
          that.reloadTask = setTimeout(() => {
            if (
              that.isreloadlist &&
              location.hash == "#/server" &&
              that.$parent.treeid == that.treeid
            ) {
              that.getServerList();
              that.getServerNotifyList();
            }
            that.reloadServerList();
          }, 3000);
        }
      }
    },
    startServerList() {
      this.isreloadlist = true;
    },
    stopServerList() {
      this.isreloadlist = false;
    },
    // 获取服务列表
    getServerList() {
      this.$ajax
        .getJSON("/k8s/api/pod_list", {
          tree_node_id: this.treeid,
        })
        .then((data) => {
          this.serverList = [];
          if (data.hasOwnProperty("Data")) {
            data.Data.forEach((item) => {
              item.isChecked = false;
              item.Source = JSON.parse(item.Source || "{}");
              item.CreateTime = moment(item.CreateTime).format(
                "YYYY-MM-DD HH:mm:ss"
              );
              item.StartTime = moment(item.StartTime).format(
                "YYYY-MM-DD HH:mm:ss"
              );
            });
            this.serverList = data.Data;
          }
        })
        .catch((err) => {});
    },
    // 获取服务实时状态
    getServerNotifyList() {
      if (!this.showOthers) return;

      this.$ajax
        .getJSON("/k8s/api/server_notify_list", {
          tree_node_id: this.treeid,
          size: this.notifyPagination.size,
          page: this.notifyPagination.page,
        })
        .then((data) => {
          this.notifyPagination.total = Math.ceil(
            data.total.value / this.notifyPagination.size
          );
          this.serverNotifyList = data.hits || [];

          this.serverNotifyList.forEach((item) => {
            item._source.timeStr = moment(item._source.notifyTime).format(
              "YYYY-MM-DD HH:mm:ss"
            );
          });
        })
        .catch((err) => {
          // this.$tip.error(`${this.$t('serverList.restart.failed')}: ${err.err_msg || err.message}`);
        });
    },
    statusStyle(message) {
      message = message || "";

      if (message == "restart" || message.indexOf("[succ]") != -1) {
        return "color: green";
      } else if (
        message == "stop" ||
        message.indexOf("[alarm]") != -1 ||
        message.indexOf("error") != -1 ||
        message.indexOf("ERROR") != -1
      ) {
        return "color: red";
      }
      return "";
    },
    notifyGotoPage(num) {
      this.notifyPagination.page = num;
      this.getServerNotifyList();
    },
    // 获取服务数据
    getServerConfig() {
      this.stopServerList();
      const loading = this.$loading.show({
        target: this.$refs.configFormLoading,
      });

      this.$ajax
        .getJSON("/k8s/api/server_option_select", {
          tree_node_id: this.treeid,
        })
        .then((data) => {
          loading.hide();

          if (this.configModal.model) {
            this.configModal.model = Object.assign(
              {},
              this.configModal.model,
              data.Data[0]
            );
          } else {
            data.templates = [];
            this.configModal.model = data.Data[0];
          }

          this.configModal.model["tree_node_id"] = this.treeid;
          this.startServerList();
        })
        .catch((err) => {
          loading.hide();
          this.closeConfigModal();
          this.startServerList();
          this.$tip.error(
            `${this.$t("serverList.restart.failed")}: ${
              err.err_msg || err.message
            }`
          );
        });
    },
    // 编辑服务
    configServer() {
      this.stopServerList();
      this.configModal.show = true;

      this.$ajax
        .getJSON("/k8s/api/template_select")
        .then((data) => {
          // console.log('model:', this.configModal.model);
          if (this.configModal.model) {
            this.configModal.model.templates = data.Data;
          } else {
            this.configModal.model = { templates: data.Data };
          }
          this.getServerConfig();
          this.startServerList();
        })
        .catch((err) => {
          this.startServerList();
          this.$tip.error(
            `${this.$t("serverList.restart.failed")}: ${
              err.err_msg || err.message
            }`
          );
        });
    },
    saveConfig() {
      if (this.$refs.configForm.validate()) {
        const loading = this.$Loading.show();
        this.$ajax
          .postJSON("/k8s/api/server_option_update", {
            isBak: this.configModal.model.bak_flag,
            ...this.configModal.model,
          })
          .then((res) => {
            loading.hide();
            this.closeConfigModal();
            this.$tip.success(this.$t("common.success"));
          })
          .catch(() => {
            loading.hide();
          });
      }
    },
    closeConfigModal() {
      if (this.$refs.configForm) this.$refs.configForm.resetValid();
      this.configModal.show = false;
      this.configModal.model = null;
      this.startServerList();
    },
    // 启动服务
    async startServer() {
      if (await this.checkLauncherType()) {
        this.$tip.warning(this.$t("pub.dlg.foregroundTip"));
        return;
      }
      this.stopServerList();
      const checkedServerList = this.checkedList.filter(
        (item) => item.isChecked
      );
      if (checkedServerList.length <= 0) {
        this.$tip.warning(this.$t("pub.dlg.a"));
        return;
      }

      let podIp = checkedServerList.map((item) => item.PodIp);
      let serverApp = checkedServerList[0].ServerApp;
      let serverName = checkedServerList[0].ServerName;
      this.$confirm(
        this.$t("serverList.startService.msg.startService"),
        this.$t("common.alert")
      )
        .then(() => {
          this.$ajax
            .getJSON("/k8s/api/send_command", {
              command: "StartServer",
              podIp,
              serverApp,
              serverName,
            })
            .then((data) => {
              for (let i = 0; i < data.length; i++) {
                if (data[i].ret_code != 0) {
                  this.$tip.error(
                    this.$t("common.error") + ", ret_code:" + data[i].ret_code
                  );
                  return;
                }
              }

              this.$tip.success(this.$t("common.success"));
              this.startServerList();
              this.getServerNotifyList();
            })
            .catch((err) => {
              this.$tip.error(
                `${this.$t("common.error")}: ${err.err_msg || err.message}`
              );
            });
        })
        .catch(() => {
          this.startServerList();
        });
    },
    // 重启服务
    async restartServer() {
      if (await this.checkLauncherType()) {
        this.$tip.warning(this.$t("pub.dlg.foregroundTip"));
        return;
      }
      this.stopServerList();
      const checkedServerList = this.checkedList.filter(
        (item) => item.isChecked
      );
      if (checkedServerList.length <= 0) {
        this.$tip.warning(this.$t("pub.dlg.a"));
        return;
      }

      let podIp = checkedServerList.map((item) => item.PodIp);
      let serverApp = checkedServerList[0].ServerApp;
      let serverName = checkedServerList[0].ServerName;
      this.$confirm(
        this.$t("serverList.restartService.msg.restartService"),
        this.$t("common.alert")
      )
        .then(() => {
          this.$ajax
            .getJSON("/k8s/api/send_command", {
              command: "RestartServer",
              podIp,
              serverApp,
              serverName,
            })
            .then((data) => {
              for (let i = 0; i < data.length; i++) {
                if (data[i].ret_code != 0) {
                  this.$tip.error(
                    this.$t("common.error") + ", ret_code:" + data[i].ret_code
                  );
                  return;
                }
              }

              this.$tip.success(this.$t("common.success"));
              this.startServerList();
              this.getServerNotifyList();
            })
            .catch((err) => {
              this.$tip.error(
                `${this.$t("common.error")}: ${err.err_msg || err.message}`
              );
            });
        })
        .catch(() => {
          this.startServerList();
        });
    },
    // 停止服务
    async stopServer() {
      if (await this.checkLauncherType()) {
        this.$tip.warning(this.$t("pub.dlg.foregroundTip"));
        return;
      }
      this.stopServerList();
      const checkedServerList = this.checkedList.filter(
        (item) => item.isChecked
      );
      if (checkedServerList.length <= 0) {
        this.$tip.warning(this.$t("pub.dlg.a"));
        return;
      }

      let podIp = checkedServerList.map((item) => item.PodIp);
      let serverApp = checkedServerList[0].ServerApp;
      let serverName = checkedServerList[0].ServerName;
      this.$confirm(
        this.$t("serverList.stopService.msg.stopService"),
        this.$t("common.alert")
      )
        .then(() => {
          this.$ajax
            .getJSON("/k8s/api/send_command", {
              command: "StopServer",
              podIp,
              serverApp,
              serverName,
            })
            .then((data) => {
              for (let i = 0; i < data.length; i++) {
                if (data[i].ret_code != 0) {
                  this.$tip.error(
                    this.$t("common.error") + ", ret_code:" + data[i].ret_code
                  );
                  return;
                }
              }

              this.$tip.success(this.$t("common.success"));
              this.startServerList();
              this.getServerNotifyList();
            })
            .catch((err) => {
              this.$tip.error(
                `${this.$t("common.error")}: ${err.err_msg || err.message}`
              );
            });
        })
        .catch(() => {
          this.startServerList();
        });
    },
    deletePod(row) {
      this.$confirm(
        this.$t("serverList.tips.deletePod"),
        this.$t("common.alert")
      ).then(() => {
        this.$ajax
          .getJSON("/k8s/api/delete_pod", {
            PodName: row.PodName,
          })
          .then((data) => {
            this.$tip.success(`${this.$t("common.success")}`);
            this.getServerList();
          })
          .catch((err) => {
            this.$tip.error(
              `${this.$t("common.error")}: ${err.err_msg || err.message}`
            );
          });
      });
    },
    viewEvent(row) {
      let data = Object.assign({}, row);
      let query = { application: data.ServerApp, serverName: data.ServerName };
      this.$router.push({ path: "/operation/event", query: query });
    },
    // 查看模版
    viewTemplate() {
      const loading = this.$loading.show({
        target: this.$refs.servantModalLoading,
      });
      this.$ajax
        .getJSON("/k8s/api/server_option_template", {
          tree_node_id: this.treeid,
        })
        .then((data) => {
          loading.hide();
          this.detailModal.title = this.$t("cfg.title.viewTemplate");
          this.detailModal.model = {
            detail: data,
          };
          this.detailModal.show = true;
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.err_msg || err.message}`
          );
        });
    },

    // 管理私有模版
    privateTemplateManage() {
      const loading = this.$loading.show({
        target: this.$refs.servantModalLoading,
      });
      this.$ajax
        .getJSON("/k8s/api/server_option_select", {
          tree_node_id: this.treeid,
        })
        .then((data) => {
          loading.hide();
          this.detailModal.title = this.$t("cfg.title.viewProfileTemplate");
          this.detailModal.model = {
            detail: (data && data.Data[0].ServerProfile) || "",
          };

          this.detailModal.show = true;
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.err_msg || err.message}`
          );
        });
    },

    // 管理Servant弹窗
    manageServant(server) {
      this.stopServerList();
      this.servantModal.show = true;

      this.$ajax
        .getJSON("/k8s/api/server_adapter_select", {
          tree_node_id: this.treeid,
        })
        .then((data) => {
          this.servantModal.model = data.Data;
          this.servantModal.currentServer = server;
        })
        .catch((err) => {
          this.$tip.error(
            `${this.$t("serverList.restart.failed")}: ${
              err.err_msg || err.message
            }`
          );
        });
    },
    manageK8S() {
      this.$refs.k8s.show(this.treeid);
    },
    closeServantModal() {
      this.servantModal.show = false;
      this.servantModal.model = null;
      this.servantModal.currentServer = null;
      this.startServerList();
    },
    addAdapter(template) {
      this.servantAddModal.model.ServerServant.push(
        Object.assign({}, template, { Port: this.getPort(template.Port) })
      );
    },
    getPort(port) {
      const { defaultObj, servantModal } = this;

      let result = 0;
      if (!port) {
        result = Math.floor(defaultObj.Port);

        if (servantModal.model && servantModal.model.length > 0) {
          let servant =
            servantModal.model.sort((a, b) => {
              return b.Port - a.Port;
            }) || [];
          result = Math.floor(servant[0].Port);
        }
      } else {
        result = port;
      }
      result++;

      if (result === 19385) {
        result++;
      }

      return result;
    },
    // 新增、编辑 servant
    configServant(id) {
      const { defaultObj } = this;

      const model = {
        tree_node_id: this.treeid,
        ServerServant: [
          {
            Name: "",
            Port: this.getPort() || 0,
            Threads: defaultObj.Threads || 0,
            Connections: defaultObj.Connections || 0,
            Capacity: defaultObj.Capacity || 0,
            Timeout: defaultObj.Timeout || 0,
            IsTcp: defaultObj.IsTcp,
            IsTars: defaultObj.IsTars,
          },
        ],
      };
      if (id) {
        // 编辑
        this.servantDetailModal.model = model;
        this.servantDetailModal.isNew = true;

        const old = this.servantModal.model.find(
          (item) => item.AdapterId === id
        );
        this.servantDetailModal.model = {
          AdapterId: old.AdapterId,
          ServerServant: [old],
        };
        this.servantDetailModal.isNew = false;
        this.servantDetailModal.show = true;
      } else {
        // 新增
        this.servantAddModal.model = model;
        this.servantAddModal.isNew = true;
        this.servantAddModal.show = true;
      }
    },
    closeServantAddModal() {
      if (this.$refs.servantAddForm) this.$refs.servantAddForm.resetValid();
      this.servantAddModal.show = false;
      this.servantAddModal.model = null;
    },
    closeServantDetailModal() {
      if (this.$refs.servantDetailForm)
        this.$refs.servantDetailForm.resetValid();
      this.servantDetailModal.show = false;
      this.servantDetailModal.model = null;
    },
    // 检查绑定地址
    checkServantEndpoint(endpoint) {
      const tmp = endpoint.split(/\s-/);
      const regProtocol = /^tcp|udp$/i;
      let regHost =
        /^h\s(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])\.(\d{1,2}|1\d\d|2[0-4]\d|25[0-5])$/i;
      let regT = /^t\s([1-9]|[1-9]\d+)$/i;
      let regPort = /^p\s\d{4,5}$/i;

      let check = true;
      if (regProtocol.test(tmp[0])) {
        let flag = 0;
        for (let i = 1; i < tmp.length; i++) {
          // eslint-disable-line
          // 验证 -h
          if (regHost && regHost.test(tmp[i])) {
            flag++; // eslint-disable-line
            // 提取参数
            this.servantDetailModal.model.node_name = tmp[i].split(/\s/)[1];
            regHost = null;
          }
          // 验证 -t
          if (regT && regT.test(tmp[i])) {
            flag++; // eslint-disable-line
            regT = null;
          }
          // 验证 -p
          if (regPort && regPort.test(tmp[i])) {
            const port = tmp[i].substring(2);
            if (!(port < 0 || port > 65535)) {
              flag++; // eslint-disable-line
            }
            regPort = null;
          }
        }
        check = flag === 3;
      } else {
        check = false;
      }
      return check;
    },
    // 保存 servant
    saveServantAdd() {
      if (this.$refs.servantAddForm.validate()) {
        const loading = this.$Loading.show();
        // 新建
        if (this.servantAddModal.isNew) {
          let query = Object.assign({}, this.servantAddModal.model);

          if (query.ServerServant) {
            // Array -> Object
            let obj = {};
            query.ServerServant.forEach((item) => {
              obj[item.Name] = item;
            });
            query.ServerServant = obj;
          }

          this.$ajax
            .postJSON("/k8s/api/server_adapter_create", query)
            .then((res) => {
              loading.hide();
              // this.servantModal.model.unshift(res);
              this.manageServant();
              this.$tip.success(this.$t("common.success"));
              this.closeServantAddModal();
            })
            .catch((err) => {
              loading.hide();
              this.$tip.error(
                `${this.$t("common.error")}: ${err.err_msg || err.message}`
              );
            });
        } else {
          loading.hide();
        }
      }
    },
    // 保存 servant
    saveServantDetail() {
      if (this.$refs.servantDetailForm.validate()) {
        const loading = this.$Loading.show();
        // 新建
        if (this.servantDetailModal.isNew) {
          const query = this.servantDetailModal.model;
          this.$ajax
            .postJSON("/k8s/api/server_adapter_create", query)
            .then((res) => {
              loading.hide();
              this.servantModal.model.unshift(res);
              this.$tip.success(this.$t("common.success"));
              // this.closeServantModal();
              this.closeServantDetailModal();
            })
            .catch((err) => {
              loading.hide();
              this.$tip.error(
                `${this.$t("common.error")}: ${err.err_msg || err.message}`
              );
            });
          // 修改
        } else {
          this.servantDetailModal.model.servant =
            this.servantDetailModal.model.application +
            "." +
            this.servantDetailModal.model.server_name +
            "." +
            this.servantDetailModal.model.obj_name;

          let query = Object.assign({}, this.servantDetailModal.model);

          this.$ajax
            .postJSON("/k8s/api/server_adapter_update", query)
            .then((res) => {
              loading.hide();
              this.$tip.success(this.$t("common.success"));
              this.closeServantDetailModal();
            })
            .catch((err) => {
              loading.hide();
              this.$tip.error(
                `${this.$t("common.error")}: ${err.err_msg || err.message}`
              );
            });
        }
      }
    },
    // 删除 servant
    deleteServant(id) {
      this.$confirm(
        this.$t("serverList.servant.a"),
        this.$t("common.alert")
      ).then(() => {
        const loading = this.$Loading.show();
        this.$ajax
          .getJSON("/k8s/api/server_adapter_delete", {
            AdapterId: id,
          })
          .then((res) => {
            loading.hide();
            this.servantModal.model = this.servantModal.model.filter(
              (item) => item.AdapterId !== id
            );
            this.$tip.success(this.$t("common.success"));
          })
          .catch((err) => {
            loading.hide();
            this.$tip.error(
              `${this.$t("common.error")}: ${err.err_msg || err.message}`
            );
          });
      });
    },

    closeDetailModal() {
      this.detailModal.show = false;
      this.detailModal.model = null;
    },

    // 显示更多命令
    showMoreCmd(server) {
      this.stopServerList();
      const checkedServerList = this.checkedList.filter(
        (item) => item.isChecked
      );
      if (checkedServerList.length <= 0) {
        this.$tip.warning(this.$t("pub.dlg.a"));
        return;
      }

      let podIp = checkedServerList.map((item) => item.PodIp);
      let serverApp = checkedServerList[0].ServerApp;
      let serverName = checkedServerList[0].ServerName;

      this.moreCmdModal.model = {
        podIp,
        serverApp,
        serverName,
        selected: "setloglevel",
        setloglevel: "NONE",
        loadconfig: "",
        command: "",
        configs: null,
      };
      this.moreCmdModal.unwatch = this.$watch(
        "moreCmdModal.model.selected",
        () => {
          if (this.$refs.moreCmdForm) this.$refs.moreCmdForm.resetValid();
        }
      );
      this.moreCmdModal.show = true;
      this.moreCmdModal.currentServer = server;
    },
    sendCommand(serverApp, serverName, podIp, command, hold) {
      // if (true) {
      //   let msg = JSON.parse(
      //     `{ "title": "成功!!!", "message": "[notify prefix object num:1]<br>[1]:====================================================================================================<br>----------------------------------------------------------------------------------------------------<br>[adapter:Cloud.MarketStorageServer.StorageObjAdapter] [connections:2]<br>conn-uid ip:port last-time timeout recvBufferSize sendBufferSize <br>205520898 172.29.96.179:46112 2022-04-17 12:38:01 30 0 0 <br>205520908 127.0.0.1:42308 2022-04-17 12:37:34 3 0 0 <br>----------------------------------------------------------------------------------------------------<br>[adapter:Cloud.MarketStorageServer.RaftObjAdapter] [connections:2]<br>conn-uid ip:port last-time timeout recvBufferSize sendBufferSize <br>205520898 172.29.96.179:46112 2022-04-17 12:38:01 30 0 0 <br>205520908 127.0.0.1:42308 2022-04-17 12:37:34 3 0 0 <br>----------------------------------------------------------------------------------------------------<br>[adapter:AdminAdapter] [connections:2] <br>conn-uid ip:port last-time timeout recvBufferSize sendBufferSize <br>205520898 172.29.96.179:46112 2022-04-17 12:38:01 30 0 0 <br>205520908 127.0.0.1:42308 2022-04-17 12:37:34 3 0 0 <br>====================================================================================================<br><br>", "duration": 0 }`
      //   );
      //   this.commandHTML = msg.message;
      //   this.dialogCommandVisible = true;
      // } else {
      const loading = this.$Loading.show();
      this.$ajax
        .getJSON("/k8s/api/send_command", {
          serverApp,
          serverName,
          podIp,
          command,
        })
        .then((res) => {
          loading.hide();
          for (let i = 0; i < res.length; i++) {
            if (res[i].ret_code != 0) {
              this.$tip.error(
                this.$t("common.error") + ", ret_code:" + res[i].ret_code
              );
              return;
            }
          }

          const msg = res[0].err_msg.replace(/\n/g, "<br>");
          if (res[0].ret_code === 0) {
            this.commandHTML = msg;
            this.dialogCommandVisible = true;

            this.getServerNotifyList();
          } else {
            throw new Error(msg);
          }
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error({
            title: this.$t("common.error"),
            message: err.err_msg || err.message,
          });
        });
      // }
    },
    invokeMoreCmd() {
      const model = this.moreCmdModal.model;
      const server = this.moreCmdModal.currentServer;
      // 下线服务
      if (model.selected === "setloglevel") {
        this.sendCommand(
          model.serverApp,
          model.serverName,
          model.podIp,
          `tars.setloglevel ${model.setloglevel}`
        );
        // push 日志文件
      } else if (
        model.selected === "loadconfig" &&
        this.$refs.moreCmdForm.validate()
      ) {
        this.sendCommand(
          model.serverApp,
          model.serverName,
          model.podIp,
          `tars.loadconfig ${model.loadconfig}`
        );
        // 发送自定义命令
      } else if (
        model.selected === "command" &&
        this.$refs.moreCmdForm.validate()
      ) {
        this.sendCommand(
          model.serverApp,
          model.serverName,
          model.podIp,
          model.command
        );
        // 查看服务链接
      } else if (model.selected === "connection") {
        this.sendCommand(
          model.serverApp,
          model.serverName,
          model.podIp,
          `tars.connection`,
          true
        );
      }
    },
    closeMoreCmdModal() {
      if (this.$refs.moreCmdForm) this.$refs.moreCmdForm.resetValid();
      if (this.moreCmdModal.unwatch) this.moreCmdModal.unwatch();
      this.checkedList = [];
      this.moreCmdModal.show = false;
      this.moreCmdModal.model = null;
      this.startServerList();
    },
    checkChange(data) {
      // debugger
      this.stopServerList();
      const checkedList = this.checkedList;

      let isChecked = data.isChecked;
      if (isChecked) {
        let isTrue = false;
        checkedList.forEach((item) => {
          if (item.PodId === data.PodId) {
            isTrue = true;
          }
        });
        if (!isTrue) {
          checkedList.push(data);
        }
      } else {
        let isTrue = false;
        let index = -1;
        checkedList.forEach((iitem, iindex) => {
          if (iitem.PodId === data.PodId) {
            isTrue = true;
            index = iindex;
          }
        });
        if (isTrue) {
          checkedList.splice(index, 1);
        }
      }
    },
    //校验服务是否为前端启动
    async checkLauncherType() {
      let k8sData = await this.$ajax.getJSON("/k8s/api/server_k8s_select", {
        tree_node_id: this.treeid,
      });
      let launcherType = k8sData.Data[0].launcherType;
      return launcherType == "foreground";
    },
    goMarket(row) {
      let href;
      if (row.Source["tars.io/CloudProduct"]) {
        href = `/static/market/index.html#/market/product/${row.Source["tars.io/CloudInstall"].group}/${row.Source["tars.io/CloudInstall"].name}/${row.Source["tars.io/CloudInstall"].version}`;
      } else {
        href = `/static/market/index.html#/market/service/${row.Source["tars.io/CloudInstall"].group}/${row.Source["tars.io/CloudInstall"].name}/${row.Source["tars.io/CloudInstall"].version}`;
      }

      window.open(href);
    },
  },
  async created() {
    this.serverData = this.$parent.getServerData();
    if (!this.serverData.server_type) {
      try {
        let server = await this.$ajax.getJSON("/k8s/api/server_option_select", {
          tree_node_id: this.treeid,
        });
        this.$set(this.serverData, "server_type", server.Data[0].serverType);
      } catch (e) {
        this.$set(this.serverData, "server_type", "normal");
      }
    }
  },
  mounted() {
    this.getServerList();
    this.reloadServerList();
    this.startServerList();
    this.getServerNotifyList();
  },
  beforeMount() {
    this.startServerList();
  },
  beforeDestroy() {
    this.stopServerList();
  },
  watch: {
    isCheckedAll() {
      const isCheckedAll = this.isCheckedAll;
      this.serverList.forEach((item) => {
        item.isChecked = isCheckedAll;
      });

      if (isCheckedAll) {
        this.checkedList = [].concat(this.serverList);
      } else {
        this.checkedList = [];
      }
    },
    checkedList() {
      const checkedList = this.checkedList;
      if (checkedList.length > 0) {
        this.stopServerList();
      } else {
        this.startServerList();
      }
    },
  },
};
</script>

<style lang="postcss">
@import "../../assets/css/variable.css";

.page_server_manage {
  .tbm16 {
    margin: 16px 0;
  }
  .danger {
    color: var(--off-color);
  }

  /* .icon.iconfont {
    font-size: 10px;
    cursor: pointer;
    vertical-align: 0em;
  } */

  .more-cmd {
    .el-form-item__content {
      display: flex;
      align-items: center;
    }
    span.el-radio {
      margin-right: 5px;
    }
    label.el-radio {
      width: 200px;
    }
  }

  .table_head {
    padding: 10px 0;
  }

  .buttonText {
    white-space: nowrap;
  }

  .dcache .table-operations {
    position: absolute;
    right: -15px;
    top: -40px;
  }

  a:link {
    color: #0000ef;
  }

  a:visited {
    color: #0000ef;
  }

  a:hover {
    color: #ff0000;
  }

  .over {
    /*超出部分省略*/
    overflow: hidden;
    text-overflow: ellipsis;
    display: -webkit-box;
    -webkit-line-clamp: 2;
    -webkit-box-orient: vertical;
  }

  .log-body {
    height: 450px;
  }

  .wrap-lines {
    white-space: pre-wrap;
    white-space: -moz-pre-wrap;
    white-space: -pre-wrap;
    white-space: -o-pre-wrap;
    word-wrap: break-word;
  }

  .pre {
    background-color: #454545;
    padding: 10px;
    white-space: pre-wrap;
    overflow: auto;
    margin: 1em 0px;
    display: block;
  }

  .log-body .log-msg {
    color: #27aa5e;
    line-height: initial;
    white-space: pre;
    width: calc(100vw - 150px);
  }

  .log-body .log-date {
    -webkit-user-select: none;
    -moz-user-select: none;
    -ms-user-select: none;
    user-select: none;
    color: #8b959c;
    padding-right: 10px;
  }
}
</style>
