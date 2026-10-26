<template>
  <section class="page_operation_region">

    <div>
      <el-button type="primary" size="mini" @click="addRegion">{{$t('region.add')}}</el-button>
    </div>

    <el-table ref="table" :data="items" :empty-text="$t('common.nodata')" :label="$t('region.list')">
      <el-table-column :label="$t('common.serial')" width="25%"><template slot-scope="scope">{{scope.$index + 1}}</template></el-table-column>
      <el-table-column :label="$t('region.title')" prop="region" width="25%"></el-table-column>
      <el-table-column :label="$t('region.label')" prop="label"></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="180px">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="editRegion(scope.row)">{{$t('operate.update')}}</el-button>
          <el-button size="mini" type="text" @click="removeItem(scope.row)">{{$t('operate.delete')}}</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog :title="$t(title)" :visible.sync="showModel" width="600px" @on-confirm="saveItem">
      <el-form ref="detailForm">
        <el-form-item :label="$t('region.title')" required>
          <el-input
            size="small"
            v-model="model.region"
            required
            :placeholder="$t('region.regionTips')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('region.label')" required>
          <el-input
            size="small"
            v-model="model.label"
            required
            :placeholder="$t('region.labelTips')"
          ></el-input>
        </el-form-item>
      </el-form>
    </el-dialog>
  </section>
</template>

<script>
  export default {
    data () {
      return {
        title: 'region.add',
        items: [],
        showModel: false,
        model: {}
      }
    },
    mounted() {
      this.fetchData()
    },
    methods: {
      fetchData() {
        this.$ajax.getJSON('/server/api/get_region_list').then((items) => {
          this.items = items || []
        }).catch((err) => {
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      },
      addRegion () {
        this.showModel = true;
        this.title = 'region.add';
        this.model = {region: '', label: ''}
      },
      editRegion (model) {
          this.showModel = true;
        this.showModel = true;
        this.title = 'region.modify';
        this.model = model
      },
      saveItem() {
        if (this.$refs.detailForm.validate()) {
          const model = this.model;
          const url = model.id ? '/server/api/update_region' : '/server/api/add_region';

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
      removeItem ({id}) {
        this.$ajax.getJSON('/server/api/delete_region', {id}).then((items) => {
          this.$tip.success(this.$t('common.success'));
          this.fetchData()
        }).catch((err) => {
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      },
      closeDetailModal() {
        this.$refs.detailForm.resetValid();
        this.showModel = false;
        this.model = {};
      },
    }
  }
</script>

<style>

</style>
