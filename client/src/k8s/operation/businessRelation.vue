<template>
  <div class="page_operation_businessRelation">
    <el-button
      size="small"
      type="primary"
      style="float: right"
      @click="addItem"
      >{{ $t("businessRelation.btn.add") }}</el-button
    >
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <el-form-item :label="$t('business.form.business')">
        <el-select
          v-model="query.f_business_name"
          size="small"
          filterable
          v-if="business && business.length > 0"
        >
          <el-option v-for="d in business" :key="d.f_id" :value="d.f_name">{{
            d.f_name
          }}</el-option>
        </el-select>
        <el-input
          size="small"
          v-model="query.f_business_name"
          v-else
        ></el-input>
      </el-form-item>
      <el-form-item :label="$t('application.form.application')">
        <el-select
          v-model="query.f_application_name"
          size="small"
          filterable
          v-if="application && application.length > 0"
        >
          <el-option
            v-for="d in application"
            :key="d.f_id"
            :value="d.f_name"
            >{{ d.f_name }}</el-option
          >
        </el-select>
        <el-input
          size="small"
          v-model="query.f_application_name"
          v-else
        ></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="small" type="primary" native-type="submit">{{
          $t("operate.search")
        }}</el-button>

      </el-form-item>
    </el-form>

    <el-table ref="table" :data="items" :empty-text="$t('common.nodata')">
      <el-table-column
        :label="$t('business.form.business')"
        prop="f_business_name"
      ></el-table-column>
      <el-table-column
        :label="$t('application.form.application')"
        prop="f_application_name"
      ></el-table-column>
      <el-table-column
        :label="$t('businessRelation.form.person')"
        prop="f_create_person"
      ></el-table-column>
      <el-table-column
        :label="$t('businessRelation.form.time')"
        prop="f_create_time"
      ></el-table-column>
      <el-table-column :label="$t('operate.operates')">
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

    <el-dialog
      :visible.sync="viewModal.show"
      :label="$t('businessRelation.view.title')"
      width="800px"
    >
      <pre v-if="viewModal.model">{{ viewModal.model.profile }}</pre>
      <template slot="footer"></template>
    </el-dialog>

    <el-dialog
      :visible.sync="detailModal.show"
      :label="
        detailModal.isNew
          ? this.$t('businessRelation.add.title')
          : this.$t('businessRelation.update.title')
      "
      width="800px"
      @on-confirm="saveItem"
      @on-cancel="closeDetailModal"
    >
      <el-form ref="detailForm" v-if="detailModal.model" itemWidth="700px">
        <el-form-item :label="$t('application.form.application')" required>
          <el-input
            disabled
            size="small"
            v-model="detailModal.model.f_application_name"
            :placeholder="$t('common.notEmpty')"
            required
            :required-tip="$t('common.notEmpty')"
            :pattern-tip="$t('common.notEmpty')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('business.form.business')" required>
          <el-select
            v-if="business && business.length > 0"
            v-model="detailModal.model.f_business_name"
            size="small"
            required
            :required-tip="$t('common.notEmpty')"
          >
            <el-option v-for="d in business" :key="d.f_id" :value="d.f_name">{{
              d.f_name
            }}</el-option>
          </el-select>
          <el-input
            v-else
            size="small"
            v-model="detailModal.model.f_business_name"
            :placeholder="$t('common.notEmpty')"
            required
            :required-tip="$t('common.notEmpty')"
            :pattern-tip="$t('common.notEmpty')"
          ></el-input>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: "OperationApplication",

  data() {
    return {
      query: {
        f_business_name: "",
        f_application_name: "",
      },
      items: [],
      viewModal: {
        show: false,
        model: null,
      },
      detailModal: {
        show: false,
        model: null,
        isNew: false,
      },
      business: [],
      application: [],
    };
  },

  mounted() {
    this.fetchData();
    this.getBusinessData();
    this.getApplicationData();
  },

  methods: {
    fetchData() {
      const loading = this.$refs.table.$loading.show();
      return this.$ajax
        .getJSON("/k8s/api/query_business_relation", this.query)
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
        const url = model.f_id
          ? "/k8s/api/update_business_relation"
          : "/k8s/api/add_business_relation";

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
        this.$t("businessRelation.delete.confirmTips"),
        this.$t("common.alert")
      )
        .then(() => {
          const loading = this.$Loading.show();
          this.$ajax
            .getJSON("/k8s/api/delete_business_relation", { f_id: d.f_id })
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

    getBusinessData() {
      return this.$ajax.getJSON("/k8s/api/query_business").then((data) => {
        this.business = data;
      });
    },

    getApplicationData() {
      return this.$ajax.getJSON("/k8s/api/query_application").then((data) => {
        this.application = data;
      });
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
}
</style>
