<template>
    <div>
        <el-form ref="detailForm" itemWidth="200px" @submit.native.prevent="saveItem">
            <el-form-item :label="$t('gateway.flowControl.duration')" required>
                <el-input size="small" type="number" :disabled="!editing"
                v-model="form.f_duration"
                :placeholder="$t('gateway.flowControl.durationTip')"
                required
                :required-tip="$t('gateway.flowControl.durationTip')"
                pattern="^\d+$"
                :pattern-tip="$t('gateway.flowControl.durationTip')"
                ></el-input>
            </el-form-item>
            <el-form-item :label="$t('gateway.flowControl.maxFlow')" required>
                <el-input size="small" type="number"  :disabled="!editing"
                v-model="form.f_max_flow"
                :placeholder="$t('gateway.flowControl.maxFlowTip')"
                required
                :required-tip="$t('gateway.flowControl.maxFlowTip')"
                pattern="^\d+$"
                :pattern-tip="$t('gateway.flowControl.maxFlowTip')"
                ></el-input>
            </el-form-item>
            <el-form-item>
                <el-button v-if="!editing" @click.prevent="editing = true" size="small" type="button" type="primary">{{$t('operate.modify')}}</el-button>
                <el-button v-if="editing" size="small" type="primary" native-type="submit">{{$t('operate.save')}}</el-button>
            </el-form-item>
            <el-form-item></el-form-item>
        </el-form>
    </div>
</template>
<script>
export default {
    name:"FlowControl",
    props: {
      station: {
        type: Object,
        required: true,
      },
      gatewayObj: {
        type: String,
        required: true
      }
    },
    data(){
        return {
            form:{f_duration: 60, f_max_flow: 0},
            editing: false
        }
    },
    methods:{
        fetchData() {
            //const loading = this.$Loading.show();
            return this.$ajax.getJSON('/server/api/get_flowcontrol', {
                f_station_id: this.station.f_station_id,
                gatewayObj: this.gatewayObj
            }).then((data) => {
                //loading.hide();
                this.form = data.f_duration ? data: {f_duration: 60, f_max_flow: 0};
            }).catch((err) => {
                //loading.hide();
                this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
            });
        },
        saveItem(){
            if (this.$refs.detailForm.validate()) {
                const model = this.form;
                model.f_station_id = this.station.f_station_id

                const url ='/server/api/upsert_flowcontrol';
                const loading = this.$Loading.show();
                model.gatewayObj = this.gatewayObj
                this.$ajax.postJSON(url, model).then(() => {
                loading.hide();
                this.$tip.success(this.$t('common.success'));
                    this.fetchData();
                    this.editing = false
                }).catch((err) => {
                    loading.hide();
                    this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
                });
            }
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