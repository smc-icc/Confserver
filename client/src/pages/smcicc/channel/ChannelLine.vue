<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.line.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.line.desc') }}</p>
    <omni-channel-panel channel-type="line" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelLine',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
