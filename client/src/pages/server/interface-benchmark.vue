<template>
  <div class="benchmark_wrapper">
    <!-- 1.选择servant -->
    <el-form class="left_align" itemWidth="350px">
        <el-form-item :label="$t('inf.dlg.objName')">
            <el-select size="small"  v-model="servant"  @change="objChange">
                <el-option v-for="item in servantList" :value="item.servant" :key="item.servant"></el-option>
            </el-select>
        </el-form-item>
    </el-form>
    <!-- 2.压测函数列表 -->
    <el-table :data="fnList" :label="$t('inf.benchmark.fnlist')" :empty-text="$t('inf.benchmark.nofn')" :row-class-name="fnRowClassName">
        <el-table-column :label="$t('inf.benchmark.interface')" prop="interface" width="100px"></el-table-column>
        <el-table-column :label="$t('inf.benchmark.fnname')" prop="name" width="120px"></el-table-column>
        <el-table-column :label="$t('inf.benchmark.returnType')" prop="return" width="120px"></el-table-column>
        <el-table-column :label="$t('inf.benchmark.inParam')">
            <template slot-scope="scope">
              <json-view :maxDepth="0" rootKey="view" colorScheme="dark" :data="JSON.parse(scope.row.inParams)" />
            </template>
        </el-table-column>
        <el-table-column :label="$t('inf.benchmark.outParam')">
           <template slot-scope="scope">
              <json-view :maxDepth="0" rootKey="view" colorScheme="dark" :data="JSON.parse(scope.row.outParams)" />
            </template>
        </el-table-column>
        <el-table-column :label="$t('operate.operates')" width="80px">
          <template slot-scope="scope">
              <el-button size="mini" type="text" @click="queryCase(scope.row)">{{$t('inf.benchmark.case')}}</el-button>
          </template>
        </el-table-column>
    </el-table>
    <!-- 3. 压测函数的用例列表 -->
    <wrapper  v-if="showCase">
        <el-button size="small" type="primary" class="add-btn" @click="initCaseContentForm">{{$t('inf.benchmark.addCase')}}</el-button>
        <el-table :data="bmCaseList" :label="currentFn.interface+'.'+currentFn.name+' '+$t('inf.benchmark.caselist')" :empty-text="$t('inf.benchmark.nocase')">
            <el-table-column :label="$t('inf.benchmark.des')" prop="des"></el-table-column>
            <el-table-column :label="$t('inf.benchmark.inputValue')" prop="in_values"></el-table-column>
            <el-table-column :label="$t('operate.operates')" width="240px">
              <template slot-scope="scope">
                  <el-button size="mini" type="text" @click="initCaseContentForm(scope.row)">{{$t('inf.benchmark.modifyCase')}}</el-button>
                  <el-button size="mini" type="text" @click="initCaseConfigForm(scope.row, 'test')">{{$t('inf.benchmark.testCase')}}</el-button>
                  <el-button size="mini" type="text" @click="initCaseConfigForm(scope.row, 'start')">{{$t('inf.benchmark.runCase')}}</el-button>
                  <el-button size="mini" type="text" @click="queryResult(scope.row)">{{$t('inf.benchmark.viewResult')}}</el-button>
                  <el-button size="mini" type="text" @click="deleteBmCase(scope.row)">{{$t('inf.benchmark.deleteCase')}}</el-button>
              </template>
            </el-table-column>
        </el-table>
    </wrapper>
    <div class="mt10">
        <el-button type="primary" size="small" @click="$parent.showBm=false">{{$t('operate.goback')}}</el-button>
    </div>
    <!-- 4.添加、修改用例弹窗 -->
    <el-dialog
      :visible.sync="upsertCaseContentModal"
      :label="$t('inf.benchmark.case')"
      width="700px"
      @on-confirm="upsertCaseContent">
      <el-form itemWidth="100%">
        <el-form-item :label="$t('inf.benchmark.des')">
          <el-input size="small" v-model="caseModel.des"></el-input>
        </el-form-item>
        <el-form-item :label="$t('inf.benchmark.inParam')">
          <json-view :maxDepth="0" rootKey="view" :data="JSON.parse(currentFn.inParams||'{}')" />
        </el-form-item>
        <el-form-item :label="$t('inf.benchmark.inputValue')">
          <el-input size="small" :rows="10" type="textarea" v-model="caseModel.in_values"></el-input>
          <a target="_blank" href="https://github.com/TarsCloud/TarsDocs/blob/master/benchmark/tars-guide.md">
            <span>{{$t('inf.benchmark.inputValueDes')}}</span>
          </a>
        </el-form-item>
      </el-form>
    </el-dialog>
    <!-- 5.修改用例压测配置弹窗 -->
    <el-dialog
      :footShow = "false"
      :visible.sync="upsertCaseConfigModal"
      ref="startBm"
      :label="$t('inf.benchmark.bmParams')"
      width="700px">
      <el-form itemWidth="100%" class="start-bm">
        <el-form-item label="servant">
          <el-input disabled size="small" v-model="caseModel.servant"></el-input>
        </el-form-item>
        <el-form-item :label="$t('inf.benchmark.endpoints')">
          <el-checkbox v-for="(value, name) in endpoints" v-model="endpoints[name]" :key="name" class="checkbox_endpoint_item">{{name}}</el-checkbox>
          <el-input size="small" type="textarea" :placeholder="$t('inf.benchmark.endpointsTip')" v-model="caseModel.endpoints"></el-input>
        </el-form-item>
        <el-form-group inline label-position="top">
           <el-form-item v-if="upsertCaseConfigModalName == 'start'" :label="$t('inf.benchmark.links')" :size="5">
            <el-input type="number" size="small" v-model="caseModel.links" required></el-input>
          </el-form-item>
          <el-form-item v-if="upsertCaseConfigModalName == 'start'" :label="$t('inf.benchmark.speed')" :size="5">
            <el-input  type="number" size="small" v-model="caseModel.speed" required></el-input>
          </el-form-item>
          <el-form-item v-if="upsertCaseConfigModalName == 'start'" :label="$t('inf.benchmark.duration')" :size="5">
            <el-input  type="number" size="small" v-model="caseModel.duration" required></el-input>
          </el-form-item>
          <el-form-item v-if="testResultModal" :label="$t('inf.benchmark.testResult')" :size="5">
            <div> {{testResult.errmsg || testResultRsp}} </div>
          </el-form-item>
           <el-form-item :size="5">
            <el-button v-if="upsertCaseConfigModalName == 'test'" @click="execBenchmark('test')" type="primary" class="start_bm">{{$t('inf.benchmark.infTest')}}</el-button>
            <el-button v-if="upsertCaseConfigModalName == 'start'" @click="upsertCaseConfig" type="primary" class="start_bm">{{$t('inf.benchmark.startBenchmark')}}</el-button>
            <el-button @click="upsertCaseConfigModal = false" class="cancel_bm">{{$t('inf.benchmark.cancelTest')}}</el-button>
          </el-form-item>
        </el-form-group>
      </el-form>
    </el-dialog>
    <!-- 6.查看结果弹窗 -->
    <el-dialog
      :footShow = "false"
      :visible.sync="resultModal"
      :label="result.fn + ' - ' + $t('inf.benchmark.testResult')"
      width="1300px">
      <wrapper>
        <div class="result_op">
          <el-button v-if="result.status == 0" @click="initCaseConfigForm(currentCase, 'start')" size="small" theme="success"  class="bmop-btn">{{$t('inf.benchmark.startBenchmark')}}</el-button>
          <el-button  v-if="result.status == 1" @click="execBenchmark('stop')" size="small" type="danger"  class="bmop-btn">{{$t('inf.benchmark.stopBenchmark')}}</el-button>
          <el-button size="small"  class="bmop-btn" @click="getResultById(result.id)">{{$t('inf.benchmark.refresh')}}<span v-if="result.status == 1">({{nextRefresh}}s)</span></el-button>
        </div>
        <div class="result_select">
          <el-radio v-model="resultMode" label="detail">{{$t('inf.benchmark.detail')}}</el-radio>
          <el-radio v-model="resultMode" label="chart">{{$t('inf.benchmark.stat')}}</el-radio>
        </div>
        <el-table v-if="resultMode=='detail'" :data="result.results" empty-text="data is empty" style="height:500px;overflow:auto">
          <el-table-column :label="$t('inf.benchmark.time')" prop="time_stamp" width="150px" align="center">
              <template slot-scope="{row}">
                <span>{{formatDate(row.time_stamp*1000)}}</span>
              </template>
          </el-table-column>
          <!-- <el-table-column title="时间点(s)" prop="total_time" width="60px" align="center"></el-table-column> -->
          <el-table-column title="qps" prop="avg_speed" width="70px" align="center"></el-table-column>
          <el-table-column :label="$t('inf.benchmark.total')" prop="total_request" width="70px" align="center"></el-table-column>
          <el-table-column :label="$t('inf.benchmark.success')" prop="succ_request" width="70px" align="center"></el-table-column>
          <el-table-column :label="$t('inf.benchmark.fail')" prop="fail_request" width="70px" align="center"></el-table-column>
          <el-table-column :label="$t('inf.benchmark.successRate')" width="80px" align="center">
            <template slot-scope="{row}">
                <span>{{getSuccessRate(row)}}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('inf.benchmark.maxCost')" prop="max_time" width="80px" align="center"></el-table-column>
          <el-table-column :label="$t('inf.benchmark.minCost')" prop="min_time" width="80px" align="center"></el-table-column>
          <el-table-column :label="$t('inf.benchmark.avgCost')" width="80px" align="center">
            <template slot-scope="{row}">
                <span>{{row.total_request==0?0:(row.total_time/row.total_request).toFixed(2)}}</span>
            </template>
          </el-table-column>
          <el-table-column title="p90" width="70px" align="center">
             <template slot-scope="{row}">
                <span>{{(row.p90_time).toFixed(2)}}</span>
            </template>
          </el-table-column>
          <el-table-column title="p99" width="70px" align="center">
             <template slot-scope="{row}">
                <span>{{(row.p99_time).toFixed(2)}}</span>
            </template>
          </el-table-column>
          <el-table-column title="p999" width="70px" align="center">
             <template slot-scope="{row}">
                <span>{{(row.p999_time).toFixed(2)}}</span>
            </template>
          </el-table-column>
          <el-table-column :label="$t('inf.benchmark.sendBytes')" prop="send_bytes" width="80px" align="center"></el-table-column>
          <el-table-column :label="$t('inf.benchmark.recvBytes')" prop="recv_bytes" width="80px" align="center"></el-table-column>
        </el-table>
        <div v-if="resultMode=='chart'" class="return_chart">
          <ve-pie :legend="returnChartOptions.legend" :label="returnChartOptions.title" :data="returnChartOptions" width="500px"></ve-pie>
          <ve-pie :legend="costChartOptions.legend" :label="costChartOptions.title" :data="costChartOptions" width="500px"></ve-pie>
        </div>
      </wrapper>

    </el-dialog>
  </div>
</template>

<script>
  import VePie from 'v-charts/lib/pie';
  import { JSONView } from 'vue-json-component';
  import wrapper from '@/components/section-wrappper';
  import { formatDate } from '@/lib/date';
  const CASE_CONTENT = { id:-1, des:"", in_values:"" }
  //const CASE_CONFIG = {id:-1, servant:"", endpoints:"",links:1, speed: 1, duration:20}
  const POLLING_INTERVAL = 5000

  export default {
    name: 'InterfaceBenchmark',
    components: {
      wrapper,VePie,"json-view":JSONView
    },
    data(){
        return {
            showCase: false,
            upsertCaseContentModal:false,
            upsertCaseConfigModalName: '',
            upsertCaseConfigModal:false,
            resultModal:false,
            testResultModal:false,

            servant:"",
            currentFn:{},
            currentCase:{},
            resultMode:"detail",
            endpoints:{},
            selectedEndpoints:[],
            fnList:[],
            bmCaseList:[],
            result:{results:[],status:0},
            testResult:{},
            nextRefresh:6,
            nextRefreshTimer:0,
            caseModel:Object.assign({}, CASE_CONTENT)
        }
    },
    methods:{
        formatDate,
        fnRowClassName({row, rowIndex}) {
          if(row == this.currentFn){
            return "current_fn"
          }
          return ""
        },
        getSuccessRate(row){
          let total = row.succ_request+row.fail_request
          if(!total) return '0%'
          return (100*row.succ_request/total).toFixed(2)+'%'
        },
        upsertBmCase(caseInfo){
          const loading = this.$Loading.show();
          caseInfo.servant = this.servant;
          caseInfo.fn = this.currentFn.name;
          this.$ajax.postJSON('/server/api/upsert_bm_case', caseInfo).then(data => {
                loading.hide();
                this.getBenchmarkCaseList()
                this.upsertCaseContentModal = false
                this.upsertCaseConfigModal = false
            }).catch((err) => {
                loading.hide();
                this.upsertCaseContentModal = false
                this.upsertCaseConfigModal = false
                this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
            });
        },
        //init edit form value of content
        initCaseContentForm(row){
          if(row && row.id){
            this.caseModel = Object.assign({}, row)
          } else {
            this.caseModel = Object.assign({}, CASE_CONTENT)
            this.caseModel.in_values = this.currentFn.funInput
          }
          this.upsertCaseContentModal = true
        },
        //init edit form value of config
        initCaseConfigForm(row, mode){
          if(!row){
            return
          }
          this.currentCase = row
          this.testResult = {}
          this.testResultModal = false
          this.caseModel = Object.assign({}, row)
          if(!this.caseModel.links) this.caseModel.links=1
          if(!this.caseModel.speed) this.caseModel.speed=100
          if(!this.caseModel.duration) this.caseModel.duration=20
          let endpoints = this.caseModel.endpoints.split("\n")
          //reset checkbox status
          for(let endpoint in this.endpoints){
            let index = endpoints.indexOf(endpoint)
            if(index > -1){
              this.endpoints[endpoint] = true
              endpoints.splice(index, 1)
            } else {
              this.endpoints[endpoint] = false
            }
          }
          //set the custom endpoints
          this.caseModel.endpoints = endpoints.join("\n")
          this.upsertCaseConfigModalName = mode
          this.upsertCaseConfigModal = true 
          this.resultModal = false
        },
        //run update or init case
        upsertCaseContent(){
          let caseInfo = {}
          if(this.caseModel.id>0) caseInfo.id = this.caseModel.id
          caseInfo.des = this.caseModel.des
          caseInfo.in_values = this.caseModel.in_values
          this.upsertBmCase(caseInfo)
        },
        //run update case config and start benchmark
        upsertCaseConfig(){
          let caseInfo = {}
          caseInfo.id = this.caseModel.id
          caseInfo.links = this.caseModel.links
          caseInfo.speed = this.caseModel.speed
          caseInfo.duration = this.caseModel.duration
          caseInfo.endpoints = this.queryFullEndpoints()
          this.upsertBmCase(caseInfo)
          //let-ui文档缺乏，此处手动检查参数
          if(!caseInfo.endpoints || !this.caseModel.links || !this.caseModel.speed || !this.caseModel.duration){
             this.$Notice({ title: "missing params", type: "error" })
             return
          }
          this.execBenchmark()
        },
        execBenchmark(op = "start"){
          let startParams = {
            caseId: this.currentCase.id,
            servant: this.servant,
            fn: this.currentFn.name
          }
          let path = ""
          switch(op){
            case "start":
              path = "/server/api/start_bencmark"
              startParams.para_input = this.currentFn.inParams
              startParams.para_value = this.currentCase.in_values
              startParams.para_output = this.currentFn.outParams
              startParams.endpoints = this.queryFullEndpoints()
              startParams.links = this.caseModel.links
              startParams.speed = this.caseModel.speed
              startParams.duration = this.caseModel.duration
              break;
            case "stop":
              path = "/server/api/stop_bencmark"
              break;
            case "test":
              path = "/server/api/test_bencmark"
              startParams.para_input = this.currentFn.inParams
              startParams.para_value = this.currentCase.in_values
              startParams.para_output = this.currentFn.outParams
              startParams.endpoints = this.queryFullEndpoints()
              break;
          }
          this.$ajax.postJSON(path, startParams).then(data => {
                if(op == "start") this.queryResult()
                switch(op){
                  case "start":
                    this.result.status = this.currentCase.status = 1
                    this.queryResult()
                    break;
                  case "stop":
                    this.result.status = this.currentCase.status = 0
                    this.stopPollingResult()
                    break;
                  case "test":
                    this.testResult = data
                    this.testResultModal = true
                    break;
                }
            }).catch((err) => {
                this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
            });
        },
        //query endpoints to select
        queryFullEndpoints(){
          //get endpoints from checkbox and textarea
          let endpoints = []
          //from checkbox
          for(let endpoint in this.endpoints){
            // console.log("endpoint:",endpoint, " checked:", this.endpoints[endpoint])
            if(this.endpoints[endpoint]) endpoints.push(endpoint)
          }
          //from textarea
          this.caseModel.endpoints.split("\n").forEach((endpoint)=>{
            endpoints.push(endpoint)
          })
          return Array.from(new Set(endpoints)).filter((item)=>{
            return !!item
          }).join("\n")
        },
        queryResult(row){
          if(row) this.currentCase = row
          this.getResultById(this.currentCase.id)
          this.resultModal = true
        },
        queryCase(row){
          this.showCase = true
          this.currentFn = row
          this.getBenchmarkCaseList()
        },
        getBenchmarkDes(id) {
            this.$ajax.getJSON('/server/api/get_benchmark_des', {
                id : id
            }).then(data => {
                this.fnList = data;
            }).catch((err) => {
                this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
            });
        },
        getBenchmarkCaseList(){
          this.$ajax.getJSON('/server/api/get_bm_case_list', {
                servant : this.servant,
                fn: this.currentFn.name
            }).then(data => {
                this.bmCaseList = data
            }).catch((err) => {
                this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
            });
        },
        getResultById(id){
          this.result.id = id
          this.$ajax.getJSON('/server/api/get_bm_result_by_id', {
                id : id
            }).then(data => {
                data.results = JSON.parse(data.results || "[]")
                data.results.reverse()
                this.result = data
            }).catch((err) => {
                this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
            });
        },
        deleteBmCase(row){
          this.$confirm(this.$t('inf.benchmark.deleteCaseConfirm'), this.$t('common.alert')).then(() => {
            const loading = this.$Loading.show();
            let caseInfo = {}
            caseInfo.id = row.id
            caseInfo.is_deleted = 1
            this.upsertBmCase(caseInfo)
          });
        },
        startPollingResult(){
          this.stopPollingResult()
          this.nextRefreshTimer = setInterval(()=>{
            this.nextRefresh--
            if(this.nextRefresh == 0){
              this.queryResult()
            } else if(this.nextRefresh<0){
              if(this.nextRefresh<0) this.nextRefresh = POLLING_INTERVAL / 1000
            }
          }, 1000)
        },
        stopPollingResult(){
          this.nextRefresh = POLLING_INTERVAL / 1000
          clearInterval(this.nextRefreshTimer)
        },
        objChange(){
          if(!this.servant) return
          this.$ajax.getJSON('/server/api/get_endpoints', {
              servant : this.servant
          }).then(data => {
              this.endpoints = {}
              data.forEach((item)=>{
                this.endpoints[`${item.istcp?'tcp':'udp'} -h ${item.host} -p ${item.port} -t ${item.timeout}`] = false
              })
          }).catch((err) => {
              this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
          });
        },
        pieFromResult(title, field1, field2, mapFieldName){
          let rowsMap = {}
          for(let result of this.result.results){
            if(!result[mapFieldName]) continue
            for(let key in result[mapFieldName]){
              if(!rowsMap[key]) rowsMap[key] = 0
              rowsMap[key] += result[mapFieldName][key]
            }
          }
          let rows = Object.keys(rowsMap).map((key)=>{
            return {
              [field1]: key,
              [field2]: rowsMap[key]
            }
          })
          return {
            title:{
              text: title || ""
            },
            legend: {
              orient: 'vertical',
              top:50,
              right: 0
            },
            columns: [field1, field2],
            rows
          }
        }
    },
    computed:{
      testResultRsp(){
        return (this.testResult.rsp || "").replace(/<br>/g, "\n")
      },
      costChartOptions(){
        return this.pieFromResult(this.$t('inf.benchmark.costStat'), "返回值","数量","cost_map")
      },
      returnChartOptions(){
        return this.pieFromResult(this.$t('inf.benchmark.retStat'), "返回值","数量","ret_map")
      }
    },
    props: {
      servantList: {
        type: Array,
        required: true,
      }
    },
    watch: { 
      	servantList: {
          immediate: true, 
          handler (val, oldVal) {
            if(val.length && !this.servant){
              this.servant = val[0].servant
              this.objChange()
            }
          }
        },
        resultModal(val, oldVal){
          if(val){
            if(this.currentCase.status == 0) return
            this.startPollingResult()
          } else {
            this.stopPollingResult()
          }
        }
    },
    beforeDestory(){
      this.stopPollingResult()
    }
  };
</script>

<style lang="postcss">
/* .el-table tr.current_fn td {
    background: #778cf5 !important;
    color: #fff !important;
}
.el-table tr.current_fn td .table-operation{
  color: #fff;
} */
.el-table tr.current_fn {
  border: solid thin #778cf5;
  box-sizing: border-box;
  border-style: double;
}
.start_bm,.cancel_bm{
  width:96px;
}
.start_bm{
  margin-right:20px;
}
.result_op{
  display: flex;
  justify-content: space-between;
}
.bmop-btn{
  width:96px;
  margin: 10px 0;
}
.result_select{
  margin: 10px 0;
}
.return_chart{
  display: flex;
  justify-content:space-around;
}
.checkbox_endpoint_item{
  display: block;
}
.json-view-item.root-item.dark{
  background: #555555;
}
.start-bm .el-form-item label.el-form-item__label{
  width:200px !important;
}
</style>
