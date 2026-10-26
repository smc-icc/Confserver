<template>
  <iframe
    v-if="allowed"
    :src="src"
    title="企业流程工具"
    class="flow-plugin-frame"
  /><el-empty
    v-else
    description="流程设计工具未安装、未启用或当前用户无权使用"
  />
</template>
<script>
import {
  productModules,
  moduleAvailable,
  refreshModules,
} from '@/community/modules';
export default {
  props: { tool: { type: String, required: true } },
  computed: {
    allowed() {
      return productModules.canDesign && moduleAvailable('flow-designer');
    },
    src() {
      return (
        '/pages/server/api/smcicc/community/plugins/flow-designer/web/index.html?tool=' +
        encodeURIComponent(this.tool)
      );
    },
  },
  mounted() {
    refreshModules().catch(() => {});
  },
};
</script>
<style scoped>
.flow-plugin-frame {
  display: block;
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 600px;
  border: 0;
}
</style>
