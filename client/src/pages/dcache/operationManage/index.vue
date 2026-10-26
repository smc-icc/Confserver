<template>
  <div class="operation-manage">
    <el-tabs :value="getTabKey()" @tab-click="(tab) => onTabClick(tab.name)">
      <el-tab-pane :label="$t('dcache.operationManage.expand')" name="/operationManage/expand"></el-tab-pane>
      <el-tab-pane :label="$t('dcache.operationManage.shrinkage')" name="/operationManage/shrinkage"></el-tab-pane>
      <el-tab-pane :label="$t('dcache.operationManage.migration')" name="/operationManage/migration"></el-tab-pane>
      <el-tab-pane :label="$t('dcache.operationManage.mainBackup')" name="/operationManage/mainBackup"></el-tab-pane>
      <el-tab-pane :label="$t('dcache.operationManage.router')" name="/operationManage/router"></el-tab-pane>
    </el-tabs>
    <router-view class="operation-manage-children"></router-view>
  </div>
</template>
<script>
export default{
  methods: {
    onTabClick (tabkey) {
      if(this.$route.path != tabkey){
      this.$router.replace(tabkey)
      }
    },
    getTabKey() {
      const { path } = this.$route
      const pathIndex = path.indexOf('/', path.indexOf('/', path.indexOf('/') + 1) + 1)
      let result = path
      if(pathIndex > 0){
        result = path.substr(0, pathIndex)
      }
      return result
    }
  }
}
</script>
<style>
.operation-manage {
  display: flex;
  flex: 1;
  flex-flow: column;
  overflow: hidden;
  padding-top: 30px;
  padding-bottom: 20px;
  width: 100%;

  .el-tabs__content{
    padding-top: 20px;
  }

  &-children {
    display: flex;
    flex: 1;
    flex-flow: column;
    overflow: auto;
    padding:0 20px 20px 0;
    position: relative;
  }
  &-children::-webkit-scrollbar{border-radius:10px;}
}
</style>

