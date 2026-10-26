<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.wechat.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.wechat.desc') }}</p>
    <el-tabs v-model="activeTab">
      <el-tab-pane :label="$t('smcicc.channel.wechat.tabMp')" name="wechat_mp">
        <wechat-channel-panel channel-type="wechat_mp" />
      </el-tab-pane>
      <el-tab-pane :label="$t('smcicc.channel.wechat.tabKf')" name="wecom_kf">
        <wechat-channel-panel channel-type="wecom_kf" />
      </el-tab-pane>
      <el-tab-pane :label="$t('smcicc.channel.wechat.tabContact')" name="wecom_contact">
        <wechat-channel-panel channel-type="wecom_contact" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import WechatChannelPanel from '@/pages/server/wechat-channels.vue'

const TAB_KEYS = ['wechat_mp', 'wecom_kf', 'wecom_contact']

export default {
  name: 'ChannelWechat',
  components: { WechatChannelPanel },
  inject: { channelVdnId: { default: null } },
  data() {
    const tab = this.$route.query.tab
    const activeTab = TAB_KEYS.includes(tab) ? tab : 'wechat_mp'
    return { activeTab }
  },
  watch: {
    activeTab(tab) {
      if (this.channelVdnId) return
      if (this.$route.query.tab === tab) return
      this.$router.replace({ query: { ...this.$route.query, tab } })
    },
    '$route.query.tab'(tab) {
      if (TAB_KEYS.includes(tab) && tab !== this.activeTab) {
        this.activeTab = tab
      }
    },
  },
}
</script>

<style scoped src="./channel-page.css"></style>
