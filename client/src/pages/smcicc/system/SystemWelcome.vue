<template>
  <div class="sys-welcome">
    <p class="tip">{{ $t('smcicc.system.welcome.tip') }}</p>
    <iframe
      v-if="iframeSrc"
      class="welcome-iframe"
      :title="$t('smcicc.system.welcome.iframeTitle')"
      frameborder="0"
      :src="iframeSrc"
    />
    <el-alert
      v-else
      :title="$t('smcicc.system.welcome.noLegacyUrl')"
      type="info"
      :closable="false"
      show-icon
    />
  </div>
</template>

<script>
export default {
  name: 'SMCIccSystemWelcome',
  inject: ['smciccLegacyUiRoot'],
  computed: {
    iframeSrc() {
      const b = (this.smciccLegacyUiRoot.base || '').replace(/\/$/, '');
      return b ? `${b}/welcome.html` : '';
    },
  },
};
</script>

<style scoped>
.tip {
  color: #606266;
  font-size: 13px;
  line-height: 1.6;
  margin-bottom: 12px;
}
.welcome-iframe {
  width: 100%;
  height: calc(100vh - 220px);
  min-height: 400px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
</style>
