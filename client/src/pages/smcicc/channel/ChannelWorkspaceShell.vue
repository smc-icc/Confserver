<template>
  <div
    class="channel-workspace"
    :class="{ 'channel-workspace-embedded': !!channelVdnId }"
    :style="{ gridTemplateColumns: splitWidth + 'px 8px minmax(0, 1fr)' }"
  >
    <header v-if="channelVdnId" class="channel-embedded-toolbar">
      <span><i class="el-icon-tickets" aria-hidden="true" />{{ listTitle }}</span>
      <div class="channel-list-actions"><slot name="list-actions" /></div>
    </header>
    <section class="channel-list-panel">
      <header v-if="!channelVdnId" class="channel-list-toolbar">
        <span class="channel-list-title">{{ listTitle }}</span>
        <div class="channel-list-actions">
          <slot name="list-actions" />
        </div>
      </header>
      <div class="channel-list-body">
        <slot name="list" />
      </div>
    </section>

    <div
      class="channel-splitter"
      role="separator"
      aria-orientation="vertical"
      tabindex="0"
      @mousedown="startResize"
      @keydown.left.prevent="resizeBy(-20)"
      @keydown.right.prevent="resizeBy(20)"
    >
      <span class="channel-splitter-grip" aria-hidden="true" />
    </div>

    <section class="channel-config-panel">
      <header class="channel-config-header">
        <h2 :title="configTitle"><i v-if="channelVdnId" class="el-icon-setting" aria-hidden="true" /><span>{{ configTitle }}</span></h2>
        <div class="channel-config-actions">
          <slot name="config-actions" />
        </div>
      </header>
      <div class="channel-config-body">
        <slot />
      </div>
    </section>
  </div>
</template>

<script>
export default {
  name: 'ChannelWorkspaceShell',
  inject: { channelVdnId: { default: null } },
  props: {
    listTitle: {
      type: String,
      default: '渠道列表',
    },
    configTitle: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      splitWidth: this.channelVdnId ? 200 : 276,
      resizing: false,
      resizeStartX: 0,
      resizeStartWidth: 276,
    }
  },
  beforeDestroy() {
    this.stopResize()
  },
  methods: {
    clampWidth(width) {
      const rect = this.$el ? this.$el.getBoundingClientRect() : null
      const maxWidth = rect ? Math.max(220, rect.width - 520) : 420
      return Math.round(Math.min(maxWidth, Math.max(200, width)))
    },
    startResize(event) {
      if (event.button !== 0) return
      this.resizing = true
      this.resizeStartX = event.clientX
      this.resizeStartWidth = this.splitWidth
      document.body.classList.add('channel-workspace-is-resizing')
      window.addEventListener('mousemove', this.resizeSplit)
      window.addEventListener('mouseup', this.stopResize)
      event.preventDefault()
    },
    resizeSplit(event) {
      if (!this.resizing || !this.$el) return
      this.splitWidth = this.clampWidth(
        this.resizeStartWidth + event.clientX - this.resizeStartX,
      )
    },
    resizeBy(delta) {
      this.splitWidth = this.clampWidth(this.splitWidth + delta)
    },
    stopResize() {
      if (!this.resizing && !document.body.classList.contains('channel-workspace-is-resizing')) return
      this.resizing = false
      this.resizeStartX = 0
      this.resizeStartWidth = this.splitWidth
      document.body.classList.remove('channel-workspace-is-resizing')
      window.removeEventListener('mousemove', this.resizeSplit)
      window.removeEventListener('mouseup', this.stopResize)
    },
  },
}
</script>

<style scoped>
.channel-workspace-embedded { grid-template-rows: auto minmax(0, 1fr); }
.channel-embedded-toolbar { grid-column: 1 / -1; display: flex; align-items: center; gap: 16px; min-height: 48px; padding: 8px 14px; box-sizing: border-box; border-bottom: 1px solid #e4e7ed; background: #f7f9fc; font-size: 14px; font-weight: 600; }

.channel-workspace {
  display: grid;
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
  grid-template-columns: 276px 8px minmax(0, 1fr);
  gap: 16px;
  padding: 16px;
  box-sizing: border-box;
  overflow: hidden;
  background: var(--cfg-bg, #f4f7fb);
}

.channel-list-panel,
.channel-config-panel {
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border: 1px solid var(--cfg-border, #e4e7ed);
  border-radius: 6px;
  background: #fff;
  box-shadow: 0 4px 16px rgba(34, 35, 41, 0.06);
}

.channel-list-panel,
.channel-config-panel {
  display: flex;
  flex-direction: column;
}

.channel-list-toolbar,
.channel-config-header {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  justify-content: space-between;
  border-bottom: 1px solid var(--cfg-border, #e4e7ed);
  background: var(--cfg-surface-raised, #f7f9fc);
}

.channel-list-toolbar {
  min-height: 56px;
  gap: 4px;
  padding: 10px 12px;
}

.channel-list-title {
  min-width: 0;
  overflow: hidden;
  color: var(--cfg-heading, #222329);
  font-size: 14px;
  font-weight: 650;
  line-height: 32px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-list-actions,
.channel-config-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 4px;
}

.channel-list-actions /deep/ .el-button {
  width: 30px;
  min-width: 30px;
  height: 30px;
  margin: 0;
  padding: 7px 0;
}

.channel-config-actions /deep/ .el-button {
  width: 34px;
  min-width: 34px;
  height: 34px;
  margin: 0;
  padding: 8px 0;
}

.channel-list-body,
.channel-config-body {
  min-height: 0;
  flex: 1 1 auto;
  overflow: auto;
}

.channel-list-body {
  padding: 6px 0;
}

.channel-config-header {
  min-height: 56px;
  gap: 16px;
  padding: 10px 18px;
}

.channel-config-header h2 {
  min-width: 0;
  margin: 0;
  overflow: hidden;
  color: var(--cfg-heading, #222329);
  font-size: 18px;
  font-weight: 650;
  line-height: 1.4;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.channel-config-body {
  padding: 16px 18px;
}

.channel-splitter {
  position: relative;
  min-height: 0;
  outline: none;
  cursor: col-resize;
}

.channel-splitter::before {
  position: absolute;
  top: 8px;
  bottom: 8px;
  left: 3px;
  width: 2px;
  border-radius: 2px;
  background: var(--cfg-border, #e4e7ed);
  content: '';
  transition: background-color 160ms ease, width 160ms ease;
}

.channel-splitter:hover::before,
.channel-splitter:focus::before,
.channel-workspace-is-resizing .channel-splitter::before {
  left: 2px;
  width: 4px;
  background: var(--cfg-accent, #457ff5);
}

.channel-splitter-grip {
  position: absolute;
  top: 50%;
  left: 0;
  width: 8px;
  height: 44px;
  transform: translateY(-50%);
}

@media (max-width: 900px) {
  .channel-workspace {
    gap: 10px;
    padding: 10px;
  }

  .channel-config-header,
  .channel-config-body {
    padding-right: 12px;
    padding-left: 12px;
  }
}
</style>
