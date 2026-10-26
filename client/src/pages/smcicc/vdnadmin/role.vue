<template>
  <div class="smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.vdnadmin.role.title') }}</h2>
    <p class="desc">{{ $t('smcicc.vdnadmin.role.desc') }}</p>
    <el-button type="primary" size="small" :loading="loading" @click="load">{{ $t('smcicc.common.refresh') }}</el-button>
    <el-alert v-if="err" :title="err" type="error" show-icon class="mt" />
    <el-table v-else :data="rows" size="small" stripe class="mt" :empty-text="$t('smcicc.vdnadmin.role.noData')">
      <el-table-column prop="id" :label="$t('smcicc.vdnadmin.role.colId')" width="80" />
      <el-table-column prop="name" :label="$t('smcicc.vdnadmin.role.colName')" min-width="160" />
      <el-table-column prop="issystem" :label="$t('smcicc.vdnadmin.role.colSystem')" width="100" />
      <el-table-column prop="vdnid" :label="$t('smcicc.vdnadmin.role.colVdn')" width="80" />
    </el-table>
  </div>
</template>

<script>
export default {
  name: 'SMCIccVdnRole',
  data() {
    return {
      loading: false,
      err: '',
      rows: [],
    };
  },
  mounted() {
    this.load();
  },
  methods: {
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .getJSON('/server/api/smcicc/vdnadmin/initRoleData')
        .then((data) => {
          this.rows = (data && data.Rows) || [];
        })
        .catch(() => {
          this.err = this.$t('smcicc.vdnadmin.role.requestFailed');
          this.rows = [];
        })
        .finally(() => {
          this.loading = false;
        });
    },
  },
};
</script>

<style scoped>
.page-title {
  font-size: 20px;
  margin: 0 0 8px;
}
.desc {
  color: #606266;
  margin-bottom: 12px;
}
.mt {
  margin-top: 12px;
}
</style>
