<template>
  <div class="channel-page smcicc-page">
    <h2 class="page-title">{{ $t('smcicc.channel.integrationKeys.title') }}</h2>
    <p class="desc">{{ $t('smcicc.channel.integrationKeys.desc') }}</p>
    <integration-keys-panel />
  </div>
</template>

<script>
import IntegrationKeysPanel from '@/pages/server/integration-keys.vue'

export default {
  name: 'ChannelIntegrationKeys',
  components: { IntegrationKeysPanel },
}
</script>

<style scoped src="./channel-page.css"></style>
