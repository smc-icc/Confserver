<template>
  <section class="page_operation">
    <div>
      <el-button type="primary" size="small" @click="addConfig">{{$t('cache.config.addConfig')}}</el-button>
    </div>
    
    <el-table :data="list" :label="$t('cache.config.tableTitle')" :empty-text="$t('common.nodata')">
      <el-table-column title="ID" prop="id"></el-table-column>
      <el-table-column :label="$t('cache.config.remark')" prop="remark"></el-table-column>
      <el-table-column :label="$t('cache.config.path')" prop="path"></el-table-column>
      <el-table-column :label="$t('cache.config.item')" prop="item"></el-table-column>
      <el-table-column :label="$t('cache.config.reload')" prop="reload"></el-table-column>
      <el-table-column :label="$t('cache.config.period')" prop="period"></el-table-column>
      <el-table-column :label="$t('operate.operates')">
        <template slot-scope="{row}">
          <el-button size="mini" type="text" @click="editConfig(row)">{{$t('operate.update')}}</el-button>
          <el-button size="mini" type="text" @click="deleteConfig(row)" class="danger">{{$t('operate.delete')}}</el-button>
        </template>
      </el-table-column>
    </el-table>
    <el-dialog
      :visible.sync="addConfigVisible"
      :footShow="false"
      :closeOnClickBackdrop="true"
    >
      <add-config v-if="addConfigVisible" @call-back="getConfig"></add-config>
    </el-dialog>
    <el-dialog
      :visible.sync="editConfigVisible"
      :footShow="false"
      :closeOnClickBackdrop="true"
    >
      <edit-config v-if="editConfigVisible" v-bind="editConfigObj" @call-back="getConfig"></edit-config>
    </el-dialog>
  </section>
</template>

<script>
  import AddConfig from './add.vue'
  import EditConfig from './edit.vue'
  export default {
    components: {
      AddConfig,
      EditConfig
    },
    data () {
      return {
        list: [],
        addConfigVisible: false,
        editConfigVisible: false,
        editConfigObj: null,
      }
    },
    methods: {
      addConfig () {
        this.addConfigVisible = true
      },
      editConfig (config) {
        this.editConfigVisible = true;
        this.editConfigObj = config
      },
      deleteConfig ({id}) {
        this.$confirm(this.$t('cache.config.deleteConfig'), this.$t('common.alert')).then(async () => {
          try {
            let configItemList = await this.$ajax.getJSON('/server/api/cache/deleteConfig', {id});
            await this.getConfig();
          } catch (err) {
            console.error(err)
            this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
          }
        });
      },
      async getConfig () {
        try {
          let configItemList = await this.$ajax.getJSON('/server/api/cache/getConfig');
          this.list = configItemList;
        } catch (err) {
          console.error(err)
          this.$tip.error(`${this.$t('common.error')}: ${err.message || err.err_msg}`);
        }
      }
    },
    async created () {
      this.getConfig();
    }
  }
</script>

<style>
  .page_operation{overflow:auto;}
</style>
