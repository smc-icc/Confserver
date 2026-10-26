<template>
  <div class="onboard-page" v-loading="loading">
    <header class="onboard-hero">
      <div>
        <p class="eyebrow">{{ $t('smcicc.onboard.eyebrow') }}</p>
        <h1>{{ $t('smcicc.onboard.title') }}</h1>
        <p class="lead">在当前 VDN 内创建坐席、配置热线并核验开通结果。请先由系统管理员准备技能组、坐席组和语音通道。</p>
      </div>
      <el-tag v-if="status.completed" type="success" effect="plain">{{ $t('smcicc.onboard.doneTag') }}</el-tag>
    </header>

    <el-alert
      v-if="status.completed"
      class="mb"
      type="success"
      show-icon
      :closable="false"
      :title="$t('smcicc.onboard.alreadyDone', { time: status.completedAt || '-' })"
    />

    <el-alert v-if="status.prerequisites && status.prerequisites.length" class="mb" type="warning" :closable="false" show-icon :title="`尚需系统管理员准备：${status.prerequisites.join('、')}`" />
    <el-steps :active="step" finish-status="success" align-center class="onboard-steps">
      <el-step title="确认 VDN" />
      <el-step :title="$t('smcicc.onboard.step2.title')" />
      <el-step :title="$t('smcicc.onboard.step3.title')" />
      <el-step :title="$t('smcicc.onboard.step4.title')" />
    </el-steps>

    <section class="onboard-card">
      <div v-show="step === 0">
        <h2>确认当前 VDN</h2>
        <p class="desc">所有设置仅应用于当前 VDN。多位管理员共享开通进度。</p>
        <el-descriptions :column="1" border>
          <el-descriptions-item label="VDN">{{ status.vdn && status.vdn.name }}（{{ vdnId }}）</el-descriptions-item>
          <el-descriptions-item label="语音技能组">{{ status.skill ? status.skill.name : '尚未配置，请先在 VDN 管理中配置' }}</el-descriptions-item>
          <el-descriptions-item label="坐席数">{{ status.agents.length }}</el-descriptions-item>
        </el-descriptions>
      </div>

      <div v-show="step === 1">
        <h2>{{ $t('smcicc.onboard.step2.heading') }}</h2>
        <p class="desc">{{ $t('smcicc.onboard.step2.desc') }}</p>
        <el-alert
          v-if="status.agents.length"
          class="mb"
          type="info"
          :closable="false"
          :title="$t('smcicc.onboard.step2.existing', { list: agentSummary })"
        />
        <el-form ref="agentForm" :model="agent" :rules="agentRules" label-width="120px" size="small" class="form">
          <el-form-item :label="$t('smcicc.onboard.step2.workNo')" prop="workNo">
            <el-input v-model="agent.workNo" autocomplete="username" />
          </el-form-item>
          <el-form-item :label="$t('smcicc.onboard.step2.name')" prop="name">
            <el-input v-model="agent.name" />
          </el-form-item>
          <el-form-item label="登录邮箱" prop="email"><el-input v-model="agent.email" autocomplete="email" /></el-form-item>
          <el-form-item :label="$t('smcicc.onboard.step2.password')" prop="password">
            <el-input v-model="agent.password" type="password" show-password autocomplete="new-password" />
          </el-form-item>
        </el-form>
        <ul class="auto-list">
          <li>{{ $t('smcicc.onboard.step2.autoExt', { ext: status.suggestedExtension }) }}</li>
          <li>{{ $t('smcicc.onboard.step2.autoSkill', { skill: (status.skill && status.skill.name) || '-' }) }}</li>
          <li>{{ $t('smcicc.onboard.step2.autoVdn', { name: (status.vdn && status.vdn.name) || '-' }) }}</li>
        </ul>
      </div>

      <div v-show="step === 2">
        <h2>{{ $t('smcicc.onboard.step3.heading') }}</h2>
        <p class="desc">{{ $t('smcicc.onboard.step3.desc') }}</p>
        <el-form ref="hotlineForm" :model="hotline" :rules="hotlineRules" label-width="120px" size="small" class="form">
          <el-form-item :label="$t('smcicc.onboard.step3.name')" prop="vdnName">
            <el-input v-model="hotline.vdnName" />
          </el-form-item>
          <el-form-item :label="$t('smcicc.onboard.step3.access')" prop="accessCode">
            <el-input v-model="hotline.accessCode" />
          </el-form-item>
          <el-form-item :label="$t('smcicc.onboard.step3.record')">
            <el-switch v-model="hotline.startRecord" />
            <span class="hint">{{ $t('smcicc.onboard.step3.recordHint') }}</span>
          </el-form-item>
        </el-form>
      </div>

      <div v-show="step === 3">
        <h2>{{ $t('smcicc.onboard.step4.heading') }}</h2>
        <p class="desc">{{ $t('smcicc.onboard.step4.desc') }}</p>
        <ol class="check-list">
          <li>
            {{ $t('smcicc.onboard.step4.openDesk') }}
            <a v-if="status.omniAgentUrl" :href="status.omniAgentUrl" target="_blank" rel="noopener">{{ status.omniAgentUrl }}</a>
          </li>
          <li>使用坐席邮箱 {{ agent.email || "（创建坐席时填写的邮箱）" }} 和创建时设置的密码登录。</li>
          <li>{{ $t('smcicc.onboard.step4.phone', { ext: sit.extension || status.suggestedExtension, sip: sit.sipPassword || '1234' }) }}</li>
          <li>{{ $t('smcicc.onboard.step4.call', { access: hotline.accessCode || (status.accessCode && status.accessCode.code) || '-' }) }}</li>
        </ol>
        <el-result v-if="finished" icon="success" :title="$t('smcicc.onboard.step4.success')" :sub-title="$t('smcicc.onboard.step4.successHint')" />
      </div>

      <footer class="actions">
        <el-button v-if="step > 0" @click="step -= 1">{{ $t('smcicc.onboard.prev') }}</el-button>
        <el-button v-if="step > 0 && step < 3 && canSkip" @click="skip">{{ $t('smcicc.onboard.skip') }}</el-button>
        <el-button v-if="step < 3" type="primary" :loading="saving" @click="next">{{ $t('smcicc.onboard.next') }}</el-button>
        <el-button v-else type="primary" :loading="saving" @click="finish">{{ $t('smcicc.onboard.finish') }}</el-button>
      </footer>
    </section>
  </div>
</template>

<script>
import onboardApi from './onboardApi';
export default {
  name: 'VdnBusinessWizard',
  props: { vdnId: { type: Number, required: true } },
  data() {
    const confirmPwd = (rule, value, callback) => {
      if (value !== this.pwd.password) callback(new Error(this.$t('smcicc.onboard.step1.mismatch')));
      else callback();
    };
    return {
      loading: false,
      saving: false,
      step: 0,
      finished: false,
      createdAgent: null,
      status: {
        completed: false,
        completedAt: '',
        admin: { workNo: '', name: '', loggedIn: false },
        vdn: null,
        accessCode: null,
        skill: null,
        agents: [],
        suggestedWorkNo: '1001',
        suggestedExtension: '9001',
        suggestedAccessCode: '4000',
        omniAgentUrl: '',
        sipDomain: '',
      },
      pwd: { password: '', confirm: '' },
      agent: { workNo: '', name: '', email: '', password: '' },
      hotline: { vdnName: '', accessCode: '', startRecord: true },
      pwdRules: {
        password: [{ required: true, min: 6, max: 32, message: this.$t('smcicc.onboard.step1.pwdRule'), trigger: 'blur' }],
        confirm: [{ required: true, validator: confirmPwd, trigger: 'blur' }],
      },
      agentRules: {
        email: [{ required: true, type: 'email', message: '请输入有效邮箱', trigger: 'blur' }],
        workNo: [{ required: true, pattern: /^\w{3,20}$/, message: this.$t('smcicc.onboard.step2.workNoRule'), trigger: 'blur' }],
        name: [{ required: true, message: this.$t('smcicc.onboard.step2.nameRule'), trigger: 'blur' }],
        password: [{ required: true, min: 6, max: 32, message: this.$t('smcicc.onboard.step2.pwdRule'), trigger: 'blur' }],
      },
      hotlineRules: {
        vdnName: [{ required: true, min: 2, max: 40, message: this.$t('smcicc.onboard.step3.nameRule'), trigger: 'blur' }],
        accessCode: [{ required: true, pattern: /^(\*|\d{3,20})$/, message: this.$t('smcicc.onboard.step3.accessRule'), trigger: 'blur' }],
      },
    };
  },
  computed: {
    agentSummary() {
      return (this.status.agents || []).map((a) => `${a.workNo} ${a.name}`).join('、') || '-';
    },
    canSkip() {
      if (this.step === 0) return true;
      if (this.step === 1) return this.status.agents.length > 0 || Boolean(this.createdAgent);
      if (this.step === 2) return Boolean(this.status.vdn && this.status.accessCode);
      return false;
    },
    sit() {
      const created = this.createdAgent;
      const first = (this.status.agents || [])[0];
      return {
        workNo: (created && created.workNo) || (first && first.workNo) || this.agent.workNo,
        extension: (created && created.extension) || (first && first.extension) || this.status.suggestedExtension,
        sipPassword: (created && created.sipPassword) || '1234',
        hasPassword: Boolean(created || this.agent.password),
      };
    },
  },
  created() {
    this.load();
  },
  methods: {
    errMsg(e) {
      return (e && (e.err_msg || e.message)) || this.$t('smcicc.common.requestFailed');
    },
    applyStatus(data) {
      this.status = { ...this.status, ...(data || {}) };
      if (!this.agent.workNo) this.agent.workNo = this.status.suggestedWorkNo || '1001';
      if (!this.agent.name) this.agent.name = this.$t('smcicc.onboard.step2.defaultName');
      if (!this.hotline.vdnName && this.status.vdn) this.hotline.vdnName = this.status.vdn.name;
      if (!this.hotline.accessCode) {
        this.hotline.accessCode = (this.status.accessCode && this.status.accessCode.code) || this.status.suggestedAccessCode;
      }
      if (this.status.vdn) this.hotline.startRecord = Boolean(this.status.vdn.startRecord);
    },
    api(method, path, body = {}) { return onboardApi(method, path.replace(/^\//, ''), { ...body, vdnId: this.vdnId }); },
    async load() {
      this.loading = true;
      try {
        const data = await this.api('get', '/status');
        this.applyStatus(data);
      } catch (e) {
        this.$message.error(this.errMsg(e));
      } finally {
        this.loading = false;
      }
    },
    validate(ref) {
      return new Promise((resolve) => {
        this.$refs[ref].validate((ok) => resolve(ok));
      });
    },
    skip() {
      this.step = Math.min(3, this.step + 1);
    },
    async next() {
      try {
        this.saving = true;
        if (this.step === 0) {
          if (!this.status.vdn) throw new Error('当前 VDN 无效');
          if (this.status.prerequisites && this.status.prerequisites.length) throw new Error('请先完成上方列出的基础配置');
        } else if (this.step === 1) {
          if (!(await this.validate('agentForm'))) return;
          this.createdAgent = await this.api('post', '/first-agent', {
            workNo: this.agent.workNo,
            name: this.agent.name,
            password: this.agent.password,
            email: this.agent.email,
          });
          this.agent.password = '';
          if (this.createdAgent.sync_pending) this.$message.warning('坐席已保存，Omni 同步待完成');
          else this.$message.success(this.$t('smcicc.onboard.step2.ok', { ext: this.createdAgent.extension }));
        } else if (this.step === 2) {
          if (!(await this.validate('hotlineForm'))) return;
          await this.api('post', '/hotline', {
            vdnName: this.hotline.vdnName,
            accessCode: this.hotline.accessCode,
            startRecord: this.hotline.startRecord ? 1 : 0,
          });
          this.$message.success(this.$t('smcicc.onboard.step3.ok'));
        }
        this.step += 1;
      } catch (e) {
        this.$message.error(this.errMsg(e));
      } finally {
        this.saving = false;
      }
    },
    async finish() {
      this.saving = true;
      try {
        const result = await this.api('post', '/complete', {});
        this.finished = true;
        this.status.completed = true;
        this.status.completedAt = result.completedAt;
        this.$message.success(this.$t('smcicc.onboard.step4.ok'));
      } catch (e) {
        this.$message.error(this.errMsg(e));
      } finally {
        this.saving = false;
      }
    },
  },
};
</script>

<style scoped>
.onboard-page {
  max-width: 880px;
  padding: 8px 0 32px;
}
.onboard-hero {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.eyebrow {
  margin: 0 0 6px;
  color: #457ff5;
  font-size: 12px;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}
h1 {
  margin: 0 0 8px;
  color: #1f2d3d;
  font-size: 24px;
  font-weight: 600;
}
.lead,
.desc,
.hint {
  color: #606266;
  line-height: 1.6;
}
.lead { margin: 0; }
.desc { margin: 0 0 16px; }
.hint { margin-left: 10px; font-size: 12px; }
.onboard-steps { margin: 20px 0 24px; }
.onboard-card {
  background: #fff;
  border: 1px solid #e4e7ed;
  border-radius: 10px;
  padding: 24px 28px 16px;
  box-shadow: 0 8px 24px rgba(31, 45, 61, 0.04);
}
.onboard-card h2 {
  margin: 0 0 8px;
  font-size: 18px;
  color: #303133;
}
.form { max-width: 460px; }
.auto-list,
.check-list {
  margin: 8px 0 0;
  padding-left: 20px;
  color: #565b66;
  line-height: 1.8;
}
.actions {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  margin-top: 24px;
  padding-top: 16px;
  border-top: 1px solid #ebeef5;
}
.mb { margin-bottom: 16px; }
</style>
