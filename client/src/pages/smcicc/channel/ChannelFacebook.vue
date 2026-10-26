<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.facebook.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.facebook.desc') }}</p>
    <omni-channel-panel channel-type="facebook" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelFacebook',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
