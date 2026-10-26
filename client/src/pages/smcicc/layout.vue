<template>
  <div class="smcicc-shell" :class="{ 'notification-settings-shell': isRegistrationSettings }">
    <el-button v-if="isRegistrationSettings" class="notification-mobile-menu" size="small" :aria-expanded="registrationMenuOpen ? 'true' : 'false'" @click="registrationMenuOpen = !registrationMenuOpen">{{ registrationMenuOpen ? '收起导航' : '展开导航' }}</el-button>
    <el-container>
      <el-aside width="300px" class="smcicc-aside" :class="{ 'notification-nav-open': registrationMenuOpen }">
        <el-menu
          ref="sideMenu"
          :router="true"
          :default-active="activeMenuPath"
          :default-openeds="defaultOpenSubmenus"
          class="smcicc-side-menu"
        >
          <el-menu-item v-if="onboardingRole === 'vdn'" index="/smcicc/vdnadmin/workspace"><i class="el-icon-office-building"></i><span>我的 VDN</span></el-menu-item>
          <el-menu-item v-if="['system', 'vdn'].includes(onboardingRole)" index="/smcicc/vdnadmin/organization">
            <i class="el-icon-user"></i><span>VDN 成员与权限</span>
          </el-menu-item>
          <el-submenu
            v-for="g in plainMenu"
            :key="g.key"
            :index="'sm-' + g.key"
          >
            <template slot="title">
              <i :class="['smcicc-menu-icon', groupMenuIcon(g.key)]"></i>
              <span class="submenu-title-text">{{ $t(g.titleKey) }}</span>
            </template>
            <el-menu-item v-for="it in g.items" :key="it.id" :index="systemModulePath(it.id)">
              <i :class="['smcicc-menu-icon', itemMenuIcon(it.id)]"></i>
              <span>{{ $t(it.titleKey) }}</span>
            </el-menu-item>
          </el-submenu>
          <el-submenu
            v-if="vdnMenu"
            index="sm-g-vdn"
            class="is-vdn-group"
            :class="{ 'is-vdn-current': isVdnPage }"
          >
            <template slot="title">
              <i :class="['smcicc-menu-icon', groupMenuIcon('g-vdn')]"></i>
              <span class="submenu-title-text">{{ $t(vdnMenu.titleKey) }}</span>
              <button
                type="button"
                class="vdn-menu-add"
                :title="$t('operate.add')"
                :aria-label="$t('operate.add')"
                @click.stop="openSidebarVdnAdd"
              >
                <i class="el-icon-plus"></i>
              </button>
            </template>
            <div class="vdn-side-tree-wrap" @click.stop>
              <input ref="vdnSideImport" class="vdn-side-import" type="file" accept=".csv,text/csv" @change="onSidebarVdnImport" />
              <div v-if="!sideVdnRows.length && !sideVdnLoading" class="vdn-side-empty">{{ $t('smcicc.system.vdn.emptyList') }}</div>
              <el-tree
                v-else
                ref="sideVdnTree"
                v-loading="sideVdnLoading"
                class="vdn-side-tree"
                :data="sideVdnTree"
                node-key="id"
                :indent="18"
                default-expand-all
                highlight-current
                :expand-on-click-node="false"
                :current-node-key="sideActiveVdnId"
                @node-click="onSideVdnClick"
              >
                <span slot-scope="{ data }" class="vdn-side-node" :title="`${data.id} ${data.name}`">
                  <span class="vdn-side-label">{{ data.name || `VDN ${data.id}` }}</span>
                  <span class="vdn-side-actions">
                    <el-button type="text" icon="el-icon-upload2" :title="$t('operate.import')" @click.stop="triggerSidebarVdnImport(data)" />
                    <el-button type="text" icon="el-icon-download" :title="$t('operate.export')" @click.stop="pushVdnCmd('export', data)" />
                    <el-button type="text" icon="el-icon-delete" class="vdn-side-delete" :title="$t('operate.delete')" @click.stop="pushVdnCmd('delete', data)" />
                  </span>
                </span>
              </el-tree>
            </div>
          </el-submenu>
          <el-menu-item v-if="onboardingRole === 'system'" index="/smcicc/system/community-modules">
            <i class="el-icon-box"></i><span>版本与功能组件</span>
          </el-menu-item>
        </el-menu>
      </el-aside>
      <el-main class="smcicc-main" :class="{ 'smcicc-main--ccs': isSplitWorkspace }">
        <router-view />
      </el-main>
    </el-container>
  </div>
</template>

<script>
import { moduleAvailable, productModules, refreshModules } from '@/community/modules';
import {
  ICC_DEFAULT_SYSTEM_VUE_ROUTE,
  ICC_SYSTEM_MENU,
  getSystemModule,
} from './system/menuConfig';

export default {
  name: 'SMCIccLayout',
  data() {
      const defaultGroupKey =
      ICC_SYSTEM_MENU.find((g) => g.items.some((it) => it.vueRoute === ICC_DEFAULT_SYSTEM_VUE_ROUTE))?.key || 'g-account';
    const onVdn = this.$route.path === '/smcicc/system/vdn';
    return {
      systemMenu: ICC_SYSTEM_MENU,
      registrationMenuOpen: false,      onboardingRole: 'none',
      defaultOpenSubmenus: [onVdn ? 'sm-g-vdn' : `sm-${defaultGroupKey}`],
      defaultSystemPath: `/smcicc/system/${ICC_DEFAULT_SYSTEM_VUE_ROUTE}`,
      sideVdnRows: [],
      sideVdnLoading: false,
      sideImportRow: null,
    };
  },
  computed: {
    isRegistrationSettings() { return this.$route.name === 'RegistrationNotifications'; },
    plainMenu() {
      if (this.onboardingRole === 'none') return [];
      if (this.onboardingRole === 'vdn') return this.systemMenu.filter(g => g.key === 'g-account').map(g => ({ ...g, items: g.items.filter(it => it.id === 'onboard-wizard') }));
      return this.systemMenu.filter((g) => g.key !== 'g-vdn' && g.key !== 'g-omni-channel' && (!g.requiredModule || moduleAvailable(g.requiredModule))).map(g => ({ ...g, items: g.items.filter(it => (!it.requiredModule || moduleAvailable(it.requiredModule)) && (it.id !== 'onboard-wizard' || this.onboardingRole === 'system')) }));
    },
    vdnMenu() {
      if (this.onboardingRole !== 'system') return null;
      return this.systemMenu.find((g) => g.key === 'g-vdn') || null;
    },
    isVdnPage() {
      return this.$route.path === '/smcicc/system/vdn';
    },
    sideActiveVdnId() {
      if (!this.isVdnPage) return null;
      const id = Number(this.$route.query.vdnId);
      return Number.isNaN(id) || id <= 0 ? null : id;
    },
    sideVdnTree() {
      const rows = this.sideVdnRows || [];
      const ids = new Set(rows.map((row) => row.id));
      const childrenOf = {};
      rows.forEach((row) => {
        const parent = ids.has(row.parentId) && row.parentId !== row.id ? row.parentId : 0;
        if (!childrenOf[parent]) childrenOf[parent] = [];
        childrenOf[parent].push(row);
      });
      const build = (parentId) => (childrenOf[parentId] || []).map((row) => ({
        ...row,
        children: build(row.id),
      }));
      return build(0);
    },
    /** 在 /smcicc 子路由下高亮当前页（含 /smcicc/system/*） */
    activeMenuPath() {
      const p = this.$route.path;
      if (p === '/smcicc' || p === '/smcicc/') return this.defaultSystemPath;
      if (p.startsWith('/smcicc/system')) return p;
      return p;
    },
    isSplitWorkspace() {
      const p = this.$route.path;
      return (
        p === '/smcicc/system/vdn' ||
        p === '/smcicc/system/voice-driver' ||
        (p.indexOf('/smcicc/system/channel-') === 0 &&
          p !== '/smcicc/system/channel-group' &&
          p !== '/smcicc/system/channel-config')
      );
    },
  },
  methods: {
    groupMenuIcon(key) {
      return {
        'g-account': 'el-icon-user',
        'g-onboard': 'el-icon-guide',
        'g-basic': 'el-icon-setting',
        'g-voice': 'el-icon-phone-outline',
        'g-module': 'el-icon-cpu',
        'g-omni-channel': 'el-icon-chat-dot-round',
        'g-channel': 'el-icon-connection',
        'g-vdn': 'el-icon-office-building',
      }[key] || 'el-icon-folder-opened';
    },
    itemMenuIcon(id) {
      const exactIcons = {
        'onboard-wizard': 'el-icon-s-claim',
        'basic-user': 'el-icon-user',
        'voice-driver': 'el-icon-phone-outline',
        'basic-odbc': 'el-icon-coin',
        'basic-sip': 'el-icon-phone-outline',
        'basic-access': 'el-icon-key',
        'ch-website': 'el-icon-monitor',
        'ch-sms': 'el-icon-chat-line-square',
        'ch-email': 'el-icon-message',
        'ch-api': 'el-icon-link',
        'ch-ops': 'el-icon-set-up',
        'ch-integration-keys': 'el-icon-key',
        'ch-recording-access': 'el-icon-microphone',
        'vdn-agent-user': 'el-icon-user',
        'vdn-service-route': 'el-icon-guide',
      };
      if (exactIcons[id]) return exactIcons[id];
      if (id.indexOf('sw-') === 0) return 'el-icon-phone-outline';
      if (id.indexOf('mod-') === 0) return 'el-icon-cpu';
      if (id.indexOf('ch-') === 0) return 'el-icon-chat-dot-square';
      if (id.indexOf('vdn-') === 0) return 'el-icon-office-building';
      return 'el-icon-document';
    },
    systemModulePath(id) {
      const m = getSystemModule(id);
      if (m && m.vueRoute) return `/smcicc/system/${m.vueRoute}`;
      return `/smcicc/system/m/${id}`;
    },
    loadSideVdns() {
      if (this.onboardingRole !== 'system') return;
      this.sideVdnLoading = true;
      this.$ajax
        .postJSON('/server/api/smcicc/systemadmin/loadVdnListJoin', { page: 1, pagesize: 10000, 'vdn.name': '' })
        .then((data) => {
          const raw = Array.isArray(data.Rows) ? data.Rows : [];
          this.sideVdnRows = raw.map((row) => {
            const id = row.id != null ? Number(row.id) : Number(row.ID);
            if (Number.isNaN(id)) return null;
            const parentId = row.parentId != null ? Number(row.parentId) : Number(row.ParentId != null ? row.ParentId : -1);
            return {
              id,
              name: row.name != null ? String(row.name) : String(row.Name || ''),
              parentId: Number.isNaN(parentId) ? -1 : parentId,
            };
          }).filter((row) => row != null);
          this.$nextTick(() => this.syncSideTreeCurrent());
        })
        .catch(() => {
          this.sideVdnRows = [];
        })
        .finally(() => {
          this.sideVdnLoading = false;
        });
    },
    syncSideTreeCurrent() {
      const tree = this.$refs.sideVdnTree;
      if (tree && this.sideActiveVdnId != null) tree.setCurrentKey(this.sideActiveVdnId);
    },
    vdnWorkspaceQuery(row, extra) {
      const onPage = this.isVdnPage;
      const query = { tab: onPage && this.$route.query.tab ? this.$route.query.tab : 'basic' };
      if (row && row.id != null) query.vdnId = String(row.id);
      else if (onPage && this.$route.query.vdnId) query.vdnId = String(this.$route.query.vdnId);
      if (query.tab === 'channels' && this.$route.query.channel) query.channel = this.$route.query.channel;
      if (query.tab === 'route' && this.$route.query.route) query.route = this.$route.query.route;
      return { ...query, ...(extra || {}) };
    },
    openSidebarVdnAdd() {
      this.$router.push({
        path: '/smcicc/system/vdn',
        query: this.vdnWorkspaceQuery(null, { add: String(Date.now()) }),
      }).catch(() => {});
    },
    onSideVdnClick(row) {
      if (!row || row.id == null) return;
      this.$router.push({ path: '/smcicc/system/vdn', query: this.vdnWorkspaceQuery(row) }).catch(() => {});
    },
    triggerSidebarVdnImport(row) {
      this.sideImportRow = row;
      if (this.$refs.vdnSideImport) this.$refs.vdnSideImport.click();
    },
    onSidebarVdnImport(event) {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      const row = this.sideImportRow;
      this.sideImportRow = null;
      if (!file || !row) return;
      this.$root.__vdnImportFile = file;
      this.pushVdnCmd('import', row);
    },
    pushVdnCmd(cmd, row) {
      this.$router.push({
        path: '/smcicc/system/vdn',
        query: this.vdnWorkspaceQuery(row, { vdnCmd: cmd, vdnCmdAt: String(Date.now()) }),
      }).catch(() => {});
    },
  },
  watch: {
    '$route.path'(path) {
      if (path === '/smcicc/system/vdn' && this.$refs.sideMenu) this.$refs.sideMenu.open('sm-g-vdn');
    },
    sideActiveVdnId() {
      this.$nextTick(() => this.syncSideTreeCurrent());
    },
  },
  mounted() {
    refreshModules().catch(() => {});
    this.$ajax.getJSON('/server/api/smcicc/onboard/context').then(result => {
      const c = result && result.data ? result.data : result;
      this.onboardingRole = c.role || 'none';
      if (this.onboardingRole === 'none') { window.location.replace('/vdn-access.html'); return; }
      this.loadSideVdns();
    }).catch(() => { this.onboardingRole = 'none'; });
    this.$root.$on('smcicc-vdn-menu-refresh', this.loadSideVdns);
  },
  beforeDestroy() {
    this.$root.$off('smcicc-vdn-menu-refresh', this.loadSideVdns);
  },
};
</script>

<style scoped>
.smcicc-shell {
  display: flex;
  flex: 1;
  flex-flow: column;
  overflow: hidden;
  padding: 16px 0 0;
  width: 100%;
  align-self: stretch;
  box-sizing: border-box;
  background: #f4f7fb;
  color: #565b66;
}
.smcicc-shell /deep/ .el-container {
  flex: 1;
  overflow: hidden;
  width: 100%;
}
.smcicc-aside {
  border-right: 1px solid #e4e7ed;
  background: #f8fafc;
  overflow-y: auto;
}
.aside-head {
  padding: 12px 16px;
  font-weight: 600;
  font-size: 14px;
  color: #303133;
  border-bottom: 1px solid #ebeef5;
  background: #f0f2f5;
}
.smcicc-side-menu {
  border-right: none;
  background: transparent;
}
.smcicc-side-menu /deep/ .el-menu-item,
.smcicc-side-menu /deep/ .el-submenu__title {
  color: #565b66;
}
.smcicc-side-menu /deep/ .el-menu-item:hover,
.smcicc-side-menu /deep/ .el-submenu__title:hover {
  color: #457ff5;
  background: #eef4ff;
}
.smcicc-side-menu /deep/ .el-menu-item.is-active {
  color: #457ff5;
  background: #eaf2ff;
  box-shadow: inset 3px 0 0 #457ff5;
}
.smcicc-side-menu /deep/ .el-submenu > .el-menu--inline {
  position: relative;
  margin: 0 0 6px;
  padding: 8px 0 10px;
  background: transparent;
}
.smcicc-side-menu /deep/ .el-submenu > .el-menu--inline::before {
  content: "";
  position: absolute;
  z-index: 1;
  top: 0;
  bottom: 12px;
  left: 28px;
  border-left: 1px solid #c5cedb;
}
.smcicc-side-menu /deep/ .el-submenu > .el-menu--inline > .el-menu-item {
  position: relative;
  height: 40px;
  line-height: 40px;
  margin: 2px 8px 2px 0;
  padding-left: 52px !important;
  border-radius: 4px;
}
.smcicc-side-menu /deep/ .el-submenu > .el-menu--inline > .el-menu-item::before {
  content: "";
  position: absolute;
  top: 50%;
  left: 28px;
  width: 14px;
  border-top: 1px solid #c5cedb;
}
.smcicc-menu-icon {
  width: 18px;
  margin-right: 8px;
  color: #7a91bd;
  text-align: center;
  font-size: 15px;
}
.smcicc-side-menu /deep/ .el-menu-item.is-active .smcicc-menu-icon {
  color: #457ff5;
}
.submenu-title-text {
  white-space: normal;
  line-height: 1.35;
  word-break: break-all;
}
.smcicc-side-menu /deep/ .is-vdn-group > .el-submenu__title {
  position: relative;
  padding-right: 72px !important;
}
.smcicc-side-menu /deep/ .is-vdn-current > .el-submenu__title {
  color: #457ff5;
  background: #eaf2ff;
}
.vdn-menu-add {
  position: absolute;
  right: 32px;
  top: 50%;
  z-index: 2;
  display: inline-flex;
  width: 28px;
  height: 28px;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: 4px;
  color: #457ff5;
  background: transparent;
  font-size: 16px;
  line-height: 1;
  cursor: pointer;
  transform: translateY(-50%);
}
.vdn-menu-add:hover {
  background: rgba(69, 127, 245, 0.12);
}
.vdn-side-tree-wrap {
  position: relative;
  margin: 2px 0 4px;
  padding: 4px 0 6px 36px;
}
.vdn-side-import {
  display: none;
}
.vdn-side-empty {
  padding: 4px 16px 10px 8px;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
.vdn-side-tree {
  background: transparent;
  color: #565b66;
}
.vdn-side-tree /deep/ .el-tree-node {
  position: relative;
}
.vdn-side-tree /deep/ .el-tree-node__content {
  position: relative;
  height: 36px;
  margin: 2px 8px 2px 0;
  border-radius: 4px;
}
.vdn-side-tree /deep/ .el-tree-node__content::before {
  content: "";
  position: absolute;
  top: 50%;
  left: -8px;
  width: 8px;
  border-top: 1px solid #c5cedb;
}
.vdn-side-tree /deep/ .el-tree-node__children {
  position: relative;
  margin-left: 8px;
  padding-left: 10px;
}
.vdn-side-tree /deep/ .el-tree-node__children::before {
  content: "";
  position: absolute;
  top: 0;
  bottom: 14px;
  left: 0;
  border-left: 1px solid #c5cedb;
}
.vdn-side-tree /deep/ .el-tree-node__expand-icon {
  color: #7a91bd;
}
.vdn-side-tree /deep/ .el-tree-node__expand-icon.is-leaf {
  color: transparent;
}
.vdn-side-tree /deep/ .el-tree-node.is-current > .el-tree-node__content {
  color: #457ff5;
  background: #eaf2ff;
}
.vdn-side-node {
  display: flex;
  flex: 1;
  min-width: 0;
  align-items: center;
  gap: 4px;
  padding-right: 8px;
}
.vdn-side-label {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.vdn-side-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
}
.vdn-side-actions /deep/ .el-button {
  margin: 0;
  padding: 0 2px;
  font-size: 14px;
}
.vdn-side-delete {
  color: #f56c6c;
}
.smcicc-main {
  display: flex;
  min-height: 0;
  flex-direction: column;
  padding: 0 24px;
  overflow: auto;
  background: transparent;
}
.smcicc-main--ccs {
  width: auto !important;
  flex: 1 1 auto !important;
  padding-right: 0 !important;
}
.notification-mobile-menu { display: none; }
@media (max-width: 900px) {
  .notification-settings-shell > .notification-mobile-menu { display: block; align-self: flex-start; margin: 0 12px 8px; }
  .notification-settings-shell > .el-container { flex-direction: column; }
  .notification-settings-shell .smcicc-aside { display: none; width: 100% !important; max-height: 45vh; border-right: 0; }
  .notification-settings-shell .smcicc-aside.notification-nav-open { display: block; }
  .notification-settings-shell .smcicc-main { padding: 0; width: 100%; min-width: 0; }
}
</style>
