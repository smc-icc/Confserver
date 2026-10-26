<template>
  <div class="smcicc-page channel-config-page">
    <system-list-toolbar
      :title="$t('smcicc.system.channelConfig.title')"
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
      <el-table-column prop="offset" :label="$t('smcicc.system.channelConfig.colOffset')" width="120" align="center" />
      <el-table-column prop="confOffset" :label="$t('smcicc.system.channelConfig.colConfOffset')" width="140" align="center" />
      <el-table-column prop="confLength" :label="$t('smcicc.system.channelConfig.colConfLength')" width="120" align="center" />
      <el-table-column :label="$t('smcicc.system.channelConfig.colTas')" min-width="200" show-overflow-tooltip>
        <template slot-scope="{ row }">{{ tasDisplay(row) }}</template>
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
      <el-form ref="formRef" :model="form" :rules="rules" label-width="140px" size="small">
        <el-form-item :label="$t('smcicc.system.channelConfig.offset')" prop="offsetStr">
          <el-input v-model="form.offsetStr" class="no-ime" maxlength="9" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelConfig.confOffset')" prop="confOffsetStr">
          <el-input v-model="form.confOffsetStr" class="no-ime" maxlength="9" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelConfig.confLength')" prop="confLengthStr">
          <el-input v-model="form.confLengthStr" class="no-ime" maxlength="9" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.channelConfig.tas')" prop="myId">
          <el-select v-model.number="form.myId" filterable style="width: 100%">
            <el-option
              v-for="t in tasList"
              :key="'d-' + t.myId + '-' + t.pid"
              :label="tasLabel(t)"
              :value="Number(t.myId)"
            />
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
    offsetStr: '',
    confOffsetStr: '',
    confLengthStr: '',
    myId: null,
  };
}

export default {
  name: 'SMCIccChannelConfigManager',
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
      tasList: [],
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
      let action;
      if (this.dialogMode === 'edit') action = this.$t('operate.title.update');
      else if (this.dialogMode === 'copy') action = this.$t('smcicc.common.copy');
      else action = this.$t('operate.title.add');
      return `${this.$t('smcicc.system.channelConfig.dialogTitle')} — ${action}`;
    },
    rules() {
      const ruleNum9 = (requiredKey, maxLenKey, numericKey) => (rule, value, cb) => {
        const s = String(value ?? '').trim();
        if (s === '') {
          cb(new Error(this.$t(`smcicc.system.channelConfig.${requiredKey}`)));
          return;
        }
        if (s.length > 9) {
          cb(new Error(this.$t(`smcicc.system.channelConfig.${maxLenKey}`)));
          return;
        }
        if (!/^\d+$/.test(s)) {
          cb(new Error(this.$t(`smcicc.system.channelConfig.${numericKey}`)));
          return;
        }
        cb();
      };
      return {
        offsetStr: [{ validator: ruleNum9('offsetRequired', 'offsetMaxLen', 'offsetNumeric'), trigger: 'blur' }],
        confOffsetStr: [{ validator: ruleNum9('confOffsetRequired', 'confOffsetMaxLen', 'confOffsetNumeric'), trigger: 'blur' }],
        confLengthStr: [{ validator: ruleNum9('confLengthRequired', 'confLengthMaxLen', 'confLengthNumeric'), trigger: 'blur' }],
        myId: [{ required: true, message: this.$t('smcicc.system.channelConfig.tasRequired'), trigger: 'change' }],
      };
    },
  },
  mounted() {
    this.loadTasList();
    this.load();
  },
  methods: {
    tasLabel(t) {
      return t.myName != null && String(t.myName) !== '' ? String(t.myName) : this.$t('smcicc.system.channelConfig.myIdFallback', { id: t.myId });
    },
    tasDisplay(row) {
      if (row.tas && row.tas.myName) return row.tas.myName;
      return row.myId != null ? this.$t('smcicc.system.channelConfig.myIdFallback', { id: row.myId }) : '—';
    },
    loadTasList() {
      this.$ajax.postJSON(`${BASE}/loadTasList`, {}).then((d) => {
        this.tasList = Array.isArray(d) ? d : [];
      });
    },
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        channel: { myId: -1 },
      };
    },
    listExportFileName() {
      return 'icc-channel-config';
    },
    async importListRecord(record) {
      const channel = {
        id: 0,
        offset: Number(record.offset),
        confOffset: Number(record.confOffset),
        confLength: Number(record.confLength),
        myId: Number(record.myId),
      };
      if (Object.values(channel).some((value) => Number.isNaN(value))) return false;
      return (await this.$ajax.postJSON(`${BASE}/addChannel`, { channel })) === 1;
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadChannelList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.channelConfig.loadFailed');
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
    rowToFormStr(r) {
      return {
        id: r.id != null ? Number(r.id) : null,
        offsetStr: r.offset != null ? String(r.offset) : '',
        confOffsetStr: r.confOffset != null ? String(r.confOffset) : '',
        confLengthStr: r.confLength != null ? String(r.confLength) : '',
        myId: r.myId != null ? Number(r.myId) : null,
      };
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
      this.form = this.rowToFormStr(r);
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    openCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'copy';
      this.form = this.rowToFormStr(r);
      this.dialogVisible = true;
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    channelPayload() {
      const f = this.form;
      return {
        channel: {
          id: f.id != null ? Number(f.id) : 0,
          offset: Number(String(f.offsetStr).trim()),
          confOffset: Number(String(f.confOffsetStr).trim()),
          confLength: Number(String(f.confLengthStr).trim()),
          myId: Number(f.myId),
        },
      };
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        let url = `${BASE}/addChannel`;
        if (this.dialogMode === 'edit') {
          url = `${BASE}/editChannel`;
        } else if (this.dialogMode === 'copy') {
          url = `${BASE}/copyChannel`;
        }
        this.saving = true;
        this.$ajax
          .postJSON(url, this.channelPayload())
          .then((data) => {
            if (this.dialogMode === 'edit') {
              if (data === 1) {
                this.$message.success(this.$t('smcicc.common.saveSuccess'));
                this.dialogVisible = false;
                this.load();
              } else {
                this.$message.warning(this.$t('smcicc.common.saveFailed'));
              }
              return;
            }
            if (this.dialogMode === 'copy') {
              if (data === true) {
                this.$message.success(this.$t('smcicc.common.copySuccess'));
                this.dialogVisible = false;
                this.load();
              } else {
                this.$message.warning(this.$t('smcicc.common.copyFailed'));
              }
              return;
            }
            if (data === 1) {
              this.$message.success(this.$t('smcicc.common.addSuccess'));
              this.dialogVisible = false;
              this.load();
            } else {
              this.$message.warning(this.$t('smcicc.common.addFailed'));
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.saving = false;
          });
      });
    },
    doDelete() {
      if (!this.selection.length) return;
      const ids = this.selection.map((x) => x.id).filter((id) => id != null);
      const n = ids.length;
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteChannel`, { ids: ids.join(',') }))
        .then((ok) => {
          if (ok === true) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else {
            this.$message.warning(this.$t('smcicc.common.deleteFailed'));
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
