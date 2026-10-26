<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.tiktok.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.tiktok.desc') }}</p>
    <omni-channel-panel channel-type="tiktok" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelTiktok',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
