<template>
  <div class="provision-page" v-loading="loading">
    <header class="provision-header">
      <div><h1>{{ context.role === 'system' ? (context.tenancyEnabled ? '管理平台' : '开通 VDN') : '业务开通向导' }}</h1>
      <p>{{ context.role === 'system' ? (context.tenancyEnabled ? '审核注册账号；VDN 由审核通过的管理员自行创建和维护。' : '创建独立业务空间，指定管理员，再核验两端开通结果。') : '在获授权的 VDN 内配置坐席与热线。' }}</p></div>
      <el-tag v-if="context.role !== 'none'">{{ context.role === 'system' ? '超级管理员' : 'VDN 管理员' }}</el-tag>
    </header>
    <el-alert v-if="error" class="notice" type="error" :title="error" :closable="false" show-icon />
    <el-alert v-if="context.message" class="notice" type="warning" :title="context.message" :closable="false" show-icon />
    <el-empty v-if="!loading && context.role === 'none'" description="当前账号没有开通管理权限，请联系 VDN 管理员。" />
    <template v-else-if="context.role === 'system' && !business">
      <div class="toolbar"><h2>VDN 列表</h2><el-button v-if="context.tenancyEnabled" type="primary" @click="$router.push('/smcicc/system/vdn-access')">注册账号审核</el-button><el-button v-if="!context.tenancyEnabled" type="primary" @click="openCreate">创建 VDN</el-button></div>
      <el-table :data="context.vdns" class="vdn-table" empty-text="还没有 VDN，请创建第一个业务空间。">
        <el-table-column prop="id" label="VDN 编号" width="120" />
        <el-table-column prop="name" label="业务空间" min-width="150" />
        <el-table-column label="操作" min-width="260"><template slot-scope="scope">
          <el-button v-if="!context.tenancyEnabled" type="text" @click="openAdmin(scope.row)">管理员与开通状态</el-button>
          <el-button type="text" @click="enterBusiness(scope.row)">协助业务配置</el-button>
        </template></el-table-column>
      </el-table>
      <section v-if="stage !== 'list'" class="provision-card">
        <el-steps :active="stage === 'create' ? 0 : (receipt ? 2 : 1)" align-center finish-status="success">
          <el-step title="创建 VDN" /><el-step title="添加管理员" /><el-step title="核验开通" />
        </el-steps>
        <h2>{{ stage === 'create' ? '创建业务空间' : `VDN ${selected} · ${selectedName}` }}</h2>
        <el-form v-if="stage === 'create'" label-position="top" @submit.native.prevent="createVdn">
          <div class="field-pair"><el-form-item label="VDN 编号"><el-input v-model="vdnForm.vdnId" placeholder="正整数，例如 2" /></el-form-item>
          <el-form-item label="VDN 名称"><el-input v-model="vdnForm.name" maxlength="40" placeholder="例如：客户服务中心" /></el-form-item></div>
          <el-button type="primary" :loading="saving" native-type="submit">创建并继续</el-button>
        </el-form>
        <el-form v-else-if="!receipt" label-position="top" @submit.native.prevent="assignAdmin">
          <el-form-item label="管理员来源"><el-radio-group v-model="adminMode"><el-radio-button label="new">创建新管理员</el-radio-button><el-radio-button label="existing">指定当前 VDN 用户</el-radio-button></el-radio-group></el-form-item>
          <el-form-item v-if="adminMode === 'existing'" label="现有用户"><el-select v-model="adminForm.sourceId" placeholder="选择当前 VDN 内的用户" filterable><el-option v-for="u in users" :key="u.id" :value="u.id" :label="`${u.workNo} · ${u.name} · ${u.email || '未配置邮箱'}`" /></el-select></el-form-item>
          <template v-else>
            <div class="field-pair"><el-form-item label="工号"><el-input v-model="adminForm.workNo" autocomplete="off" maxlength="20" :readonly="alloc.mode !== 'manual'" /><p class="form-hint">{{ allocHint }}</p></el-form-item><el-form-item label="姓名"><el-input v-model="adminForm.name" maxlength="40" /></el-form-item></div>
            <el-form-item label="登录邮箱"><el-input v-model="adminForm.email" type="email" autocomplete="email" maxlength="50" placeholder="每个业务账号使用独立邮箱" /></el-form-item>
            <div class="field-pair"><el-form-item label="初始密码"><el-input v-model="adminForm.password" type="password" show-password autocomplete="new-password" /></el-form-item><el-form-item label="再次确认密码"><el-input v-model="adminForm.confirm" type="password" show-password autocomplete="new-password" /></el-form-item></div>
          </template>
          <p class="form-hint">管理员仅获得当前 VDN 的管理权限。指定现有用户不会覆盖其密码；工号按当前 VDN 查重，邮箱必须唯一。</p>
          <el-button type="primary" :loading="saving" native-type="submit">保存管理员并同步</el-button>
        </el-form>
        <div v-else class="receipt">
          <el-alert :type="receipt.status === 'ready' ? 'success' : 'warning'" :title="receipt.status === 'ready' ? 'VDN 与管理员已完成同步' : '管理员已保存，开通待核验'" :closable="false" show-icon />
          <p v-if="receipt.message" class="form-hint">{{ receipt.message }}</p><el-descriptions :column="1" border><el-descriptions-item label="Omni account_id">{{ receipt.accountId || '待同步确认' }}</el-descriptions-item><el-descriptions-item label="管理员工号">{{ receipt.workNo }}</el-descriptions-item><el-descriptions-item label="登录邮箱">{{ receipt.email }}</el-descriptions-item><el-descriptions-item label="状态">{{ receipt.status === 'ready' ? '已就绪' : '待同步 / 核验' }}</el-descriptions-item></el-descriptions>
          <p class="form-hint">系统会重新检查用户状态、授权、VDN 映射和 Omni 同步。重试不会重复创建账号，也不会恢复已撤销的权限。</p>
          <el-button type="primary" :loading="saving" @click="retry">{{ receipt.status === 'ready' ? '重新核验' : '重试同步并核验' }}</el-button>
          <el-button @click="stage = 'list'">返回 VDN 列表</el-button>
        </div>
      </section>
    </template>
    <template v-else-if="context.role !== 'none'">
      <div class="context-bar"><el-button v-if="context.role === 'system'" @click="business = false">返回 VDN 列表</el-button><label for="onboard-vdn">当前 VDN</label><el-select id="onboard-vdn" v-model="selected" placeholder="请选择获授权 VDN"><el-option v-for="v in context.vdns" :key="v.id" :value="Number(v.id)" :label="`${v.name}（${v.id}）`" /></el-select><span v-if="context.role === 'system'">超级用户协助配置 · 操作将记录审计</span></div>
      <vdn-business-wizard v-if="selected" :key="selected" :vdn-id="selected" />
      <el-empty v-else description="请选择 VDN 后继续" />
    </template>
  </div>
</template>
<script>
import onboardApi from './onboardApi';
import VdnBusinessWizard from './VdnBusinessWizard.vue';
const emptyAdmin = () => ({ sourceId: null, workNo: '', name: '', email: '', password: '', confirm: '' });
export default {
  name: 'OnboardingWizard', components: { VdnBusinessWizard },
  data: () => ({ context: { role: 'none', vdns: [], message: '' }, loading: false, saving: false, error: '', stage: 'list', business: false, selected: null, users: [], receipt: null, adminMode: 'new', adminForm: emptyAdmin(), vdnForm: { vdnId: '', name: '' }, alloc: { mode: 'auto', ranges: [], preview: null } }),
  computed: {
    selectedName() { const row = this.context.vdns.find(v => Number(v.id) === this.selected); return row ? row.name : ''; },
    allocHint() {
      if (this.alloc.mode === 'manual') return `手动分配，请填写号段 ${(this.alloc.ranges || []).map(range => range.startNo + '–' + range.endNo).join('、')}`;
      return `自动分配，系统预留工号 ${this.alloc.preview || '—'}，不能手改`;
    },
  },
  created() { this.load(); },
  methods: {
    api: onboardApi,
    async run(fn) { if (this.saving) return; this.saving = true; this.error = ''; try { await fn(); } catch (e) { this.error = e.err_msg || e.message || '请求失败，请刷新重试'; } finally { this.saving = false; } },
    async load() { this.loading = true; try { this.context = await this.api('get', 'context'); if (this.context.role === 'vdn') { const requested = this.$route && this.$route.query.vdnId; if (requested && !this.context.vdns.some(v => Number(v.id) === Number(requested))) throw new Error('没有此 VDN 的管理权限'); this.selected = requested ? Number(requested) : this.context.vdns.length === 1 ? Number(this.context.vdns[0].id) : null; } } catch (e) { this.error = e.err_msg || e.message; } finally { this.loading = false; } },
    openCreate() { if (this.saving) return; this.stage = 'create'; this.receipt = null; this.adminForm = emptyAdmin(); this.error = ''; },
    async loadAlloc() { this.alloc = await this.$ajax.getJSON('/server/api/smcicc/workno/policy', { vdnId: this.selected }); if (this.alloc.mode !== 'manual') this.adminForm.workNo = this.alloc.preview ? String(this.alloc.preview) : ''; },
    async openAdmin(row) { if (this.saving) return; this.users = []; this.selected = Number(row.id); this.stage = 'admin'; this.adminForm = emptyAdmin(); this.receipt = null; await this.run(async () => { const s = await this.api('get', 'provision-status', { vdnId: this.selected }); this.users = s.users; this.receipt = s.provisioning; await this.loadAlloc(); }); },
    enterBusiness(row) { if (this.saving) return; this.selected = Number(row.id); this.business = true; this.error = ''; },
    async createVdn() { await this.run(async () => { const result = await this.api('post', 'create-vdn', this.vdnForm); this.context = await this.api('get', 'context'); this.selected = result.vdnId; this.stage = 'admin'; this.users = []; this.adminForm = emptyAdmin(); await this.loadAlloc(); }); },
    async assignAdmin() { if (this.adminMode === 'existing' && !this.adminForm.sourceId) { this.error = '请选择当前 VDN 的现有用户'; return; } await this.run(async () => { this.receipt = await this.api('post', 'assign-admin', { vdnId: this.selected, ...(this.adminMode === 'existing' ? { sourceId: this.adminForm.sourceId } : this.adminForm) }); this.adminForm = emptyAdmin(); }); },
    async retry() { await this.run(async () => { this.receipt = await this.api('post', 'retry', { vdnId: this.selected }); }); },
  },
};
</script>
<style scoped>
.provision-page { max-width: 1120px; margin: 0 auto; padding: 28px; color: #24334b; }
.provision-header, .toolbar { display: flex; justify-content: space-between; align-items: center; gap: 20px; }
.provision-header h1 { font-size: 28px; margin: 0 0 12px; font-weight: 600; }
.provision-header p, .form-hint { color: #68778b; line-height: 1.8; }
.notice { margin: 20px 0; }
.toolbar { margin: 30px 0 16px; }
h2 { font-size: 18px; font-weight: 600; }
.vdn-table, .provision-card { border: 1px solid #e2e8f0; border-radius: 10px; }
.provision-card { margin-top: 28px; padding: 28px; background: #fff; }
.provision-card h2 { margin: 32px 0 24px; }
.provision-card .el-form, .receipt { max-width: 680px; margin: 0 auto; }
.field-pair { display: grid; grid-template-columns: 1fr 1fr; gap: 24px; }
.receipt .el-descriptions { margin: 24px 0; }
.context-bar { display: flex; align-items: center; flex-wrap: wrap; gap: 16px; margin: 24px 0; padding: 16px; background: #eef4fc; border-radius: 8px; }
.context-bar span { color: #596d89; font-size: 13px; }
@media (max-width: 700px) { .provision-page { padding: 16px; } .provision-header { align-items: flex-start; } .provision-header h1 { font-size: 23px; } .provision-card { padding: 18px 12px; } .field-pair { grid-template-columns: 1fr; gap: 0; } }
</style>
