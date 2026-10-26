<template>
  <div class="page_operation_templates">
    <div class="between">
      <el-form inline itemWidth="200px" @submit.native.prevent="search">
        <el-form-item :label="$t('gateway.stationId')">
          <el-input size="small" v-model="query.f_station_id"></el-input>
        </el-form-item>
        <el-form-item :label="$t('gateway.stationName')">
          <el-input size="small" v-model="query.f_name_cn"></el-input>
        </el-form-item>
        <el-form-item>
          <el-button size="small" type="primary" native-type="submit">{{$t('operate.search')}}</el-button>
        </el-form-item>
      </el-form>
      <el-button size="small" type="primary" @click="addItem">{{$t('gateway.btn.addGateway')}}</el-button>
    </div>

    <el-table ref="table" :data="items" :empty-text="$t('common.nodata')">
      <el-table-column :label="$t('gateway.stationId')" prop="f_station_id" width="20%"></el-table-column>
      <el-table-column :label="$t('gateway.stationName')" prop="f_name_cn" width="20%"></el-table-column>
      <el-table-column :label="$t('gateway.monitorUrl')" prop="f_monitor_url" width="25%"></el-table-column>
      <el-table-column :label="$t('cfg.btn.lastUpdate')" prop="f_update_time"></el-table-column>
      <el-table-column :label="$t('operate.operates')" width="300px">
        <template slot-scope="scope">
          <el-button size="mini" type="text" @click="viewItem(scope.row)">{{$t('operate.config')}}</el-button>
          <el-button size="mini" type="text" @click="editItem(scope.row)">{{$t('operate.update')}}</el-button>
          <el-button size="mini" type="text" @click="removeItem(scope.row)">{{$t('operate.delete')}}</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog :visible.sync="viewModal.show" :title="(viewModal.model ? viewModal.model.f_name_cn : '') + ' ' + $t('gateway.config.title')" width="1000px">
      <el-tabs v-if="stationMode == 'http'">
        <el-tab-pane :label="$t('gateway.router.title')">
          <HttpRouter v-if="viewModal.model" :gatewayObj="gatewayObj" :station="viewModal.model"></HttpRouter>
        </el-tab-pane>
        <el-tab-pane :label="$t('gateway.flowControl.title')">
          <FlowControl v-if="viewModal.model" :gatewayObj="gatewayObj" :station="viewModal.model"></FlowControl>
        </el-tab-pane>
        <el-tab-pane :label="$t('gateway.bwlist.title.black')">
          <BwList v-if="viewModal.model" :gatewayObj="gatewayObj" :station="viewModal.model" type="black"></BwList>
        </el-tab-pane>
        <el-tab-pane :label="$t('gateway.bwlist.title.white')">
          <BwList v-if="viewModal.model" :gatewayObj="gatewayObj" :station="viewModal.model" type="white"></BwList>
        </el-tab-pane>
      </el-tabs>
      <el-tabs v-if="stationMode == 'tars'">
        <el-tab-pane :label="$t('gateway.flowControl.title')">
          <FlowControl v-if="viewModal.model" :gatewayObj="gatewayObj" :station="viewModal.model"></FlowControl>
        </el-tab-pane>
        <el-tab-pane :label="$t('gateway.bwlist.title.black')">
          <BwList v-if="viewModal.model" :gatewayObj="gatewayObj" :station="viewModal.model" type="black"></BwList>
        </el-tab-pane>
        <el-tab-pane :label="$t('gateway.bwlist.title.white')">
          <BwList v-if="viewModal.model" :gatewayObj="gatewayObj" :station="viewModal.model" type="white"></BwList>
        </el-tab-pane>
      </el-tabs>
      <template slot="footer"></template>
    </el-dialog>

    <el-dialog
      :visible.sync="detailModal.show"
      :title="detailModal.isNew ? this.$t('gateway.add.title') : this.$t('gateway.update.title')"
      width="800px"
      @on-confirm="saveItem"
      @on-cancel="closeDetailModal"
    >
      <el-form ref="detailForm" v-if="detailModal.model" itemWidth="700px">
        <el-form-item :label="$t('gateway.stationId')" required>
          <el-radio v-model="stationMode" label="http">http</el-radio>
          <el-radio v-model="stationMode" label="tars">tars</el-radio>
          <el-input
            size="small" v-if="stationMode=='http'"
            v-model="detailModal.model.f_station_id"
            :placeholder="$t('gateway.add.idFormatTips')"
            required
            :required-tip="$t('gateway.add.idFormatTips')"
            pattern="^[a-zA-Z](([a-zA-Z_0-9](?<!obj|Obj))+)?$"
            :pattern-tip="$t('gateway.add.idFormatTips')"
          ></el-input>
          <ServantSelector v-if="stationMode=='tars'" :gatewayObj="gatewayObj" v-model="detailModal.model.f_station_id"></ServantSelector>
        </el-form-item>
        <el-form-item :label="$t('gateway.stationName')" required>
          <el-input
            size="small"
            v-model="detailModal.model.f_name_cn"
            :placeholder="$t('gateway.add.stationNameTips')"
            required
            :required-tip="$t('gateway.add.stationNameTips')"
            :pattern-tip="$t('gateway.add.stationNameTips')"
          ></el-input>
        </el-form-item>
        <el-form-item :label="$t('gateway.monitorUrl')">
          <el-input
            size="small"
            v-model="detailModal.model.f_monitor_url"
            :placeholder="$t('gateway.add.monitorUrlTips')"
            :pattern-tip="$t('gateway.add.monitorUrlTips')"
          ></el-input>
        </el-form-item>
      </el-form>
    </el-dialog>
  </div>
</template>

<script>
import BwList from "./bwlist"
import FlowControl from "./flowcontrol"
import HttpRouter from "./httprouter"
import ServantSelector from "./components/ServantSelector"

export default {
  name: 'Station',
  components:{BwList, FlowControl, HttpRouter, ServantSelector},
  props: {
    gatewayObj: {
      type: String,
      required: true
    }
  },
  data() {
    return {
      query: {
        f_station_id: '',
        f_name_cn: '',
      },
      items: [],
      stationMode: 'http',
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
      this.query.gatewayObj = this.gatewayObj
      return this.$ajax.getJSON('/server/api/station_list', this.query).then((data) => {
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
      this.setStationMode(d);
      this.viewModal.show = true;
    },
    editItem(d) {
      this.detailModal.model = d;
      this.setStationMode(d)
      this.detailModal.show = true;
      this.detailModal.isNew = false;
    },
    setStationMode(d){
      if(d.f_station_id.endsWith("obj") || d.f_station_id.endsWith("Obj")){
        this.stationMode = "tars"
      } else {
        this.stationMode = "http"
      }
    },
    saveItem() {
      if (this.$refs.detailForm.validate()) {
        const model = this.detailModal.model;
        const url = model.f_id ? '/server/api/update_station' : '/server/api/add_station';

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

      this.$confirm(this.$t('gateway.delete.confirmTips'), this.$t('common.alert')).then(() => {
        const loading = this.$Loading.show();
        this.$ajax.postJSON('/server/api/delete_station', { f_id: d.f_id, gatewayObj:this.gatewayObj }).then(() => {
          loading.hide();
          this.fetchData().then(() => {
            this.$tip.success(this.$t('common.success'));
          });
        }).catch((err) => {
          loading.hide();
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        });
      }).catch((e) => {   console.error(e)});
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
