<template>
  <div class="page_operation_templates">
    <div class="between">
      <el-form inline itemWidth="200px" @submit.native.prevent="search">
        <el-form-item label="upstream">
          <el-input size="small" v-model="query.f_upstream"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button size="small" type="primary" native-type="submit">{{$t('operate.search')}}</el-button>
        </el-form-item>
      </el-form>
      <el-button size="small" type="primary" @click="addItem">{{$t('gateway.btn.addUpstream')}}</el-button>
    </div>

    <el-table ref="table" :data="items" :empty-text="$t('common.nodata')">
      <el-table-column title="upstream" prop="f_upstream" width="20%"></el-table-column>
      <el-table-column :label="$t('gateway.addr')" prop="f_addr" width="20%"></el-table-column>
      <el-table-column :label="$t('gateway.weight')" prop="f_weight"></el-table-column>
      <el-table-column :label="$t('gateway.fusing')" prop="f_fusing_onoff">
         <template slot-scope="scope">
          <span>{{scope.row.f_fusing_onoff == 1 ? $t('gateway.fusingOn') : $t('gateway.fusingOff')}}</span>
        </template>
      </el-table-column>
      <el-table-column :label="$t('cfg.btn.lastUpdate')" prop="f_update_time"></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="200px">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="editItem(scope.row)">{{$t('operate.update')}}</el-button>
          <el-button size="mini" type="text" @click="removeItem(scope.row)">{{$t('operate.delete')}}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog
      :visible.sync="detailModal.show"
      :label="detailModal.isNew ? this.$t('gateway.btn.addUpstream') : this.$t('gateway.update.upstream')"
      width="800px"
      @on-confirm="saveItem"
      @on-cancel="closeDetailModal"
    >
      <el-form ref="detailForm" v-if="detailModal.model" itemWidth="700px">
        <el-form-item label="upstream" required>
          <el-input
            size="small"
            v-model="detailModal.model.f_upstream"
            :placeholder="$t('gateway.add.upstreamFormatTips')"
            required
            :required-tip="$t('gateway.add.upstreamFormatTips')"
            pattern="^[a-zA-Z](([a-zA-Z0-9_](?<!obj|Obj))+)?$"
            :pattern-tip="$t('gateway.add.upstreamFormatTips')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('gateway.addr')" required>
          <el-input
            size="small"
            v-model="detailModal.model.f_addr"
            :placeholder="$t('gateway.add.addrFormatTips')"
            required
            pattern="^(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|[1-9])\.(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|\d)\.(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|\d)\.(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|\d):\d+$"
            :required-tip="$t('gateway.add.addrFormatTips')"
            :pattern-tip="$t('gateway.add.addrFormatTips')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('gateway.weight')" required>
          <el-input
            size="small" type="number"
            v-model="detailModal.model.f_weight"
            required
            pattern="^\d+$"
            :required-tip="$t('gateway.add.weightFormatTips')"
            :placeholder="$t('gateway.add.weightFormatTips')"
            :pattern-tip="$t('gateway.add.weightFormatTips')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('gateway.fusing')">
            <el-radio v-model="detailModal.model.f_fusing_onoff" :label="1">{{$t('gateway.fusingOn')}}</el-radio>
            <el-radio v-model="detailModal.model.f_fusing_onoff" :label="0">{{$t('gateway.fusingOff')}}</el-radio>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
export default {
  name: 'Upstream',
  props: {
    gatewayObj: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      query: {
        f_upstream: ''
      },
      items: [],
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
      this.query.gatewayObj = this.gatewayObj
      return this.$ajax.getJSON('/server/api/upstream_list', this.query).then((data) => {
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
      this.detailModal.model = {
        f_weight: 1,
        f_fusing_onoff: 1
      };
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
        const url = model.f_id ? '/server/api/update_upstream' : '/server/api/add_upstream';

        const loading = this.$Loading.show();
        model.gatewayObj = this.gatewayObj
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
      this.$confirm(this.$t('gateway.delete.upstreamConfirmTips'), this.$t('common.alert')).then(() => {
        const loading = this.$Loading.show();
        this.$ajax.postJSON('/server/api/delete_upstream', { f_id: d.f_id, gatewayObj: this.gatewayObj }).then(() => {
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

<style lang="postcss" scoped>
.page_operation_templates {
  pre {
    color: #909FA3;
    margin-top: 32px;
  }

  .el-dialog__body {
    overflow-y: visible;
  }
}
.between{
  display: flex;
  justify-content: space-between;
  align-items: center;
}
</style>
