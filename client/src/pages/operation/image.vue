<template>
  <div class="page_operation_approval">
    <el-card style="margin-top: 10px;padding:15px">
      <div>
        <span
          >{{ $t("deployService.title.baseRegistry") }}
          <i class="el-icon-refresh-right" @click="fetchRegistryData()"></i>
        </span>

        <span style="float: right; margin-bottom: 10px">
          <el-button type="success" size="small" @click="showDockerLogin"
            >{{ $t("imageService.btn.docker") }}
          </el-button>
          &nbsp;&nbsp;
          <el-button
            style="float: right; margin-bottom: 10px"
            type="primary"
            size="small"
            @click="addRegistryItem"
            >{{ $t("imageService.btn.add") }}
          </el-button>
        </span>
      </div>
      <el-table
        ref="tableRegistry"
        :data="baseRegistryLists"
        :empty-text="$t('common.nodata')"
      >
        <el-table-column
          :label="$t('imageService.form.Registry')"
          prop="registry"
          min-width="200"
          show-overflow-tooltip
        >
        </el-table-column>
        <el-table-column
          :label="$t('imageService.form.UserName')"
          prop="username"
          min-width="120"
          show-overflow-tooltip
        ></el-table-column>
        <el-table-column
          :label="$t('imageService.form.Mark')"
          prop="remark"
          min-width="140"
          show-overflow-tooltip
        ></el-table-column>
        <el-table-column
          :label="$t('imageService.form.UpdateTime')"
          prop="update_time"
          width="180"
        ></el-table-column>
        <el-table-column
          :label="$t('imageService.form.CreateTime')"
          prop="create_time"
          width="180"
        ></el-table-column>
        <el-table-column :label="$t('operate.operates')" width="180" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="editRegistryItem(scope.row)"
              >{{ $t("operate.update") }}
            </el-button>
            <el-button size="mini" type="text" @click="removeRegistryItem(scope.row)"
              >{{ $t("operate.delete") }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
    <br />
    <el-card style="margin-top: 10px;padding:15px">
      <div>
        <span
          >{{ $t("deployService.title.baseImage") }}
          <i class="el-icon-refresh-right" @click="fetchImageData()"></i>
        </span>
        <el-button
          style="float: right; margin-bottom: 10px"
          type="primary"
          size="small"
          @click="addImageItem"
          >{{ $t("imageService.btn.add") }}
        </el-button>
      </div>
      <el-table ref="table" :data="baseLists" :empty-text="$t('common.nodata')">
        <el-table-column
          :label="$t('imageService.form.Image')"
          prop="image"
          min-width="220"
          show-overflow-tooltip
        ></el-table-column>
        <el-table-column
          :label="$t('imageService.form.Registry')"
          prop="registry"
          min-width="160"
          show-overflow-tooltip
        >
        </el-table-column>
        <el-table-column label="sha256" prop="sha" min-width="180" show-overflow-tooltip>
        </el-table-column>
        <el-table-column
          :label="$t('imageService.form.Mark')"
          prop="remark"
          min-width="140"
          show-overflow-tooltip
        ></el-table-column>
        <el-table-column
          :label="$t('imageService.form.Result')"
          prop="result"
          width="100"
        ></el-table-column>
        <!-- <el-table-column
          :label="$t('imageService.form.UpdateTime')"
          prop="update_time"
        ></el-table-column> -->
        <!-- <el-table-column
          :label="$t('imageService.form.CreateTime')"
          prop="create_time"
        ></el-table-column> -->
        <el-table-column :label="$t('operate.operates')" width="220" fixed="right">
          <template slot-scope="scope">
            <el-button size="mini" type="text" @click="editImageItem(scope.row)"
              >{{ $t("operate.update") }}
            </el-button>
            <el-button size="mini" type="text" @click="removeImageItem(scope.row)"
              >{{ $t("operate.delete") }}
            </el-button>
            <el-button size="mini" type="text" @click="pullImageItem(scope.row)"
              >{{ $t("operate.pull") }}
            </el-button>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <!--仓库-->
    <el-dialog
      :visible.sync="baseRegistryModal.show"
      :label="
        baseRegistryModal.isNew
          ? this.$t('dialog.title.add')
          : this.$t('dialog.title.edit')
      "
      :footShow="false"
    >
      <el-form ref="detailRegistryForm" :rules="registryRules">
        <el-form-item :label="$t('imageService.form.Registry')">
          <el-input
            size="small"
            v-model="baseRegistryModal.model.registry"
            placeholder="docker.io"
          >
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('imageService.form.UserName')">
          <el-input
            size="small"
            v-model="baseRegistryModal.model.username"
            :placeholder="$t('imageService.form.UserName')"
          >
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('imageService.form.Password')">
          <el-input
            size="small"
            v-model="baseRegistryModal.model.password"
            type="password"
            :placeholder="$t('imageService.form.Password')"
          >
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('imageService.form.Mark')" required>
          <el-input
            size="small"
            v-model="baseRegistryModal.model.remark"
            :placeholder="$t('imageService.form.Mark')"
          >
          </el-input>
        </el-form-item>
        <el-button type="success" size="small" @click="saveRegistryItem"
          >{{ $t("common.submit") }}
        </el-button>
        &nbsp;&nbsp;
        <el-button
          type="primary"
          size="small"
          @click="baseRegistryModal.show = false"
          >{{ $t("common.cancel") }}
        </el-button>
        &nbsp;&nbsp;
        <el-button type="primary" size="small" @click="checkDockerRegistry"
          >{{ $t("imageService.btn.checkRegistry") }}
        </el-button>
      </el-form>
    </el-dialog>

    <!--基础镜像-->
    <el-dialog
      :visible.sync="baseModal.show"
      :label="
        baseModal.isNew
          ? this.$t('dialog.title.add')
          : this.$t('dialog.title.edit')
      "
      @on-confirm="saveImageItem"
    >
      <el-form ref="detailForm" :rules="rules" inline>
        <el-form-item :label="$t('imageService.form.Registry')" required>
          <el-select size="small" v-model="baseModal.model.registryId">
            <el-option
              v-for="r in baseRegistryLists"
              :key="r.id"
              :value="r.id"
              >{{ r.registry + "(" + r.remark + ")" }}</el-option
            >
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('imageService.form.Image')" required>
          <el-input
            size="small"
            v-model="baseModal.model.image"
            :placeholder="$t('imageService.form.Image')"
          >
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('imageService.form.Mark')" required>
          <el-input
            size="small"
            v-model="baseModal.model.remark"
            :placeholder="$t('imageService.form.Mark')"
          >
          </el-input>
        </el-form-item>
      </el-form>
    </el-dialog>

    <el-dialog
      :label="$t('imageService.btn.docker')"
      :visible.sync="nodeListModal.show"
      :footShow="false"
      width="80%"
    >
      <el-table
        :data="nodeListModal.nodeList"
        stripe
        style="margin:10px"
        :row-class-name="tableRowClassName"
        @selection-change="handleSelectionChange"
        :empty-text="$t('common.nodata')"
        ref="nodeListLoading"
      >
        <el-table-column type="selection" width="80"> </el-table-column>
        <el-table-column
          :label="$t('nodeList.table.th.node_name')"
          prop="node_name"
          width="150"
        ></el-table-column>
        <el-table-column
          :label="$t('nodeList.table.th.present_state')"
          width="150"
        >
          <template slot-scope="scope">
            <span
              :class="
                scope.row.present_state === 'active' ? 'active' : 'inactive'
              "
              >{{ scope.row.present_state }}</span
            >
          </template>
        </el-table-column>
        <el-table-column
          :label="$t('nodeList.table.th.version')"
          prop="tars_version"
          width="200"
        ></el-table-column>
        <el-table-column :label="$t('nodeList.table.th.result')">
          <template slot-scope="scope">
            <span v-html="scope.row.result"></span>
          </template>
        </el-table-column>
      </el-table>

      <div>
        <el-button type="primary" size="small" @click="forceDockerLogin"
          >{{ $t("imageService.btn.docker") }}
        </el-button>
        <el-pagination
          style="display: inline; float: right"
          :current-page="nodeListModal.pageNum"
          @current-change="gotoPage"
          :total="nodeListModal.total"
        >
        </el-pagination>
      </div>
    </el-dialog>
  </div>
</template>

<script>
import moment from "moment";

export default {
  name: "OperationImage",
  data() {
    return {
      //仓库信息列表
      baseRegistryLists: [],
      //base详细信息(add/update)
      baseRegistryModal: {
        show: false,
        model: {},
        isNew: false,
      },
      //base镜像信息list
      baseLists: [],

      nodeListModal: {
        show: false,
        nodeList: [],
        pageNum: 1,
        pageSize: 20,
        total: 1,
        multipleSelection: [],
      },

      //base详细信息(add/update)
      baseModal: {
        show: false,
        model: {},
        isNew: false,
      },
      registryRules: {
        remark: [
          {
            required: true,
            message: `${this.$t("imageService.node.markTip")}`,
            trigger: "blur",
          },
        ],
      },
      rules: {
        image: [
          {
            required: true,
            message: `${this.$t("imageService.node.imageAddressTip")}`,
            trigger: "blur",
          },
        ],
        remark: [
          {
            required: true,
            message: `${this.$t("imageService.node.markTip")}`,
            trigger: "blur",
          },
        ],
      },
    };
  },
  mounted() {
    this.fetchRegistryData();
  },
  methods: {
    showDockerLogin() {
      this.nodeListModal.show = true;
      this.getNodeList();
    },
    async forceDockerLogin() {
      if (this.nodeListModal.multipleSelection.length == 0) {
        this.$Notice({
          message: this.$t("imageService.form.Choose"),
          type: "warning",
        });
        return;
      }
      for (let i = 0; i < this.nodeListModal.multipleSelection.length; i++) {
        let node_name = this.nodeListModal.multipleSelection[i].node_name;

        let ret = this.nodeListModal.nodeList.findIndex((v) => {
          return v.node_name == node_name;
        });

        this.nodeListModal.nodeList[ret].result = "docker login...";

        this.$set(
          this.nodeListModal.nodeList,
          ret,
          this.nodeListModal.nodeList[ret]
        );

        try {
          let data = await this.$ajax.postJSON(
            "/server/api/force_docker_login",
            {
              nodeName: node_name,
            }
          );

          data.forEach((d) => {
            let style = "";
            if (d.indexOf("Succeeded") != -1) {
              style = "color: green";
            } else {
              style = "color: red";
            }

            this.nodeListModal.nodeList[ret].result +=
              '<div style="' + style + '">' + d + "</div>";
          });

          this.$set(
            this.nodeListModal.nodeList,
            ret,
            this.nodeListModal.nodeList[ret]
          );
        } catch (err) {
          this.nodeListModal.nodeList[ret].result +=
            '<div style="red">' +
            `${this.$t("common.error")}: ${err.message || err.err_msg}` +
            "</div>";

          this.$set(
            this.nodeListModal.nodeList,
            ret,
            this.nodeListModal.nodeList[ret]
          );
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        }
      }
    },
    handleSelectionChange(val) {
      this.nodeListModal.multipleSelection = val;
      // console.log(val);
    },
    fetchRegistryData() {
      const loading = this.$refs.tableRegistry.$loading.show();

      return this.$ajax
        .getJSON("/server/api/base_registry")
        .then((data) => {
          loading.hide();
          this.baseRegistryLists = data;

          this.baseRegistryLists.forEach((image) => {
            image.create_time = moment(image.create_time).format(
              "YYYY-MM-DD HH:mm:ss"
            );
            image.update_time = moment(image.update_time).format(
              "YYYY-MM-DD HH:mm:ss"
            );
          });

          this.fetchImageData();
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },
    checkDockerRegistry() {
      const loading = this.$refs.tableRegistry.$loading.show();

      if (
        !this.baseRegistryModal.model.registry ||
        this.baseRegistryModal.model.registry == ""
      ) {
        this.baseRegistryModal.model.registry = "docker.io";
      }

      return this.$ajax
        .postJSON(
          "/server/api/check_docker_registry",
          this.baseRegistryModal.model
        )
        .then((data) => {
          loading.hide();

          this.$tip.success(data);
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },
    saveRegistryItem() {
      const loading = this.$refs.tableRegistry.$loading.show();

      if (
        !this.baseRegistryModal.model.registry ||
        this.baseRegistryModal.model.registry == ""
      ) {
        this.baseRegistryModal.model.registry = "docker.io";
      }
      return this.$ajax
        .postJSON(
          this.baseRegistryModal.isNew
            ? "/server/api/add_registry"
            : "/server/api/update_registry",
          this.baseRegistryModal.model
        )
        .then((data) => {
          loading.hide();

          this.baseRegistryModal.show = false;

          this.fetchRegistryData();

          this.$tip.success(this.$t("common.success"));
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },
    addRegistryItem() {
      this.baseRegistryModal.show = true;
      this.baseRegistryModal.model = {};
      this.baseRegistryModal.isNew = true;
    },
    editRegistryItem(row) {
      this.baseRegistryModal.show = true;
      this.baseRegistryModal.model = row;
      this.baseRegistryModal.isNew = false;
    },
    removeRegistryItem(row) {
      this.$confirm(
        this.$t("imageService.form.DeleteRegistryTips"),
        this.$t("common.alert")
      )
        .then(() => {
          const loading = this.$refs.tableRegistry.$loading.show();

          return this.$ajax
            .postJSON("/server/api/delete_registry", {
              id: row.id,
            })
            .then((data) => {
              loading.hide();

              this.fetchRegistryData();
            })
            .catch((err) => {
              loading.hide();
              this.$tip.error(
                `${this.$t("common.error")}: ${err.message || err.err_msg}`
              );
            });
        })
        .catch(() => {});
    },
    fetchImageData() {
      const loading = this.$refs.table.$loading.show();

      return this.$ajax
        .getJSON("/server/api/base_image", {
          offset: 0,
          limit: -1,
        })
        .then((data) => {
          loading.hide();
          this.baseLists = data.rows;

          this.baseLists.forEach((image) => {
            image.create_time = moment(image.create_time).format(
              "YYYY-MM-DD HH:mm:ss"
            );

            let registry = this.baseRegistryLists.filter((v) => {
              return v.id == image.registryId;
            });

            if (registry.length == 0) {
              image.registry = "error!!";
            } else {
              image.registry = registry[0].registry;
            }
            image.update_time = moment(image.update_time).format(
              "YYYY-MM-DD HH:mm:ss"
            );
          });
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },
    saveImageItem() {
      let registry = this.baseRegistryLists.filter((v) => {
        return v.id == this.baseModal.model.registryId;
      })[0];

      if (!registry) {
        this.$tip.error(`${this.$t("common.error")}`);
        return;
      }

      if (
        registry.registry != "docker.io" &&
        !this.baseModal.model.image.startsWith(registry.registry)
      ) {
        this.$tip.error(`${this.$t("imageService.btn.imageTips")}`);
        return;
      }

      if (this.baseModal.model.image.indexOf(":") == -1) {
        this.baseModal.model.image = this.baseModal.model.image + ":latest";
      }

      const loading = this.$refs.table.$loading.show();

      return this.$ajax
        .postJSON(
          this.baseModal.isNew
            ? "/server/api/add_image"
            : "/server/api/update_image",
          this.baseModal.model
        )
        .then((data) => {
          loading.hide();

          this.baseModal.show = false;

          this.fetchImageData();

          this.$tip.success(this.$t("common.success"));
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },
    addImageItem() {
      this.baseModal.show = true;
      this.baseModal.model = {};
      this.baseModal.isNew = true;
    },
    editImageItem(row) {
      this.baseModal.show = true;
      this.baseModal.isNew = false;
      this.baseModal.model = row;
    },
    removeImageItem(row) {
      this.$confirm(
        this.$t("imageService.form.DeleteImageTips"),
        this.$t("common.alert")
      )
        .then(() => {
          const loading = this.$refs.table.$loading.show();

          return this.$ajax
            .postJSON("/server/api/delete_image", {
              id: row.id,
            })
            .then((data) => {
              loading.hide();

              this.fetchImageData();
            })
            .catch((err) => {
              loading.hide();
              this.$tip.error(
                `${this.$t("common.error")}: ${err.message || err.err_msg}`
              );
            });
        })
        .catch(() => {});
    },
    pullImageItem(row) {
      this.$ajax
        .postJSON("/server/api/docker_pull", {
          id: row.id,
        })
        .then((data) => {
          this.$tip.success("succ");
        })
        .catch((err) => {
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },
    tableRowClassName({ row, rowIndex }) {
      if (row.present_state === "active") {
        return "red-row";
      }
      return "";
    },
    getNodeList(curr_page) {
      const loading = this.$refs.nodeListLoading.$loading.show();

      if (!curr_page) {
        curr_page = this.nodeListModal.pageNum || 1;
      }

      this.$ajax
        .getJSON("/server/api/list_tars_node", {
          node_name: "",
          page_size: this.nodeListModal.pageSize,
          curr_page: curr_page,
        })
        .then((data) => {
          loading.hide();
          this.nodeListModal.pageNum = curr_page;
          this.nodeListModal.total =
            (data.count + 1) / this.nodeListModal.pageSize;
          this.nodeListModal.nodeList = data.rows;

          this.nodeListModal.nodeList.forEach((x) => {
            x.last_heartbeat = moment(x.last_heartbeat).format(
              "YYYY-MM-DD HH:mm:ss"
            );
            x.last_reg_time = moment(x.last_reg_time).format(
              "YYYY-MM-DD HH:mm:ss"
            );
          });
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.err_msg || err.message}`
          );
        });
    },
    gotoPage(num) {
      this.getNodeList(num);
    },
  },
};
</script>

<style scoped lang="postcss">
active,
.inactive {
  &:before {
    content: " ";
    display: inline-block;
    width: 7px;
    height: 7px;
    border-radius: 100%;
    margin-right: 5px;
  }
}
.active {
  color: green;
  &:before {
    background: green;
  }
}
.inactive {
  color: red;
  &:before {
    background: red;
  }
}
</style>
