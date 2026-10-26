<template>
  <div class="community-modules">
    <div class="page-heading">
      <div>
        <h2>版本与功能组件</h2>
        <p>管理当前版本、授权额度和已安装的功能组件。</p>
      </div>
      <el-button size="small" :loading="busy" @click="load">刷新</el-button>
    </div>
    <el-alert
      v-if="error"
      :title="error"
      type="error"
      :closable="false"
      show-icon
    />
    <el-card
      :body-style="{ padding: '20px' }"
      shadow="never"
      class="current-version"
    >
      <div class="version-heading">
        <strong>{{ editionName }}</strong
        ><el-tag size="small" type="info">当前版本</el-tag>
      </div>
      <p v-if="state.license">
        授权有效期至 {{ state.license.expiresAt }} · 配置修订
        {{ state.revision }}
      </p>
      <p v-else>全媒体功能可用。ICC 话务功能需升级专业版或企业版。</p>
      <div class="quotas">
        <span
          >语音并发 <b>{{ quota('concurrentCalls') }}</b> 路</span
        >
        <span
          >视频并发 <b>{{ quota('videoConcurrentCalls') }}</b> 路</span
        >
        <span
          >坐席并发 <b>{{ quota('voiceSeats') }}</b> 路</span
        >
      </div>
    </el-card>
    <el-alert
      v-if="!state.canManage"
      title="仅系统管理员可以升级版本和管理功能组件"
      type="info"
      :closable="false"
    />
    <template v-else>
      <div class="upgrade-options">
        <el-card :body-style="{ padding: '20px' }" shadow="never">
          <h3>专业版</h3>
          <p>全媒体与 ICC 基础话务</p>
          <ul>
            <li>2 路语音并发、2 路视频并发</li>
            <li>2 路坐席并发</li>
            <li>支持标准 IVR、ITR 流程运行</li>
            <li>不含 IVR、ITR 流程设计器</li>
          </ul>
          <el-button
            type="primary"
            :disabled="upgradeBlocked || state.edition === 'enterprise'"
            @click="$refs.professional.click()"
            >升级专业版本</el-button
          >
          <input
            ref="professional"
            type="file"
            accept=".json,.smcu"
            aria-label="专业版升级包"
            @change="upgrade($event, 'professional')"
          />
        </el-card>
        <el-card :body-style="{ padding: '20px' }" shadow="never">
          <h3>企业版</h3>
          <p>完整 ICC 功能与流程设计工具</p>
          <ul>
            <li>语音、视频和坐席并发由授权文件指定</li>
            <li>包含 IVR、ITR 流程设计器</li>
            <li>包含外呼、质检等全部功能</li>
            <li>保留已有客户、会话和流程数据</li>
          </ul>
          <el-button
            type="primary"
            :disabled="upgradeBlocked"
            @click="$refs.enterprise.click()"
            >升级为企业版本</el-button
          >
          <input
            ref="enterprise"
            type="file"
            accept=".json,.smcu"
            aria-label="企业版升级包"
            @change="upgrade($event, 'enterprise')"
          />
        </el-card>
      </div>
      <p class="hint">
        选择供应商提供的对应版本升级包，系统会校验授权并安装所需组件。升级中断后可继续原任务；首次启用
        ICC 后需受控重启 Omni 后端。
      </p>
      <el-card
        v-if="job"
        class="job"
        :body-style="{ padding: '20px' }"
        shadow="never"
      >
        <strong>{{ phaseName }}</strong>
        <p>组件进度：{{ job.index }} / {{ job.total }}</p>
        <p v-if="job.component">
          当前组件：{{ moduleName(job.component.module) }} ·
          {{ componentPhaseName }}
        </p>
        <p v-if="job.error" class="job-error">{{ job.error }}</p>
        <p v-if="job.phase === 'failed'" class="hint">
          已完成的安装步骤和已有业务数据会保留；排除故障后继续升级。
        </p>
        <el-button
          v-if="needsRetry"
          size="small"
          :loading="busy"
          @click="poll(true)"
          >继续升级</el-button
        >
      </el-card>
      <h3 class="modules-title">功能组件</h3>
      <p class="hint">
        这里显示功能安装与启用状态。停用功能不会删除数据，也不会自动停止 TARS
        进程；进程状态请在服务管理中查看。
      </p>
      <el-table :data="rows">
        <el-table-column prop="name" label="模块" min-width="160" />
        <el-table-column label="安装状态"
          ><template slot-scope="s">{{
            s.row.installed ? '已安装' : '未安装'
          }}</template></el-table-column
        >
        <el-table-column label="授权状态"
          ><template slot-scope="s">{{
            s.row.licensed ? '已授权' : '未授权'
          }}</template></el-table-column
        >
        <el-table-column prop="version" label="组件版本" />
        <el-table-column label="启用"
          ><template slot-scope="s"
            ><el-switch
              :value="s.row.enabled"
              :disabled="
                upgradeBlocked ||
                s.row.id === 'omni' ||
                (!s.row.enabled && (!s.row.installed || !s.row.licensed))
              "
              @change="toggle(s.row, $event)" /></template
        ></el-table-column>
      </el-table>
    </template>
  </div>
</template>
<script>
import { productModules, refreshModules } from '@/community/modules';
import { communityRequest } from '@/community/api.mjs';
const phases = {
  prepared: '等待升级',
  installing: '正在安装组件',
  installing_designer: '正在安装流程设计工具',
  complete: '升级完成',
  failed: '升级未完成',
  patch_tars: '正在发布',
  start_tars: '正在启动',
  verifying: '正在检查服务状态',
  submission_unknown: '需要确认发布结果',
  task_query_unknown: '暂时无法查询服务任务',
  deploying: '正在准备服务',
};
export default {
  data() {
    return {
      state: productModules,
      busy: false,
      error: '',
      job: null,
      timer: null,
      disposed: false,
    };
  },
  computed: {
    rows() {
      return Object.values(this.state.modules || {});
    },
    editionName() {
      return (
        {
          community: '开源版',
          registered: '专业版（原注册版）',
          professional: '专业版',
          enterprise: '企业版',
        }[this.state.edition] || '版本待确认'
      );
    },
    upgradeBlocked() {
      return (
        this.busy ||
        !this.state.loaded ||
        !!(this.job && this.job.phase !== 'complete')
      );
    },
    phaseName() {
      return this.job && (phases[this.job.phase] || '升级处理中');
    },
    componentPhaseName() {
      return (
        this.job &&
        this.job.component &&
        (phases[this.job.component.phase] || '安装处理中')
      );
    },
    needsRetry() {
      return (
        this.job &&
        (this.job.phase === 'failed' ||
          ['submission_unknown', 'task_query_unknown'].includes(
            this.job.component && this.job.component.phase,
          ) ||
          !!this.error)
      );
    },
  },
  mounted() {
    this.load();
  },
  beforeDestroy() {
    this.disposed = true;
    clearTimeout(this.timer);
  },
  methods: {
    quota(key) {
      if (!this.state.loaded) return '待确认';
      const n = this.state.limits[key];
      return Number.isSafeInteger(n) ? n : '未配置';
    },
    moduleName(id) {
      return (this.state.modules[id] || {}).name || id;
    },
    async refresh() {
      await refreshModules();
    },
    async load() {
      if (this.busy) return;
      this.busy = true;
      this.error = '';
      clearTimeout(this.timer);
      try {
        await this.refresh();
        if (this.state.canManage) {
          const data = await communityRequest('upgrade/current');
          this.job = data.job;
          this.schedule();
        }
      } catch (e) {
        this.error = e.err_msg || e.message || '无法读取版本状态';
      } finally {
        this.busy = false;
      }
    },
    send(path, data) {
      return communityRequest(path, { method: 'POST', data });
    },
    async upgrade(event, edition) {
      const file = event.target.files[0];
      if (!file) return;
      this.error = '';
      if (file.size > 67 * 1024 * 1024) {
        this.error = '升级包超过大小限制';
        event.target.value = '';
        return;
      }
      this.busy = true;
      try {
        const bundle = JSON.parse(await file.text());
        this.job = await this.send('upgrade', {
          bundle,
          edition,
          expectedRevision: this.state.revision,
        });
        await this.refresh();
        this.schedule();
      } catch (e) {
        this.error =
          e.err_msg || e.message || '升级包提交失败，请刷新查看任务状态';
      } finally {
        this.busy = false;
        event.target.value = '';
      }
    },
    async toggle(row, enabled) {
      this.busy = true;
      this.error = '';
      try {
        await this.send('modules/enable', {
          module: row.id,
          enabled,
          expectedRevision: this.state.revision,
        });
        await this.refresh();
      } catch (e) {
        this.error = e.err_msg || e.message || '操作失败';
      } finally {
        this.busy = false;
      }
    },
    schedule() {
      clearTimeout(this.timer);
      if (
        !this.disposed &&
        this.job &&
        this.job.phase !== 'complete' &&
        !this.needsRetry
      )
        this.timer = setTimeout(() => this.poll(false), 2000);
    },
    async poll(retry) {
      if (!this.job || this.disposed) return;
      this.busy = true;
      this.error = '';
      try {
        this.job = await this.send('upgrade/job', {
          id: this.job.id,
          retry,
          expectedRevision: this.state.revision,
        });
        await this.refresh();
        this.schedule();
      } catch (e) {
        this.error =
          e.err_msg || e.message || '无法继续升级，请刷新查看任务状态';
      } finally {
        this.busy = false;
      }
    },
  },
};
</script>
<style scoped>
.community-modules {
  padding: 24px;
  max-width: 1200px;
}
.page-heading,
.version-heading {
  display: flex;
  align-items: center;
  gap: 12px;
}
.page-heading {
  justify-content: space-between;
  margin-bottom: 20px;
}
h2,
h3,
p {
  margin-top: 0;
}
h2 {
  font-size: 22px;
  margin-bottom: 8px;
}
p,
.hint {
  color: #606266;
  line-height: 1.7;
}
.current-version {
  margin: 16px 0 20px;
}
.version-heading {
  margin-bottom: 12px;
  font-size: 18px;
}
.quotas {
  display: flex;
  flex-wrap: wrap;
  gap: 16px 36px;
}
.quotas b {
  color: #303133;
  font-size: 22px;
  margin-left: 8px;
}
.upgrade-options {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20px;
}
.upgrade-options h3 {
  margin-bottom: 8px;
  font-size: 18px;
}
.upgrade-options ul {
  padding-left: 20px;
  line-height: 2;
  color: #606266;
  margin: 16px 0 24px;
}
.upgrade-options input {
  display: none;
}
.hint {
  font-size: 13px;
  margin: 16px 0;
}
.job {
  margin: 20px 0;
  overflow-wrap: anywhere;
}
.job p {
  margin: 10px 0;
}
.job-error {
  color: #b42318;
}
.modules-title {
  margin: 28px 0 8px;
}
@media (max-width: 900px) {
  .upgrade-options {
    grid-template-columns: 1fr;
  }
  .community-modules {
    padding: 16px;
  }
}
</style>
