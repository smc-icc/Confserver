<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.sms.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.sms.desc') }}</p>
    <el-tabs v-model="activeTab">
      <el-tab-pane :label="$t('smcicc.channel.sms.tabTwilio')" name="twilio_sms">
        <omni-channel-panel channel-type="twilio_sms" />
      </el-tab-pane>
      <el-tab-pane :label="$t('smcicc.channel.sms.tabBandwidth')" name="sms">
        <omni-channel-panel channel-type="sms" />
      </el-tab-pane>
    </el-tabs>
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelSms',
  components: { OmniChannelPanel },
  data() {
    return { activeTab: 'twilio_sms' }
  },
}
</script>

<style scoped src="./channel-page.css"></style>
