<template>
  <div class="page_operation">
    <el-tabs :value="$route.matched[1] ? $route.matched[1].path : '/operation/apply'" @tab-click="(tab) => onTabClick(tab.name)">
      <el-tab-pane :label="$t('apply.createTitle')" name="/operation/apply"></el-tab-pane>
      <el-tab-pane :label="$t('module.createTitle')" name="/operation/module"></el-tab-pane>
      <el-tab-pane :label="$t('region.title')" name="/operation/region"></el-tab-pane>
    </el-tabs>

    <router-view class="page_operation_children"></router-view>
  </div>
</template>

<script>

export default {
  name: 'Oparetion',
  methods: {
    onTabClick(tabkey) {
      this.$router.replace(tabkey);
    },
  },
};
</script>

<style>
.page_operation {
  display: flex;
  flex: 1;
  flex-flow: column;
  overflow: hidden;
  padding-top: 10px;
  padding-bottom: 20px;
  width: 100%;

  &_children {
    display: flex;
    flex: 1;
    flex-flow: column;
    margin-top: 20px;
    overflow: auto;
    padding:0 40px 20px 0;
    position: relative;
  }
  &_children::-webkit-scrollbar{border-radius:10px;}
}

</style>
