<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.telegram.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.telegram.desc') }}</p>
    <omni-channel-panel channel-type="telegram" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelTelegram',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
