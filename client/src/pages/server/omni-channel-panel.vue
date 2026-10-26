<template>
  <channel-workspace-shell
    class="omni-ch"
    :list-title="`${channelLabel}列表`"
    :config-title="configTitle"
  >
    <template slot="list-actions">
      <el-button type="primary" icon="el-icon-plus" title="新增" aria-label="新增" @click="startCreate" />
      <el-button type="primary" icon="el-icon-refresh" title="刷新" aria-label="刷新" :loading="loading" @click="fetchList()" />
      <el-button type="primary" icon="el-icon-download" title="导出" aria-label="导出" :disabled="!rows.length" @click="exportChannels" />
      <el-button type="danger" icon="el-icon-delete" title="删除" aria-label="删除" :disabled="!activeRow" @click="removeChannel(activeRow)" />
    </template>

    <template slot="list">
      <button
        v-for="row in rows"
        :key="row.conf_id"
        type="button"
        class="channel-list-item"
        :class="{ active: String(row.conf_id) === activeId }"
        @click="selectChannel(row)"
      >
        <i class="el-icon-chat-dot-square" aria-hidden="true" />
        <span>{{ rowLabel(row) }}</span>
      </button>
      <div v-if="!loading && !rows.length" class="channel-empty">暂无渠道</div>
    </template>

    <template slot="config-actions">
      <el-button
        type="primary"
        icon="el-icon-check"
        title="保存"
        aria-label="保存"
        :loading="saving"
        @click="saveCurrent"
      />
    </template>

    <div v-loading="loading" class="channel-editor">
      <div v-if="channelHint || publicBaseUrl" class="channel-guidance">
        <p v-if="channelHint">{{ channelHint }}</p>
        <p v-if="publicBaseUrl">公网基址：<code>{{ publicBaseUrl }}</code></p>
      </div>

      <el-form v-if="tenancyEnabled" label-width="150px" size="small">
        <el-form-item label="归属 VDN">
          <el-input-number v-model="currentModel.vdn_id" :min="1" :disabled="mode === 'edit' || !!channelVdnId" />
          <span>创建时指定；禁止通过编辑跨租户搬迁</span>
        </el-form-item>
      </el-form>
      <channel-form
        :fields="currentFields"
        :value="currentModel"
        :edit-mode="mode === 'edit'"
        @input="updateCurrentModel"
      />

      <section v-if="activeRow" class="channel-access-section">
        <h3>接入信息</h3>
        <el-form label-width="160px" size="small">
          <el-form-item v-if="activeRow.webhook_url || activeRow.widget_script_url" label="Webhook / 脚本">
            <el-input :value="activeRow.webhook_url || activeRow.widget_script_url" readonly>
              <el-button slot="append" icon="el-icon-document-copy" title="复制" @click="copyUrl(activeRow)" />
            </el-input>
          </el-form-item>
          <el-form-item v-if="activeRow.identifier" label="Identifier">
            <el-input :value="activeRow.identifier" readonly />
          </el-form-item>
          <el-form-item v-if="activeRow.hmac_token" label="HMAC Token">
            <el-input :value="activeRow.hmac_token" readonly />
          </el-form-item>
          <el-form-item v-if="activeRow.website_token" label="Widget Token">
            <el-input :value="activeRow.website_token" readonly />
          </el-form-item>
        </el-form>
      </section>
    </div>
  </channel-workspace-shell>
</template>

<script>
import ChannelWorkspaceShell from '@/pages/smcicc/channel/ChannelWorkspaceShell.vue'
import {
  CHANNEL_FIELDS,
  CHANNEL_HINTS,
  CHANNEL_LABELS,
  emptyForm,
} from '@/config/channel-field-schemas'
import {
  ROUTE_APP_TYPE_OPTIONS,
  ROUTE_TRIGGER_OPTIONS,
  cloneRoutes,
  emptyRouteRow,
} from '@/config/channel-routes'

const ChannelForm = {
  props: ['fields', 'value', 'editMode'],
  data() {
    return {
      routeTriggers: ROUTE_TRIGGER_OPTIONS,
      appTypes: ROUTE_APP_TYPE_OPTIONS,
    }
  },
  computed: {
    model() {
      return this.value || {}
    },
  },
  methods: {
    setField(key, value) {
      this.$emit('input', { ...this.model, [key]: value })
    },
    routesOf(key) {
      return Array.isArray(this.model[key]) ? this.model[key] : []
    },
    addRoute(key) {
      const rows = this.routesOf(key).slice()
      rows.push(emptyRouteRow(rows.length))
      this.setField(key, rows)
    },
    removeRoute(key, index) {
      const rows = this.routesOf(key).slice()
      rows.splice(index, 1)
      this.setField(key, rows)
    },
  },
  template: `
    <el-form class="channel-dynamic-form" label-width="160px" size="small" @submit.native.prevent>
      <div class="channel-field-grid">
        <el-form-item
          v-for="field in fields"
          :key="field.key"
          :label="field.label"
          :required="field.required"
          :class="{ 'channel-field-full': field.type === 'textarea' || field.type === 'routes' }"
        >
          <div v-if="field.type === 'routes'" style="width:100%">
            <el-table :data="routesOf(field.key)" size="mini" border style="margin-bottom:6px">
              <el-table-column label="顺位" width="58">
                <template slot-scope="s">
                  <el-input-number v-model="s.row.priority" :min="0" :max="99" size="mini" controls-position="right" style="width:52px" />
                </template>
              </el-table-column>
              <el-table-column label="触发点" width="140">
                <template slot-scope="s">
                  <el-select v-model="s.row.trigger" size="mini" filterable allow-create style="width:100%">
                    <el-option v-for="t in routeTriggers" :key="t.value" :label="t.label" :value="t.value" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="应用类型" width="88">
                <template slot-scope="s">
                  <el-select v-model="s.row.app_type" size="mini" style="width:100%">
                    <el-option v-for="a in appTypes" :key="a.value" :label="a.label" :value="a.value" />
                  </el-select>
                </template>
              </el-table-column>
              <el-table-column label="参数" min-width="110">
                <template slot-scope="s">
                  <el-input-number v-if="s.row.app_type === 'itr'" v-model="s.row.flow_id" :min="0" size="mini" controls-position="right" style="width:100%" />
                  <el-input-number v-else-if="s.row.app_type === 'agent'" v-model="s.row.agent_id" :min="0" size="mini" controls-position="right" style="width:100%" />
                  <el-input-number v-else-if="s.row.app_type === 'robot'" v-model="s.row.robot_id" :min="0" size="mini" controls-position="right" style="width:100%" />
                  <el-input-number v-else-if="s.row.app_type === 'acd'" v-model="s.row.agent_group_id" :min="-1" size="mini" controls-position="right" style="width:100%" />
                  <span v-else style="color:#c0c4cc;font-size:12px">—</span>
                </template>
              </el-table-column>
              <el-table-column label="启用" width="54">
                <template slot-scope="s"><el-switch v-model="s.row.enabled" /></template>
              </el-table-column>
              <el-table-column width="42">
                <template slot-scope="s">
                  <el-button type="text" style="color:#f56c6c" @click="removeRoute(field.key, s.$index)">删</el-button>
                </template>
              </el-table-column>
            </el-table>
            <el-button size="mini" @click="addRoute(field.key)">+ 添加路由</el-button>
            <div v-if="field.hint" style="color:#909399;font-size:12px;line-height:1.5;margin-top:4px">{{ field.hint }}</div>
          </div>
          <el-switch
            v-else-if="field.type === 'switch'"
            :value="!!model[field.key]"
            @change="setField(field.key, $event)"
          />
          <el-input
            v-else-if="field.type === 'textarea'"
            type="textarea"
            :rows="4"
            :value="model[field.key]"
            :placeholder="field.placeholder"
            @input="setField(field.key, $event)"
          />
          <el-input
            v-else-if="field.type === 'number'"
            type="number"
            :value="model[field.key]"
            :placeholder="field.placeholder"
            @input="setField(field.key, $event ? parseInt($event, 10) : undefined)"
          />
          <el-input
            v-else
            :type="field.secret ? 'password' : 'text'"
            :value="model[field.key]"
            :placeholder="field.secret && editMode ? '留空则不修改' : field.placeholder"
            @input="setField(field.key, $event)"
          />
        </el-form-item>
      </div>
    </el-form>
  `,
}

export default {
  name: 'OmniChannelPanel',
  components: { ChannelWorkspaceShell, ChannelForm },
  inject: { channelVdnId: { default: null } },
  props: {
    channelType: {
      type: String,
      required: true,
    },
  },
  data() {
    return {
      publicBaseUrl: '',
      rows: [],
      loading: false,
      saving: false,
      form: { ...emptyForm(this.channelType), ...(this.channelVdnId ? { vdn_id: this.channelVdnId } : {}) },
      tenancyEnabled: false,
      editRow: null,
      activeId: '',
      mode: 'create',
    }
  },
  computed: {
    channelLabel() {
      return CHANNEL_LABELS[this.channelType] || '渠道'
    },
    channelHint() {
      return CHANNEL_HINTS[this.channelType] || ''
    },
    currentFields() {
      return CHANNEL_FIELDS[this.channelType] || []
    },
    currentModel() {
      return this.mode === 'edit' && this.editRow ? this.editRow : this.form
    },
    activeRow() {
      return this.rows.find((row) => String(row.conf_id) === this.activeId) || null
    },
    configTitle() {
      return this.mode === 'edit' && this.activeRow
        ? this.rowLabel(this.activeRow)
        : `新建${this.channelLabel}渠道`
    },
  },
  watch: {
    channelType() {
      this.rows = []
      this.startCreate()
      this.fetchList()
    },
  },
  mounted() {
    this.fetchList()
  },
  methods: {
    apiBase() {
      return `/api/integrations/channels/${this.channelType}`
    },
    rowLabel(row) {
      return row.name || row.inbox_name || row.identifier || `${this.channelLabel}渠道`
    },
    updateCurrentModel(value) {
      if (this.mode === 'edit') this.editRow = value
      else this.form = value
    },
    startCreate() {
      this.mode = 'create'
      this.activeId = ''
      this.editRow = null
      this.form = { ...emptyForm(this.channelType), ...(this.channelVdnId ? { vdn_id: this.channelVdnId } : {}) }
    },
    selectChannel(row) {
      if (!row) return
      this.mode = 'edit'
      this.activeId = String(row.conf_id)
      this.editRow = { ...row, routes: cloneRoutes(row.routes) }
    },
    async fetchList(preferredId) {
      this.loading = true
      try {
        const res = await this.$axios.get(`${this.apiBase()}/list`)
        const data = res.data?.data || {}
        this.publicBaseUrl = data.public_base_url || ''
        this.tenancyEnabled = data.tenancy_enabled === true
        this.rows = (data.channels || []).filter(row => !this.channelVdnId || Number(row.vdn_id) === this.channelVdnId)
        const targetId = preferredId != null ? String(preferredId) : this.activeId
        const selected = this.rows.find((row) => String(row.conf_id) === targetId)
        if (selected) this.selectChannel(selected)
        else if (this.rows.length) this.selectChannel(this.rows[0])
        else this.startCreate()
      } catch (error) {
        this.$message.error('加载渠道列表失败')
      } finally {
        this.loading = false
      }
    },
    validateCurrent() {
      if (this.channelVdnId && Number(this.currentModel.vdn_id) !== this.channelVdnId) {
        this.$message.warning('渠道归属必须与当前 VDN 一致'); return false
      }
      if (this.tenancyEnabled && (!Number.isSafeInteger(Number(this.currentModel.vdn_id)) || Number(this.currentModel.vdn_id) <= 0)) {
        this.$message.warning('必须明确指定已映射的 VDN；旧渠道请先审核归属')
        return false
      }
      for (const field of this.currentFields) {
        const value = this.currentModel[field.key]
        if (field.required && field.type !== 'switch' && field.type !== 'routes' && !String(value ?? '').trim()) {
          this.$message.warning(`请填写 ${field.label}`)
          return false
        }
      }
      return true
    },
    saveCurrent() {
      if (!this.validateCurrent()) return
      if (this.mode === 'edit') this.saveEdit()
      else this.createChannel()
    },
    async createChannel() {
      this.saving = true
      try {
        await this.$axios.post(`${this.apiBase()}/create`, this.form)
        this.$message.success('已创建并同步到 OmniAgent')
        const createdName = this.form.name || this.form.inbox_name
        this.form = { ...emptyForm(this.channelType), ...(this.channelVdnId ? { vdn_id: this.channelVdnId } : {}) }
        await this.fetchList()
        const created = this.rows.find((row) => this.rowLabel(row) === createdName)
        if (created) this.selectChannel(created)
      } catch (error) {
        this.$message.error(error.response?.data?.message || '创建失败')
      } finally {
        this.saving = false
      }
    },
    async saveEdit() {
      if (!this.editRow?.conf_id) return
      this.saving = true
      try {
        const body = { ...this.editRow }
        const strip = [
          'conf_id', 'webhook_url', 'omni_channel_id', 'omni_inbox_id',
          'website_token', 'widget_script_url', 'identifier', 'hmac_token',
        ]
        Object.keys(body).forEach((key) => {
          if (key.endsWith('_masked')) delete body[key]
        })
        strip.forEach((key) => delete body[key])
        await this.$axios.post(`${this.apiBase()}/${this.editRow.conf_id}/update`, body)
        this.$message.success('已更新')
        await this.fetchList(this.editRow.conf_id)
      } catch (error) {
        this.$message.error(error.response?.data?.message || '更新失败')
      } finally {
        this.saving = false
      }
    },
    async removeChannel(row) {
      if (!row) return
      try {
        await this.$confirm(`确定删除渠道「${this.rowLabel(row)}」？`, '确认', { type: 'warning' })
      } catch (error) {
        return
      }
      try {
        await this.$axios.post(`${this.apiBase()}/${row.conf_id}/delete`)
        this.$message.success('已删除')
        this.startCreate()
        await this.fetchList()
      } catch (error) {
        this.$message.error(error.response?.data?.message || '删除失败')
      }
    },
    copyUrl(row) {
      const text = String(row.webhook_url || row.widget_script_url || '').trim()
      if (!text) return
      const done = () => this.$message.success('已复制到剪贴板')
      const fail = () => this.$message.error('复制失败，请手动选择复制')
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(done).catch(fail)
        return
      }
      try {
        const textarea = document.createElement('textarea')
        textarea.value = text
        textarea.style.position = 'fixed'
        textarea.style.left = '-9999px'
        document.body.appendChild(textarea)
        textarea.select()
        document.execCommand('copy')
        document.body.removeChild(textarea)
        done()
      } catch (error) {
        fail()
      }
    },
    exportChannels() {
      const blob = new Blob([JSON.stringify(this.rows, null, 2)], { type: 'application/json;charset=utf-8' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `${this.channelType}-channels.json`
      link.click()
      URL.revokeObjectURL(link.href)
    },
  },
}
</script>

<style scoped>
.omni-ch {
  min-width: 0;
  min-height: 0;
}

.channel-list-item {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 0;
  border-left: 3px solid transparent;
  color: var(--cfg-text, #565b66);
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
}

.channel-list-item:hover {
  background: #f3f6fb;
}

.channel-list-item.active {
  border-left-color: var(--cfg-accent, #457ff5);
  color: var(--cfg-accent, #457ff5);
  background: #eaf2ff;
}

.channel-list-item i {
  flex: 0 0 auto;
  font-size: 16px;
}

.channel-list-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-empty {
  padding: 24px 12px;
  color: var(--cfg-muted, #909399);
  font-size: 13px;
  text-align: center;
}

.channel-editor {
  min-height: 100%;
}

.channel-guidance {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #e8edf5;
  border-radius: 4px;
  color: var(--cfg-muted, #7a8190);
  background: #f7f9fc;
  font-size: 12px;
  line-height: 1.6;
}

.channel-guidance p {
  margin: 0;
}

.channel-guidance p + p {
  margin-top: 4px;
}

.omni-ch /deep/ .channel-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
}

.omni-ch /deep/ .channel-field-full {
  grid-column: 1 / -1;
}

.omni-ch /deep/ .el-form-item__content,
.omni-ch /deep/ .el-input,
.omni-ch /deep/ .el-textarea {
  min-width: 0;
}

.channel-access-section {
  margin-top: 8px;
  padding-top: 18px;
  border-top: 1px solid var(--cfg-border, #e4e7ed);
}

.channel-access-section h3 {
  margin: 0 0 16px;
  color: var(--cfg-heading, #222329);
  font-size: 14px;
  font-weight: 650;
}

@media (max-width: 1100px) {
  .omni-ch /deep/ .channel-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .omni-ch /deep/ .channel-field-full {
    grid-column: auto;
  }
}
</style>
