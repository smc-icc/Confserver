<template>
  <channel-workspace-shell
    class="integration-keys"
    :list-title="`密钥列表 ${configuredCount}/${items.length}`"
    :config-title="activeItem ? activeItem.name : '集成密钥配置'"
  >
    <template slot="list-actions">
      <el-button
        type="primary"
        icon="el-icon-refresh"
        title="刷新"
        aria-label="刷新"
        :loading="loading"
        @click="fetchList()"
      />
      <el-button
        type="primary"
        icon="el-icon-download"
        title="导出"
        aria-label="导出"
        :disabled="!configuredCount"
        @click="exportKeys"
      />
      <el-button
        type="danger"
        icon="el-icon-delete"
        title="清除"
        aria-label="清除"
        :disabled="!activeItem || !activeItem.configured"
        @click="remove(activeItem)"
      />
    </template>

    <template slot="list">
      <button
        v-for="item in items"
        :key="item.id"
        type="button"
        class="integration-list-item"
        :class="{ active: item.id === activeId }"
        @click="selectItem(item)"
      >
        <i class="el-icon-key" aria-hidden="true" />
        <span>{{ item.name }}</span>
        <i
          class="integration-status"
          :class="item.configured ? 'is-configured' : 'is-empty'"
          :title="item.configured ? '已配置' : '未配置'"
          aria-hidden="true"
        />
      </button>
      <div v-if="!loading && !items.length" class="integration-empty">暂无集成密钥</div>
    </template>

    <template slot="config-actions">
      <el-button
        type="primary"
        icon="el-icon-check"
        title="保存"
        aria-label="保存"
        :loading="saving"
        :disabled="!activeItem"
        @click="save"
      />
    </template>

    <div v-loading="loading" class="integration-editor">
      <el-empty v-if="!activeItem" description="暂无集成密钥" :image-size="72" />
      <template v-else>
        <div class="integration-summary">
          <div>
            <span class="summary-label">配置状态</span>
            <el-tag :type="activeItem.configured ? 'success' : 'info'" size="small">
              {{ activeItem.configured ? '已配置' : '未配置' }}
            </el-tag>
          </div>
          <div>
            <span class="summary-label">厂商</span>
            <span>{{ activeItem.vendor }}</span>
          </div>
          <div>
            <span class="summary-label">更新时间</span>
            <span>{{ activeItem.updated_at || '暂无' }}</span>
          </div>
        </div>

        <el-form label-width="120px" size="small" class="integration-form" @submit.native.prevent>
          <el-form-item label="系统">
            <el-input :value="activeItem.name" readonly />
          </el-form-item>
          <el-form-item label="说明">
            <el-input :value="activeItem.description" readonly />
          </el-form-item>
          <el-form-item label="当前密钥">
            <el-input :value="activeItem.configured ? activeItem.endpoint_masked : '未配置'" readonly />
          </el-form-item>
          <el-form-item label="新密钥" required>
            <el-input
              v-model="editValue"
              :type="showPassword ? 'text' : 'password'"
              :placeholder="activeItem.configured ? '输入新密钥，留空则不修改' : `输入 ${activeItem.name} 密钥`"
              autocomplete="new-password"
              @keyup.enter.native="save"
            >
              <el-button
                slot="append"
                icon="el-icon-view"
                :title="showPassword ? '隐藏密钥' : '显示密钥'"
                :aria-label="showPassword ? '隐藏密钥' : '显示密钥'"
                @click="showPassword = !showPassword"
              />
            </el-input>
          </el-form-item>
        </el-form>
      </template>
    </div>
  </channel-workspace-shell>
</template>

<script>
import ChannelWorkspaceShell from '@/pages/smcicc/channel/ChannelWorkspaceShell.vue'

export default {
  name: 'IntegrationKeysPanel',
  components: { ChannelWorkspaceShell },
  data() {
    return {
      items: [],
      activeId: '',
      editValue: '',
      loading: false,
      saving: false,
      showPassword: false,
    }
  },
  computed: {
    configuredCount() {
      return this.items.filter((item) => item.configured).length
    },
    activeItem() {
      return this.items.find((item) => item.id === this.activeId) || null
    },
  },
  mounted() {
    this.fetchList()
  },
  methods: {
    selectItem(item) {
      if (!item) return
      this.activeId = item.id
      this.editValue = ''
      this.showPassword = false
    },

    async fetchList(preferredId) {
      this.loading = true
      try {
        const res = await this.$axios.get('/api/integrations/list')
        this.items = res.data?.data?.items || []
        const targetId = typeof preferredId === 'string' ? preferredId : this.activeId
        const selected = this.items.find((item) => item.id === targetId) || this.items[0]
        if (selected) this.selectItem(selected)
        else this.activeId = ''
      } catch (error) {
        this.$message.error('加载失败：' + (error.message || '网络错误'))
      } finally {
        this.loading = false
      }
    },

    async save() {
      if (!this.activeItem) return
      const value = this.editValue.trim()
      if (!value) {
        this.$message.warning('请输入密钥')
        return
      }
      this.saving = true
      try {
        const activeId = this.activeItem.id
        await this.$axios.post('/api/integrations/update', { key: activeId, value })
        this.$message.success('已保存')
        await this.fetchList(activeId)
      } catch (error) {
        this.$message.error(error.response?.data?.message || '保存失败')
      } finally {
        this.saving = false
      }
    },

    async remove(item) {
      if (!item || !item.configured) return
      try {
        await this.$confirm(`确定清除 ${item.name} 的密钥吗？`, '确认', { type: 'warning' })
      } catch (error) {
        return
      }
      try {
        await this.$axios.post('/api/integrations/delete', { key: item.id })
        this.$message.success('已清除')
        await this.fetchList(item.id)
      } catch (error) {
        this.$message.error(error.response?.data?.message || '清除失败')
      }
    },

    async exportKeys() {
      try {
        const res = await this.$axios.get('/api/integrations/export')
        const data = JSON.stringify(res.data?.data || {}, null, 2)
        const blob = new Blob([data], { type: 'application/json;charset=utf-8' })
        const link = document.createElement('a')
        link.href = URL.createObjectURL(blob)
        link.download = 'integrations.json'
        link.click()
        URL.revokeObjectURL(link.href)
        this.$message.success('已下载')
      } catch (error) {
        this.$message.error(error.response?.data?.message || '导出失败')
      }
    },
  },
}
</script>

<style scoped>
.integration-keys {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.integration-list-item {
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

.integration-list-item:hover {
  background: #f3f6fb;
}

.integration-list-item.active {
  border-left-color: var(--cfg-accent, #457ff5);
  color: var(--cfg-accent, #457ff5);
  background: #eaf2ff;
}

.integration-list-item > i:first-child {
  flex: 0 0 auto;
  font-size: 16px;
}

.integration-list-item span {
  min-width: 0;
  flex: 1 1 auto;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.integration-status {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #c0c4cc;
}

.integration-status.is-configured {
  background: #67c23a;
}

.integration-empty {
  padding: 24px 12px;
  color: var(--cfg-muted, #909399);
  font-size: 13px;
  text-align: center;
}

.integration-editor {
  min-height: 100%;
}

.integration-summary {
  display: flex;
  align-items: center;
  gap: 28px;
  margin-bottom: 24px;
  padding: 12px 14px;
  border: 1px solid #e8edf5;
  border-radius: 4px;
  color: var(--cfg-text, #565b66);
  background: #f7f9fc;
  font-size: 13px;
}

.integration-summary > div {
  display: flex;
  align-items: center;
  gap: 8px;
}

.summary-label {
  color: var(--cfg-muted, #909399);
}

.integration-form {
  width: 100%;
  max-width: 960px;
}

@media (max-width: 1100px) {
  .integration-summary {
    align-items: flex-start;
    flex-direction: column;
    gap: 8px;
  }
}
</style>
