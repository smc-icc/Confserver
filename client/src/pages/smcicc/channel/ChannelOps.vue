<template>
  <div class="channel-page smcicc-page">
    <channel-workspace-shell list-title="配置列表" :config-title="$t('smcicc.channel.ops.title')">
      <template slot="list-actions">
        <el-button type="primary" icon="el-icon-refresh" title="刷新" aria-label="刷新" :loading="loading" @click="load" />
      </template>
      <template slot="list">
        <button type="button" class="singleton-list-item active">
          <i class="el-icon-set-up" aria-hidden="true" />
          <span>{{ $t('smcicc.channel.ops.title') }}</span>
        </button>
      </template>
      <template slot="config-actions">
        <el-button type="primary" icon="el-icon-check" title="保存" aria-label="保存" :loading="saving" @click="onSave" />
      </template>

      <div class="channel-guidance">{{ $t('smcicc.channel.ops.desc') }}</div>
      <el-form :model="form" label-width="140px" size="small" class="ops-form" v-loading="loading">
      <el-form-item :label="$t('smcicc.channel.ops.welcome')">
        <el-input v-model="form.welcome_text" type="textarea" :rows="2" />
      </el-form-item>
      <el-form-item :label="$t('smcicc.channel.ops.queueTip')">
        <el-input v-model="form.queue_tip" />
      </el-form-item>
      <el-form-item :label="$t('smcicc.channel.ops.connectTip')">
        <el-input v-model="form.connect_tip" placeholder="{{agentName}}坐席为您服务" />
      </el-form-item>
      <el-form-item :label="$t('smcicc.channel.ops.sensitiveWords')">
        <el-input v-model="sensitiveText" type="textarea" :rows="3" :placeholder="$t('smcicc.channel.ops.sensitivePlaceholder')" />
      </el-form-item>
      <el-form-item :label="$t('smcicc.channel.ops.sensitiveMode')">
        <el-radio-group v-model="form.sensitive_mode">
          <el-radio label="mask">{{ $t('smcicc.channel.ops.modeMask') }}</el-radio>
          <el-radio label="block">{{ $t('smcicc.channel.ops.modeBlock') }}</el-radio>
        </el-radio-group>
      </el-form-item>
      <el-form-item :label="$t('smcicc.channel.ops.labels')">
        <div v-for="(row, idx) in form.label_defaults" :key="idx" class="label-row">
          <el-input v-model="row.title" style="width:140px" />
          <el-color-picker v-model="row.color" />
          <el-button type="text" @click="form.label_defaults.splice(idx, 1)">删除</el-button>
        </div>
        <el-button size="mini" @click="form.label_defaults.push({ title: '', color: '#1f93ff' })">+ {{ $t('smcicc.channel.ops.addLabel') }}</el-button>
      </el-form-item>
      <el-form-item :label="$t('smcicc.channel.ops.asrUrl')">
        <el-input v-model="form.asr_url" placeholder="留空=TARS ASRServer；填写则覆盖为其它 HTTP ASR" />
      </el-form-item>
      <el-form-item :label="$t('smcicc.channel.ops.asrTimeout')">
        <el-input-number v-model="form.asr_timeout_ms" :min="1000" :max="60000" :step="1000" />
        <el-button size="mini" style="margin-left:8px" @click="probeAsr">{{ $t('smcicc.channel.ops.asrProbe') }}</el-button>
        <span v-if="asrHint" class="hint">{{ asrHint }}</span>
      </el-form-item>
        <el-form-item v-if="hint">
          <span class="hint">{{ hint }}</span>
        </el-form-item>
    </el-form>
    </channel-workspace-shell>
  </div>
</template>

<script>
import ChannelWorkspaceShell from './ChannelWorkspaceShell.vue'

export default {
  name: 'ChannelOps',
  components: { ChannelWorkspaceShell },
  data() {
    return {
      loading: false,
      saving: false,
      hint: '',
      asrHint: '',
      sensitiveText: '',
      form: {
        welcome_text: '',
        queue_tip: '',
        connect_tip: '',
        sensitive_mode: 'mask',
        label_defaults: [],
        asr_url: '',
        asr_timeout_ms: 20000,
      },
    }
  },
  created() {
    this.load()
  },
  methods: {
    async load() {
      this.loading = true
      try {
        const res = await this.$axios.get('/api/integrations/omni-ops')
        const data = (res.data && res.data.data) || {}
        this.form = {
          welcome_text: data.welcome_text || '',
          queue_tip: data.queue_tip || '',
          connect_tip: data.connect_tip || '',
          sensitive_mode: data.sensitive_mode === 'block' ? 'block' : 'mask',
          label_defaults: Array.isArray(data.label_defaults) ? data.label_defaults : [],
          asr_url: data.asr_url || '',
          asr_timeout_ms: data.asr_timeout_ms || 20000,
        }
        this.sensitiveText = (data.sensitive_words || []).join('\n')
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || this.$t('smcicc.common.loadFailed'))
      } finally {
        this.loading = false
      }
    },
    async onSave() {
      this.saving = true
      this.hint = ''
      try {
        const res = await this.$axios.post('/api/integrations/omni-ops/save', {
          ...this.form,
          sensitive_words_text: this.sensitiveText,
        })
        const sync = (res.data && res.data.sync) || {}
        if (sync.ok) {
          this.hint = this.$t('smcicc.channel.recordingAccess.savedAndSynced')
          this.$message.success(this.hint)
        } else {
          this.hint = this.$t('smcicc.channel.recordingAccess.savedSyncFailed', { error: sync.error || '' })
          this.$message.warning(this.hint)
        }
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || this.$t('smcicc.common.saveFailed'))
      } finally {
        this.saving = false
      }
    },
    async probeAsr() {
      this.asrHint = ''
      try {
        const res = await this.$axios.get('/api/integrations/omni-ops/asr-health')
        const data = res.data || {}
        this.asrHint = data.ok
          ? (`ASR 可达 (${data.mode || 'tars'})`)
          : (`ASR 不可达: ${data.error || data.url || ''}`)
      } catch (e) {
        this.asrHint = e.message || '探测失败'
      }
    },
  },
}
</script>

<style scoped src="./channel-page.css"></style>
<style scoped>
.label-row { display: flex; align-items: center; gap: 8px; margin-bottom: 8px; }
.hint { color: #909399; font-size: 12px; }
.ops-form { width: 100%; max-width: 960px; }
.channel-guidance { margin-bottom: 18px; padding: 12px 14px; border: 1px solid #e8edf5; border-radius: 4px; color: #7a8190; background: #f7f9fc; font-size: 12px; line-height: 1.6; }
.singleton-list-item { display: flex; width: 100%; min-height: 44px; align-items: center; gap: 10px; padding: 0 14px; border: 0; border-left: 3px solid #457ff5; color: #457ff5; background: #eaf2ff; cursor: default; font: inherit; text-align: left; }
.singleton-list-item i { flex: 0 0 auto; font-size: 16px; }
.singleton-list-item span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
