<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.weibo.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.weibo.desc') }}</p>
    <omni-channel-panel channel-type="weibo" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelWeibo',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
