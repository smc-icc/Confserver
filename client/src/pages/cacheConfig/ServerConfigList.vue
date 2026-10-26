<template>
  <section>
    <el-table :data="configList" :empty-text="$t('common.nodata')">
      <el-table-column :label="$t('cache.config.remark')" prop="remark"></el-table-column>
      <el-table-column :label="$t('cache.config.path')" prop="path"></el-table-column>
      <el-table-column :label="$t('cache.config.item')" prop="item"></el-table-column>
      <el-table-column :label="$t('cache.config.value')" prop="config_value"></el-table-column>
    </el-table>
  </section>
</template>

<script>
  export default {
    props: {
      appName: {type: String, required: true},
      moduleName: {type: String, required: true},
      serverName: {type: String, required: true},
      nodeName: {type: String, required: true},
    },
    data () {
      return {
        configList: []
      }
    },
    methods: {
      async getServerConfig () {
        try {
          let option = {
            appName: this.appName,
            moduleName: this.moduleName,
            serverName: this.serverName,
            nodeName: this.nodeName,
          };
          let configItemList = await this.$ajax.getJSON('/server/api/cache/getServerConfig', option);
          this.configList = configItemList.filter(item => {
            var items = configItemList.filter(subItem =>{
              return subItem.path === item.path && subItem.item === item.item
            });
            var lastItem = items[items.length -1];
            return item === lastItem
          })
        } catch (err) {
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        }
      }
    },
    created () {
      this.getServerConfig();
    }
  }
</script>

<style>

</style>
