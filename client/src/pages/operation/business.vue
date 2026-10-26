<template>
  <div class="page_operation_business">
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <el-form-item :label="$t('business.form.business')">
        <el-input size="small" v-model="query.f_name"></el-input>
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

        <el-button
          size="small"
          type="primary"
          style="float: right"
          @click="addItem"
          >{{ $t("business.btn.add") }}</el-button
        >
      </div>
    </el-form>

    <el-table ref="table" :data="items" :empty-text="$t('common.nodata')">
      <el-table-column
        :label="$t('business.form.business')"
        prop="f_name"
      ></el-table-column>
      <el-table-column
        :label="$t('business.form.showName')"
        prop="f_show_name"
      ></el-table-column>
      <el-table-column
        :label="$t('business.form.order')"
        prop="f_order"
      ></el-table-column>
      <el-table-column
        :label="$t('business.form.person')"
        prop="f_create_person"
      ></el-table-column>
      <el-table-column
        :label="$t('business.form.time')"
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
      :label="$t('business.view.title')"
      width="800px"
    >
      <pre v-if="viewModal.model">{{ viewModal.model.profile }}</pre>
      <template slot="footer"></template>
    </el-dialog>

    <el-dialog
      :visible.sync="detailModal.show"
      :label="
        detailModal.isNew
          ? this.$t('business.add.title')
          : this.$t('business.update.title')
      "
      width="800px"
      @on-confirm="saveItem"
      @on-cancel="closeDetailModal"
    >
      <el-form ref="detailForm" v-if="detailModal.model" itemWidth="700px">
        <el-form-item :label="$t('business.form.business')" required>
          <el-input
            size="small"
            v-model="detailModal.model.f_name"
            :placeholder="$t('business.add.formatTips')"
            required
            :required-tip="$t('business.add.nameTips')"
            pattern="^[a-zA-Z]([.a-zA-Z0-9]+)?$"
            :pattern-tip="$t('business.add.formatTips')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('business.form.showName')" required>
          <el-input
            size="small"
            v-model="detailModal.model.f_show_name"
            :placeholder="$t('common.notEmpty')"
            required
            :required-tip="$t('common.notEmpty')"
            :pattern-tip="$t('common.notEmpty')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('business.form.order')">
          <el-input
            size="small"
            v-model="detailModal.model.f_order"
            :placeholder="$t('common.needNumber')"
            :required-tip="$t('common.needNumber')"
            pattern="^([0-9]+)?$"
            :pattern-tip="$t('common.needNumber')"
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
        f_name: "",
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
    };
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    fetchData() {
      const loading = this.$refs.table.$loading.show();
      return this.$ajax
        .getJSON("/server/api/query_business", this.query)
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
          ? "/server/api/update_business"
          : "/server/api/add_business";

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
        this.$t("business.delete.confirmTips"),
        this.$t("common.alert")
      )
        .then(() => {
          const loading = this.$Loading.show();
          this.$ajax
            .getJSON("/server/api/delete_business", { f_id: d.f_id })
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
