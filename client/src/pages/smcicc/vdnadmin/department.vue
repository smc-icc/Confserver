<template>
  <div class="smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.vdnadmin.department.title') }}</h2>
    <p class="desc">{{ $t('smcicc.vdnadmin.department.desc') }}</p>
    <el-button type="primary" size="small" :loading="loading" @click="load">{{ $t('smcicc.vdnadmin.department.loadTree') }}</el-button>
    <el-alert v-if="err" :title="err" type="error" show-icon class="mt" />
    <el-tree
      v-else-if="treeData.length"
      class="tree"
      :data="treeData"
      :props="{ label: 'text', children: 'children' }"
      default-expand-all
    />
    <pre v-else-if="loaded" class="json-block">[]</pre>
  </div>
</template>

<script>
export default {
  name: 'SMCIccVdnDepartment',
  data() {
    return {
      loading: false,
      err: '',
      treeData: [],
      loaded: false,
    };
  },
  methods: {
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .getJSON('/server/api/smcicc/vdnadmin/getDepartTree')
        .then((data) => {
          this.treeData = Array.isArray(data) ? data : [];
          this.loaded = true;
        })
        .catch(() => {
          this.err = this.$t('smcicc.vdnadmin.department.requestFailed');
          this.treeData = [];
          this.loaded = true;
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
.tree {
  margin-top: 16px;
  max-width: 640px;
}
.json-block {
  margin-top: 16px;
  padding: 12px;
  background: #f5f7fa;
  border-radius: 4px;
  font-size: 12px;
}
</style>
