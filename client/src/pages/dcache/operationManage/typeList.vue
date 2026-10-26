<template>
  <div>
    <el-table :data="showList" :empty-text="$t('common.nodata')" ref="pageTable">
      <el-table-column :label="$t('dcache.operationManage.appName')"  prop="appName"></el-table-column>
      <el-table-column :label="$t('dcache.operationManage.moduleName')"  prop="moduleName"></el-table-column>
      <el-table-column :label="$t('dcache.operationManage.srcGroupName')"  prop="srcGroupName"></el-table-column>
      <el-table-column :label="$t('dcache.operationManage.dstGroupName')"  prop="dstGroupName"></el-table-column>
      <el-table-column :label="$t('dcache.operationManage.status')"  prop="status">
        <template slot-scope="{row}">
          {{$t(row.statusText)}}
        </template>
      </el-table-column>
      <el-table-column :label="$t('dcache.operationManage.beginTime')"  prop="beginTime"></el-table-column>
      <el-table-column :label="$t('dcache.operationManage.progress')"  prop="progress">
        <template slot-scope="{row}">
          {{row.progressText}}
        </template>
      </el-table-column>
      <el-table-column :label="$t('operate.operates')"  prop="appName" width="120px">
        <template slot-scope="{row}" >
          <el-button size="mini" type="text" v-if="row.status === 3" @click="ensureStop(row)">{{$t('operate.stop')}}</el-button>
          <el-button size="mini" type="text" v-if="row.status !== 3" @click="ensureDelete(row)">{{$t('operate.delete')}}</el-button>
          <el-button size="mini" type="text" v-if="row.status === 5" @click="restartDask(row)">{{$t('operate.retry')}}</el-button>
        </template>
      </el-table-column>
      <el-pagination slot="pagination" align="right"
                                        :total="total" :current-page="page" @current-change="changePage">
      </el-pagination>
    </el-table>
  </div>
</template>
<script>
import Router from 'vue-router';
import {getRouterChange, stopTransfer, deleteTransfer, restartTransfer} from '@/dcache/interface.js'
export default {
  data () {
    return {
      list: [],
      total: 0,
      page: 1,
    }
  },
  computed: {
    showList () {
      let {page, list} = this;
      return list.slice((page -1 ) * 10, page * 10);
    },
    type () {
      let typeMap = {
        expand: '1',
        shrinkage: '2',
        migration: '0'
      }
      return typeMap[this.$route.params.type] || '1'
    }
  },
  methods: {
    /**
     * 获取 列表数据
     */
    async getRouterChange () {
      try {

        let { totalNum, transferRecord } = await getRouterChange({type: this.type});
        this.list = transferRecord.map(item => {
          //  status: "0"-新增迁移任务，"1"-配置阶段完成，"2"-发布完成，"3"-正在迁移，"4"-完成，5""-停止
          item.statusText = 'dcache.operationManage.statusText.' + item.status;
          item.progressText = item.progress + '%';
          return item;
        });
        this.total = Math.ceil(totalNum/10);
      } catch (err) {

        console.error(err);
        this.$tip.error(err.message);
      }
    },
    /**
     * 改变页数
     * @page
     */
    changePage (page) {
      this.page = page;
    },
    /**
     * 确认停止
     */
    async ensureStop (row) {
      try {
        await this.$confirm(this.$t('dcache.operationManage.ensureStop'));
        // console.log('ensure stop', row)
        let {appName, moduleName, type, srcGroupName, dstGroupName} = row;
        await stopTransfer({appName, moduleName, type, srcGroupName, dstGroupName});
        this.getRouterChange();
      } catch (err) {
        console.error(err)
        this.$tip.error(err.message)
      }
    },
    /**
     * 确认删除
     */
    async ensureDelete (row) {
      try {
        await this.$confirm(this.$t('dcache.operationManage.ensureDelete'));
        // console.log('ensure delete', row)
        let {appName, moduleName, type, srcGroupName, dstGroupName} = row;
        await deleteTransfer({appName, moduleName, type, srcGroupName, dstGroupName});
        this.getRouterChange();
      } catch (err) {
        console.error(err)
        this.$tip.error(err.message)
      }
    },
    /**
     * 重启任务
     */
    async restartDask (row) {
      try {
        await this.$confirm(this.$t('dcache.operationManage.ensureRestart'));
        let {appName, moduleName, type, srcGroupName, dstGroupName} = row;
        await restartTransfer({appName, moduleName, type, srcGroupName, dstGroupName});
        this.getRouterChange();
      } catch (err) {
        console.error(err)
        this.$tip.error(err.message)
      }
    },
  },
  beforeRouteUpdate (to, from, next) {
    next();
    this.getRouterChange();
  },
  created () {
    this.getRouterChange();
  },
}
</script>
