<template>
  <div class="page_server_manage">
    <!-- 服务列表 -->
    <div class="table_head" style="height:50px">
      <h4>
        {{ this.$t("serverList.title.serverList") }}
        <i
          class="el-icon-refresh-right"
          style="cursor: pointer"
          @click="getServerList()"
        ></i>
      </h4>
    </div>

    <el-table
      v-if="serverList"
      :data="serverList"
      :empty-text="$t('common.nodata')"
    >
      <el-table-column
        :label="$t('deployService.form.app')"
        prop="ServerApp"
      ></el-table-column>
      <el-table-column
        :label="$t('deployService.form.serviceName')"
        prop="ServerName"
      ></el-table-column>
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
      <el-table-column
        :label="$t('serverList.table.th.ip')"
        prop="NodeIp"
      ></el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.version')"
        prop="ServiceVersion"
      ></el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.createTime')"
        prop="CreateTime"
      ></el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.deleteTime')"
        prop="DeleteTime"
      ></el-table-column>
    </el-table>
  </div>
</template>

<script>
import moment from "moment";

export default {
  name: "ServerManage",
  data() {
    return {
      serverData: {
        level: 5,
        application: "",
        server_name: "",
        set_name: "",
        set_area: "",
        set_group: "",
      },

      serverList: [],
    };
  },
  props: ["treeid"],
  methods: {
    gotoLog(data) {
      let url = `/logview.html?History=true&NodeIP=${data.NodeIp}&ServerApp=${data.ServerApp}&ServerName=${data.ServerName}&PodName=${data.PodName}`;
      window.open(url);
    },
    // 获取服务列表
    getServerList(c) {
      this.$ajax
        .getJSON("/k8s/api/pod_history_list", {
          tree_node_id: this.treeid,
        })
        .then((data) => {
          data.Data.forEach((item) => {
            item.CreateTime = moment(item.CreateTime).format(
              "YYYY-MM-DD HH:mm:ss"
            );
            item.DeleteTime = moment(item.DeleteTime).format(
              "YYYY-MM-DD HH:mm:ss"
            );
          });

          this.serverList = data.Data;
        })
        .catch((err) => {
          this.$confirm(
            err.err_msg || err.message || this.$t("serverList.msg.fail"),
            this.$t("common.alert")
          ).then(() => {
            this.getServerList();
          });
        });
    },
    more() {
      this.getServerList(this.continue);
    },
  },
  created() {
    this.serverData = this.$parent.getServerData();
  },
  mounted() {
    this.getServerList();
  },
};
</script>

<style>
@import "../../assets/css/variable.css";

.page_server_manage {
  .tbm16 {
    margin: 16px 0;
  }
  .danger {
    color: var(--off-color);
  }

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
}
</style>
