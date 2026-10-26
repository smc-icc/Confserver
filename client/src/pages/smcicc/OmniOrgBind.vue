<template>
  <div class="smcicc-page org-bind-page">
    <h2 class="page-title">{{ $t('smcicc.orgBind') }}</h2>
    <p class="desc">
      查看当前 VDN 下业务组挂接的电话/在线技能，并为 Omni inbox 绑定 ITR 流程。
      VDN 默认流程请到「VDN 管理」修改。未挂在线技能的组无法「仅签入在线」。
    </p>

    <el-form :inline="true" size="small" class="toolbar" @submit.native.prevent="loadMatrix">
      <el-form-item v-if="!lockedVdnId" label="VDN">
        <el-select v-model="vdnId" filterable style="width: 240px" @change="loadMatrix">
          <el-option v-for="v in vdnOptions" :key="v.id" :label="`${v.id} — ${v.name}`" :value="v.id" />
        </el-select>
      </el-form-item>
      <el-form-item>
        <el-button type="primary" icon="el-icon-search" :loading="loading" @click="loadMatrix">查询</el-button>
      </el-form-item>
    </el-form>

    <el-alert v-if="warning" :title="warning" type="warning" show-icon class="mb" :closable="false" />

    <el-card shadow="never" class="mb">
      <div slot="header" class="card-head">VDN 默认 ITR 流程</div>
      <p class="hint">
        当前 VDN {{ vdnId || '—' }}：
        <b v-if="vdnDefaultFlowId">{{ formatFlow(vdnDefaultFlowId) }}</b>
        <span v-else>未配置（Omni 使用环境变量默认流程）</span>
      </p>
    </el-card>

    <el-card shadow="never" class="mb">
      <div slot="header" class="card-head">业务组 × 媒体技能</div>
      <el-table v-loading="loading" :data="groups" border stripe size="small" max-height="360" empty-text="无业务组，或 t_group_skill 未挂技能">
        <el-table-column prop="id" label="组 ID" width="80" align="center" />
        <el-table-column prop="name" label="组名" min-width="160" show-overflow-tooltip />
        <el-table-column label="媒体" width="140">
          <template slot-scope="{ row }">
            <el-tag v-if="(row.mediaKinds || []).indexOf('tas') >= 0" size="mini" type="info">电话</el-tag>
            <el-tag v-if="(row.mediaKinds || []).indexOf('ims') >= 0" size="mini" type="success">在线</el-tag>
            <span v-if="!(row.mediaKinds || []).length" class="muted">未挂技能</span>
          </template>
        </el-table-column>
        <el-table-column label="技能" min-width="220">
          <template slot-scope="{ row }">
            <span v-if="!(row.skills || []).length" class="muted">—</span>
            <el-tag
              v-for="s in row.skills || []"
              :key="s.id"
              size="mini"
              :type="s.kind === 'tas' ? 'info' : 'success'"
              class="skill-tag"
            >{{ s.name }}({{ s.kind === 'tas' ? '电话' : '在线' }})</el-tag>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-card shadow="never">
      <div slot="header" class="card-head">Inbox 绑定 ITR 流程</div>
      <el-table v-loading="loading" :data="inboxes" border stripe size="small" empty-text="未拉到 Omni inbox（检查 PLATFORM_SYNC_SECRET）">
        <el-table-column prop="id" label="ID" width="70" align="center" />
        <el-table-column prop="name" label="Inbox" min-width="140" show-overflow-tooltip />
        <el-table-column prop="channel_type" label="渠道" width="110" />
        <el-table-column label="启用 ITR" width="100" align="center">
          <template slot-scope="{ row }">
            <el-switch v-model="row.itr_enabled" @change="saveInbox(row)" />
          </template>
        </el-table-column>
        <el-table-column label="流程" min-width="220">
          <template slot-scope="{ row }">
            <el-select
              v-model="row.itr_flow_id"
              clearable
              filterable
              placeholder="未绑定（用 VDN 默认）"
              style="width: 100%"
              @change="saveInbox(row)"
            >
              <el-option v-for="f in flows" :key="f.id" :label="`${f.id} ${f.name}`" :value="f.id" />
            </el-select>
          </template>
        </el-table-column>
      </el-table>
    </el-card>
  </div>
</template>

<script>
const SYS_BASE = '/server/api/smcicc/systemadmin';

export default {
  name: 'SMCIccOmniOrgBind',
  props: {
    lockedVdnId: { type: Number, default: 0 },
  },
  data() {
    return {
      vdnId: null,
      vdnOptions: [],
      vdnDefaultFlowId: 0,
      groups: [],
      inboxes: [],
      flows: [],
      loading: false,
      warning: '',
      savingIds: {},
    };
  },
  watch: {
    lockedVdnId(id) {
      if (id > 0 && id !== this.vdnId) {
        this.vdnId = id;
        this.loadMatrix();
      }
    },
  },
  mounted() {
    if (this.lockedVdnId > 0) this.vdnId = this.lockedVdnId;
    this.loadVdns().then(() => this.loadMatrix());
  },
  methods: {
    formatFlow(id) {
      const n = Number(id);
      const f = this.flows.find((x) => Number(x.id) === n);
      return f ? `${f.id} ${f.name}` : String(id);
    },
    loadVdns() {
      return this.$ajax
        .postJSON(`${SYS_BASE}/loadAllVdns`, {})
        .then((data) => {
          const list = Array.isArray(data) ? data : data?.Rows || data?.rows || [];
          this.vdnOptions = list
            .map((x) => ({
              id: Number(x.id ?? x.ID ?? x.vdnId),
              name: String(x.name ?? x.Name ?? ''),
            }))
            .filter((x) => x.id > 0);
          if (!this.vdnId && !this.lockedVdnId && this.vdnOptions.length) this.vdnId = this.vdnOptions[0].id;
        })
        .catch(() => {
          this.vdnOptions = [];
        });
    },
    async loadMatrix() {
      if (!this.vdnId) {
        this.groups = [];
        this.inboxes = [];
        return;
      }
      this.loading = true;
      this.warning = '';
      try {
        const res = await this.$axios.get('/api/smcicc/itrflow/org-matrix', { params: { vdnId: this.vdnId } });
        const data = (res.data && res.data.data) || res.data || {};
        this.vdnDefaultFlowId = Number(data.vdnDefaultFlowId || 0);
        this.groups = data.groups || [];
        this.inboxes = (data.inboxes || []).map((x) => ({
          ...x,
          itr_enabled: x.itr_enabled !== false,
          itr_flow_id: x.itr_flow_id || null,
        }));
        this.flows = data.flows || [];
        this.warning = data.warning || '';
      } catch (e) {
        this.groups = [];
        this.inboxes = [];
        this.warning = (e && e.message) || '加载失败';
      } finally {
        this.loading = false;
      }
    },
    async saveInbox(row) {
      if (!row || !row.id) return;
      if (this.savingIds[row.id]) return;
      this.$set(this.savingIds, row.id, true);
      try {
        const res = await this.$axios.post('/api/smcicc/itrflow/bind-inbox', {
          inboxId: row.id,
          flowId: row.itr_flow_id || null,
          itrEnabled: row.itr_enabled !== false,
        });
        if (res.data && res.data.ret_code === 200) {
          this.$message.success(`已保存 ${row.name}`);
        } else {
          this.$message.error((res.data && res.data.err_msg) || '保存失败');
        }
      } catch (e) {
        this.$message.error((e && e.message) || '保存失败');
      } finally {
        this.$set(this.savingIds, row.id, false);
      }
    },
  },
};
</script>

<style scoped>
.org-bind-page .page-title {
  margin: 0 0 8px;
  font-size: 18px;
  font-weight: 600;
  color: #303133;
}
.org-bind-page .desc {
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 12px;
}
.org-bind-page .toolbar {
  margin-bottom: 8px;
}
.org-bind-page .mb {
  margin-bottom: 12px;
}
.org-bind-page .card-head {
  font-weight: 600;
}
.org-bind-page .hint {
  margin: 0;
  font-size: 13px;
  color: #606266;
}
.org-bind-page .muted {
  color: #c0c4cc;
}
.org-bind-page .skill-tag {
  margin: 0 4px 4px 0;
}
</style>
