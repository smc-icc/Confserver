<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.miniprogram.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.miniprogram.desc') }}</p>
    <omni-channel-panel channel-type="miniprogram" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelMiniprogram',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
