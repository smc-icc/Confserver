<template>
  <div class="smcicc-page voice-driver-page">
    <div class="driver-head">
      <h2>{{ $t('smcicc.menu.item.voice-driver') }}</h2>
      <el-button type="primary" size="small" :loading="saving" @click="save">保存</el-button>
    </div>
    <el-form label-width="100px" size="small" class="driver-mode-form">
      <el-form-item label="驱动模式">
        <el-select v-model="mode" :disabled="saving" class="driver-mode-select" aria-label="驱动模式">
          <el-option label="FreeSWITCH" value="freeswitch" />
          <el-option label="ehang" value="ehang" />
        </el-select>
      </el-form-item>
    </el-form>
    <p v-if="showDiagnostics" class="hint">
      这里决定配置台显示哪一套话务参数，并在能读到 <code>tas_config.xml</code> 时写入 ESL 和 SIP 网关。
      TAS 进程实际加载哪个驱动，仍以 TARS 服务配置里的 DriverPath 为准。改完 XML 后需要重启 TAS。
    </p>
    <el-alert v-if="showDiagnostics && loadErr" :title="loadErr" type="error" show-icon :closable="false" class="mb" />
    <el-alert v-if="err" :title="err" type="error" show-icon :closable="false" class="mb" />

    <template v-if="mode === 'freeswitch'">
      <el-alert
        v-if="showDiagnostics && !xmlAvailable"
        title="当前 ConfServer 读不到 tas_config.xml。设置环境变量 TAS_CONFIG_XML 指向 TAS 节点上的文件后，下面的 ESL 和 SIP 网关才会写入。"
        type="warning"
        show-icon
        :closable="false"
        class="mb"
      />
      <p v-if="showDiagnostics && xmlAvailable" class="hint">正在编辑 {{ xmlPath }}<span v-if="moduleType">，Module Type={{ moduleType }}</span></p>
      <el-tabs key="freeswitch" v-model="fsSection">
        <el-tab-pane label="ESL" name="esl">
          <el-form label-width="180px" size="small" class="driver-form">
            <el-form-item label="FreeSWITCH 地址"><el-input v-model="esl.ip" /></el-form-item>
            <el-form-item label="ESL 端口"><el-input v-model="esl.port" /></el-form-item>
            <el-form-item label="ESL 密码"><el-input v-model="esl.password" show-password /></el-form-item>
            <el-form-item label="超时（毫秒）"><el-input v-model="esl.timeout" /></el-form-item>
            <el-form-item label="分机状态检查周期"><el-input v-model="esl.checkExtStatusPeriod" /></el-form-item>
            <el-form-item label="ReportSocketHost">
              <el-input v-model="esl.reportSocketHost" />
              <p class="hint">TAS 连上 ESL 后写入 FS 变量 tas_esl_host，拨号计划用 ${tas_esl_host}:8040。</p>
            </el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="SIP 网关" name="sip">
          <el-form label-width="180px" size="small" class="driver-form">
            <h3>呼出</h3>
            <el-form-item label="网关地址"><el-input v-model="sipOutbound.ip" /></el-form-item>
            <el-form-item label="端口"><el-input v-model="sipOutbound.port" /></el-form-item>
            <el-form-item label="用户名"><el-input v-model="sipOutbound.userName" /></el-form-item>
            <el-form-item label="密码"><el-input v-model="sipOutbound.password" show-password /></el-form-item>
            <el-form-item label="出局前缀"><el-input v-model="sipOutbound.prefix" /></el-form-item>
            <el-form-item label="语音编码"><el-input v-model="sipOutbound.voiceCodes" /></el-form-item>
            <el-form-item label="DTMF"><el-input v-model="sipOutbound.dtmfType" /></el-form-item>
            <h3>呼入</h3>
            <el-form-item label="来源地址"><el-input v-model="sipInbound.fromAddr" /></el-form-item>
            <el-form-item label="端口"><el-input v-model="sipInbound.port" /></el-form-item>
            <el-form-item label="语音编码"><el-input v-model="sipInbound.voiceCodes" /></el-form-item>
            <el-form-item label="DTMF"><el-input v-model="sipInbound.dtmfType" /></el-form-item>
          </el-form>
        </el-tab-pane>
        <el-tab-pane label="xml_curl" name="curl">
          <el-form label-width="180px" size="small" class="driver-form">
            <el-form-item label="ConfServer 地址">
              <el-input :value="xmlCurl.endpoint" readonly />
            </el-form-item>
            <el-form-item label="下发内容">
              <el-input :value="(xmlCurl.sections || []).join(' | ')" readonly />
            </el-form-item>
          </el-form>
          <p class="hint">
            FreeSWITCH 的 mod_xml_curl 把 gateway-url 指到这个地址。directory 下发分机，dialplan 按「接入号码」转到 TAS，configuration 下发 ACL。
            接入号码在话务配置的「接入号码」里维护，不在这份 XML 里。
          </p>
        </el-tab-pane>
      </el-tabs>
    </template>

    <template v-else>
      <el-tabs key="ehang" v-model="ehangSection">
        <el-tab-pane lazy label="MC" name="mc"><mc-manager /></el-tab-pane>
        <el-tab-pane lazy label="PRD" name="prd"><prd-manager /></el-tab-pane>
        <el-tab-pane lazy label="ISX" name="isx"><isx-manager /></el-tab-pane>
        <el-tab-pane lazy label="通道组" name="channel-group"><channel-group-manager /></el-tab-pane>
        <el-tab-pane lazy label="通道" name="channel"><channel-config-manager /></el-tab-pane>
        <el-tab-pane lazy label="SIP 注册分机" name="sip"><sip-ext-num-manager /></el-tab-pane>
      </el-tabs>
    </template>
  </div>
</template>

<script>
import McManager from './McManager.vue';
import PrdManager from './PrdManager.vue';
import IsxManager from './IsxManager.vue';
import ChannelGroupManager from './ChannelGroupManager.vue';
import ChannelConfigManager from './ChannelConfigManager.vue';
import SipExtNumManager from './SipExtNumManager.vue';

const EHANG_SECTIONS = ['mc', 'prd', 'isx', 'channel-group', 'channel', 'sip'];

export default {
  name: 'SMCIccVoiceDriver',
  components: {
    McManager,
    PrdManager,
    IsxManager,
    ChannelGroupManager,
    ChannelConfigManager,
    SipExtNumManager,
  },
  data() {
    return {
      mode: 'freeswitch',
      fsSection: 'esl',
      ehangSection: 'mc',
      xmlAvailable: false,
      xmlPath: '',
      moduleType: '',
      esl: {},
      sipOutbound: {},
      sipInbound: {},
      xmlCurl: { endpoint: '/xml_curl', sections: [] },
      saving: false,
      // 暂时隐藏加载/XML 诊断提示；保存失败仍单独显示。
      showDiagnostics: false,
      loadErr: '',
      err: '',
    };
  },
  watch: {
    '$route.query': {
      immediate: true,
      handler(q) {
        if (q.mode === 'ehang' || q.mode === 'freeswitch') this.mode = q.mode;
        if (EHANG_SECTIONS.includes(q.section)) this.ehangSection = q.section;
        if (q.section === 'esl' || q.section === 'sip' || q.section === 'curl') this.fsSection = q.section;
      },
    },
  },
  mounted() {
    this.load();
  },
  methods: {
    load() {
      this.loadErr = '';
      this.err = '';
      return this.$ajax.getJSON('/server/api/smcicc/voice-driver').then((data) => {
        if (data.ok === false) {
          this.loadErr = '读取驱动配置失败';
          return;
        }
        if (!this.$route.query.mode) this.mode = data.mode || 'freeswitch';
        this.xmlAvailable = !!data.xmlAvailable;
        this.xmlPath = data.xmlPath || '';
        this.moduleType = data.moduleType || '';
        this.esl = { ...(data.esl || {}) };
        this.sipOutbound = { ...(data.sipOutbound || {}) };
        this.sipInbound = { ...(data.sipInbound || {}) };
        this.xmlCurl = data.xmlCurl || this.xmlCurl;
      }).catch(() => {
        this.loadErr = '读取驱动配置失败';
      });
    },
    save() {
      this.saving = true;
      this.err = '';
      const body = { mode: this.mode };
      if (this.mode === 'freeswitch') {
        body.esl = this.esl;
        body.sipOutbound = this.sipOutbound;
        body.sipInbound = this.sipInbound;
      }
      return this.$ajax.postJSON('/server/api/smcicc/voice-driver', body).then((data) => {
        if (data.ok === false) {
          this.err = '保存失败';
          return;
        }
        this.xmlAvailable = !!data.xmlAvailable;
        this.xmlPath = data.xmlPath || '';
        this.$message.success(this.mode === 'freeswitch' && data.xmlWritten ? '已写入 tas_config.xml，重启 TAS 后生效' : '已保存');
      }).catch(() => {
        this.err = '保存失败';
      }).finally(() => {
        this.saving = false;
      });
    },
  },
};
</script>

<style scoped>
.driver-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  width: 100%;
  margin-bottom: 20px;
}
.driver-head h2 {
  margin: 0;
  font-size: 18px;
}
.driver-mode-select { width: 240px; max-width: 100%; }
.hint {
  margin: 0 0 12px;
  color: #909399;
  font-size: 13px;
  line-height: 1.5;
}
.mb { margin-bottom: 12px; }
.driver-form { max-width: 720px; padding-top: 12px; }
.driver-form h3 { margin: 8px 0 12px; font-size: 14px; }
</style>
