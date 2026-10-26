<template>
  <div class="progressTable">
    <el-table ref="ProgressTable" :data="releaseProgress" :empty-text="$t('common.nodata')">
      <el-table-column :label="$t('service.serverName')" prop="serverName" width="30%"></el-table-column>
      <el-table-column :label="$t('service.serverIp')" prop="nodeName" width="30%"></el-table-column>
      <el-table-column :label="$t('publishLog.releaseId')" prop="releaseId" width="15%"></el-table-column>
      <el-table-column :label="$t('publishLog.releaseProgress')" prop="percent"></el-table-column>
    </el-table>
    <p ref="progressTip">{{success? '发布完成': '发布中...'}}</p>
  </div>
</template>

<script>
  import { getReleaseProgress } from '@/dcache/interface.js'
  export default {
    props: {
      releaseId: {
        type: [Number, String],
        required: true
      }
    },
    data () {
      return {
        releaseProgress: [],
        timer: '',
        progressTip: '',
        success: false,
      }
    },
    methods: {
    	async getProgress () {
        try {

          let {percent, progress} = await getReleaseProgress({releaseId: this.releaseId});

          this.releaseProgress = progress;

          if (+percent !== 100) {

          	this.timer = window.setTimeout(this.getProgress, 1000)
          } else {

            if (this.timer) window.clearTimeout(this.timer);
            this.success = true;
            this.$emit('done-fn');
          }
        } catch (err) {

          console.error(err);
          this.$tip.error(err.message)
        }
      },

    },
    created () {
    	this.getProgress();
    },
    destroyed () {
    	if (this.timer) window.clearTimeout(this.timer);
    }
  }
</script>

<style scoped>
.progressTable {
  margin-top: 20px;
}
</style>
