<template>
  <div>
      <GatewayObjList @config="config" v-if="!gatewayObj"></GatewayObjList>
    
      <el-tabs v-if="gatewayObj">
        <el-tab-pane :label="$t('gateway.station')">
          <Station :gatewayObj="gatewayObj"></Station>
        </el-tab-pane>
        <el-tab-pane :label="$t('gateway.upstream')">
          <Upstream :gatewayObj="gatewayObj"></Upstream>
        </el-tab-pane>
        <el-tab-pane :label="$t('gateway.globalblack')">
          <BwList :gatewayObj="gatewayObj" :station="globalStation" type="black"></BwList>
        </el-tab-pane>
      </el-tabs>
      <el-button v-if="gatewayObj" @click="switchGateway()" >{{$t('gateway.switchGateway')}}</el-button>
  </div>

</template>
<script>
import Station from "./station"
import Upstream from "./upstream"
import BwList from "./bwlist"
import GatewayObjList from "./gatewayObjList"

export default {
    name: "Gateway",
    components:{Station, Upstream,BwList, GatewayObjList},
    data(){
      return {
        gatewayObj:"",
        globalStation:{
          f_station_id:""
        }
      }
    },
    methods:{
      config(obj){
        this.gatewayObj = obj
      },
      switchGateway(){
        this.gatewayObj = ""
        localStorage.setItem("gatewayObj", "")
      }
    },
    mounted(){
      let gatewayObj = localStorage.getItem("gatewayObj")
      if(gatewayObj) this.gatewayObj = gatewayObj

    }
}
</script>
<style lang="postcss">
.no_obj_tip{
  text-align: center;
}
.gateway_obj_item{
  margin: 0 0 10px 0;
  color:#3f5ae0;
  cursor: pointer;
}
.add_gateway_obj{
  text-align: center;
  font-size: 24px;
  background: #f9f9f9;
  height:32px;
  line-height: 28px;
  cursor: pointer;
  &:hover{
    background: #f2f2f2;
  }
}
</style>