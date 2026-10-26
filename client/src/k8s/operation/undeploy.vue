<template>
  <div class="page_operation_undeploy">
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <el-form-item :label="$t('deployService.form.app')">
        <el-input size="small" v-model="query.ServerApp"></el-input>
      </el-form-item>
      <el-form-item :label="$t('deployService.form.serviceName')">
        <el-input size="small" v-model="query.ServerName"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="small" type="primary" @click="fetchData(true, 1)">{{
          $t("operate.search")
        }}</el-button>
        <span>
          <i
            class="el-icon-refresh-right"
            style="margin:10px"
            @click="fetchData(true, 1)"
          ></i>
        </span>
      </el-form-item>
    </el-form>

    <el-table ref="table" :data="serverList" :empty-text="$t('common.nodata')">
      <el-table-column width="60px">
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
      <el-table-column
        :label="$t('deployService.form.app')"
        prop="ServerApp"
      ></el-table-column>
      <el-table-column
        :label="$t('deployService.form.serviceName')"
        prop="ServerName"
      ></el-table-column>
      <el-table-column :label="$t('deployService.form.source')">
        <template slot-scope="scope"
          ><el-tag
            style="cursor:pointer"
            v-if="scope.row.Source['tars.io/CloudInstall']"
            @click="goMarket(scope.row)"
          >
            {{
              scope.row.Source["tars.io/CloudInstall"].group +
                "/" +
                scope.row.Source["tars.io/CloudInstall"].name +
                ":" +
                scope.row.Source["tars.io/CloudInstall"].version
            }}
          </el-tag>
        </template>
      </el-table-column>
    </el-table>

    <div style="overflow:hidden;">
      <div class="btn_group">
        <el-button type="primary" size="small" @click="undeployServer">{{
          $t("operate.undeploy")
        }}</el-button>
      </div>
      <el-pagination
        align="right"
        style="float:right;"
        :current-page="pagination.page"
        @current-change="gotoPage"
        :total="pagination.total"
      >
      </el-pagination>
      <!-- <div style="float:left;">
        <el-button type="primary" size="small" @click="configServer">{{$t('operate.update')}}</el-button>
        <el-button type="primary" size="small" @click="manageServant">{{$t('operate.servant')}}</el-button>
        <el-button type="primary" size="small" @click="manageK8S">{{$t('operate.k8s')}}</el-button>
      </div> -->
    </div>
  </div>
</template>

<script>
export default {
  name: "OperationUndeploy",

  data() {
    return {
      query: {
        ServerApp: "",
        ServerName: "",
      },
      // 分页
      pagination: {
        page: 1,
        size: 10,
        total: 1,
      },
      viewModal: {
        show: false,
        model: null,
      },
      serverList: [],
      isCheckedAll: false,
      checkedList: [],
    };
  },

  watch: {
    isCheckedAll() {
      let { isCheckedAll } = this;
      this.serverList.forEach((item) => {
        item.isChecked = isCheckedAll;
      });

      if (isCheckedAll) {
        this.checkedList = [].concat(this.serverList);
      } else {
        this.checkedList = [];
      }
    },
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    // 切换服务实时状态页码
    gotoPage(num) {
      this.pagination.page = num;
      this.fetchData();
    },
    fetchData(force, page) {
      const loading = this.$refs.table.$loading.show();
      console.log("fetchData", force, page);
      return this.$ajax
        .getJSON("/k8s/api/server_list", {
          ServerApp: this.query.ServerApp,
          ServerName: this.query.ServerName,
          page: page || this.pagination.page,
          size: this.pagination.size,
          force: force,
        })
        .then((data) => {
          loading.hide();
          this.serverList = [];
          if (data.hasOwnProperty("Data")) {
            data.Data.forEach((item) => {
              item.isChecked = false;
              item.Source = item.Source || "{}";
              // console.log(item.Source);
              item.Source = JSON.parse(item.Source);
            });
            this.serverList = data.Data;
          }
          this.pagination.total = Math.ceil(
            data.Count.AllCount / this.pagination.size
          );
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },

    search() {
      this.fetchData();
    },

    closeViewModal() {
      this.viewModal.show = false;
      this.viewModal.model = null;
    },

    viewItem(d) {
      this.viewModal.model = d;
      this.viewModal.show = true;
    },

    checkChange(data) {
      const checkedList = this.checkedList;

      let isChecked = data.isChecked;
      if (isChecked) {
        let isTrue = false;
        checkedList.forEach((item) => {
          if (item.ServerId === data.ServerId) {
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
          if (iitem.ServerId === data.ServerId) {
            isTrue = true;
            index = iindex;
          }
        });
        if (isTrue) {
          checkedList.splice(index, 1);
        }
      }
    },

    undeployServer() {
      // let { checkedList } = this

      const checkedServerList = this.checkedList.filter(
        (item) => item.isChecked
      );
      if (checkedServerList.length <= 0) {
        this.$tip.warning(this.$t("dialog.tips.item"));
        return;
      }

      let ServerIds = checkedServerList.map((item) => item.ServerId);

      this.$confirm(
        this.$t("serverList.dlg.msg.undeploy"),
        this.$t("common.alert")
      ).then(() => {
        const loading = this.$Loading.show();
        this.$ajax
          .postJSON("/k8s/api/server_undeploy", {
            ServerIds,
          })
          .then((res) => {
            loading.hide();
            this.fetchData();
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
};
</script>

<style>
.page_operation_undeploy {
  pre {
    color: #909fa3;
    margin-top: 32px;
  }

  .el-dialog__body {
    overflow-y: visible;
  }

  .success {
    color: #49cc8f;
  }
  .warn {
    color: #e0543f;
  }

  .el-dialog__body .el-form .el-form .el-form-item:last-child {
    margin-bottom: 20px;
  }
}
</style>
