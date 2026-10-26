<template>
  <div class="smcicc-page sys-user-page">
    <div class="account-toolbar">
      <h2 class="page-title">{{ $t('smcicc.system.sysUser.title') }}</h2>

      <el-form :inline="true" size="small" class="search-form" @submit.native.prevent="search">
        <el-input
          v-model="filterKeyword"
          class="search-input"
          :aria-label="$t('smcicc.system.sysUser.searchPlaceholder')"
          :placeholder="$t('smcicc.system.sysUser.searchPlaceholder')"
          @keyup.enter.native="search"
        >
          <i
            slot="suffix"
            :class="filterKeyword ? 'el-icon-circle-close search-action-icon' : 'el-icon-search search-action-icon'"
            :title="filterKeyword ? $t('operate.clear') : $t('operate.search')"
            @click.stop="filterKeyword ? clearSearch() : search()"
          ></i>
        </el-input>
      </el-form>

      <div class="actions">
        <el-button type="primary" size="small" icon="el-icon-plus" :title="$t('operate.add')" @click="openAdd" />
        <el-button type="primary" size="small" icon="el-icon-upload2" :title="$t('smcicc.system.sysUser.import')" :loading="importing" @click="triggerImport" />
        <el-button type="primary" size="small" icon="el-icon-download" :title="$t('smcicc.system.sysUser.export')" :disabled="!filteredRows.length" @click="exportUsers" />
        <el-button type="danger" size="small" icon="el-icon-delete" :title="$t('operate.delete')" :disabled="!selection.length" @click="doDelete" />
        <input ref="importFile" class="import-file" type="file" accept=".csv,text/csv" @change="importUsers" />
      </div>
    </div>

    <el-alert v-if="err" :title="err" type="error" show-icon class="mb" :closable="false" />

    <el-table
      ref="table"
      v-loading="loading"
      :data="filteredRows"
      border
      stripe
      size="small"
      max-height="520"
      @selection-change="onSel"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column type="index" :label="$t('smcicc.system.sysUser.colSequence')" width="72" align="center" />
      <el-table-column prop="id" :label="$t('smcicc.system.sysUser.colId')" width="100" show-overflow-tooltip />
      <el-table-column prop="workNo" :label="$t('smcicc.system.sysUser.colWorkNo')" min-width="120" show-overflow-tooltip />
      <el-table-column prop="name" :label="$t('smcicc.system.sysUser.colName')" min-width="120" show-overflow-tooltip />
    </el-table>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="400px" append-to-body @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="96px" size="small">
        <el-form-item :label="$t('smcicc.system.sysUser.loginAccount')" prop="workNo">
          <el-input v-model="form.workNo" :disabled="dialogMode === 'edit'" autocomplete="username" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sysUser.loginPassword')" prop="password">
          <el-input v-model="form.password" type="password" show-password autocomplete="new-password" />
        </el-form-item>
        <el-form-item :label="$t('smcicc.system.sysUser.realName')" prop="name">
          <el-input v-model="form.name" />
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
const BASE = '/server/api/smcicc/systemadmin';
const ACCOUNT_LIST_LIMIT = 10000;

export default {
  name: 'SMCIccSysUserManager',
  data() {
    return {
      loading: false,
      saving: false,
      importing: false,
      err: '',
      rows: [],
      filterKeyword: '',
      selection: [],
      dialogVisible: false,
      dialogMode: 'add',
      form: {
        id: null,
        workNo: '',
        password: '',
        name: '',
      },
    };
  },
  computed: {
    filteredRows() {
      const keyword = (this.filterKeyword || '').trim().toLowerCase();
      if (!keyword) return this.rows;
      return this.rows.filter((row) =>
        [row.id, row.workNo, row.name].some((value) =>
          String(value == null ? '' : value).toLowerCase().includes(keyword)
        )
      );
    },
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    dialogTitle() {
      const action =
        this.dialogMode === 'edit' ? this.$t('operate.title.update') : this.$t('operate.title.add');
      return `${this.$t('smcicc.system.sysUser.dialogTitle')} - ${action}`;
    },
    rules() {
      return {
        workNo: [{ required: true, message: this.$t('smcicc.system.sysUser.workNoRequired'), trigger: 'blur' }],
        password: [{ required: true, message: this.$t('smcicc.system.sysUser.passwordRequired'), trigger: 'blur' }],
        name: [{ required: true, message: this.$t('smcicc.system.sysUser.nameRequired'), trigger: 'blur' }],
      };
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    listPayload() {
      return {
        page: 1,
        pagesize: ACCOUNT_LIST_LIMIT,
        user: { name: '', workNo: '' },
      };
    },
    search() {
      this.filterKeyword = (this.filterKeyword || '').trim();
    },
    clearSearch() {
      this.filterKeyword = '';
    },
    triggerImport() {
      this.$refs.importFile && this.$refs.importFile.click();
    },
    parseCsv(text) {
      const rows = [];
      let row = [];
      let cell = '';
      let quoted = false;
      const source = String(text || '').replace(/^\uFEFF/, '');
      for (let i = 0; i < source.length; i += 1) {
        const char = source[i];
        if (char === '"') {
          if (quoted && source[i + 1] === '"') {
            cell += '"';
            i += 1;
          } else {
            quoted = !quoted;
          }
        } else if (char === ',' && !quoted) {
          row.push(cell.trim());
          cell = '';
        } else if ((char === '\n' || char === '\r') && !quoted) {
          if (char === '\r' && source[i + 1] === '\n') i += 1;
          row.push(cell.trim());
          if (row.some((value) => value !== '')) rows.push(row);
          row = [];
          cell = '';
        } else {
          cell += char;
        }
      }
      row.push(cell.trim());
      if (row.some((value) => value !== '')) rows.push(row);
      return rows;
    },
    async importUsers(event) {
      const input = event.target;
      const file = input.files && input.files[0];
      input.value = '';
      if (!file) return;
      this.importing = true;
      try {
        const text = await new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result);
          reader.onerror = reject;
          reader.readAsText(file, 'UTF-8');
        });
        const csvRows = this.parseCsv(text);
        const headers = (csvRows.shift() || []).map((header) => header.trim().toLowerCase());
        const findColumn = (aliases) => headers.findIndex((header) => aliases.includes(header));
        const workNoIndex = findColumn(['workno', 'account', '用户账号', '登录账号']);
        const passwordIndex = findColumn(['password', '登录密码', '密码']);
        const nameIndex = findColumn(['name', '用户名称', '真实姓名', '姓名']);
        if (workNoIndex < 0 || passwordIndex < 0 || nameIndex < 0 || !csvRows.length) {
          this.$message.warning(this.$t('smcicc.system.sysUser.importInvalid'));
          return;
        }
        let success = 0;
        let duplicate = 0;
        let failed = 0;
        for (const values of csvRows) {
          const user = {
            workNo: String(values[workNoIndex] || '').trim(),
            password: String(values[passwordIndex] || ''),
            name: String(values[nameIndex] || '').trim(),
          };
          if (!user.workNo || !user.password || !user.name) {
            failed += 1;
            continue;
          }
          try {
            const result = await this.$ajax.postJSON(`${BASE}/addUser`, { user });
            if (result === 1) success += 1;
            else if (result === -1) duplicate += 1;
            else failed += 1;
          } catch (e) {
            failed += 1;
          }
        }
        this.$message.success(this.$t('smcicc.system.sysUser.importResult', { success, duplicate, failed }));
        this.load();
      } catch (e) {
        this.$message.error(this.$t('smcicc.system.sysUser.importFailed'));
      } finally {
        this.importing = false;
      }
    },
    csvCell(value) {
      return `"${String(value == null ? '' : value).replace(/"/g, '""')}"`;
    },
    exportUsers() {
      const header = ['sequence', 'id', 'workNo', 'password', 'name'];
      const lines = this.filteredRows.map((row, index) =>
        [index + 1, row.id, row.workNo, row.password, row.name].map(this.csvCell).join(',')
      );
      const blob = new Blob([`\uFEFF${header.join(',')}\r\n${lines.join('\r\n')}`], {
        type: 'text/csv;charset=utf-8',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `icc-system-users-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
    load() {
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${BASE}/loadUserList`, this.listPayload())
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
        })
        .catch(() => {
          this.err = this.$t('smcicc.system.sysUser.loadFailed');
          this.rows = [];
        })
        .finally(() => {
          this.loading = false;
        });
    },
    onSel(rows) {
      this.selection = rows || [];
    },
    resetForm() {
      this.form = { id: null, workNo: '', password: '', name: '' };
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
        workNo: r.workNo != null ? String(r.workNo) : '',
        password: r.password != null ? String(r.password) : '',
        name: r.name != null ? String(r.name) : '',
      };
      this.dialogVisible = true;
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        this.saving = true;
        const payload =
          this.dialogMode === 'edit'
            ? {
                user: {
                  id: this.form.id,
                  workNo: this.form.workNo.trim(),
                  password: this.form.password,
                  name: this.form.name.trim(),
                },
              }
            : {
                user: {
                  workNo: this.form.workNo.trim(),
                  password: this.form.password,
                  name: this.form.name.trim(),
                },
              };
        const url = this.dialogMode === 'edit' ? `${BASE}/modifyUser` : `${BASE}/addUser`;
        this.$ajax
          .postJSON(url, payload)
          .then((data) => {
            if (data === 1) {
              this.$message.success(this.$t('smcicc.common.saveSuccess'));
              this.dialogVisible = false;
              this.load();
            } else if (data === -1) {
              this.$message.warning(this.$t('smcicc.system.sysUser.duplicateWorkNo'));
            } else {
              this.$message.warning(this.$t('smcicc.common.saveFailed'));
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
      this.$confirm(this.$t('smcicc.system.sysUser.copyConfirm'), this.$t('smcicc.common.copy'), {
        type: 'info',
      })
        .then(() =>
          this.$ajax.postJSON(`${BASE}/copyUser`, {
            user: {
              workNo: r.workNo,
              name: r.name,
              password: r.password,
            },
          })
        )
        .then((ok) => {
          if (ok) {
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
      const ids = this.selection.map((r) => r.id).filter((id) => id != null);
      const n = ids.length;
      this.$confirm(this.$t('smcicc.common.confirmDelete', { n }), this.$t('operate.delete'), { type: 'warning' })
        .then(() => this.$ajax.postJSON(`${BASE}/getSysUserCount`, {}))
        .then((cnt) => {
          const remain = Number(cnt) - n;
          if (remain <= 0) {
            this.$message.warning(this.$t('smcicc.system.sysUser.keepOneUser'));
            return Promise.reject(new Error('keep-one'));
          }
          return this.$ajax.postJSON(`${BASE}/deleteUsers`, { userIds: ids.join(',') });
        })
        .then((ok) => {
          if (ok === undefined) return;
          if (ok) {
            this.$message.success(this.$t('smcicc.common.deleteSuccess'));
            this.load();
          } else {
            this.$message.warning(this.$t('smcicc.common.deleteFailed'));
          }
        })
        .catch((e) => {
          if (e === 'cancel' || (e && e.message === 'keep-one')) return;
        });
    },
  },
};
</script>

<style scoped>
.page-title {
  flex: 0 0 auto;
  font-size: 20px;
  margin: 0;
}
.account-toolbar {
  display: grid;
  grid-column: 1 / -1;
  grid-row: 1;
  grid-template-columns: minmax(0, 1fr) auto minmax(0, 1fr);
  flex: 0 0 auto;
  align-items: center;
  gap: 16px;
  margin-bottom: 16px;
  width: 100%;
}
.account-toolbar .page-title {
  justify-self: start;
}
.search-form {
  display: flex;
  grid-column: 2;
  align-items: center;
  gap: 8px;
  margin: 0;
  justify-self: center;
}
.search-form .el-input {
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
  gap: 8px;
  justify-self: end;
  margin-left: 0;
}
.actions .el-button + .el-button {
  margin-left: 0;
}
.actions .el-button {
  width: 34px;
  padding-right: 0;
  padding-left: 0;
}
.import-file {
  display: none;
}
.mb {
  margin-bottom: 12px;
}

@media (max-width: 1200px) {
  .account-toolbar {
    flex-wrap: wrap;
    grid-template-columns: 1fr auto;
  }
  .search-form {
    grid-column: 2;
    justify-self: end;
  }
  .actions {
    grid-column: 1 / -1;
    margin-left: 0;
    justify-self: end;
  }
}
</style>
