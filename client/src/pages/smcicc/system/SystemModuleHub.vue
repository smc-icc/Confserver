<template>
  <div class="sys-mod" v-if="mod">
    <h2 class="title">{{ $t(mod.titleKey) }}</h2>
    <p class="sub">
      Node：<code>/server/api/smcicc/systemadmin/{{ mod.action }}</code>
      <span v-if="total != null" class="total">（Total: {{ total }}）</span>
    </p>
    <el-tabs v-model="tab">
      <el-tab-pane :label="$t('smcicc.hub.apiPreview')" name="api">
        <el-alert v-if="err" :title="err" type="error" show-icon class="mb" />
        <div v-loading="loading" class="table-wrap">
          <el-table v-if="columns.length" :data="rows" stripe border size="small" max-height="480">
            <el-table-column
              v-for="col in columns"
              :key="col"
              :prop="col"
              :label="col"
              min-width="100"
              show-overflow-tooltip
            />
          </el-table>
          <pre v-else-if="!loading && rawJson" class="raw">{{ rawJson }}</pre>
          <span v-else-if="!loading">{{ $t('smcicc.hub.noTableData') }}</span>
        </div>
      </el-tab-pane>
      <el-tab-pane :label="$t('smcicc.hub.legacyUi')" name="legacy" :disabled="!legacyFrameSrc">
        <p v-if="!legacyFrameSrc" class="muted">{{ $t('smcicc.hub.legacyNotConfigured') }}</p>
        <iframe
          v-else
          class="legacy-iframe"
          :title="$t(mod.titleKey)"
          frameborder="0"
          :src="legacyFrameSrc"
        />
      </el-tab-pane>
    </el-tabs>
  </div>
  <el-alert v-else :title="$t('smcicc.hub.unknownModule')" type="warning" :closable="false" show-icon />
</template>

<script>
import { getSystemModule } from './menuConfig';

function extractRows(data) {
  if (data == null) return { rows: [], total: null };
  if (Array.isArray(data)) return { rows: data, total: data.length };
  if (typeof data === 'object') {
    if (Array.isArray(data.Rows)) return { rows: data.Rows, total: data.Total != null ? data.Total : data.Rows.length };
    if (Array.isArray(data.rows)) return { rows: data.rows, total: data.total };
    const keys = Object.keys(data);
    if (keys.length && keys.every((k) => typeof data[k] !== 'object' || data[k] === null)) {
      return { rows: [data], total: 1 };
    }
  }
  return { rows: [], total: null };
}

export default {
  name: 'SMCIccSystemModuleHub',
  inject: ['smciccLegacyUiRoot'],
  data() {
    return {
      mod: null,
      tab: 'api',
      loading: false,
      err: '',
      rows: [],
      columns: [],
      total: null,
      rawJson: '',
    };
  },
  computed: {
    legacyUiBase() {
      return this.smciccLegacyUiRoot.base || '';
    },
    legacyFrameSrc() {
      if (!this.mod) return '';
      const b = (this.legacyUiBase || '').replace(/\/$/, '');
      return b ? `${b}/systemadmin/${this.mod.legacyPath}` : '';
    },
  },
  watch: {
    '$route.params.moduleId': {
      immediate: true,
      handler() {
        this.loadModule();
      },
    },
    legacyFrameSrc() {
      if (!this.legacyFrameSrc && this.tab === 'legacy') this.tab = 'api';
    },
  },
  methods: {
    loadModule() {
      const id = this.$route.params.moduleId;
      const m = getSystemModule(id);
      this.mod = m;
      this.err = '';
      this.rows = [];
      this.columns = [];
      this.total = null;
      this.rawJson = '';
      if (!m) return;

      const url = `/server/api/smcicc/systemadmin/${m.action}`;
      const payload = { page: 1, pagesize: 200 };
      this.loading = true;
      const req = m.usePost
        ? this.$ajax.postJSON(url, payload)
        : this.$ajax.getJSON(url, payload);
      req
        .then((data) => {
          const { rows, total } = extractRows(data);
          this.total = total;
          if (rows.length && typeof rows[0] === 'object' && rows[0] !== null) {
            const keySet = new Set();
            rows.slice(0, 50).forEach((r) => {
              Object.keys(r).forEach((k) => keySet.add(k));
            });
            this.columns = Array.from(keySet).slice(0, 16);
            this.rows = rows;
          } else {
            try {
              this.rawJson = JSON.stringify(data, null, 2);
            } catch (e) {
              this.rawJson = String(data);
            }
          }
        })
        .catch(() => {
          this.err = this.$t('smcicc.hub.requestFailed');
        })
        .finally(() => {
          this.loading = false;
        });
    },
  },
};
</script>

<style scoped>
.title {
  margin: 0 0 8px;
  font-size: 18px;
}
.sub {
  margin: 0 0 12px;
  font-size: 13px;
  color: #606266;
}
.sub .total {
  margin-left: 8px;
}
.mb {
  margin-bottom: 12px;
}
.table-wrap {
  min-height: 120px;
}
.raw {
  font-size: 12px;
  background: #f5f7fa;
  padding: 12px;
  border-radius: 4px;
  overflow: auto;
  max-height: 480px;
}
.legacy-iframe {
  width: 100%;
  height: calc(100vh - 260px);
  min-height: 480px;
  border: 1px solid #dcdfe6;
  border-radius: 4px;
}
.muted {
  color: #909399;
  font-size: 13px;
}
</style>
