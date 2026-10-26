<template>
    <div>
        <el-form ref="detailForm" inline itemWidth="200px" @submit.native.prevent="addItem">
            <el-form-item label="IP" required>
                <el-input size="small" 
                v-model="form.f_ip"
                :placeholder="$t('gateway.bwlist.ipTip')"
                required
                :required-tip="$t('gateway.bwlist.ipTip')"
                pattern="^(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|[1-9]|\*)\.(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|\d|\*)\.(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|\d|\*)\.(1\d{2}|2[0-4]\d|25[0-5]|[1-9]\d|\d|\*)$"
                :pattern-tip="$t('gateway.bwlist.ipTip')"
                ></el-input>
            </el-form-item>
            <el-form-item>
                <el-button size="small" type="primary" native-type="submit">{{$t('operate.add')}}</el-button>
            </el-form-item>
            <el-form-item></el-form-item>
        </el-form>
        <el-table ref="table" :data="items" :empty-text="$t('common.nodata')">
            <el-table-column title="IP" prop="f_ip" width="300px"></el-table-column>
            <el-table-column :label="$t('cfg.btn.lastUpdate')" prop="f_update_time"></el-table-column>
            <el-table-column :label="$t('operate.operates')" width="80px">
                <template slot-scope="scope">
                    <el-button size="mini" type="text" @click="removeItem(scope.row)">{{$t('operate.delete')}}</el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>
<script>
export default {
    name:"BwList",
    props: {
      station: {
        type: Object,
        required: true,
      },
      //type: black / white
      type: {
        type: String,
        required: true,
      },
      gatewayObj: {
        type: String,
        required: true
      }
    },
    data(){
        return {
            items: [],
            form:{f_ip:""}
        }
    },
    methods:{
        fetchData() {
            //const loading = this.$refs.table.$loading.show();
            return this.$ajax.getJSON('/server/api/bwlist', {
                f_station_id: this.station.f_station_id,
                type: this.type,
                gatewayObj: this.gatewayObj
            }).then((data) => {
                //loading.hide();
                this.items = data;
            }).catch((err) => {
                //loading.hide();
                this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
            });
        },
        addItem(){
            if (this.$refs.detailForm.validate()) {
                const model = this.form;
                model.f_station_id = this.station.f_station_id
                model.type = this.type

                const url ='/server/api/add_bwlist';
                const loading = this.$Loading.show();
                model.gatewayObj = this.gatewayObj
                this.$ajax.postJSON(url, model).then(() => {
                loading.hide();

                this.$tip.success(this.$t('common.success'));
                    this.form.f_ip = ""
                    this.fetchData();
                }).catch((err) => {
                    loading.hide();
                    this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
                });
            }
        },
        removeItem(d){
            this.$confirm(this.$t('gateway.delete.bwListConfirmTips'), this.$t('common.alert')).then(() => {
                const loading = this.$Loading.show();
                this.$ajax.postJSON('/server/api/delete_bwlist', { f_id: d.f_id, type: this.type,gatewayObj:this.gatewayObj }).then(() => {
                    loading.hide();
                    this.fetchData().then(() => {
                        this.$tip.success(this.$t('common.success'));
                    });
                }).catch((err) => {
                    loading.hide();
                    this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
                });
            }).catch(() => {});
        }
    },
    watch: {
        station() {
            this.items = []
            this.fetchData()
        }
    },
    mounted() {
        this.fetchData();
    },
}
</script>
<style scoped lang="postcss">

</style>