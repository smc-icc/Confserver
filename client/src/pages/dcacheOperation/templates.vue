<template>
  <div class="page_operation_templates">
    <el-button size="small" type="primary" style="float: right" @click="addItem">{{$t('template.btn.addTempate')}}</el-button>
    <el-form inline itemWidth="200px" @submit.native.prevent="search">
      <el-form-item :label="$t('deployService.form.template')">
        <el-input size="small" v-model="query.template_name"></el-input>
      </el-form-item>
      <el-form-item :label="$t('template.search.parentTemplate')">
        <el-input size="small" v-model="query.parents_name"></el-input>
      </el-form-item>
      <el-form-item>
        <el-button size="small" type="primary" native-type="submit">{{$t('operate.search')}}</el-button>
      </el-form-item>
    </el-form>

    <el-table ref="table" :data="items" :empty-text="$t('common.nodata')">
      <el-table-column :label="$t('deployService.form.template')" prop="template_name" width="25%"></el-table-column>
      <el-table-column :label="$t('template.search.parentTemplate')" prop="parents_name" width="25%"></el-table-column>
      <el-table-column :label="$t('cfg.btn.lastUpdate')" prop="posttime"></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="180px">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="viewItem(scope.row)">{{$t('operate.view')}}</el-button>
          <el-button size="mini" type="text" @click="editItem(scope.row)">{{$t('operate.update')}}</el-button>
          <el-button size="mini" type="text" @click="removeItem(scope.row)">{{$t('operate.delete')}}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog :visible.sync="viewModal.show" :label="$t('template.view.title')" width="800px">
      <pre v-if="viewModal.model">{{viewModal.model.profile}}</pre>
      <template slot="footer"></template>
    </el-dialog>

    <el-dialog
      :visible.sync="detailModal.show"
      :label="detailModal.isNew ? this.$t('template.add.title') : this.$t('template.update.title')"
      width="800px"
      @on-confirm="saveItem"
      @on-cancel="closeDetailModal"
    >
      <el-form ref="detailForm" v-if="detailModal.model" itemWidth="700px">
        <el-form-item :label="$t('deployService.form.template')" required>
          <el-input
            size="small"
            v-model="detailModal.model.template_name"
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
            v-model="detailModal.model.parents_name"
            :placeholder="$t('pub.dlg.defaultValue')"
            required
            :required-tip="$t('deployService.table.tips.empty')"
          >
            <el-option value>{{$t('pub.dlg.defaultValue')}}</el-option>
            <el-option
              v-for="d in items"
              :key="d.id"
              :value="d.template_name"
            >{{d.template_name}}</el-option>
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('template.form.content')" required>
          <el-input
            type="textarea"
            :rows="10"
            size="small"
            v-model="detailModal.model.profile"
            required
            :required-tip="$t('deployService.table.tips.empty')"
          ></el-input>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'OperationTemplates',

  data() {
    return {
      query: {
        template_name: '',
        parents_name: '',
      },
      items: [],
      viewModal: {
        show: false,
        model: null,
      },
      detailModal: {
        show: false,
        model: null,
        isNew: false
      },
    };
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    fetchData() {
      const loading = this.$refs.table.$loading.show();
      return this.$ajax.getJSON('/server/api/query_profile_template', this.query).then((data) => {
        loading.hide();
        this.items = data;
      }).catch((err) => {
        loading.hide();
        this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
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
        const url = model.id ? '/server/api/update_profile_template' : '/server/api/add_profile_template';

        const loading = this.$Loading.show();
        this.$ajax.postJSON(url, model).then(() => {
          loading.hide();
          this.$tip.success(this.$t('common.success'));
          this.closeDetailModal();
          this.fetchData();
        }).catch((err) => {
          loading.hide();
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      }
    },

    removeItem(d) {
      this.$confirm(this.$t('template.delete.confirmTips'), this.$t('common.alert')).then(() => {
        const loading = this.$Loading.show();
        this.$ajax.getJSON('/server/api/delete_profile_template', { id: d.id }).then(() => {
          loading.hide();
          this.fetchData().then(() => {
            this.$tip.success(this.$t('common.success'));
          });
        }).catch((err) => {
          loading.hide();
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      }).catch(() => {});
    },
  },
};
</script>

<style>
.page_operation_templates {
  pre {
    color: #909FA3;
    margin-top: 32px;
  }

  .el-dialog__body {
    overflow-y: visible;
  }
}
</style>
