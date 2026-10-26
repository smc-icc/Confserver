<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.website.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.website.desc') }}</p>
    <omni-channel-panel channel-type="web_widget" />
  </div>
</template>

<script>
import OmniChannelPanel from '@/pages/server/omni-channel-panel.vue'

export default {
  name: 'ChannelWebsite',
  components: { OmniChannelPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
