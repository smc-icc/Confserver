<template>
  <div class="smcicc-page access-code-page">
    <system-list-toolbar
      :title="$t('smcicc.system.accessCode.title')"
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
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="code" :label="$t('smcicc.system.accessCode.colCode')" min-width="160" show-overflow-tooltip />
      <el-table-column :label="$t('smcicc.system.accessCode.colMediaType')" min-width="160" show-overflow-tooltip>
        <template slot-scope="scope">
          {{ scope.row.mediaType && scope.row.mediaType.name != null ? scope.row.mediaType.name : '' }}
        </template>
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

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="400px" append-to-body @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px" size="small">
        <el-form-item :label="$t('smcicc.system.accessCode.code')" prop="code">
          <el-input v-model="form.code" class="no-ime" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.accessCode.mediaType')" prop="mediaTypeId">
          <el-select v-model="form.mediaTypeId" :placeholder="$t('smcicc.common.pleaseSelect')" filterable style="width: 100%">
            <el-option v-for="m in mediaTypes" :key="m.id" :label="m.name" :value="m.id" />
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

export default {
  name: 'SMCIccAccessCodeManager',
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
      mediaTypes: [],
      dialogVisible: false,
      dialogMode: 'add',
      form: {
        id: null,
        code: '',
        mediaTypeId: null,
      },
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    dialogTitle() {
      const modeKey = {
        add: 'operate.title.add',
        edit: 'operate.title.update',
        copy: 'smcicc.common.copy',
      };
      const action = modeKey[this.dialogMode] ? this.$t(modeKey[this.dialogMode]) : '';
      return `${this.$t('smcicc.system.accessCode.dialogTitle')} - ${action}`;
    },
    rules() {
      return {
        code: [{ required: true, message: this.$t('smcicc.system.accessCode.codeRequired'), trigger: 'blur' }],
        mediaTypeId: [{ required: true, message: this.$t('smcicc.system.accessCode.mediaTypeRequired'), trigger: 'change' }],
      };
    },
  },
  mounted() {
    this.loadMediaTypes();
    this.load();
  },
  methods: {
    successMsgKey() {
      if (this.dialogMode === 'edit') return 'smcicc.common.saveSuccess';
      if (this.dialogMode === 'copy') return 'smcicc.common.copySuccess';
      return 'smcicc.common.addSuccess';
    },
    failMsgKey() {
      if (this.dialogMode === 'edit') return 'smcicc.common.saveFailed';
      if (this.dialogMode === 'copy') return 'smcicc.common.copyFailed';
      return 'smcicc.common.addFailed';
    },
    loadMediaTypes() {
      this.$ajax
        .getJSON(`${BASE}/loadMediaTypeListAtAccessCode`)
        .then((data) => {
          this.mediaTypes = Array.isArray(data) ? data : [];
        })
        .catch(() => {
          this.mediaTypes = [];
        });
    },
    listPayload() {
      return {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        calledCode: '',
      };
    },
    listExportFileName() {
      return 'icc-access-code';
    },
    async importListRecord(record) {
      const code = String(record.code || '').trim();
      const mediaTypeId = Number(record['mediaType.id'] || record.mediaTypeId);
      if (!code || !Number.isFinite(mediaTypeId)) return false;
      return (
        (await this.$ajax.postJSON(`${BASE}/addAccessCode`, {
          accessCode: { code, mediaType: { id: mediaTypeId } },
        })) === 1
      );
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadAccessCodeList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.accessCode.loadFailed');
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
      this.form = { id: null, code: '', mediaTypeId: null };
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    openAdd() {
      this.dialogMode = 'add';
      this.resetForm();
      this.dialogVisible = true;
    },
    openEdit() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'edit';
      this.form = {
        id: r.id,
        code: r.code != null ? String(r.code) : '',
        mediaTypeId: r.mediaType && r.mediaType.id != null ? Number(r.mediaType.id) : null,
      };
      this.dialogVisible = true;
    },
    openCopy() {
      const r = this.singleSel;
      if (!r) return;
      this.dialogMode = 'copy';
      this.form = {
        id: null,
        code: r.code != null ? String(r.code) : '',
        mediaTypeId: r.mediaType && r.mediaType.id != null ? Number(r.mediaType.id) : null,
      };
      this.dialogVisible = true;
    },
    accessCodeBody() {
      return {
        code: (this.form.code || '').trim(),
        id: this.form.id,
        mediaType: { id: this.form.mediaTypeId },
      };
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        this.saving = true;
        const payload = { accessCode: this.accessCodeBody() };
        let url;
        if (this.dialogMode === 'edit') {
          url = `${BASE}/modifyAccessCode`;
        } else if (this.dialogMode === 'copy') {
          url = `${BASE}/copyAccessCode`;
        } else {
          url = `${BASE}/addAccessCode`;
        }
        if (this.dialogMode === 'add' || this.dialogMode === 'copy') {
          delete payload.accessCode.id;
        }
        this.$ajax
          .postJSON(url, payload)
          .then((data) => {
            if (data === 1) {
              this.$message.success(this.$t(this.successMsgKey()));
              this.dialogVisible = false;
              this.load();
            } else if (data === -1) {
              this.$message.warning(this.$t('smcicc.system.accessCode.duplicateCode'));
            } else {
              this.$message.warning(this.$t(this.failMsgKey()));
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
      const ids = this.selection.map((r) => r.id).filter((id) => id != null);
      const n = ids.length;
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteAccessCode`, { accessCodeIds: ids.join(',') }))
        .then((ok) => {
          if (ok) {
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
  color: #606266;
  font-size: 13px;
  margin-bottom: 12px;
  line-height: 1.5;
}
.toolbar {
  margin-bottom: 8px;
}
.actions {
  margin-bottom: 12px;
}
.actions .el-button + .el-button {
  margin-left: 8px;
}
.mb {
  margin-bottom: 12px;
}
.pager {
  margin-top: 16px;
}
.no-ime {
  ime-mode: disabled;
}
</style>
