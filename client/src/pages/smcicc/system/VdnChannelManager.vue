<template>
  <section class="vdn-channel-manager">
    <aside class="channel-types" aria-label="渠道类型列表">
      <nav>
        <button v-for="item in channelItems" :key="item.vueRoute" type="button"
          :class="{ active: selected === item.vueRoute }" :aria-current="selected === item.vueRoute ? 'page' : null"
          :title="$t(item.titleKey)" @click="selectChannelType(item.vueRoute)">
          <span class="channel-type-icon" :style="{ backgroundColor: item.icon.color }" aria-hidden="true">
            <img v-if="item.icon.src" :src="item.icon.src" alt="" width="14" height="14" />
            <i v-else :class="item.icon.className" />
          </span>
          <span class="channel-type-label">{{ $t(item.titleKey) }}</span><i class="channel-type-arrow el-icon-arrow-right" aria-hidden="true" />
        </button>
      </nav>
    </aside>
    <main class="channel-detail">
      <header class="channel-detail-title"><h3>{{ selectedTitle }}</h3><span>当前 VDN：{{ vdnId }}</span></header>
      <el-alert v-if="sharedSettings" title="此项为平台共享设置，修改会影响多个 VDN。" type="info" :closable="false" show-icon />
      <div class="channel-detail-content">
        <component :is="channelComponent" v-if="channelComponent" :key="`${vdnId}:${selected}`" />
      </div>
    </main>
  </section>
</template>
<script>
import { ICC_SYSTEM_MENU } from './menuConfig';
import Monitor from '@/assets/omni-channel-icons/Monitor.svg';
import ChatDotRound from '@/assets/omni-channel-icons/ChatDotRound.svg';
import Grid from '@/assets/omni-channel-icons/Grid.svg';
import Share from '@/assets/omni-channel-icons/Share.svg';
import Message from '@/assets/omni-channel-icons/Message.svg';
import Cellphone from '@/assets/omni-channel-icons/Cellphone.svg';
import Connection from '@/assets/omni-channel-icons/Connection.svg';
import ChatLineRound from '@/assets/omni-channel-icons/ChatLineRound.svg';
// Match Omni's channel symbols and palette without loading its Vue 3 runtime.
const socialIcon = { src: ChatLineRound, color: '#db2777' };
const channelIcons = {
  'channel-website': { src: Monitor, color: '#0284c7' },
  'channel-facebook': socialIcon,
  'channel-whatsapp': socialIcon,
  'channel-sms': { src: Cellphone, color: '#0d9488' },
  'channel-email': { src: Message, color: '#ea580c' },
  'channel-api': { src: Connection, color: '#1a3be6' },
  'channel-telegram': socialIcon,
  'channel-line': socialIcon,
  'channel-instagram': socialIcon,
  'channel-tiktok': socialIcon,
  'channel-weibo': { src: Share, color: '#dc2626' },
  'channel-miniprogram': { src: Grid, color: '#c026d3' },
  'channel-wechat': { src: ChatDotRound, color: '#16a34a' },
  'channel-ops': { className: 'el-icon-set-up', color: '#667085' },
  'channel-integration-keys': { className: 'el-icon-key', color: '#667085' },
  'channel-recording-access': { className: 'el-icon-microphone', color: '#667085' },
};
const channelItems = ICC_SYSTEM_MENU.find(g => g.key === 'g-omni-channel').items.map(item => ({ ...item, icon: channelIcons[item.vueRoute] }));
export default {
  name: 'VdnChannelManager',
  props: { vdnId: { type: Number, required: true } },
  provide() { return { channelVdnId: this.vdnId }; },
  data() {
    const selected = this.$route.query.channel;
    return { channelItems, selected: channelItems.some(it => it.vueRoute === selected) ? selected : channelItems[0].vueRoute };
  },
  computed: {
    selectedTitle() { const item = channelItems.find(it => it.vueRoute === this.selected); return item ? this.$t(item.titleKey) : "渠道管理"; },
    sharedSettings() { return ['channel-ops', 'channel-integration-keys', 'channel-recording-access'].includes(this.selected); },
    channelComponent() {
      const route = this.$router.resolve(`/smcicc/system/${this.selected}`).route;
      const match = route.matched[route.matched.length - 1];
      return match && match.components.default;
    },
  },
  watch: {
    '$route.query.channel'(value) {
      this.selected = channelItems.some(it => it.vueRoute === value) ? value : channelItems[0].vueRoute;
    },
  },
  methods: {
    selectChannelType(value) { this.selected = value; this.saveSelection(); },
    saveSelection() {
      this.$router.replace({ path: this.$route.path, query: { ...this.$route.query, tab: 'channels', channel: this.selected } }).catch(() => {});
    },
  },
};
</script>
<style scoped>
.vdn-channel-manager { display: grid; grid-template-columns: 180px minmax(0, 1fr); height: 100%; min-height: 600px; min-width: 0; background: #fff; border: 2px solid #9da8b6; box-sizing: border-box; }
.channel-types { display: flex; flex-direction: column; min-height: 0; border-right: 2px solid #b5bfcc; background: #f1f3f7; }
.channel-detail-title { display: flex; flex: 0 0 auto; align-items: center; min-height: 48px; padding: 0 16px; border-bottom: 2px solid #b5bfcc; box-sizing: border-box; }
.channel-types nav { overflow: auto; padding: 10px 8px; }
.channel-types button { display: flex; align-items: center; gap: 8px; width: 100%; min-height: 42px; margin-bottom: 4px; padding: 10px; border: 0; border-radius: 4px; text-align: left; font: inherit; font-size: 13px; line-height: 20px; color: #475467; background: transparent; cursor: pointer; }
.channel-type-icon { display: inline-flex; flex: 0 0 20px; align-items: center; justify-content: center; width: 20px; height: 20px; border-radius: 4px; color: #fff; }
.channel-type-icon img { display: block; width: 14px; height: 14px; }
.channel-type-icon i { font-size: 14px; }
.channel-type-label { flex: 1; min-width: 0; overflow-wrap: anywhere; }
.channel-type-arrow { flex: 0 0 12px; visibility: hidden; font-size: 12px; }
.channel-types button:hover { color: #263b85; background: #e3e8f2; }
.channel-types button.active { color: #fff; background: #3556d6; font-weight: 600; }
.channel-types button.active .channel-type-arrow { visibility: visible; }
.channel-types button:focus-visible { outline: 2px solid #168570; outline-offset: 2px; }
.channel-detail { display: flex; flex-direction: column; min-width: 0; min-height: 0; }
.channel-detail-title { justify-content: space-between; flex-wrap: wrap; gap: 4px 12px; padding-top: 10px; padding-bottom: 10px; color: #344054; background: #e2e6eb; }
.channel-detail-title h3 { min-width: 0; margin: 0; font-size: 15px; line-height: 22px; font-weight: 600; overflow-wrap: anywhere; }
.channel-detail-title span { flex: 0 0 auto; padding-left: 12px; border-left: 1px solid #bdc6d2; font-size: 12px; line-height: 20px; color: #667085; }
.channel-detail-content { flex: 1; min-height: 0; min-width: 0; overflow: auto; }
.channel-detail-content > .channel-page { min-height: 550px; }
.channel-detail-content /deep/ .channel-workspace { padding: 0; gap: 0; background: #fff; }
.channel-detail-content /deep/ .channel-list-panel, .channel-detail-content /deep/ .channel-config-panel { border: 1px solid #c5ced9; border-top: 0; border-radius: 0; box-shadow: none; }
.channel-detail-content /deep/ .channel-embedded-toolbar { flex-wrap: wrap; gap: 8px 16px; color: #344054; background: #edf0f3; border-bottom-color: #bdc6d2; }
.channel-detail-content /deep/ .channel-embedded-toolbar > span { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; }
.channel-detail-content /deep/ .channel-embedded-toolbar > span i { color: #667085; font-size: 16px; }
.channel-detail-content /deep/ .channel-list-body { padding: 0; }
.channel-detail-content /deep/ .channel-list-item,
.channel-detail-content /deep/ .wx-list-item,
.channel-detail-content /deep/ .singleton-list-item { min-height: 48px; padding: 10px 12px; box-sizing: border-box; border-left: 3px solid transparent; border-bottom: 1px solid #d8dfe8; border-radius: 0; font-size: 13px; line-height: 22px; color: #475467; background: #fff; }
.channel-detail-content /deep/ .channel-list-item:hover,
.channel-detail-content /deep/ .wx-list-item:hover { color: #246657; background: #f1f8f6; }
.channel-detail-content /deep/ .channel-list-item.active,
.channel-detail-content /deep/ .wx-list-item.active,
.channel-detail-content /deep/ .singleton-list-item.active { border-left-color: #168570; color: #146c5b; background: #e7f4f0; font-weight: 600; }
.channel-detail-content /deep/ .channel-list-item:focus-visible,
.channel-detail-content /deep/ .wx-list-item:focus-visible { outline: 2px solid #168570; outline-offset: -2px; }
.channel-detail-content /deep/ .channel-splitter { background: #e7ebf1; }
.channel-detail-content /deep/ .channel-splitter::before { background: #b5bfcc; }
.channel-detail-content /deep/ .channel-splitter:hover::before,
.channel-detail-content /deep/ .channel-splitter:focus::before { background: #168570; }
.channel-detail-content /deep/ .channel-config-header { min-height: 48px; padding: 8px 14px; border-left: 3px solid #168570; border-bottom-color: #c5ced9; background: #f5f6f8; }
.channel-detail-content /deep/ .channel-config-header h2 { display: flex; align-items: center; gap: 8px; color: #344054; font-size: 14px; }
.channel-detail-content /deep/ .channel-config-header h2 i { flex: 0 0 auto; color: #168570; font-size: 16px; }
.channel-detail-content /deep/ .channel-config-header h2 span { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.channel-detail-content /deep/ .channel-field-grid,
.channel-detail-content /deep/ .wx-field-grid { grid-template-columns: minmax(0, 1fr); }
@media (max-width: 1100px) {
  .vdn-channel-manager { grid-template-columns: 160px minmax(0, 1fr); }
  .channel-types button { padding-right: 8px; padding-left: 8px; }
  .channel-detail-content /deep/ .channel-config-body .el-form-item__label { display: block; float: none; width: auto !important; padding: 0; text-align: left; line-height: 24px; }
  .channel-detail-content /deep/ .channel-config-body .el-form-item__content { margin-left: 0 !important; }
}
</style>
