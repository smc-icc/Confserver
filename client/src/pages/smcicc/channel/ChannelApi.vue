<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.api.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.api.desc') }}</p>
    <omni-channel-panel channel-type="api" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelApi',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
