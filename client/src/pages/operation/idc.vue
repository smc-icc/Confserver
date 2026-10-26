<!--运维管理->IDC分组管理-->

<template>
  <div class="page_operation_templates">
    <!--搜索-->
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <el-form-item :label="$t('idc.grid.groupName')">
        <el-input size="small" v-model="query.group_name"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="small" @click="search" type="primary">{{
          $t("operate.search")
        }}</el-button>
      </el-form-item>
      <div style="float: right">
        <i
          class="el-icon-refresh-right"
          style="margin:10px"
          @click="fetchData()"
        ></i>

        <el-button size="small" type="primary" @click="addGroup">{{
          $t("idc.btn.add")
        }}</el-button>
      </div>
    </el-form>

    <!-- 列表-->
    <el-table
      ref="table"
      :data="items"
      :empty-text="$t('common.nodata')"
      class="hideFir"
    >
      <el-table-column
        prop="group_id"
        style="display: none"
      ></el-table-column>
      <el-table-column
        :label="$t('idc.grid.groupName')"
        prop="group_name"
      ></el-table-column>
      <el-table-column
        :label="$t('idc.grid.groupNameCN')"
        prop="group_name_cn"
      ></el-table-column>
      <el-table-column
        :label="$t('idc.grid.ipOrder')"
        prop="ip_order"
      ></el-table-column>
      <el-table-column
        :label="$t('idc.grid.allowIpRule')"
        prop="allow_ip_rule"
      ></el-table-column>
      <el-table-column
        :label="$t('idc.grid.dennyIpRule')"
        prop="denny_ip_rule"
      ></el-table-column>
      <el-table-column
        :label="$t('idc.grid.lastuser')"
        prop="lastuser"
      ></el-table-column>
      <el-table-column
        :label="$t('idc.grid.modifyTime')"
        prop="modify_time"
      ></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="300px">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="editItem(scope.row)">{{
            $t("operate.update")
          }}</el-button>
          <el-button size="mini" type="text" @click="removeItem(scope.row)">{{
            $t("operate.delete")
          }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- 弹框-->
    <el-dialog
      :visible.sync="detailModal.show"
      :label="
        detailModal.isNew ? this.$t('idc.btn.add') : this.$t('idc.update.title')
      "
      width="800px"
      @on-confirm="saveItem"
      @on-cancel="closeDetailModal"
    >
      <el-form
        ref="detailForm"
        v-if="detailModal.model"
        itemWidth="300px"
        columns="2"
        class="two-columns"
      >
        <el-form-item
          :label="$t('idc.grid.groupName')"
          required
          v-if="!detailModal.isNew"
        >
          {{ detailModal.model.group_name }}
        </el-form-item>
        <el-form-item
          :label="$t('idc.grid.groupName')"
          required
          v-if="detailModal.isNew"
        >
          <el-input
            size="small"
            v-model="detailModal.model.group_name"
            :placeholder="$t('idc.valid.groupName')"
            required
            :required-tip="$t('idc.valid.groupName')"
            pattern="^[a-zA-Z-]([.a-zA-Z0-9-]+)?$"
            :pattern-tip="$t('idc.valid.groupName')"
          ></el-input>
        </el-form-item>
        <el-form-item
          :label="$t('idc.grid.groupNameCN')"
          required
          style="margin-left: 40px"
        >
          <el-input
            size="small"
            v-model="detailModal.model.group_name_cn"
            required
            :placeholder="$t('idc.update.placeholder')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('idc.grid.ipOrder')" required>
          <el-select
            size="small"
            v-model="detailModal.model.ip_order"
            :placeholder="$t('idc.update.allowType')"
            required
          >
            <el-option v-for="t in ipOrders" :key="t" :value="t">{{
              t
            }}</el-option>
          </el-select>
        </el-form-item>
        <el-form-item> </el-form-item>
        <el-form-item :label="$t('idc.grid.allowIpRule')">
          <el-select v-model="detailModal.model.allowList" required multiple>
            <el-option v-for="t in allowList" :key="t" :value="t">{{
              t
            }}</el-option>
          </el-select>
        </el-form-item>
        <el-form-item
          :label="$t('idc.grid.dennyIpRule')"
          style="margin-left: 40px"
        >
          <el-select v-model="detailModal.model.dennyList" required multiple>
            <el-option v-for="t in dennyList" :key="t" :value="t">{{
              t
            }}</el-option>
          </el-select>
        </el-form-item>
        <el-form-item itemWidth="242px">
          <el-input
            v-model="addIp.addAllow"
            :placeholder="$t('idc.update.addIp')"
            size="small"
          ></el-input>
        </el-form-item>
        <el-button type="primary" size="small" @click="addAllowIp">{{
          $t("operate.add")
        }}</el-button>
        <el-form-item itemWidth="242px" style="margin-left: 40px">
          <el-input
            v-model="addIp.addDenny"
            :placeholder="$t('idc.update.addIp')"
            size="small"
          ></el-input>
        </el-form-item>
        <el-button type="primary" size="small" @click="addDennyIp">{{
          $t("operate.add")
        }}</el-button>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: "OperationIDCManage",
  data() {
    return {
      showManualAddItem: false,
      items: [],
      query: {
        group_name: "",
      },
      detailModal: {
        show: false,
        model: null,
        isNew: false,
      },
      ipOrders: ["denny_allow", "allow_denny"],
      allowList: [],
      dennyList: [],
      addIp: {
        addAllow: "",
        addDenny: "",
      },
    };
  },
  mounted() {
    this.fetchData();
  },
  methods: {
    fetchData() {
      const loading = this.$refs.table.$loading.show();
      return this.$ajax
        .getJSON("/server/api/query_idc", this.query)
        .then((data) => {
          loading.hide();
          this.items = data;
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
    getIpList(str) {
      const arr = [];
      if (str.trim() != "") {
        str.split("|").forEach((item) => {
          arr.push(item.trim());
        });
      }
      return arr;
    },
    addGroup() {
      this.allowList = [];
      this.dennyList = [];
      this.detailModal.model = {
        group_name: "",
        group_name_cn: "",
        ip_order: "denny_allow",
        allow_ip_rule: "",
        denny_ip_rule: "",
        allowList: [],
        dennyList: [],
      };
      this.detailModal.show = true;
      this.detailModal.isNew = true;
    },

    editItem(row) {
      const allowList = this.getIpList(row.allow_ip_rule);
      const dennyList = this.getIpList(row.denny_ip_rule);
      this.detailModal.model = {
        allowList: [],
        dennyList: [],
      };
      this.detailModal.model = Object.assign({}, this.detailModal.model, row);
      this.allowList = allowList;
      this.dennyList = dennyList;
      allowList.forEach((item) => {
        this.detailModal.model.allowList.push(item);
      });
      dennyList.forEach((item) => {
        this.detailModal.model.dennyList.push(item);
      });
      this.detailModal.show = true;
      this.detailModal.isNew = false;
    },

    removeItem(row) {
      this.$confirm(
        this.$t("idc.delete.confirmTips"),
        this.$t("common.alert")
      ).then(() => {
        const loading = this.$Loading.show();
        this.$ajax
          .getJSON("/server/api/delete_idc", row)
          .then(() => {
            loading.hide();
            this.fetchData().then(() => {
              this.$tip.success(this.$t("common.success"));
            });
          })
          .catch((err) => {
            loading.hide();
            this.$tip.error(
              `${this.$t("common.error")}: ${err.message || err.err_msg}`
            );
          });
      });
    },

    saveItem() {
      if (this.$refs.detailForm.validate()) {
        const item = this.detailModal.model;
        const url = this.detailModal.isNew
          ? "/server/api/add_idc"
          : "/server/api/update_idc";
        const loading = this.$Loading.show();
        this.$ajax
          .postJSON(url, item)
          .then(() => {
            loading.hide();
            this.$tip.success(this.$t("common.success"));
            this.closeDetailModal();
            this.fetchData();
          })
          .catch((err) => {
            loading.hide();
            this.$tip.error(
              `${this.$t("common.error")}: ${err.message || err.err_msg}`
            );
          });
      }
    },
    //关闭弹窗
    closeDetailModal() {
      this.$refs.detailForm.resetValid();
      this.detailModal.show = false;
      this.detailModal.model = null;
      this.detailModal.isNew = false;
    },
    //添加白名单
    addAllowIp() {
      if (this.validIp(this.addIp.addAllow)) {
        //已经添加
        if (
          this.allowList.includes(this.addIp.addAllow) &&
          this.detailModal.model.allowList.includes(this.addIp.addAllow)
        ) {
          this.$tip.error(`${this.$t("idc.update.exists")}`);
          return;
        } else if (
          this.allowList.includes(this.addIp.addAllow) &&
          !this.detailModal.model.allowList.includes(this.addIp.addAllow)
        ) {
          this.detailModal.model.allowList.push(this.addIp.addAllow);
          this.addIp.addAllow = "";
        } else {
          this.allowList.push(this.addIp.addAllow);
          this.detailModal.model.allowList.push(this.addIp.addAllow);
          this.addIp.addAllow = "";
        }
      } else {
        this.$tip.error(`${this.$t("idc.update.errorIp")}`);
      }
    },
    //添加黑名单
    addDennyIp() {
      if (this.validIp(this.addIp.addDenny)) {
        //已经添加
        if (
          this.dennyList.includes(this.addIp.addDenny) &&
          this.detailModal.model.dennyList.includes(this.addIp.addDenny)
        ) {
          this.$tip.error(`${this.$t("idc.update.exists")}`);
          return;
        } else if (
          this.dennyList.includes(this.addIp.addDenny) &&
          !this.detailModal.model.dennyList.includes(this.addIp.addDenny)
        ) {
          this.detailModal.model.dennyList.push(this.addIp.addDenny);
          this.addIp.addDenny = "";
        } else {
          this.dennyList.push(this.addIp.addDenny);
          this.detailModal.model.dennyList.push(this.addIp.addDenny);
          this.addIp.addDenny = "";
        }
      } else {
        this.$tip.error(`${this.$t("idc.update.errorIp")}`);
      }
    },
    //校验ip是否可用(最后一位支持'*')
    validIp(str) {
      let ipReg = new RegExp(
        "^(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|[1-9])\\.(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\." +
          "(1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)\\.((1\\d{2}|2[0-4]\\d|25[0-5]|[1-9]\\d|\\d)|\\*)$"
      );
      return ipReg.test(str);
    },
  },
};
</script>

<style>
.page_operation_business {
  pre {
    color: #909fa3;
    margin-top: 32px;
  }

  .el-dialog__body {
    overflow-y: visible;
  }

  .el-form.two-columns.el-form-cols-2 {
    margin-right: -30px;

    .el-form-item {
      padding-right: 30px;
    }
  }
}

.hideFir td:first-child {
  display: none;
}

.hideFir th:first-child {
  display: none;
}
</style>
