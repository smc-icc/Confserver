<template>
  <div class="channel-page smcicc-page">
    <channel-workspace-shell list-title="配置列表" :config-title="$t('smcicc.channel.recordingAccess.title')">
      <template slot="list-actions">
        <el-button type="primary" icon="el-icon-refresh" title="刷新" aria-label="刷新" :loading="loading" @click="load" />
      </template>
      <template slot="list">
        <button type="button" class="singleton-list-item active">
          <i class="el-icon-microphone" aria-hidden="true" />
          <span>{{ $t('smcicc.channel.recordingAccess.title') }}</span>
        </button>
      </template>
      <template slot="config-actions">
        <el-button type="primary" icon="el-icon-check" title="保存" aria-label="保存" :loading="saving" @click="onSave" />
      </template>

      <div class="channel-guidance">{{ $t('smcicc.channel.recordingAccess.desc') }}</div>
      <el-form :model="form" label-width="140px" size="small" class="rec-form" v-loading="loading">
      <el-form-item :label="$t('smcicc.channel.recordingAccess.source')">
        <el-select v-model="form.source" style="width: 240px">
          <el-option :label="$t('smcicc.channel.recordingAccess.sourceSftp')" value="sftp" />
          <el-option :label="$t('smcicc.channel.recordingAccess.sourceLocal')" value="local" />
          <el-option :label="$t('smcicc.channel.recordingAccess.sourceHttp')" value="http" disabled />
        </el-select>
      </el-form-item>
      <template v-if="form.source === 'sftp'">
        <el-form-item :label="$t('smcicc.channel.recordingAccess.sftpHost')">
          <el-input v-model="form.sftp_host" placeholder="192.168.255.128" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.channel.recordingAccess.port')">
          <el-input-number v-model="form.sftp_port" :min="1" :max="65535" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.channel.recordingAccess.username')">
          <el-input v-model="form.sftp_user" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.channel.recordingAccess.password')">
          <el-input
            v-model="form.sftp_password"
            type="password"
            show-password
            :placeholder="form.sftp_password_set ? $t('smcicc.channel.recordingAccess.passwordPlaceholderSet') : $t('smcicc.channel.recordingAccess.passwordPlaceholder')"
          />
        </el-form-item>
        <el-form-item :label="$t('smcicc.channel.recordingAccess.remoteRoot')">
          <el-input v-model="form.remote_root" />
        </el-form-item>
      </template>
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
  name: 'RecordingAccess',
  components: { ChannelWorkspaceShell },
  data() {
    return {
      loading: false,
      saving: false,
      hint: '',
      form: {
        source: 'sftp',
        sftp_host: '192.168.255.128',
        sftp_port: 22,
        sftp_user: 'root',
        sftp_password: '',
        sftp_password_set: false,
        remote_root: '/usr/local/freeswitch-1.10.12/var/lib/freeswitch/recordings',
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
        const res = await this.$axios.get('/api/integrations/recording-access')
        const data = (res.data && res.data.data) || res.data || {}
        this.form = { ...this.form, ...data, sftp_password: '' }
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || this.$t('smcicc.channel.recordingAccess.loadFailed'))
      } finally {
        this.loading = false
      }
    },
    async onSave() {
      this.saving = true
      this.hint = ''
      try {
        const payload = { ...this.form }
        if (!payload.sftp_password) delete payload.sftp_password
        const res = await this.$axios.post('/api/integrations/recording-access/save', payload)
        const sync = (res.data && res.data.sync) || {}
        this.form.sftp_password = ''
        this.form.sftp_password_set = true
        if (sync.ok) {
          this.hint = this.$t('smcicc.channel.recordingAccess.savedAndSynced')
          this.$message.success(this.hint)
        } else {
          this.hint = this.$t('smcicc.channel.recordingAccess.savedSyncFailed', {
            error: sync.error || this.$t('smcicc.common.unknownError'),
          })
          this.$message.warning(this.hint)
        }
      } catch (e) {
        this.$message.error((e.response && e.response.data && e.response.data.message) || e.message || this.$t('smcicc.channel.recordingAccess.saveFailed'))
      } finally {
        this.saving = false
      }
    },
  },
}
</script>

<style scoped src="./channel-page.css"></style>
<style scoped>
.rec-form {
  width: 100%;
  max-width: 960px;
}
.hint {
  color: #909399;
  font-size: 13px;
}
.channel-guidance { margin-bottom: 18px; padding: 12px 14px; border: 1px solid #e8edf5; border-radius: 4px; color: #7a8190; background: #f7f9fc; font-size: 12px; line-height: 1.6; }
.singleton-list-item { display: flex; width: 100%; min-height: 44px; align-items: center; gap: 10px; padding: 0 14px; border: 0; border-left: 3px solid #457ff5; color: #457ff5; background: #eaf2ff; cursor: default; font: inherit; text-align: left; }
.singleton-list-item i { flex: 0 0 auto; font-size: 16px; }
.singleton-list-item span { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
