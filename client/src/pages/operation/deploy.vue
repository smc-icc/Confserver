<template>
  <div class="page_operation_deploy">
    <el-form
      ref="form"
      inline
      label-position="top"
      itemWidth="480px"
      v-show="deployShow"
      @submit.native.prevent="save"
    >
      <el-form-item :label="$t('deployService.form.app')" required>
        <el-select
          id="inputApplication"
          v-model="model.application"
          size="small"
          filterable
          :notFoundText="$t('deployService.form.appAdd')"
        >
          <el-option v-for="d in applicationList" :key="d" :value="d">
            {{ d }}
          </el-option>
        </el-select>
      </el-form-item>
      <el-form-item :label="$t('deployService.form.serviceName')" required>
        <el-input
          size="small"
          v-model="model.server_name"
          :placeholder="$t('deployService.form.serviceFormatTips')"
          required
          :required-tip="$t('deployService.form.serviceTips')"
          pattern="^[a-zA-Z]([a-zA-Z0-9]+)?$"
          :pattern-tip="$t('deployService.form.serviceFormatTips')"
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('deployService.form.serviceType')" required>
        <el-select
          size="small"
          v-model="model.server_type"
          required
          :required-tip="$t('deployService.form.serviceTypeTips')"
        >
          <el-option v-for="d in types" :key="d" :value="d">{{
            d
          }}</el-option>
        </el-select>
      </el-form-item>
      <!--
            <div style="float: right">
                <el-button type="button" type="primary" @click="showBatchDeployModal()">
                    {{$t('deployService.form.batchDeploy')}}
                </el-button>
            </div>
-->
      <el-form-item :label="$t('deployService.form.template')" required>
        <el-select
          size="small"
          v-model="model.template_name"
          required
          :required-tip="$t('deployService.form.templateTips')"
        >
          <el-option v-for="d in templates" :key="d" :value="d">{{
            d
          }}</el-option>
        </el-select>
      </el-form-item>

      <el-form-item label="SET">
        <SetInputer
          :enabled.sync="model.enable_set"
          :name.sync="model.set_name"
          :area.sync="model.set_area"
          :group.sync="model.set_group"
        ></SetInputer>
      </el-form-item>

      <el-form-item :label="$t('user.op')" v-show="enableLogin">
        <el-input
          size="small"
          v-model="model.operator"
          :placeholder="$t('user.tips.sep')"
        ></el-input>
      </el-form-item>

      <el-form-item :label="$t('user.dev')" v-show="enableLogin">
        <el-input
          size="small"
          v-model="model.developer"
          :placeholder="$t('user.tips.sep')"
        ></el-input>
      </el-form-item>
      <el-form-item
        :label="$t('deployService.form.run_type')"
        v-if="baseImageList.length > 0"
      >
        <el-radio-group
          size="small"
          v-model="runType"
          @change="changeRunType"
          :data="[
            { value: true, text: $t('pub.dlg.tgzRun') },
            { value: false, text: $t('pub.dlg.containerRun') },
          ]"
        >
        </el-radio-group>
      </el-form-item>
      <el-form-item
        :label="$t('deployService.form.baseImageId')"
        v-if="model.run_type == 'container'"
      >
        <el-select size="small" v-model="model.base_image_id">
          <el-option v-for="i in baseImageList" :key="i.id" :value="i.id">{{
            i.image + "(" + i.remark + ")"
          }}</el-option>
        </el-select>
      </el-form-item>
      <el-table :data="model.adapters">
        <el-table-column title="OBJ">
          <template slot="head" slot-scope="props">
            <span class="required">{{ props.column.title }}</span>
          </template>
          <template slot-scope="props">
            <el-input
              size="small"
              v-model="props.row.obj_name"
              :placeholder="$t('deployService.form.placeholder')"
              required
              :required-tip="$t('deployService.form.objTips')"
              pattern="^[a-zA-Z0-9]+$"
              :pattern-tip="$t('deployService.form.placeholder')"
            ></el-input>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('deployService.form.node_name')"
          width="180px"
        >
          <template slot="head" slot-scope="props">
            <span class="required">{{ props.column.title }}</span>
          </template>
          <template slot-scope="props">
            <el-select
              @change="nodeNameChange(props.row)"
              v-model="props.row.node_name"
              size="small"
              required
              filterable
            >
              <el-option v-for="d in nodeList" :key="d" :value="d">
                {{ d }}
              </el-option>
            </el-select>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('deployService.table.th.endpoint')"
          width="140px"
        >
          <template slot="head" slot-scope="props">
            <span class="required">{{ props.column.title }}</span>
          </template>
          <template slot-scope="props">
            <el-input
              size="small"
              v-model="props.row.bind_ip"
              placeholder="IP"
              required
              :required-tip="$t('deployService.table.tips.ip')"
            ></el-input>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('deployService.table.th.port')"
          width="90px"
        >
          <template slot="head" slot-scope="props">
            <span class="required">{{ props.column.title }}</span>
          </template>
          <template slot-scope="props">
            <el-input
              size="small"
              type="number"
              :min="0"
              :max="65535"
              v-model="props.row.port"
              placeholder="0-65535"
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
            <el-radio v-model="props.row.port_type" label="tcp">TCP</el-radio>
            <el-radio v-model="props.row.port_type" label="udp">UDP</el-radio>
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
            <el-radio v-model="props.row.protocol" label="tars"
              >TARS</el-radio
            >
            <el-radio v-model="props.row.protocol" label="not_tars">{{
              $t("serverList.servant.notTARS")
            }}</el-radio>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('deployService.table.th.threads')"
          width="60px"
        >
          <template slot="head" slot-scope="props">
            <span class="required">{{ props.column.title }}</span>
          </template>
          <template slot-scope="props">
            <el-input
              size="small"
              type="number"
              :min="0"
              v-model="props.row.thread_num"
              required
              :required-tip="$t('deployService.table.tips.empty')"
            ></el-input>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.servant.connections')"
          width="90px"
        >
          <template slot="head" slot-scope="props">
            <span class="required">{{ props.column.title }}</span>
          </template>
          <template slot-scope="props">
            <el-input
              size="small"
              type="number"
              :min="0"
              v-model="props.row.max_connections"
              required
              :required-tip="$t('deployService.table.tips.empty')"
            ></el-input>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.servant.capacity')"
          width="90px"
        >
          <template slot="head" slot-scope="props">
            <span class="required">{{ props.column.title }}</span>
          </template>
          <template slot-scope="props">
            <el-input
              size="small"
              type="number"
              :min="0"
              v-model="props.row.queuecap"
              required
              :required-tip="$t('deployService.table.tips.empty')"
            ></el-input>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('serverList.table.servant.timeout')"
          width="90px"
        >
          <template slot-scope="props">
            <el-input
              size="small"
              type="number"
              :min="0"
              v-model="props.row.queuetimeout"
            ></el-input>
          </template>
        </el-table-column>
        <el-table-column :label="$t('operate.operates')" width="60px">
          <template slot-scope="props">
            <el-button size="mini" type="text" @click="addAdapter(props.row)">{{
              $t("operate.add")
            }}</el-button>
            <el-button size="mini" type="text"
              v-if="props.$index"
              class="danger"
              @click="model.adapters.splice(props.$index, 1)"
              >{{ $t("operate.delete") }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-button @click="getAutoPort()"
        >{{ $t("deployService.form.getPort") }}
      </el-button>
      &nbsp;&nbsp; &nbsp;&nbsp;
      <el-button type="primary" native-type="submit">{{
        $t("common.submit")
      }}</el-button>
    </el-form>

    <el-dialog
      :visible.sync="resultModal.show"
      width="700px"
      class="more-cmd"
      :footShow="false"
      @close="closeResultModal"
      style="text-align: center;"
      @on-cancel="closeResultModal"
    >
      <p class="result-text">
        {{ $t("deployService.form.ret.success")
        }}{{ $t("resource.installRstMsg") }}
      </p>
      <el-table
        :data="resultModal.resultList"
        :empty-text="$t('common.nodata')"
        :row-class-name="resultModal.rowClassName"
      >
        <el-table-column title="ip" prop="ip"> </el-table-column>
        <el-table-column :label="$t('resource.installResult')" prop="rst">
          <template slot-scope="scope">
            <p
              v-text="scope.row.rst ? $t('common.success') : $t('common.error')"
            ></p>
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('common.message')"
          prop="msg"
        ></el-table-column>
      </el-table>
    </el-dialog>

    <div
      style="width:400px;margin:0 auto;margin-top:100px"
      v-show="deployModal.show"
    >
      <el-form
        ref="deployForm"
        itemWidth="400px"
        v-if="deployModal.nodeList.length > 0"
      >
        <el-form-item :label="$t('nodes.node_name')">
          <el-select v-model="deployModal.node_name">
            <el-option v-for="d in deployModal.nodeList" :key="d" :value="d">
              {{ d }}
            </el-option>
          </el-select>
        </el-form-item>

        <el-form-item :label="$t('pub.dlg.releaseVersion')">
          <el-select
            v-model="deployModal.model.patch_id"
            required
            :required-tip="$t('pub.dlg.ab')"
          >
            <el-option
              v-for="d in deployModal.model.patchList"
              :key="d.id"
              :value="d.id"
            >
              {{ d.id }} | {{ d.posttime }} | {{ d.comment }}
            </el-option>
          </el-select>
        </el-form-item>
      </el-form>
      <div
        style="width:100%;text-align: center;"
        v-if="deployModal.nodeList.length > 0"
      >
        <el-alert
          show-icon
          :label="$t('deployLog.info')"
          type="warning"
          :closable="false"
        >
        </el-alert>
        <el-button
          type="primary"
          style="margin:20px auto"
          @click="doDeployLog"
        >
          {{ $t("deployLog.install") }}
        </el-button>
      </div>
      <div style="width:100%;text-align: center;" v-else>
        <el-alert
          show-icon
          :label="$t('deployLog.add_node')"
          :description="$t('deployLog.description')"
          type="warning"
          :closable="false"
        >
        </el-alert>
      </div>
    </div>

    <PublishStatus ref="publishStatus"></PublishStatus>
  </div>
</template>

<script>
import PublishStatus from "../inc/status";

import SetInputer from "@/components/set-inputer";

const types = [
  "tars_cpp",
  "tars_java",
  "tars_php",
  "tars_python",
  "tars_nodejs",
  "not_tars",
  "tars_go",
];

const tars_templates = [
  "tars.tarsregistry",
  "tars.tarsAdminRegistry",
  "tars.tarspatch",
  "tars.tarsnode",
  "tars.tarsconfig",
  "tars.tarsnotify",
  "tars.tarsstat",
  "tars.tarsquerystat",
  "tars.tarsproperty",
  "tars.tarsqueryproperty",
  "tars.framework-db",
  "tars.tarslog",
];

const getInitialModel = () => ({
  application: "",
  server_name: "",
  server_type: types[0],
  template_name: "",
  node_name: "",
  enable_set: false,
  set_name: "",
  set_area: "",
  set_group: "",
  operator: "",
  developer: "",
  run_type: "",
  base_image_id: 0,
  adapters: [
    {
      obj_name: "",
      bind_ip: "",
      port: "",
      port_type: "tcp",
      protocol: "tars",
      thread_num: 5,
      max_connections: 100000,
      queuecap: 50000,
      queuetimeout: 20000,
    },
  ],
});

export default {
  name: "OperationDeploy",
  components: {
    SetInputer,
    PublishStatus,
  },

  data() {
    return {
      types,
      applicationList: [],
      nodeList: [],
      all_templates: [],
      baseImageList: [],
      templates: [],
      runType: true,
      model: getInitialModel(),
      enableLogin: false,
      deployShow: false,
      deployModal: {
        show: false,
        node_name: "",
        nodeList: [],
        model: {
          patch_id: "",
          patchList: [],
          serverList: [],
        },
      },
      resultModal: {
        show: false,
        resultList: [],
        rowClassName: (rowData) => {
          if (rowData && rowData.row && !rowData.row.rst) {
            return "err-row";
          }
          return "";
        },
      },
    };
  },
  watch: {
    runType: function() {
      this.model.run_type = this.runType ? "" : "container";
    },
  },
  mounted() {
    this.$ajax
      .getJSON("/server/api/isEnableLogin")
      .then((data) => {
        this.enableLogin = data.enableLogin || false;
      })
      .catch((err) => {});

    this.$ajax
      .getJSON("/server/api/application_list")
      .then((data) => {
        this.applicationList = data;
      })
      .catch((err) => {
        this.$tip.error(
          `${this.$t("common.error")}: ${err.message || err.err_msg}`
        );
      });

    this.$ajax
      .getJSON("/server/api/node_list")
      .then((data) => {
        this.nodeList = data;
      })
      .catch((err) => {
        this.$tip.error(
          `${this.$t("common.error")}: ${err.message || err.err_msg}`
        );
      });

    this.$ajax
      .getJSON("/server/api/template_name_list")
      .then((data) => {
        this.templates = data;
        this.all_templates = data;

        this.model.template_name = data[0];
      })
      .catch((err) => {
        this.$tip.error(
          `${this.$t("common.error")}: ${err.message || err.err_msg}`
        );
      });

    this.$ajax
      .getJSON("/server/api/base_image_list")
      .then((data) => {
        this.baseImageList = data;
        if (this.baseImageList.length > 0) {
          this.model.base_image_id = this.baseImageList[0].id;
        }
      })
      .catch((err) => {
        this.$tip.error(
          `${this.$t("common.error")}: ${err.message || err.err_msg}`
        );
      });

    this.$watch("props.row.node_name", (val, oldVal) => {
      if (val === oldVal) {
        return;
      }

      this.model.adapters.forEach((d) => {
        d.bind_ip = val; // eslint-disable-line no-param-reassign
      });
    });

    this.checkDeployLog();
  },

  methods: {
    changeRunType() {
      this.model.run_type = this.runType ? "" : "container";
    },
    nodeNameChange(obj) {
      obj.bind_ip = obj.node_name;
    },
    addAdapter(template) {
      this.model.adapters.push(Object.assign({}, template));
    },
    deploy() {
      let objNode = [];
      for (var i = 0; i < this.model.adapters.length; i++) {
        var oo =
          this.model.adapters[i].obj_name +
          "-" +
          this.model.adapters[i].node_name;
        if (objNode.indexOf(oo) != -1) {
          this.$tip.error(`${this.$t("deployService.infos.objNodedupErr")}`);
          return;
        } else {
          objNode.push(oo);
        }
      }

      this.$confirm(
        this.$t("deployService.form.deployServiceTip"),
        this.$t("common.alert")
      ).then(() => {
        const loading = this.$Loading.show();

        // console.log(this.model);

        this.$ajax
          .postJSON("/server/api/deploy_server", this.model)
          .then((data) => {
            loading.hide();
            if (data.tars_node_rst && data.tars_node_rst.length) {
              this.showResultModal(data.tars_node_rst);
            } else {
              this.$tip.success(this.$t("deployService.form.ret.success"));
            }
            this.model = getInitialModel();
            this.model.template_name = this.templates[0];
          })
          .catch((err) => {
            loading.hide();
            this.$tip.error(
              `${this.$t("common.error")}: ${err.message || err.err_msg}`
            );
          });
      });
    },
    getAutoPort() {
      const loading = this.$Loading.show();
      var adapters = this.model.adapters;
      var bindIps = [];
      adapters.forEach((adapter) => {
        bindIps.push(adapter.bind_ip);
      });
      this.$ajax
        .getJSON("/server/api/auto_port", { node_name: bindIps.join(";") })
        .then((data) => {
          loading.hide();
          data.forEach((node, index) => {
            this.$set(adapters[index], "port", String(node.port || ""));
          });
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },
    save() {
      var application = document
        .querySelector("#inputApplication .let-select__filter__input")
        .value.trim();

      if (this.model.application == "") {
        this.model.application = application;
      }

      let appReg = new RegExp("^[a-zA-Z]([a-zA-Z0-9]+)?$");
      if (
        !this.applicationList.includes(this.model.application) ||
        !appReg.test(this.model.application)
      ) {
        this.$tip.error(`${this.$t("deployService.form.applicationTip")}`);
        return;
      }

      if (this.$refs.form.validate()) {
        const model = this.model;

        const loading = this.$Loading.show();

        let node_names = [];
        model.adapters.forEach((a) => {
          node_names.push(a.node_name);
        });

        this.$ajax
          .postJSON("/server/api/server_exist", {
            application: model.application,
            server_name: model.server_name,
            node_names: node_names,
          })
          .then((data) => {
            loading.hide();

            if (data) {
              this.$tip.error(this.$t("deployService.form.nameTips"));
            } else {
              this.deploy();
            }
          })
          .catch((err) => {
            loading.hide();
            this.$tip.error(
              `${this.$t("common.error")}: ${err.message || err.err_msg}`
            );
          });
      }
    },

    showResultModal(data) {
      this.resultModal.resultList = data;
      this.resultModal.show = true;
    },

    closeResultModal() {
      this.resultModal.show = false;
      this.resultModal.resultList = [];
    },
    checkDeployLog() {
      this.$ajax
        .getJSON("/server/api/need_deploy_log")
        .then((data) => {
          this.deployModal.show = data.need;
          this.deployShow = !data.need;
          if (data.need) {
            this.deployModal.nodeList = this.nodeList.filter((nodeName) => {
              return nodeName.indexOf("tars-") == -1;
            });

            this.showDeployLog();
          }
        })
        .catch((err) => {
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },
    getPatchList(application, serverName, currPage, pageSize) {
      return this.$ajax.getJSON("/server/api/server_patch_list", {
        application,
        module_name: serverName,
        curr_page: currPage,
        page_size: pageSize,
      });
    },
    showDeployLog() {
      let application = "tars";
      let server_name = "tarslog";
      this.deployModal.model = {
        application: application,
        server_name: server_name,
        patch_id: "",
        patchList: [],
      };
      this.getPatchList(application, server_name, 1, 10).then((data) => {
        this.deployModal.model.patchList = data.rows;
      });
    },
    doDeployLog() {
      if (this.$refs.deployForm.validate()) {
        this.$ajax
          .getJSON("/server/api/expand_deploy_log", {
            node_name: this.deployModal.node_name,
          })
          .then((data) => {
            this.deployModal.model.serverList = data.server;

            this.$refs.publishStatus.savePublishServer(
              this.deployModal,
              this.onCancel
            );
          })
          .catch((err) => {
            this.$tip.error(
              `${this.$t("deployLog.failed")}: ${err.err_msg || err.message}`
            );
          });
      }
    },
    onCancel() {
      this.checkDeployLog();
    },
  },
};
</script>

<style lang="postcss">
.page_operation_deploy {
  .el-table {
    margin: 20px 0 36px;

    th span.required {
      display: inline-block;

      & :after {
        color: #f56c6c;
        content: "*";
        margin-left: 4px;
      }
    }
    tr.err-row td {
      background: #f56c77 !important;
      color: #fff;
    }
  }
  .result-text {
    margin-top: 20px;
    margin-bottom: 10px;
  }

  .set_inputer_item {
    float: left;
    margin-right: 8px;
    width: 126px;
  }

  .borderdiv {
    border: 1px solid #84867f;
  }

  .buttonDiv {
    display: flex;
    flex-direction: row;
    justify-content: flex-start;
  }

  .pre_con {
    display: block;
    overflow: scroll;
  }

  .pre_con pre {
    margin-left: 20px;
    color: #2f2f97;
    display: block;
    word-break: break-word;
    white-space: pre-wrap;
  }
}
</style>
