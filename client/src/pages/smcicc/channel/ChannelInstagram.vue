<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.instagram.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.instagram.desc') }}</p>
    <omni-channel-panel channel-type="instagram" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelInstagram',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
