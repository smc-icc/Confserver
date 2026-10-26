<template>
  <div class="page_operation_templates">
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <el-form-item :label="$t('deployService.form.template')">
        <el-input size="small" v-model="query.template_name"></el-input>
      </el-form-item>
      <el-form-item :label="$t('template.search.parentTemplate')">
        <el-input size="small" v-model="query.parents_name"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="small" type="primary" native-type="submit">{{
          $t("operate.search")
        }}</el-button>
        &nbsp;&nbsp;&nbsp;
        <el-button size="small" type="primary" @click="addItem">{{
          $t("template.btn.addTempate")
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
        :label="$t('deployService.form.template')"
        prop="TemplateName"
        width="25%"
      ></el-table-column>
      <el-table-column
        :label="$t('template.search.parentTemplate')"
        prop="TemplateParent"
        width="25%"
      ></el-table-column>
      <el-table-column
        :label="$t('cfg.btn.lastUpdate')"
        prop="UpdateTime"
      ></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="180px">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="viewItem(scope.row)">{{
            $t("operate.view")
          }}</el-button>
          <el-button size="mini" type="text" @click="editItem(scope.row)">{{
            $t("operate.update")
          }}</el-button>
          <el-button size="mini" type="text" @click="removeItem(scope.row)">{{
            $t("operate.delete")
          }}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <!-- <div style="overflow:hidden;">
      <el-pagination align="right" style="float:right;"
        :current-page="pagination.page" @current-change="gotoPage"
        :total="pagination.total">
      </el-pagination>
    </div> -->

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
          ? this.$t('template.add.title')
          : this.$t('template.update.title')
      "
      width="800px"
      @on-confirm="saveItem"
      @on-cancel="closeDetailModal"
    >
      <el-form ref="detailForm" v-if="detailModal.model" itemWidth="700px">
        <el-form-item :label="$t('deployService.form.template')" required>
          <el-input
            size="small"
            v-model="detailModal.model.TemplateName"
            :placeholder="$t('template.add.templateFormatTips')"
            required
            :required-tip="$t('template.add.templateNameTips')"
            pattern="^[a-zA-Z]([.a-zA-Z0-9]+)?$"
            :pattern-tip="$t('template.add.templateFormatTips')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('template.search.parentTemplate')" required>
          <el-select
            size="small"
            v-model="detailModal.model.TemplateParent"
            :placeholder="$t('pub.dlg.defaultValue')"
            required
            :required-tip="$t('deployService.table.tips.empty')"
          >
            <el-option value>{{ $t("pub.dlg.defaultValue") }}</el-option>
            <el-option
              v-for="d in items"
              :key="d.id"
              :value="d.TemplateName"
              >{{ d.TemplateName }}</el-option
            >
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('deployService.form.serviceMark')">
          <el-input
            size="small"
            v-model="detailModal.model.CreateMark"
            :placeholder="$t('deployService.form.serviceMark')"
          >
          </el-input>
        </el-form-item>
        <el-form-item :label="$t('template.form.content')" required>
          <el-input
            type="textarea"
            :rows="10"
            size="small"
            v-model="detailModal.model.TemplateContent"
            required
            :required-tip="$t('deployService.table.tips.empty')"
          ></el-input>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import moment from "moment";
export default {
  name: "OperationTemplates",

  data() {
    return {
      query: {
        template_name: "",
        parents_name: "",
      },
      items: [],
      // // 分页
      // pagination: {
      //   page: 1,
      //   size: 10,
      //   total:1,
      // },
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
  },

  methods: {
    gotoPage(num) {
      this.pagination.page = num;
      this.fetchData();
    },
    fetchData() {
      const loading = this.$refs.table.$loading.show();
      return this.$ajax
        .getJSON("/k8s/api/template_select", {
          TemplateName: this.query.template_name,
          ParentName: this.query.parents_name,
        })
        .then((data) => {
          loading.hide();
          this.items = data.Data;
          this.items.forEach((item) => {
            item.UpdateTime = moment(item.UpdateTime).format(
              "YYYY-MM-DD HH:mm:ss"
            );
          });
          // this.pagination.total = Math.ceil(data.Count.AllCount / this.pagination.size)
        })
        .catch((err) => {
          loading.hide();
          this.$tip.error(
            `${this.$t("common.error")}: ${err.message || err.err_msg}`
          );
        });
    },

    search() {
      // this.pagination.page = 1;
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

        const url = model.TemplateId
          ? "/k8s/api/template_update"
          : "/k8s/api/template_create";

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
            .getJSON("/k8s/api/template_delete", { TemplateId: d.TemplateId })
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
  },
};
</script>

<style>
.page_operation_templates {
  pre {
    color: #909fa3;
    margin-top: 32px;
  }

  .el-dialog__body {
    overflow-y: auto;
    max-height: 500px;
  }
}
</style>
