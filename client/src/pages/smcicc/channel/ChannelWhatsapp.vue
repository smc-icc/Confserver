<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.whatsapp.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.whatsapp.desc') }}</p>
    <omni-channel-panel channel-type="whatsapp" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelWhatsapp',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
