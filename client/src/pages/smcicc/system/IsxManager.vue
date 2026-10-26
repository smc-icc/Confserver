<template>
  <div class="smcicc-page isx-manager-page">
    <system-list-toolbar
      :title="$t('smcicc.system.isx.title')"
      :keyword.sync="filterKeyword"
      :importing="importing"
      :has-rows="listFilteredRows.length > 0"
      :has-selection="boardSelection.length > 0"
      :add-disabled="selectedIsxPid == null"
      :import-disabled="selectedIsxPid == null"
      :delete-disabled="selectedIsxPid == null"
      @search="handleListSearch"
      @clear="clearListSearch"
      @add="openBoardAdd"
      @import="importList"
      @export="exportList"
      @delete="doBoardDelete"
    />

    <div class="isx-toolbar">
      <span class="isx-label">{{ $t('smcicc.system.isx.isxNode') }}</span>
      <el-select
        v-model="selectedIsxPid"
        :placeholder="$t('smcicc.system.isx.placeholderSelectNode')"
        filterable
        style="width: 220px"
        size="small"
        :disabled="!isxList.length"
        @change="onIsxSelectChange"
      >
        <el-option v-for="x in isxList" :key="'isx-' + x.pid" :label="isxNodeLabel(x.pid)" :value="x.pid" />
      </el-select>
      <el-button type="primary" size="small" icon="el-icon-plus" class="ml8" :title="$t('operate.add')" @click="openIsxAdd" />
      <el-button type="danger" size="small" icon="el-icon-delete" class="ml8" :title="$t('operate.delete')" :disabled="selectedIsxPid == null" @click="doIsxDelete" />
      <el-button size="small" icon="el-icon-refresh" class="ml8" :title="$t('smcicc.common.refresh')" @click="refreshAll" />
    </div>

    <el-alert v-if="isxErr" :title="isxErr" type="error" show-icon class="mb" :closable="false" />
    <p v-if="!isxLoading && !isxList.length" class="empty-tip">{{ $t('smcicc.system.isx.emptyTip') }}</p>

    <el-tabs v-model="boardTab" type="border-card" class="board-tabs" @tab-click="onBoardTabClick">
      <el-tab-pane :label="$t('smcicc.system.isx.tabAg')" name="ag" />
      <el-tab-pane :label="$t('smcicc.system.isx.tabDti')" name="dti" />
      <el-tab-pane :label="$t('smcicc.system.isx.tabSip')" name="sip" />
    </el-tabs>

    <template v-if="selectedIsxPid != null">
      <el-alert v-if="boardErr" :title="boardErr" type="error" show-icon class="mb" :closable="false" />

      <el-table
        :key="boardTab"
        v-loading="boardLoading"
        :data="listVisibleRows"
        border
        stripe
        size="small"
        max-height="440"
        @selection-change="onBoardSel"
      >
        <el-table-column type="selection" width="48" />
        <el-table-column
          prop="oamBoardId"
          :label="$t('smcicc.system.isx.colOamBoardId')"
          width="200"
          show-overflow-tooltip
        />
        <el-table-column
          v-if="boardTab !== 'sip'"
          prop="ctiLogicSpanId"
          :label="$t('smcicc.system.isx.colCtiLogicSpanId')"
          min-width="140"
          show-overflow-tooltip
        />
        <el-table-column
          v-if="boardTab === 'sip'"
          prop="sipChannelBeginId"
          :label="$t('smcicc.system.isx.colSipChannelBegin')"
          min-width="120"
          show-overflow-tooltip
        />
        <el-table-column v-if="boardTab === 'sip'" prop="sipChannelCount" :label="$t('smcicc.system.isx.colSipChannelCount')" min-width="140" />
        <el-table-column :label="$t('smcicc.system.isx.colEnable')" width="150">
          <template slot-scope="scope">
            {{ Number(scope.row.isEnable) === 1 ? $t('smcicc.common.enabled') : $t('smcicc.common.disabled') }}
          </template>
        </el-table-column>
      </el-table>

      <el-pagination
        class="pager"
        background
        layout="total, sizes, prev, pager, next, jumper"
        :page-sizes="[10, 20, 50]"
        :current-page.sync="boardPage"
        :page-size.sync="boardPageSize"
        :total="listFilteredTotal"
        @size-change="setListPageSize"
        @current-change="setListPage"
      />
    </template>

    <!-- ISX 结点 -->
    <el-dialog :title="isxDialogTitle" :visible.sync="isxDialogVisible" width="360px" append-to-body @closed="resetIsxForm">
      <el-form ref="isxFormRef" :model="isxForm" :rules="isxRules" label-width="100px" size="small">
        <el-form-item :label="$t('smcicc.system.isx.isxNodeId')" prop="newPid">
          <el-input v-model="isxForm.newPid" class="no-ime" maxlength="9" :placeholder="$t('smcicc.system.isx.placeholderPositiveInt')" />
        </el-form-item>
      </el-form>
      <p v-if="isxDialogMode === 'copy'" class="dialog-hint">{{ $t('smcicc.system.isx.copyIsxHint', { oldPid: isxCopyOldPid }) }}</p>
      <span slot="footer">
        <el-button size="small" @click="isxDialogVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="isxSaving" @click="submitIsx">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>

    <!-- 资源板 -->
    <el-dialog :title="boardDialogTitle" :visible.sync="boardDialogVisible" width="420px" append-to-body @closed="resetBoardForm">
      <el-form ref="boardFormRef" :model="boardForm" :rules="boardRulesActive" label-width="150px" size="small">
        <el-form-item :label="$t('smcicc.system.isx.boardPhysicalId')" prop="oamBoardId">
          <el-input v-model="boardForm.oamBoardId" class="no-ime" maxlength="5" :disabled="boardDialogMode === 'edit'" />
        </el-form-item>
        <el-form-item v-if="boardTab !== 'sip'" :label="$t('smcicc.system.isx.boardCtiLogicSpanId')" prop="ctiLogicSpanId">
          <el-input v-model="boardForm.ctiLogicSpanId" class="no-ime" maxlength="5" :placeholder="$t('smcicc.system.isx.placeholderCtiOptional')" />
        </el-form-item>
        <template v-if="boardTab === 'sip'">
          <el-form-item :label="$t('smcicc.system.isx.sipChannelBegin')" prop="sipChannelBeginId">
            <el-input v-model="boardForm.sipChannelBeginId" class="no-ime" maxlength="9" />
          </el-form-item>
          <el-form-item :label="$t('smcicc.system.isx.sipChannelCount')" prop="sipChannelCount">
            <el-input v-model="boardForm.sipChannelCount" class="no-ime" maxlength="9" />
          </el-form-item>
        </template>
        <el-form-item :label="$t('smcicc.system.isx.enableDisable')" prop="isEnable">
          <el-select v-model="boardForm.isEnable" style="width: 100%">
            <el-option :label="$t('smcicc.common.enabled')" :value="1" />
            <el-option :label="$t('smcicc.common.disabled')" :value="0" />
          </el-select>
        </el-form-item>
      </el-form>
      <p v-if="boardDialogMode === 'copy'" class="dialog-hint">{{ $t('smcicc.system.isx.copyBoardHint') }}</p>
      <span slot="footer">
        <el-button size="small" @click="boardDialogVisible = false">{{ $t('smcicc.common.close') }}</el-button>
        <el-button type="primary" size="small" :loading="boardSaving" @click="submitBoard">{{ $t('operate.save') }}</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import SystemListToolbar from './SystemListToolbar.vue';
import systemListPageMixin, { DEFAULT_LIST_LIMIT } from './systemListPageMixin';

const BASE = '/server/api/smcicc/systemadmin';

export default {
  name: 'SMCIccIsxManager',
  components: { SystemListToolbar },
  mixins: [systemListPageMixin],
  data() {
    return {
      isxLoading: false,
      isxErr: '',
      isxList: [],
      selectedIsxPid: null,
      isxDialogVisible: false,
      isxDialogMode: 'add',
      isxCopyOldPid: null,
      isxSaving: false,
      isxForm: { newPid: '' },
      boardTab: 'ag',
      boardRows: [],
      boardTotal: 0,
      boardPage: 1,
      boardPageSize: 10,
      boardLoading: false,
      boardErr: '',
      boardSelection: [],
      boardDialogVisible: false,
      boardDialogMode: 'add',
      boardSaving: false,
      boardForm: {
        oamBoardId: '',
        oldOamBoardId: null,
        ctiLogicSpanId: '',
        sipChannelBeginId: '',
        sipChannelCount: '',
        isEnable: 1,
      },
    };
  },
  computed: {
    boardSingleSel() {
      return this.boardSelection.length === 1 ? this.boardSelection[0] : null;
    },
    isxDialogTitle() {
      return this.isxDialogMode === 'copy'
        ? this.$t('smcicc.system.isx.dialogIsxCopy')
        : this.$t('smcicc.system.isx.dialogIsxAdd');
    },
    boardDialogTitle() {
      const kindKey = {
        ag: 'smcicc.system.isx.boardKindAg',
        dti: 'smcicc.system.isx.boardKindDti',
        sip: 'smcicc.system.isx.boardKindSip',
      };
      const actionKey = {
        add: 'operate.title.add',
        edit: 'operate.title.update',
        copy: 'smcicc.common.copy',
      };
      const kind = this.$t(kindKey[this.boardTab] || kindKey.ag);
      const action = this.$t(actionKey[this.boardDialogMode] || '');
      return this.$t('smcicc.system.isx.boardDialogTitle', { kind, action });
    },
    isxRules() {
      return {
        newPid: [
          { required: true, message: this.$t('smcicc.system.isx.isxIdRequired'), trigger: 'blur' },
          this.makeUintField(999999999, false),
        ],
      };
    },
    boardRules() {
      return {
        oamBoardId: [
          { required: true, message: this.$t('smcicc.system.isx.physicalIdEmpty'), trigger: 'blur' },
          this.makeUintField(65535, false),
        ],
        ctiLogicSpanId: [this.makeUintField(65535, true)],
        sipChannelBeginId: [this.makeUintField(999999999, true)],
        sipChannelCount: [this.makeUintField(999999999, true)],
        isEnable: [{ required: true, message: this.$t('smcicc.common.pleaseSelect'), trigger: 'change' }],
      };
    },
    boardRulesActive() {
      const r = { ...this.boardRules };
      if (this.boardTab === 'sip') {
        delete r.ctiLogicSpanId;
      } else {
        delete r.sipChannelBeginId;
        delete r.sipChannelCount;
      }
      return r;
    },
  },
  mounted() {
    this.refreshAll();
  },
  methods: {
    listSourceRows() {
      return this.boardRows;
    },
    listCurrentPage() {
      return this.boardPage;
    },
    listCurrentPageSize() {
      return this.boardPageSize;
    },
    setListPage(page) {
      this.boardPage = page;
    },
    setListPageSize(size) {
      this.boardPageSize = size;
      this.boardPage = 1;
    },
    listReload() {
      return this.loadBoardList();
    },
    listExportFileName() {
      return `icc-isx-${this.selectedIsxPid == null ? 'none' : this.selectedIsxPid}-${this.boardTab}`;
    },
    async importListRecord(record) {
      if (this.selectedIsxPid == null) return false;
      const { nest, add } = this.boardCfg();
      const inner = {
        oamBoardId: Number(record.oamBoardId),
        cfgIsxPid: this.selectedIsxPid,
        isEnable: Number(record.isEnable) === 1 ? 1 : 0,
      };
      if (!Number.isInteger(inner.oamBoardId) || inner.oamBoardId < 0) return false;
      if (this.boardTab === 'sip') {
        inner.sipChannelBeginId = record.sipChannelBeginId === '' ? null : Number(record.sipChannelBeginId);
        inner.sipChannelCount = record.sipChannelCount === '' ? null : Number(record.sipChannelCount);
      } else {
        inner.ctiLogicSpanId = record.ctiLogicSpanId === '' ? null : Number(record.ctiLogicSpanId);
      }
      const data = await this.$ajax.postJSON(`${BASE}/${add}`, { [nest]: inner });
      return data === true || data === 1;
    },
    isxNodeLabel(pid) {
      return this.$t('smcicc.system.isx.isxNodeLabel', { pid });
    },
    makeUintField(max, allowEmpty) {
      return {
        validator: (rule, value, cb) => {
          const s = String(value ?? '').trim();
          if (allowEmpty && s === '') {
            cb();
            return;
          }
          if (s === '') {
            cb(new Error(this.$t('smcicc.system.isx.cannotEmpty')));
            return;
          }
          if (!/^\d+$/.test(s)) {
            cb(new Error(this.$t('smcicc.system.isx.mustBeDigits')));
            return;
          }
          const n = Number(s);
          if (n < 0 || n > max) {
            cb(new Error(this.$t('smcicc.system.isx.rangeMax', { max })));
            return;
          }
          cb();
        },
        trigger: 'blur',
      };
    },
    boardSuccessMsgKey() {
      if (this.boardDialogMode === 'edit') return 'smcicc.common.saveSuccess';
      if (this.boardDialogMode === 'copy') return 'smcicc.common.copySuccess';
      return 'smcicc.common.addSuccess';
    },
    boardCfg() {
      const t = this.boardTab;
      if (t === 'ag') {
        return { nest: 'agBoard', list: 'loadAgBoardList', add: 'addAgBoard', edit: 'editAgBoard', del: 'deleteAgBoard', copy: 'copyAgBoard' };
      }
      if (t === 'dti') {
        return { nest: 'dtiBoard', list: 'loadDtiBoardList', add: 'addDtiBoard', edit: 'editDtiBoard', del: 'deleteDtiBoard', copy: 'copyDtiBoard' };
      }
      return { nest: 'sipBoard', list: 'loadSipBoardList', add: 'addSipBoard', edit: 'editSipBoard', del: 'deleteSipBoard', copy: 'copySipBoard' };
    },
    loadIsxNodes() {
      this.isxLoading = true;
      this.isxErr = '';
      return this.$ajax
        .postJSON(`${BASE}/loadIsxList`, {})
        .then((data) => {
          this.isxList = Array.isArray(data) ? data.map((x) => ({ pid: Number(x.pid) })) : [];
          if (this.isxList.length && (this.selectedIsxPid == null || !this.isxList.some((x) => x.pid === this.selectedIsxPid))) {
            this.selectedIsxPid = this.isxList[0].pid;
          }
          if (!this.isxList.length) {
            this.selectedIsxPid = null;
            this.boardRows = [];
            this.boardTotal = 0;
          }
        })
        .catch(() => {
          this.isxErr = this.$t('smcicc.system.isx.loadIsxFailed');
          this.isxList = [];
          this.selectedIsxPid = null;
        })
        .finally(() => {
          this.isxLoading = false;
        });
    },
    onIsxSelectChange() {
      this.boardPage = 1;
      this.loadBoardList();
    },
    onBoardTabClick(tab) {
      if (tab && tab.name) this.boardTab = tab.name;
      this.boardPage = 1;
      this.boardSelection = [];
      this.loadBoardList();
    },
    loadBoardList() {
      if (this.selectedIsxPid == null) {
        this.boardRows = [];
        this.boardTotal = 0;
        return;
      }
      const { nest, list } = this.boardCfg();
      this.boardLoading = true;
      this.boardErr = '';
      const payload = {
        page: 1,
        pagesize: DEFAULT_LIST_LIMIT,
        [nest]: { cfgIsxPid: this.selectedIsxPid },
      };
      this.$ajax
        .postJSON(`${BASE}/${list}`, payload)
        .then((data) => {
          this.boardRows = Array.isArray(data.Rows) ? data.Rows : [];
          this.boardTotal = Number(data.Total != null ? data.Total : this.boardRows.length);
        })
        .catch(() => {
          this.boardErr = this.$t('smcicc.system.isx.loadBoardFailed');
          this.boardRows = [];
          this.boardTotal = 0;
        })
        .finally(() => {
          this.boardLoading = false;
        });
    },
    refreshAll() {
      this.loadIsxNodes().then(() => this.loadBoardList());
    },
    onBoardSel(rows) {
      this.boardSelection = rows || [];
    },
    resetIsxForm() {
      this.isxForm = { newPid: '' };
      this.isxCopyOldPid = null;
      this.$nextTick(() => this.$refs.isxFormRef && this.$refs.isxFormRef.clearValidate());
    },
    openIsxAdd() {
      this.isxDialogMode = 'add';
      this.resetIsxForm();
      this.isxDialogVisible = true;
    },
    openIsxCopy() {
      if (this.selectedIsxPid == null) return;
      this.isxDialogMode = 'copy';
      this.isxCopyOldPid = this.selectedIsxPid;
      this.isxForm = { newPid: '' };
      this.isxDialogVisible = true;
      this.$nextTick(() => this.$refs.isxFormRef && this.$refs.isxFormRef.clearValidate());
    },
    submitIsx() {
      this.$refs.isxFormRef.validate((ok) => {
        if (!ok) return;
        const newPid = Number(String(this.isxForm.newPid).trim());
        if (newPid <= 0) {
          this.$message.warning(this.$t('smcicc.system.isx.isxIdPositive'));
          return;
        }
        this.isxSaving = true;
        const req =
          this.isxDialogMode === 'copy'
            ? this.$ajax.postJSON(`${BASE}/copyIsx`, { newPid, oldPid: this.isxCopyOldPid })
            : this.$ajax.postJSON(`${BASE}/addIsx`, { newPid });
        req
          .then((data) => {
            if (data === 1) {
              this.$message.success(
                this.isxDialogMode === 'copy' ? this.$t('smcicc.common.copySuccess') : this.$t('smcicc.common.addSuccess')
              );
              this.isxDialogVisible = false;
              this.loadIsxNodes().then(() => {
                this.selectedIsxPid = newPid;
                this.boardPage = 1;
                this.loadBoardList();
              });
            } else if (data === -2) {
              this.$message.warning(this.$t('smcicc.system.isx.duplicateIsxId'));
            } else {
              this.$message.warning(this.$t('smcicc.system.isx.saveFailedCopy'));
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.isxSaving = false;
          });
      });
    },
    doIsxDelete() {
      if (this.selectedIsxPid == null) return;
      const pid = this.selectedIsxPid;
      this.$confirm(this.$t('smcicc.system.isx.confirmDeleteIsx', { pid }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/deleteIsx`, { newPid: pid }))
        .then((data) => {
          if (data === 1) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.loadIsxNodes().then(() => {
              if (this.isxList.length) {
                this.selectedIsxPid = this.isxList[0].pid;
                this.loadBoardList();
              }
            });
          } else if (data === -1) {
            this.$message.warning(this.$t('smcicc.system.isx.isxReferencedByTas', { pid }));
          } else {
            this.$message.warning(this.$t('smcicc.common.deleteFailed'));
          }
        })
        .catch(() => {});
    },
    defaultBoardForm() {
      return {
        oamBoardId: '',
        oldOamBoardId: null,
        ctiLogicSpanId: '',
        sipChannelBeginId: '',
        sipChannelCount: '',
        isEnable: 1,
      };
    },
    resetBoardForm() {
      this.boardForm = this.defaultBoardForm();
      this.$nextTick(() => this.$refs.boardFormRef && this.$refs.boardFormRef.clearValidate());
    },
    rowToBoardForm(r) {
      return {
        oamBoardId: r.oamBoardId != null ? String(r.oamBoardId) : '',
        oldOamBoardId: r.oamBoardId != null ? Number(r.oamBoardId) : null,
        ctiLogicSpanId: r.ctiLogicSpanId != null && r.ctiLogicSpanId !== '' ? String(r.ctiLogicSpanId) : '',
        sipChannelBeginId: r.sipChannelBeginId != null && r.sipChannelBeginId !== '' ? String(r.sipChannelBeginId) : '',
        sipChannelCount: r.sipChannelCount != null && r.sipChannelCount !== '' ? String(r.sipChannelCount) : '',
        isEnable: Number(r.isEnable) === 1 ? 1 : 0,
      };
    },
    nestPayload() {
      const pid = this.selectedIsxPid;
      const oam = Number(String(this.boardForm.oamBoardId).trim());
      const isEn = Number(this.boardForm.isEnable) === 1 ? 1 : 0;
      const base = { oamBoardId: oam, cfgIsxPid: pid, isEnable: isEn };
      if (this.boardTab === 'sip') {
        const sb = String(this.boardForm.sipChannelBeginId).trim();
        const sc = String(this.boardForm.sipChannelCount).trim();
        return {
          ...base,
          sipChannelBeginId: sb === '' ? null : Number(sb),
          sipChannelCount: sc === '' ? null : Number(sc),
        };
      }
      const cti = String(this.boardForm.ctiLogicSpanId).trim();
      return {
        ...base,
        ctiLogicSpanId: cti === '' ? null : Number(cti),
      };
    },
    openBoardAdd() {
      if (this.selectedIsxPid == null) return;
      this.boardDialogMode = 'add';
      this.resetBoardForm();
      this.boardDialogVisible = true;
    },
    openBoardEdit() {
      const r = this.boardSingleSel;
      if (!r) return;
      this.boardDialogMode = 'edit';
      this.boardForm = this.rowToBoardForm(r);
      this.boardDialogVisible = true;
      this.$nextTick(() => this.$refs.boardFormRef && this.$refs.boardFormRef.clearValidate());
    },
    openBoardCopy() {
      const r = this.boardSingleSel;
      if (!r) return;
      this.boardDialogMode = 'copy';
      this.boardForm = this.rowToBoardForm(r);
      this.boardForm.oldOamBoardId = null;
      this.boardDialogVisible = true;
      this.$nextTick(() => this.$refs.boardFormRef && this.$refs.boardFormRef.clearValidate());
    },
    submitBoard() {
      this.$refs.boardFormRef.validate((ok) => {
        if (!ok || this.selectedIsxPid == null) return;
        const { nest, add, edit } = this.boardCfg();
        const inner = this.nestPayload();
        let url = `${BASE}/${add}`;
        const payload = { [nest]: inner };
        if (this.boardDialogMode === 'edit') {
          url = `${BASE}/${edit}`;
          payload.oldOamBoardId = this.boardForm.oldOamBoardId;
        }
        this.boardSaving = true;
        this.$ajax
          .postJSON(url, payload)
          .then((data) => {
            if (data === 1) {
              this.$message.success(this.$t(this.boardSuccessMsgKey()));
              this.boardDialogVisible = false;
              this.loadBoardList();
            } else if (data === -1) {
              this.$message.warning(this.$t('smcicc.common.duplicatePhysicalId'));
            } else {
              this.$message.warning(this.$t('smcicc.common.saveFailed'));
            }
          })
          .catch(() => this.$message.error(this.$t('smcicc.common.requestFailed')))
          .finally(() => {
            this.boardSaving = false;
          });
      });
    },
    doBoardDelete() {
      if (!this.boardSelection.length || this.selectedIsxPid == null) return;
      const ids = this.boardSelection.map((r) => r.oamBoardId).filter((id) => id != null);
      const { nest, del } = this.boardCfg();
      this.$confirm(this.$t('smcicc.system.isx.confirmDeleteBoard', { n: ids.length }), this.$t('operate.delete'), { type: 'warning' })
        .then(() =>
          this.$ajax.postJSON(`${BASE}/${del}`, {
            oamBoardIds: ids.join(','),
            cfgIsxPid: this.selectedIsxPid,
            [nest]: { cfgIsxPid: this.selectedIsxPid },
          })
        )
        .then((data) => {
          if (this.boardTab === 'sip') {
            if (data === true || data === 1) {
              this.$message.success(this.$t('smcicc.common.deleteSuccess'));
              this.loadBoardList();
            } else {
              this.$message.warning(this.$t('smcicc.common.deleteFailed'));
            }
          } else if (data === 1) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.loadBoardList();
          } else if (data === -2) {
            this.$message.warning(this.$t('smcicc.system.isx.deleteBoardRouteUsed'));
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
.isx-toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  margin-bottom: 12px;
  gap: 0 8px;
}
.isx-label {
  font-size: 13px;
  color: #606266;
  margin-right: 4px;
}
.ml8 {
  margin-left: 8px;
}
.mb {
  margin-bottom: 12px;
}
.empty-tip {
  color: #909399;
  font-size: 13px;
  margin: 0 0 12px;
}
.board-tabs {
  margin-bottom: 12px;
}
.board-tabs >>> .el-tabs__content {
  display: none;
}
.board-actions {
  margin-bottom: 8px;
}
.board-actions .el-button + .el-button {
  margin-left: 8px;
}
.pager {
  margin-top: 16px;
}
.no-ime {
  ime-mode: disabled;
}
.dialog-hint {
  margin: 0 0 8px;
  padding: 8px 10px;
  font-size: 12px;
  color: #e6a23c;
  background: #fdf6ec;
  border-radius: 4px;
}
</style>
