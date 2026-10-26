<template>
  <div class="smcicc-sys-outlet">
    <router-view :key="routeViewKey" />
  </div>
</template>

<script>
/**
 * 嵌在 SMCIccLayout 内：承载 /smcicc/system/welcome 与 /smcicc/system/m/:id，
 * 向子页提供 legacyUiRoot（与旧版 SystemShell 一致）。
 */
export default {
  name: 'SMCIccSystemOutlet',
  provide() {
    return {
      smciccLegacyUiRoot: this.legacyUiRoot,
    };
  },
  data() {
    return {
      legacyUiRoot: { base: '' },
    };
  },
  computed: {
    routeViewKey() {
      // Keep one workspace per VDN; channel/tab queries must not reset it.
      return this.$route.name === 'SMCIccVdn'
        ? `${this.$route.path}:${this.$route.query.vdnId || ''}`
        : this.$route.fullPath;
    },
  },
  mounted() {
    if (this.$cookie && /^conf-(?:vdn|account):/.test(String(this.$cookie.get('uid') || ''))) return;
    this.$ajax
      .getJSON('/server/api/smcicc/registry')
      .then((data) => {
        this.legacyUiRoot.base = (data && data.legacyUiBase) || '';
      })
      .catch(() => {});
  },
};
</script>

<style scoped>
.smcicc-sys-outlet {
  min-height: 320px;
}
</style>
