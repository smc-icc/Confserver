<template>
    <div>
        <el-form ref="addForm" inline itemWidth="400px" @submit.native.prevent="addItem">
            <el-form-item :label="$t('gateway.gatewayObj')" required>
                <el-input size="small" 
                v-model="form.gatewayObj"
                placeholder="eg:Base.GatewayServer.FlowControlObj"
                required
                required-tip="please input gateway flowcontrol obj"
                ></el-input>
            </el-form-item>
            <el-form-item>
                <el-button size="small" type="primary" native-type="submit">{{$t('operate.add')}}</el-button>
            </el-form-item>
            <el-form-item></el-form-item>
        </el-form>
        <el-table ref="table" :data="objList" :empty-text="$t('common.nodata')">
            <el-table-column :label="$t('gateway.gatewayObj')" prop="obj"></el-table-column>
            <el-table-column :label="$t('operate.operates')" width="200px">
                <template slot-scope="scope">
                    <el-button size="mini" type="text" @click="emitConfig(scope.row)">{{$t('operate.config')}}</el-button>
                    <el-button size="mini" type="text" @click="removeItem(scope.row)">{{$t('operate.delete')}}</el-button>
                </template>
            </el-table-column>
        </el-table>
    </div>
</template>
<script>
export default {
    name:"GatewayObjList",
    props: {
    },
    data(){
        return {
            form:{
                gatewayObj:""
            },
            items: [],
            gatewayObjList:[],
        }
    },
    methods:{
        fetchData() {
            //const loading = this.$refs.table.$loading.show();
            return this.$ajax.getJSON('/server/api/gatewayobj_list', {}).then((data) => {
                //loading.hide();
                this.gatewayObjList = data
            }).catch((err) => {
                //loading.hide();
                this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
            });
        },
        emitConfig(row){
            localStorage.setItem("gatewayObj", row.obj)
            this.$emit("config", row.obj)
        },
        addItem(){
            if (this.$refs.addForm.validate()) {
                const model = this.form;
    
                const url ='/server/api/add_gatewayobj';
                const loading = this.$Loading.show();
                this.$ajax.postJSON(url, model).then(() => {
                    loading.hide();
                    this.$tip.success(this.$t('common.success'));
                    this.form.gatewayObj = ""
                    this.fetchData();
                }).catch((err) => {
                    loading.hide();
                    this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
                });
            }
        },
        removeItem(item){
            this.$confirm("delete this gateway?", this.$t('common.alert')).then(() => {
                const loading = this.$Loading.show();
                this.$ajax.postJSON('/server/api/delete_gatewayobj', {gatewayObj: item.obj}).then(() => {
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
    computed: {
        objList(){
            return this.gatewayObjList.map((item)=>{
                return {obj: item}
            })
        }
    },
    watch: {
    },
    mounted() {
        this.fetchData();
    },
}
</script>
<style scoped lang="postcss">

</style>