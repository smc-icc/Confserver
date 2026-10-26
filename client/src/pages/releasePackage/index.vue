<template>
  <div class="page_operation">
    <el-tabs :value="$route.matched[1] ? $route.matched[1].path : '/operation/apply'" @tab-click="(tab) => onTabClick(tab.name)">
      <el-tab-pane :label="$t('releasePackage.proxyList')" name="/releasePackage/proxyList"></el-tab-pane>
      <el-tab-pane :label="$t('releasePackage.accessList')" name="/releasePackage/accessList"></el-tab-pane>
      <el-tab-pane :label="$t('releasePackage.routerList')" name="/releasePackage/routerList"></el-tab-pane>
      <el-tab-pane :label="$t('releasePackage.cacheList')" name="/releasePackage/cacheList"></el-tab-pane>
    </el-tabs>
    <router-view class="page_operation_children"></router-view>
  </div>
</template>

<script>

export default {
  methods: {
    onTabClick(tabkey) {
      this.$router.replace(tabkey);
    },
  },
};
</script>

<style>
.page_operation {
  padding-top: 10px;
  padding-bottom: 40px;

  &_children {
    padding: 20px 0;
  }
}
</style>
