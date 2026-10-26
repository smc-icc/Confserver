<template>
  <div class="system-list-toolbar">
    <div class="title-area">
      <h2 class="page-title" :title="title">{{ title }}</h2>
      <slot name="title-side" />
    </div>

    <el-form :inline="true" size="small" class="search-form" @submit.native.prevent="$emit('search')">
      <el-input
        :value="keyword"
        class="search-input"
        :aria-label="searchPlaceholder"
        :placeholder="searchPlaceholder"
        @input="$emit('update:keyword', $event)"
        @keyup.enter.native="$emit('search')"
      >
        <i
          slot="suffix"
          :class="keyword ? 'el-icon-circle-close search-action-icon' : 'el-icon-search search-action-icon'"
          :title="keyword ? $t('operate.clear') : $t('operate.search')"
          @click.stop="keyword ? $emit('clear') : $emit('search')"
        ></i>
      </el-input>
    </el-form>

    <div class="actions">
      <el-button type="primary" size="small" icon="el-icon-plus" :title="$t('operate.add')" :disabled="addDisabled" @click="$emit('add')" />
      <el-button type="primary" size="small" icon="el-icon-upload2" :title="$t('smcicc.system.listToolbar.import')" :loading="importing" :disabled="importDisabled" @click="chooseFile" />
      <el-button type="primary" size="small" icon="el-icon-download" :title="$t('smcicc.system.listToolbar.export')" :disabled="!hasRows || exportDisabled" @click="$emit('export')" />
      <el-button type="danger" size="small" icon="el-icon-delete" :title="$t('operate.delete')" :disabled="!hasSelection || deleteDisabled" @click="$emit('delete')" />
      <input ref="importFile" class="import-file" type="file" accept=".csv,text/csv" @change="onFileChange" />
    </div>
  </div>
</template>

<script>
export default {
  name: 'SystemListToolbar',
  props: {
    title: { type: String, required: true },
    keyword: { type: String, default: '' },
    importing: { type: Boolean, default: false },
    hasRows: { type: Boolean, default: false },
    hasSelection: { type: Boolean, default: false },
    addDisabled: { type: Boolean, default: false },
    importDisabled: { type: Boolean, default: false },
    exportDisabled: { type: Boolean, default: false },
    deleteDisabled: { type: Boolean, default: false },
  },
  computed: {
    searchPlaceholder() {
      return this.$t('smcicc.system.listToolbar.searchPlaceholder');
    },
  },
  methods: {
    chooseFile() {
      this.$refs.importFile && this.$refs.importFile.click();
    },
    onFileChange(event) {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      if (file) this.$emit('import', file);
    },
  },
};
</script>

<style scoped>
.system-list-toolbar {
  display: grid;
  grid-column: 1 / -1;
  grid-row: 1;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  align-items: center;
  gap: 16px;
  width: 100%;
  margin-bottom: 16px;
}
.title-area {
  display: flex;
  width: 100%;
  min-width: 0;
  align-items: center;
  gap: 12px;
  justify-self: start;
}
.page-title {
  min-width: 0;
  flex: 0 1 auto;
  justify-self: start;
  margin: 0;
  overflow: hidden;
  font-size: 20px;
  line-height: 1.3;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.search-form {
  grid-column: 2;
  justify-self: center;
  margin: 0;
}
.search-input {
  width: 260px;
}
.search-action-icon {
  color: #8a94a6;
  cursor: pointer;
}
.search-action-icon:hover {
  color: #457ff5;
}
.actions {
  display: flex;
  grid-column: 3;
  align-items: center;
  justify-self: end;
  gap: 8px;
}
.actions .el-button {
  width: 34px;
  min-width: 34px;
  height: 32px;
  padding: 8px 0;
}
.actions .el-button + .el-button {
  margin-left: 0;
}
.import-file {
  display: none;
}

@media (max-width: 1200px) {
  .system-list-toolbar {
    grid-template-columns: 1fr auto;
    grid-template-rows: auto auto;
  }
  .search-form {
    grid-column: 2;
    justify-self: end;
  }
  .actions {
    grid-column: 1 / -1;
    grid-row: 2;
  }
}
</style>
