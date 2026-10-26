<template>
  <section>
    <el-table :data="configList" :empty-text="$t('common.nodata')">
      <el-table-column :label="$t('cache.config.remark')" prop="remark"></el-table-column>
      <el-table-column :label="$t('cache.config.path')" prop="path"></el-table-column>
      <el-table-column :label="$t('cache.config.item')" prop="item"></el-table-column>
      <el-table-column :label="$t('cache.config.value')" prop="config_value"></el-table-column>
      <el-table-column :label="$t('cache.config.modify_value')" prop="config_value">
        <template slot-scope="{row}">
          <el-input size="small" v-model="row.modify_value"></el-input>
        </template>
      </el-table-column>
      <el-table-column :label="$t('operate.operates')">
        <template slot-scope="{row}">
          <el-button size="mini" type="text" @click="saveConfig(row)">{{$t('operate.save')}}</el-button>
          <el-button size="mini" type="text" @click="deleteConfig(row)" class="danger">{{$t('operate.delete')}}</el-button>
        </template>
      </el-table-column>
    </el-table>
  </section>
</template>

<script>
  export default {
    props: {
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
            serverName: this.serverName,
            nodeName: this.nodeName,
          };
          let configItemList = await this.$ajax.getJSON('/server/api/cache/getServerNodeConfig', option);
          // 添加被修改的空值
          configItemList.forEach(item => item.modify_value="");
          this.configList = configItemList;
        } catch (err) {
          // console.error(err)
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        }
      },
      deleteConfig ({id}) {
        this.$confirm(this.$t('cache.config.deleteConfig'), this.$t('common.alert')).then(async () => {
          try {
            let configItemList = await this.$ajax.getJSON('/server/api/cache/deleteServerConfigItem', {id});
            await this.getServerConfig();
          } catch (err) {
            // console.error(err)
            this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
          }
        });
      },
      async saveConfig ({id, modify_value}) {
        try {
          let configItemList = await this.$ajax.getJSON('/server/api/cache/updateServerConfigItem', {id, configValue: modify_value});
          await this.getServerConfig();
        } catch (err) {
          // console.error(err)
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
