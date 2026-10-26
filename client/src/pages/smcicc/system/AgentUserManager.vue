<template>
  <div class="smcicc-page agent-user-page">
    <system-list-toolbar
      title="坐席员管理"
      :keyword.sync="filterKeyword"
      :importing="importing"
      :has-rows="listFilteredRows.length > 0"
      :has-selection="selection.length > 0"
      :add-disabled="!vdnId"
      :import-disabled="!vdnId"
      :export-disabled="!vdnId"
      @search="handleListSearch"
      @clear="clearListSearch"
      @add="openAdd"
      @import="importList"
      @export="exportList"
      @delete="doDelete"
    >
      <template slot="title-side">
        <el-select
          v-if="!lockedVdnId"
          v-model="vdnId"
          class="title-vdn-select"
          size="small"
          filterable
          placeholder="选择 VDN"
          @change="onVdnChange"
        >
          <el-option v-for="v in vdnOptions" :key="v.id" :label="`${v.id} - ${v.name}`" :value="v.id" />
        </el-select>
      </template>
    </system-list-toolbar>

    <el-alert v-if="err" :title="err" type="error" show-icon class="mb" :closable="false" />
    <div v-if="vdnId" class="alloc-bar">
      <span>{{ alloc.mode === 'manual' ? `手动分配，可用范围：${rangeText}` : `自动分配，下一个工号 ${alloc.preview || '—'}，输入框只读` }}</span>
      <el-button v-if="alloc.mode !== 'manual'" type="text" @click="openApply">申请手动号段</el-button>
      <el-button v-for="item in pendingRequests" :key="item.id" type="text" @click="withdraw(item)">撤回 {{ item.startNo }}–{{ item.endNo }}</el-button>
    </div>

    <div class="agent-table-wrap">
    <el-table
      v-loading="loading"
      :data="listFilteredRows"
      border
      stripe
      size="small"
      height="100%"
      @selection-change="onSel"
      @row-dblclick="openEdit"
    >
      <el-table-column type="selection" width="48" />
      <el-table-column prop="workNo" label="工号" min-width="100" show-overflow-tooltip />
      <el-table-column prop="name" label="姓名" min-width="120" show-overflow-tooltip />
      <el-table-column prop="email" label="Email" min-width="140" show-overflow-tooltip />
      <el-table-column prop="telAgentExtendNO" label="电话分机" width="110" show-overflow-tooltip />
      <el-table-column label="视频配置" min-width="220">
        <template slot-scope="{ row }">
          <span v-if="row.videoEnabled">
            {{ row.videoSameExtension ? '共用电话分机' : row.videoExtension }} · 浏览器话机 {{ row.webSipEnabled ? '开' : '关' }} / Web 视频 {{ row.webVideoEnabled ? '开' : '关' }}
          </span>
          <span v-else>关闭</span>
          <div>口令：{{ row.videoPasswordConfigured ? '••••••（已设置）' : '未设置' }}</div>
        </template>
      </el-table-column>
      <el-table-column prop="calledTel" label="外呼主叫" width="110" show-overflow-tooltip />
      <el-table-column label="操作" width="96" align="center" fixed="right">
        <template slot-scope="{ row }">
          <span class="row-ops" @click.stop>
            <el-button type="text" icon="el-icon-edit" title="编辑" @click="openEdit(row)" />
            <el-switch :value="rowEnabled(row)" @change="(on) => setValid(row, on)" />
          </span>
        </template>
      </el-table-column>
    </el-table>
    </div>

    <el-dialog :title="dialogTitle" :visible.sync="dialogVisible" width="640px" append-to-body @closed="resetForm">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="120px" size="small">
        <el-form-item label="Omni 软件分机">
          <el-input :value="form.extensionTel || '未绑定'" readonly />
          <a :href="(omniPublicUrl || '/omni') + '/access-management?tab=extensions'" target="_blank" rel="noopener noreferrer">在 Omni 分机绑定管理中维护</a>
        </el-form-item>
        <el-row :gutter="12">
          <el-col :span="12">
            <el-form-item label="操作员工号" prop="workNo">
              <el-input v-model="form.workNo" :readonly="workNoReadonly" autocomplete="off" />
              <p class="field-hint">{{ workNoHint }}</p>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="操作员密码" prop="password">
              <el-input v-model="form.password" type="password" show-password autocomplete="new-password" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="操作员名称" prop="name">
              <el-input v-model="form.name" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="Email">
              <el-input v-model="form.email" placeholder="空则同步为 工号@agent.local" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="外呼主叫号码">
              <el-input v-model="form.calledTel" />
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="客户先挂机后" prop="clientReleaseMode">
              <el-select v-model="form.clientReleaseMode" style="width: 100%">
                <el-option :value="0" label="进入话后整理" />
                <el-option :value="1" label="进入空闲" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="坐席先挂机后" prop="agentReleaseMode">
              <el-select v-model="form.agentReleaseMode" style="width: 100%">
                <el-option :value="0" label="进入话后整理" />
                <el-option :value="1" label="进入空闲" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="来电响铃" prop="autoAnswerCall">
              <el-select v-model="form.autoAnswerCall" style="width: 100%">
                <el-option :value="0" label="振铃后手动应答" />
                <el-option :value="1" label="自动应答" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否报工号" prop="notPlayWorkNO">
              <el-select v-model="form.notPlayWorkNO" style="width: 100%">
                <el-option :value="0" label="报工号" />
                <el-option :value="1" label="不报工号" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="摘机模式" prop="agentHookMode">
              <el-select v-model="form.agentHookMode" style="width: 100%">
                <el-option :value="0" label="软摘机" />
                <el-option :value="1" label="硬摘机" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="是否电话坐席" prop="useTelAgent">
              <el-select v-model="form.useTelAgent" style="width: 100%">
                <el-option :value="0" label="否" />
                <el-option :value="1" label="是" />
              </el-select>
            </el-form-item>
          </el-col>
          <el-col :span="12">
            <el-form-item label="电话分机号">
              <el-input v-model="form.telAgentExtendNO" :disabled="form.useTelAgent !== 1" />
            </el-form-item>
          </el-col>
        </el-row>
        <el-divider content-position="left">视频与浏览器话机</el-divider>
        <el-form-item label="启用视频能力">
          <el-switch v-model="form.videoEnabled" />
          <p class="field-hint">控制视频业务本身；移动端登录绑定电话分机后默认具备视频能力。</p>
        </el-form-item>
        <el-form-item label="浏览器话机">
          <el-switch v-model="form.webSipEnabled" />
          <p class="field-hint">启用后，浏览器可直接注册电话 SIP，作为坐席话机接听和拨打语音。</p>
        </el-form-item>
        <el-form-item label="Web 视频">
          <el-switch v-model="form.webVideoEnabled" />
          <p class="field-hint">启用后，浏览器可按呼入 MediaType 接听视频。</p>
        </el-form-item>
        <el-form-item label="视频分机模式">
          <el-radio-group v-model="form.videoExtensionMode" @change="onVideoModeChange">
            <el-radio label="shared_phone">电话同分机</el-radio>
            <el-radio label="independent_video">独立视频分机</el-radio>
          </el-radio-group>
        </el-form-item>
        <el-form-item v-if="form.videoExtensionMode === 'shared_phone'" label="共用分机">
          <el-input :value="form.extensionTel || '未绑定，请先在 Omni 绑定电话分机'" readonly />
          <p class="field-hint">复用当前绑定的 ExtensionTel 和电话 SIP 口令，不另设视频密码。共用账号同时注册可能与话机或其他客户端冲突，请勿重复注册。</p>
        </el-form-item>
        <template v-else>
          <el-form-item label="独立视频分机">
            <el-input v-model="form.videoExtension" autocomplete="off" placeholder="当前 VDN 已存在且启用的分机" />
            <p class="field-hint">须已启用 SIP；不能使用本人电话分机，也不能占用其他坐席的电话或视频身份。停用视频后仍保留独立号码，清空号码可释放。</p>
          </el-form-item>
          <el-form-item label="新 SIP 口令">
            <el-input v-model="form.videoPassword" type="password" autocomplete="new-password" placeholder="12-128 位；留空保留原口令" />
          </el-form-item>
        </template>
        <el-form-item label="已保存口令">
          <span>{{ form.videoPasswordConfigured ? '••••••（已设置）' : '未设置' }}</span>
          <span v-if="form.videoExtensionMode === 'shared_phone'">（复用电话 SIP 口令）</span>
        </el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="dialogVisible = false">关闭</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="submitForm">保存</el-button>
      </span>
    </el-dialog>
    <el-dialog title="申请手动号段" :visible.sync="applyVisible" width="420px" append-to-body>
      <el-form label-width="80px" size="small">
        <el-form-item label="起始号"><el-input v-model="applyForm.startNo" /></el-form-item>
        <el-form-item label="结束号"><el-input v-model="applyForm.endNo" /></el-form-item>
        <el-form-item label="理由"><el-input v-model="applyForm.reason" type="textarea" maxlength="2000" /></el-form-item>
      </el-form>
      <span slot="footer">
        <el-button size="small" @click="applyVisible = false">关闭</el-button>
        <el-button type="primary" size="small" :loading="saving" @click="submitApply">提交</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import SystemListToolbar from './SystemListToolbar.vue';
import systemListPageMixin, { DEFAULT_LIST_LIMIT } from './systemListPageMixin';

const SYS_BASE = '/server/api/smcicc/systemadmin';
const VDN_BASE = '/server/api/smcicc/vdnadmin';
const WORKNO_BASE = '/server/api/smcicc/workno';

function emptyForm() {
  return {
    id: null,
    workNo: '',
    password: '',
    name: '',
    email: '',
    calledTel: '',
    clientReleaseMode: 0,
    agentReleaseMode: 0,
    autoAnswerCall: 0,
    notPlayWorkNO: 0,
    agentHookMode: 0,
    useTelAgent: 0,
    extensionTel: '',
    videoEnabled: false,
    videoSameExtension: false,
    videoExtension: '',
    videoPassword: '',
    videoPasswordConfigured: false,
    videoWebEnabled: false,
    videoMobileEnabled: false,
    webSipEnabled: false,
    webVideoEnabled: false,
    videoExtensionMode: 'shared_phone',
    telAgentExtendNO: '',
    isAutoDial: null,
    autoDialNO: '',
  };
}

export default {
  name: 'SMCIccAgentUserManager',
  components: { SystemListToolbar },
  mixins: [systemListPageMixin],
  props: {
    lockedVdnId: { type: Number, default: 0 },
  },
  data() {
    return {
      loading: false,
      saving: false,
      err: '',
      vdnOptions: [],
      vdnId: null,
      rows: [],
      total: 0,
      page: 1,
      pageSize: 20,
      selection: [],
      omniPublicUrl: String(process.env.VUE_APP_OMNI_PUBLIC_URL || '').replace(/\/$/, ''),
      dialogVisible: false,
      dialogMode: 'add',
      form: emptyForm(),
      oldWorkNo: '',
      alloc: { mode: 'auto', ranges: [], preview: null, requests: [] },
      applyVisible: false,
      applyForm: { startNo: '', endNo: '', reason: '' },
    };
  },
  computed: {
    singleSel() {
      return this.selection.length === 1 ? this.selection[0] : null;
    },
    dialogTitle() {
      return this.dialogMode === 'edit' ? '编辑坐席员' : '新增坐席员';
    },
    workNoReadonly() {
      return this.dialogMode === 'edit' || this.alloc.mode !== 'manual';
    },
    rangeText() {
      return (this.alloc.ranges || []).map(range => `${range.startNo}–${range.endNo}`).join('、') || '尚未授权';
    },
    pendingRequests() {
      return (this.alloc.requests || []).filter(item => item.status === 'pending');
    },
    workNoHint() {
      if (this.dialogMode === 'edit') return '已有工号不能修改';
      if (this.alloc.mode === 'manual') return `请输入当前 VDN 的号段：${this.rangeText}。工号在本 VDN 内不能重复。`;
      return '自动分配，由系统取号，不能手改。';
    },
    rules() {
      return {
        workNo: [{ required: true, message: '必填', trigger: 'blur' }],
        password: [{ required: true, message: '必填', trigger: 'blur' }],
        name: [{ required: true, message: '必填', trigger: 'blur' }],
        clientReleaseMode: [{ required: true, message: '必选', trigger: 'change' }],
        agentReleaseMode: [{ required: true, message: '必选', trigger: 'change' }],
        autoAnswerCall: [{ required: true, message: '必选', trigger: 'change' }],
        notPlayWorkNO: [{ required: true, message: '必选', trigger: 'change' }],
        agentHookMode: [{ required: true, message: '必选', trigger: 'change' }],
        useTelAgent: [{ required: true, message: '必选', trigger: 'change' }],
      };
    },
  },
  watch: {
    lockedVdnId(id) {
      if (id > 0 && id !== this.vdnId) {
        this.vdnId = id;
        this.onVdnChange();
      }
    },
  },
  mounted() {
    if (this.lockedVdnId > 0) this.vdnId = this.lockedVdnId;
    this.loadVdns().then(() => { this.load(); this.loadAlloc(); });
  },
  methods: {
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
          if (!this.vdnId && !this.lockedVdnId && this.vdnOptions.length) {
            this.vdnId = this.vdnOptions[0].id;
          }
        })
        .catch(() => {
          this.vdnOptions = [];
        });
    },
    onVdnChange() {
      this.filterKeyword = '';
      this.page = 1;
      this.load();
      this.loadAlloc();
    },
    loadAlloc() {
      if (!this.vdnId) {
        this.alloc = { mode: 'auto', ranges: [], preview: null, requests: [] };
        return Promise.resolve();
      }
      return this.$ajax.getJSON(`${WORKNO_BASE}/policy`, { vdnId: this.vdnId }).then((data) => {
        this.alloc = data || this.alloc;
      }).catch(() => {
        this.err = '工号分配规则加载失败';
      });
    },
    listExportFileName() {
      return `icc-agent-users-vdn-${this.vdnId || 'none'}`;
    },
    async importListRecord(record) {
      if (!this.vdnId) return false;
      const user = {
        id: null,
        workNo: String(record.workNo || '').trim(),
        password: String(record.password || ''),
        name: String(record.name || '').trim(),
        email: String(record.email || '').trim(),
        calledTel: String(record.calledTel || '').trim(),
        clientReleaseMode: Number(record.clientReleaseMode || 0),
        agentReleaseMode: Number(record.agentReleaseMode || 0),
        autoAnswerCall: Number(record.autoAnswerCall || 0),
        notPlayWorkNO: Number(record.notPlayWorkNO || 0),
        agentHookMode: Number(record.agentHookMode || 0),
        useTelAgent: Number(record.useTelAgent || 0),
        telAgentExtendNO: String(record.telAgentExtendNO || '').trim(),
        isAutoDial: record.isAutoDial == null || record.isAutoDial === '' ? null : Number(record.isAutoDial),
        autoDialNO: String(record.autoDialNO || '').trim(),
        vdnId: this.vdnId,
        oldWorkNo: '',
      };
      if (!user.password || !user.name || (this.alloc.mode === 'manual' && !user.workNo)) return false;
      return (await this.$ajax.postJSON(`${VDN_BASE}/addUserInfo`, {
        jsonUser: user,
        vdnId: this.vdnId,
        oldWorkNo: '',
      })) === 1;
    },
    load() {
      if (!this.vdnId) {
        this.rows = [];
        this.total = 0;
        return;
      }
      this.loading = true;
      this.err = '';
      this.$ajax
        .postJSON(`${VDN_BASE}/loadUserInfo`, {
          vdnId: this.vdnId,
          page: 1,
          pagesize: DEFAULT_LIST_LIMIT,
          workNo: '',
          name: '',
        })
        .then((data) => {
          this.rows = Array.isArray(data.Rows) ? data.Rows : [];
          this.total = Number(data.Total != null ? data.Total : this.rows.length);
        })
        .catch(() => {
          this.err = '加载失败（请确认已登录，且数据库可达）';
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
      this.oldWorkNo = '';
      this.$nextTick(() => this.$refs.formRef && this.$refs.formRef.clearValidate());
    },
    openAdd() {
      this.loadAlloc().then(() => {
        this.dialogMode = 'add';
        this.resetForm();
        if (this.alloc.mode !== 'manual') this.form.workNo = this.alloc.preview ? String(this.alloc.preview) : '';
        this.dialogVisible = true;
      });
    },
    openApply() {
      this.applyForm = { startNo: '', endNo: '', reason: '' };
      this.applyVisible = true;
    },
    submitApply() {
      this.saving = true;
      this.$ajax.postJSON(`${WORKNO_BASE}/apply`, { vdnId: this.vdnId, ...this.applyForm }).then(() => {
        this.$message.success('已提交号段申请');
        this.applyVisible = false;
        this.loadAlloc();
      }).catch((error) => {
        this.$message.error(error.err_msg || error.message || '申请失败');
      }).finally(() => { this.saving = false; });
    },
    withdraw(item) {
      this.$ajax.postJSON(`${WORKNO_BASE}/withdraw`, { id: item.id }).then(() => {
        this.$message.success('已撤回申请');
        this.loadAlloc();
      }).catch((error) => this.$message.error(error.err_msg || '撤回失败'));
    },
    onVideoModeChange(shared) {
      if (shared) this.form.videoPassword = '';
    },
    openEdit(row) {
      const r = row && typeof row === 'object' ? row : this.singleSel;
      if (!r) return;
      this.dialogMode = 'edit';
      this.oldWorkNo = r.workNo != null ? String(r.workNo) : '';
      this.form = {
        id: r.id,
        workNo: r.workNo != null ? String(r.workNo) : '',
        password: r.password != null ? String(r.password) : '',
        name: r.name != null ? String(r.name) : '',
        email: r.email != null ? String(r.email) : '',
        calledTel: r.calledTel != null ? String(r.calledTel) : '',
        clientReleaseMode: Number(r.clientReleaseMode || 0),
        agentReleaseMode: Number(r.agentReleaseMode || 0),
        autoAnswerCall: Number(r.autoAnswerCall || 0),
        notPlayWorkNO: Number(r.notPlayWorkNO || 0),
        agentHookMode: Number(r.agentHookMode || 0),
        useTelAgent: Number(r.useTelAgent || 0),
        extensionTel: String(r.extensionTel || ''),
        videoEnabled: r.videoEnabled === true || Number(r.videoEnabled) === 1,
        videoSameExtension: r.videoSameExtension === true || Number(r.videoSameExtension) === 1,
        videoExtension: String(r.videoExtension || ''),
        videoPassword: '',
        videoPasswordConfigured: r.videoPasswordConfigured === true || Number(r.videoPasswordConfigured) === 1,
        videoWebEnabled: r.webVideoEnabled === true || Number(r.webVideoEnabled) === 1 || r.videoWebEnabled === true || Number(r.videoWebEnabled) === 1,
        videoMobileEnabled: r.videoMobileEnabled === true || Number(r.videoMobileEnabled) === 1,
        webSipEnabled: r.webSipEnabled === true || Number(r.webSipEnabled) === 1,
        webVideoEnabled: r.webVideoEnabled === true || Number(r.webVideoEnabled) === 1 || r.videoWebEnabled === true || Number(r.videoWebEnabled) === 1,
        videoExtensionMode: r.videoExtensionMode === 'independent_video' ? 'independent_video' : r.videoExtensionMode === 'shared_phone' ? 'shared_phone' : (r.videoEnabled === true || Number(r.videoEnabled) === 1) && (r.videoSameExtension !== true && Number(r.videoSameExtension) !== 1) ? 'independent_video' : 'shared_phone',
        telAgentExtendNO: r.telAgentExtendNO != null ? String(r.telAgentExtendNO) : '',
        isAutoDial: r.isAutoDial == null ? null : Number(r.isAutoDial),
        autoDialNO: r.autoDialNO != null ? String(r.autoDialNO) : '',
      };
      this.dialogVisible = true;
    },
    submitForm() {
      this.$refs.formRef.validate((ok) => {
        if (!ok) return;
        if (this.form.useTelAgent === 1 && !String(this.form.telAgentExtendNO || '').trim()) {
          this.$message.warning('电话坐席需填写分机号');
          return;
        }
        if (this.form.videoEnabled && (this.form.videoExtensionMode === 'shared_phone' ? !this.form.extensionTel : !String(this.form.videoExtension || '').trim())) {
          this.$message.warning('请先配置视频分机；共号模式须先绑定电话分机');
          return;
        }
        this.saving = true;
        const user = {
          id: this.form.id,
          workNo: this.form.workNo.trim(),
          password: this.form.password,
          name: this.form.name.trim(),
          email: (this.form.email || '').trim(),
          calledTel: (this.form.calledTel || '').trim(),
          clientReleaseMode: this.form.clientReleaseMode,
          agentReleaseMode: this.form.agentReleaseMode,
          autoAnswerCall: this.form.autoAnswerCall,
          notPlayWorkNO: this.form.notPlayWorkNO,
          agentHookMode: this.form.agentHookMode,
          useTelAgent: this.form.useTelAgent,
          telAgentExtendNO: (this.form.telAgentExtendNO || '').trim(),
          isAutoDial: this.form.isAutoDial,
          autoDialNO: (this.form.autoDialNO || '').trim(),
          vdnId: this.vdnId,
          videoEnabled: this.form.videoEnabled,
          videoSameExtension: this.form.videoExtensionMode === 'shared_phone',
          videoExtensionMode: this.form.videoExtensionMode,
          videoExtension: this.form.videoExtensionMode === 'shared_phone' ? '' : this.form.videoExtension.trim(),
          videoPassword: this.form.videoExtensionMode === 'shared_phone' ? '' : this.form.videoPassword,
          webSipEnabled: this.form.webSipEnabled,
          webVideoEnabled: this.form.webVideoEnabled,
          videoWebEnabled: this.form.webVideoEnabled,
          videoMobileEnabled: false,
          oldWorkNo: this.oldWorkNo,
        };
        const url = this.dialogMode === 'edit' ? `${VDN_BASE}/editUserInfo` : `${VDN_BASE}/addUserInfo`;
        this.$ajax
          .postJSON(url, { jsonUser: user, vdnId: this.vdnId, oldWorkNo: this.oldWorkNo })
          .then((data) => {
            if (data === 1) {
              this.$message.success('已保存并同步 Omni');
              this.dialogVisible = false;
              this.load();
            } else if (data === 2) {
              this.$message.warning('工号不能重复');
            } else if (data === 3) {
              this.$message.warning('电话分机号不存在，请先在分机管理中配置');
            } else if (data === -1) {
              this.$message.warning('分机号已被其它坐席占用');
            } else if (data === 4) {
              this.$message.warning(`工号须落在当前 VDN 号段内：${this.rangeText}`);
            } else if (data === 5) {
              this.$message.warning('已有工号不能修改');
            } else {
              this.$message.warning((data && data.err_msg) || '保存失败');
            }
          })
          .catch((error) => this.$message.error(error.err_msg || error.message || '请求失败'))
          .finally(() => {
            this.saving = false;
          });
      });
    },
    rowEnabled(row) {
      return Number(row.isValid) !== 0;
    },
    setValid(row, on) {
      const prev = this.rowEnabled(row);
      this.$set(row, 'isValid', on ? 1 : 0);
      this.$ajax.postJSON(`${VDN_BASE}/setAgentValid`, {
        vdnId: this.vdnId,
        id: row.id,
        isValid: on ? 1 : 0,
      }).then((code) => {
        if (code === 1) return;
        this.$set(row, 'isValid', prev ? 1 : 0);
        this.$message.warning('启停失败');
      }).catch(() => {
        this.$set(row, 'isValid', prev ? 1 : 0);
        this.$message.error('启停失败');
      });
    },
    doDelete() {
      if (!this.selection.length) return;
      const ids = this.selection.map((r) => r.id).join(',');
      this.$confirm(`确定删除选中的 ${this.selection.length} 个坐席？将同时从 Omni 移除。`, '删除', {
        type: 'warning',
      })
        .then(() => this.$ajax.postJSON(`${VDN_BASE}/deleteUserInfo`, { userIds: ids }))
        .then((ok) => {
          if (ok) {
            this.$message.success('已删除');
            this.load();
          } else {
            this.$message.warning('删除失败');
          }
        })
        .catch(() => {});
    },
  },
};
</script>

<style scoped>
.title-vdn-select {
  width: 180px;
  flex: 0 0 180px;
}
.agent-user-page .desc {
  color: #606266;
  font-size: 13px;
  line-height: 1.5;
  margin: 0 0 12px;
}
.agent-user-page .toolbar {
  margin-bottom: 8px;
}
.agent-user-page .actions {
  margin-bottom: 10px;
}
.agent-user-page .mb {
  flex: 0 0 auto;
  margin-bottom: 10px;
}
.agent-table-wrap {
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden;
}
.row-ops {
  display: inline-flex;
  align-items: center;
  gap: 8px;
}
.alloc-bar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 8px;
  color: #606266;
  font-size: 13px;
}
.field-hint {
  margin: 4px 0 0;
  color: #909399;
  font-size: 12px;
  line-height: 1.5;
}
</style>
