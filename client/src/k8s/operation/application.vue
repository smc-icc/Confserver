<template>
  <div class="page_base_application">
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <el-form-item :label="$t('deployService.form.app')">
        <el-input size="small" v-model="query.ServerApp"></el-input>
      </el-form-item>
      <el-form-item :label="$t('deployService.form.business')">
        <el-input size="small" v-model="query.BusinessName"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="small" type="primary" native-type="submit">{{
          $t("operate.search")
        }}</el-button>
        &nbsp;&nbsp;&nbsp;
        <el-button size="small" type="primary" @click="addItem">{{
          $t("template.btn.addApplication")
        }}</el-button>
        <span>
          <i
            class="el-icon-refresh-right"
            style="margin:10px"
            @click="fetchData()"
          ></i>
        </span>
      </el-form-item>
    </el-form>

    <el-table ref="table" :data="items" :empty-text="$t('common.nodata')">
      <el-table-column
        :label="$t('deployService.form.app')"
        prop="ServerApp"
        width="25%"
      ></el-table-column>
      <el-table-column
        :label="$t('deployService.form.business')"
        prop="BusinessName"
        width="25%"
      ></el-table-column>
      <el-table-column
        :label="$t('deployService.form.appMark')"
        prop="AppMark"
      ></el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.createTime')"
        prop="CreateTime"
      ></el-table-column>
      <el-table-column
        :label="$t('serverList.table.th.createPerson')"
        prop="CreatePerson"
      ></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="180px">
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

    <div style="overflow:hidden;">
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

    <el-dialog
      :visible.sync="viewModal.show"
      :label="$t('template.view.title')"
      width="800px"
    >
      <pre v-if="viewModal.model">{{ viewModal.model.TemplateContent }}</pre>
      <template slot="footer"></template>
    </el-dialog>

    <el-dialog
      :visible.sync="detailModal.show"
      :label="
        detailModal.isNew
          ? this.$t('dialog.title.add')
          : this.$t('dialog.title.edit')
      "
      width="800px"
      @on-confirm="saveItem"
      @on-cancel="closeDetailModal"
    >
      <el-form ref="detailForm" v-if="detailModal.model" itemWidth="700px">
        <el-form-item :label="$t('deployService.form.app')" required>
          <el-input
            :disabled="detailModal.isNew ? false : true"
            size="small"
            v-model="detailModal.model.ServerApp"
            :placeholder="$t('deployService.form.placeholder')"
            required
            :required-tip="$t('deployService.form.appTips')"
            pattern="^[a-zA-Z0-9]+$"
            :pattern-tip="$t('deployService.form.placeholder')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('deployService.form.business')">
          <el-select
            size="small"
            v-model="detailModal.model.BusinessName"
            :placeholder="$t('pub.dlg.defaultValue')"
          >
            <el-option
              v-for="d in BusinessList"
              :key="d.BusinessName"
              :value="d.BusinessName"
              >{{ d.BusinessShow }}</el-option
            >
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('deployService.form.appMark')">
          <el-input
            size="small"
            v-model="detailModal.model.AppMark"
          ></el-input>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import moment from "moment";

export default {
  name: "BaseApplication",

  data() {
    return {
      query: {
        ServerApp: "",
        BusinessName: "",
      },
      items: [],
      BusinessList: [],
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
      detailModal: {
        show: false,
        model: null,
        isNew: false,
      },
    };
  },

  mounted() {
    this.fetchData();
    this.getBusinessList();
  },

  methods: {
    gotoPage(num) {
      this.pagination.page = num;
      this.fetchData();
    },
    fetchData() {
      const loading = this.$refs.table.$loading.show();
      return this.$ajax
        .getJSON(
          "/k8s/api/application_select",
          Object.assign(this.query, {
            page: this.pagination.page,
            size: this.pagination.size,
          })
        )
        .then((data) => {
          loading.hide();
          this.items = data.Data;
          this.items.forEach((item) => {
            item.CreateTime = moment(item.CreateTime).format(
              "YYYY-MM-DD HH:mm:ss"
            );
          });
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
      this.pagination.page = 1;
      this.fetchData();
    },

    closeDetailModal() {
      this.$refs.detailForm.resetValid();
      this.detailModal.show = false;
      this.detailModal.model = null;
    },

    addItem() {
      this.detailModal.model = {};
      this.detailModal.show = true;
      this.detailModal.isNew = true;
    },

    viewItem(d) {
      this.viewModal.model = d;
      this.viewModal.show = true;
    },

    editItem(d) {
      this.detailModal.model = d;
      this.detailModal.show = true;
      this.detailModal.isNew = false;
    },

    saveItem() {
      if (this.$refs.detailForm.validate()) {
        const model = this.detailModal.model;
        const url = this.detailModal.isNew
          ? "/k8s/api/application_create"
          : "/k8s/api/application_update";

        const loading = this.$Loading.show();
        this.$ajax
          .postJSON(url, model)
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

    removeItem(d) {
      this.$confirm(
        this.$t("template.delete.confirmTips"),
        this.$t("common.alert")
      )
        .then(() => {
          const loading = this.$Loading.show();
          this.$ajax
            .getJSON("/k8s/api/application_delete", { ServerApp: d.ServerApp })
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
        })
        .catch(() => {});
    },

    getBusinessList() {
      this.$ajax
        .getJSON("/k8s/api/business_select", { isAll: true })
        .then((data) => {
          this.BusinessList = [
            {
              BusinessMark: "",
              BusinessName: "",
              BusinessOrder: 0,
              BusinessShow: "",
              CreatePerson: "",
              CreateTime: new Date(),
            },
          ].concat(data.Data);
        });
    },
  },
};
</script>

<style>
.page_base_application {
  pre {
    color: #909fa3;
    margin-top: 32px;
  }

  .el-dialog__body {
    overflow-y: visible;
  }
}
</style>
