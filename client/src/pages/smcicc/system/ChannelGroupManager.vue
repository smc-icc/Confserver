<template>
  <div class="smcicc-page channel-group-page">
    <system-list-toolbar
      :title="$t('smcicc.system.channelGroup.title')"
      :keyword.sync="filterKeyword"
      :importing="importing"
      :has-rows="listFilteredRows.length > 0"
      :has-selection="selection.length > 0"
      @search="handleListSearch"
      @clear="clearListSearch"
      @add="openAdd"
      @import="importList"
      @export="exportList"
      @delete="doDelete"
    />

    <el-alert v-if="err" :title="err" type="error" show-icon class="mb" :closable="false" />

    <el-table
      v-loading="loading"
      :data="listVisibleRows"
      border
      stripe
      size="small"
      max-height="520"
      @selection-change="onSel"
      @row-dblclick="openEdit"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="name" :label="$t('smcicc.system.channelGroup.colName')" min-width="140" show-overflow-tooltip />
      <el-table-column prop="beginSpanId" :label="$t('smcicc.system.channelGroup.colBeginSpan')" width="100" align="center" />
      <el-table-column prop="beginChannelId" :label="$t('smcicc.system.channelGroup.colBeginChannel')" width="100" align="center" />
      <el-table-column prop="endSpanId" :label="$t('smcicc.system.channelGroup.colEndSpan')" width="100" align="center" />
      <el-table-column prop="endChannelId" :label="$t('smcicc.system.channelGroup.colEndChannel')" width="100" align="center" />
      <el-table-column :label="$t('smcicc.system.channelGroup.colSeekType')" min-width="140" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ seekLabel(row.seekType) }}</template>
      </el-table-column>
      <el-table-column :label="$t('smcicc.system.channelGroup.colCallerCapacity')" min-width="160" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ callerLabel(row.callerCapacity) }}</template>
      </el-table-column>
    </el-table>

    <el-pagination
      class="pager"
      background
      layout="total, sizes, prev, pager, next, jumper"
      :page-sizes="[10, 20, 50]"
      :current-page.sync="page"
      :page-size.sync="pageSize"
      :total="listFilteredTotal"
      @size-change="setListPageSize"
      @current-change="setListPage"
    />

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="420px" append-to-body @closed="onDialogClosed">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="150px" size="small">
        <el-form-item :label="$t('smcicc.system.channelGroup.name')" prop="name">
          <el-input v-model="form.name" class="no-ime" maxlength="50" show-word-limit />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelGroup.beginSpanId')" prop="beginSpanId">
          <el-input v-model.number="form.beginSpanId" class="no-ime" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelGroup.beginChannelId')" prop="beginChannelId">
          <el-input v-model.number="form.beginChannelId" class="no-ime" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelGroup.endSpanId')" prop="endSpanId">
          <el-input v-model.number="form.endSpanId" class="no-ime" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelGroup.endChannelId')" prop="endChannelId">
          <el-input v-model.number="form.endChannelId" class="no-ime" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelGroup.seekType')" prop="seekType">
          <el-select v-model.number="form.seekType" style="width: 100%">
            <el-option v-for="o in seekOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelGroup.callerCapacity')" prop="callerCapacity">
          <el-select v-model.number="form.callerCapacity" style="width: 100%">
            <el-option v-for="o in callerOptions" :key="o.value" :label="o.label" :value="o.value" />
          </el-select>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="dialogVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="submitForm">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import SystemListToolbar from './SystemListToolbar.vue';
import systemListPageMixin, { DEFAULT_LIST_LIMIT } from './systemListPageMixin';

const BASE = '/server/api/smcicc/systemadmin';

function emptyForm() {
  return {
    id: null,
    name: '',
    beginSpanId: 0,
    beginChannelId: 0,
    endSpanId: 0,
    endChannelId: 0,
    seekType: 0,
    callerCapacity: 1,
    vdnId: -1,
  };
}

function rowToForm(r) {
  return {
    id: r.id != null ? Number(r.id) : null,
    name: r.name != null ? String(r.name) : '',
    beginSpanId: r.beginSpanId != null ? Number(r.beginSpanId) : 0,
    beginChannelId: r.beginChannelId != null ? Number(r.beginChannelId) : 0,
    endSpanId: r.endSpanId != null ? Number(r.endSpanId) : 0,
    endChannelId: r.endChannelId != null ? Number(r.endChannelId) : 0,
    seekType: r.seekType != null ? Number(r.seekType) : 0,
    callerCapacity: r.callerCapacity != null ? Number(r.callerCapacity) : 1,
    vdnId: r.vdnId != null && r.vdnId !== '' ? Number(r.vdnId) : -1,
  };
}

export default {
  name: 'SMCIccChannelGroupManager',
  components: { SystemListToolbar },
  mixins: [systemListPageMixin],
  data() {
    return {
      loading: false,
      saving: false,
      err: '',
      rows: [],
      total: 0,
      page: 1,
      pageSize: 10,
      selection: [],
      dialogVisible: false,
      dialogMode: 'add',
      form: emptyForm(),
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    dialogTitle() {
      const action = this.dialogMode === 'edit' ? this.$t('operate.title.update') : this.$t('operate.title.add');
      return `${this.$t('smcicc.system.channelGroup.dialogTitle')} — ${action}`;
    },
    seekOptions() {
      return [
        { value: 0, label: this.$t('smcicc.system.channelGroup.seekW') },
        { value: 1, label: this.$t('smcicc.system.channelGroup.seekZ') },
        { value: 2, label: this.$t('smcicc.system.channelGroup.seekOdd') },
        { value: 3, label: this.$t('smcicc.system.channelGroup.seekEven') },
      ];
    },
    callerOptions() {
      return [
        { value: 1, label: this.$t('smcicc.system.channelGroup.callerAny') },
        { value: 0, label: this.$t('smcicc.system.channelGroup.callerSpecified') },
      ];
    },
    rules() {
      const ruleSpan = (rule, value, cb) => {
        const n = Number(value);
        if (value === '' || value === null || Number.isNaN(n)) {
          cb(new Error(this.$t('smcicc.system.channelGroup.required')));
          return;
        }
        if (n < 0 || n > 65535) {
          cb(new Error(this.$t('smcicc.system.channelGroup.spanRange')));
          return;
        }
        cb();
      };
      const ruleCh = (rule, value, cb) => {
        const n = Number(value);
        if (value === '' || value === null || Number.isNaN(n)) {
          cb(new Error(this.$t('smcicc.system.channelGroup.required')));
          return;
        }
        if (n < 0 || n > 31) {
          cb(new Error(this.$t('smcicc.system.channelGroup.channelRange')));
          return;
        }
        cb();
      };
      const ruleOrder = (rule, value, cb) => {
        const bs = Number(this.form.beginSpanId);
        const es = Number(this.form.endSpanId);
        const bc = Number(this.form.beginChannelId);
        const ec = Number(this.form.endChannelId);
        if ([bs, es, bc, ec].some((x) => Number.isNaN(x))) {
          cb();
          return;
        }
        if (bs > es) {
          cb(new Error(this.$t('smcicc.system.channelGroup.endSpanGteBegin')));
          return;
        }
        if (bc > ec) {
          cb(new Error(this.$t('smcicc.system.channelGroup.endChannelGteBegin')));
          return;
        }
        cb();
      };
      return {
        name: [{ required: true, message: this.$t('smcicc.system.channelGroup.required') }],
        beginSpanId: [{ validator: ruleSpan, trigger: 'blur' }],
        beginChannelId: [{ validator: ruleCh, trigger: 'blur' }],
        endSpanId: [
          { validator: ruleSpan, trigger: 'blur' },
          { validator: ruleOrder, trigger: 'blur' },
        ],
        endChannelId: [
          { validator: ruleCh, trigger: 'blur' },
          { validator: ruleOrder, trigger: 'blur' },
        ],
        seekType: [{ required: true, message: this.$t('smcicc.system.channelGroup.requiredSelect') }],
        callerCapacity: [{ required: true, message: this.$t('smcicc.system.channelGroup.requiredSelect') }],
      };
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    seekLabel(v) {
      const o = this.seekOptions.find((x) => x.value === Number(v));
      return o ? o.label : String(v ?? '');
    },
    callerLabel(v) {
      const o = this.callerOptions.find((x) => x.value === Number(v));
      return o ? o.label : String(v ?? '');
    },
    cgPayload() {
      const f = this.form;
      return {
        channelGroup: {
          id: f.id != null ? Number(f.id) : 0,
          name: String(f.name || '').trim(),
          beginSpanId: Number(f.beginSpanId),
          beginChannelId: Number(f.beginChannelId),
          endSpanId: Number(f.endSpanId),
          endChannelId: Number(f.endChannelId),
          seekType: Number(f.seekType),
          vdnId: f.vdnId != null ? Number(f.vdnId) : -1,
          callerCapacity: Number(f.callerCapacity),
        },
      };
    },
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
      };
    },
    listExportFileName() {
      return 'icc-channel-groups';
    },
    async importListRecord(record) {
      const channelGroup = {
        id: 0,
        name: String(record.name || '').trim(),
        beginSpanId: Number(record.beginSpanId || 0),
        beginChannelId: Number(record.beginChannelId || 0),
        endSpanId: Number(record.endSpanId || 0),
        endChannelId: Number(record.endChannelId || 0),
        seekType: Number(record.seekType || 0),
        vdnId: record.vdnId == null || record.vdnId === '' ? -1 : Number(record.vdnId),
        callerCapacity: record.callerCapacity == null || record.callerCapacity === '' ? 1 : Number(record.callerCapacity),
      };
      if (!channelGroup.name) return false;
      return (await this.$ajax.postJSON(`${BASE}/addChannelGroup`, { channelGroup })) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadChannelGroupList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.channelGroup.loadFailed');
          this.rows = [];
          this.total = 0;
        })
        .finally(() => {
          this.loading = false;
        });
    },
    onSel(rows) {
      this.selection = rows || [];
    },
    resetForm() {
      this.form = emptyForm();
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    onDialogClosed() {
      this.resetForm();
    },
    openAdd() {
      this.dialogMode = 'add';
      this.resetForm();
      this.dialogVisible = true;
    },
    openEdit(row) {
      const r = row && typeof row === 'object' ? row : this.singleSel;
      if (!r) return;
      this.dialogMode = 'edit';
      this.form = rowToForm(r);
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        const url = this.dialogMode === 'edit' ? `${BASE}/editChannelGroup` : `${BASE}/addChannelGroup`;
        this.saving = true;
        this.$ajax
          .postJSON(url, this.cgPayload())
          .then((code) => {
            if (code === 1) {
              this.$message.success(
                this.dialogMode === 'edit' ? this.$t('smcicc.common.saveSuccess') : this.$t('smcicc.common.addSuccess')
              );
              this.dialogVisible = false;
              this.load();
            } else if (code === -2) {
              this.$message.warning(this.$t('smcicc.system.channelGroup.duplicateName'));
            } else {
              this.$message.error(
                this.dialogMode === 'edit' ? this.$t('smcicc.common.saveFailed') : this.$t('smcicc.common.addFailed')
              );
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
    doCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.$confirm(this.$t('smcicc.system.channelGroup.copyConfirm'), this.$t('smcicc.common.copy'), { type: 'info' })
        .then(() => {
          const payload = {
            channelGroup: {
              name: String(r.name || ''),
              beginSpanId: Number(r.beginSpanId),
              beginChannelId: Number(r.beginChannelId),
              endSpanId: Number(r.endSpanId),
              endChannelId: Number(r.endChannelId),
              seekType: Number(r.seekType),
              vdnId: r.vdnId != null && r.vdnId !== '' ? Number(r.vdnId) : -1,
              callerCapacity: Number(r.callerCapacity),
            },
          };
          return this.$ajax.postJSON(`${BASE}/copyChannelGroup`, payload);
        })
        .then((ok) => {
          if (ok === true) {
            this.$message.success(this.$t('smcicc.common.copySuccess'));
            this.load();
          } else {
            this.$message.warning(this.$t('smcicc.common.copyFailed'));
          }
        })
        .catch(() => {});
    },
    doDelete() {
      if (!this.selection.length) return;
      const ids = this.selection.map((x) => x.id).filter((id) => id != null);
      const n = ids.length;
      this.$confirm(this.$t('smcicc.system.channelGroup.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteChannelGroup`, { ids: ids.join(',') }))
        .then((res) => {
          if (!res || typeof res !== 'object') {
            this.$message.error(this.$t('smcicc.system.channelGroup.deleteResponseError'));
            return;
          }
          const { result, successCount, failCount, existChannelGroupList } = res;
          const used = Array.isArray(existChannelGroupList) ? existChannelGroupList : [];
          if (result === 0 && (successCount || 0) > 0) {
            this.$message.success(this.$t('smcicc.system.channelGroup.deletePartialSuccess', { n: successCount }));
            if ((failCount || 0) > 0 && used.length) {
              const names = used.map((x) => x.name || x.id).join('、');
              this.$message.warning(this.$t('smcicc.system.channelGroup.deletePartialFail', { n: failCount, names }));
            }
            this.load();
          } else if (result === -2 && (failCount || 0) > 0 && !successCount) {
            const names = used.map((x) => x.name || x.id).join('、');
            this.$message.warning(
              names
                ? this.$t('smcicc.system.channelGroup.deleteAllInUse', { names })
                : this.$t('smcicc.system.channelGroup.deleteAllInUseShort')
            );
          } else {
            this.$message.warning(this.$t('smcicc.system.channelGroup.deleteFailedOrEmpty'));
          }
        })
        .catch(() => {});
    },
  },
};
</script>

<style scoped>
.page-title {
  font-size: 20px;
  margin: 0 0 8px;
}
.desc {
  font-size: 13px;
  color: #606266;
  margin: 0 0 12px;
  line-height: 1.5;
}
.toolbar {
  margin-bottom: 8px;
}
.actions {
  margin-bottom: 12px;
}
.actions .el-button {
  margin-right: 8px;
}
.mb {
  margin-bottom: 12px;
}
.pager {
  margin-top: 12px;
  text-align: right;
}
</style>
