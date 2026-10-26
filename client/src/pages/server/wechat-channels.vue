<template>
  <channel-workspace-shell
    class="wx-ch"
    :list-title="`${channelLabel}列表`"
    :config-title="configTitle"
  >
    <template slot="list-actions">
      <el-button type="primary" icon="el-icon-plus" title="新增" aria-label="新增" @click="startCreate" />
      <el-button type="primary" icon="el-icon-refresh" title="刷新" aria-label="刷新" :loading="loading" @click="fetchList()" />
      <el-button type="danger" icon="el-icon-delete" title="删除" aria-label="删除" :disabled="!activeRow" @click="removeChannel(activeRow)" />
    </template>

    <template slot="list">
      <button
        v-for="row in currentRows"
        :key="row.conf_id"
        type="button"
        class="wx-list-item"
        :class="{ active: String(row.conf_id) === activeId }"
        @click="selectChannel(row)"
      >
        <i class="el-icon-chat-dot-round" aria-hidden="true" />
        <span>{{ row.name || channelLabel }}</span>
      </button>
      <div v-if="!loading && !currentRows.length" class="wx-empty">暂无渠道</div>
    </template>

    <template slot="config-actions">
      <el-button
        type="primary"
        icon="el-icon-check"
        title="保存"
        aria-label="保存"
        :loading="saving"
        @click="saveCurrent"
      />
    </template>

    <div v-loading="loading" class="wx-editor">
      <div class="wx-guidance">
        <p>{{ channelHint }}</p>
        <p>公网根地址：<code>{{ publicBaseUrl || '—' }}</code></p>
      </div>

      <el-form label-width="150px" size="small" class="wx-config-form">
        <el-form-item v-if="tenancyEnabled" label="归属 VDN">
          <el-input-number v-model="currentModel.vdn_id" :min="1" :disabled="mode === 'edit' || !!channelVdnId" />
          <span>创建时指定；禁止通过编辑跨租户搬迁</span>
        </el-form-item>
        <div class="wx-field-grid">
        <template v-for="f in currentFields">
          <el-form-item v-if="f.type === 'routes'" :key="f.key + '-routes'" :label="f.label" class="wx-field-full">
            <div style="width:100%">
              <el-table :data="currentModel[f.key] || []" size="mini" border style="margin-bottom:6px">
                <el-table-column label="顺位" width="58">
                  <template slot-scope="s">
                    <el-input-number v-model="s.row.priority" :min="0" :max="99" size="mini" controls-position="right" style="width:52px" />
                  </template>
                </el-table-column>
                <el-table-column label="触发点" width="140">
                  <template slot-scope="s">
                    <el-select v-model="s.row.trigger" size="mini" filterable allow-create style="width:100%">
                      <el-option v-for="t in routeTriggers" :key="t.value" :label="t.label" :value="t.value" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="应用类型" width="88">
                  <template slot-scope="s">
                    <el-select v-model="s.row.app_type" size="mini" style="width:100%">
                      <el-option v-for="a in appTypes" :key="a.value" :label="a.label" :value="a.value" />
                    </el-select>
                  </template>
                </el-table-column>
                <el-table-column label="参数" min-width="110">
                  <template slot-scope="s">
                    <el-input-number v-if="s.row.app_type === 'itr'" v-model="s.row.flow_id" :min="0" size="mini" controls-position="right" style="width:100%" />
                    <el-input-number v-else-if="s.row.app_type === 'agent'" v-model="s.row.agent_id" :min="0" size="mini" controls-position="right" style="width:100%" />
                    <el-input-number v-else-if="s.row.app_type === 'robot'" v-model="s.row.robot_id" :min="0" size="mini" controls-position="right" style="width:100%" />
                    <el-input-number v-else-if="s.row.app_type === 'acd'" v-model="s.row.agent_group_id" :min="-1" size="mini" controls-position="right" style="width:100%" />
                    <span v-else style="color:#c0c4cc;font-size:12px">—</span>
                  </template>
                </el-table-column>
                <el-table-column label="启用" width="54">
                  <template slot-scope="s"><el-switch v-model="s.row.enabled" /></template>
                </el-table-column>
                <el-table-column width="42">
                  <template slot-scope="s">
                    <el-button type="text" style="color:#f56c6c" @click="removeRouteRow(f.key, s.$index)">删</el-button>
                  </template>
                </el-table-column>
              </el-table>
              <el-button size="mini" @click="addRouteRow(f.key)">+ 添加路由</el-button>
              <div style="color:#909399;font-size:12px;line-height:1.5">{{ f.hint }}</div>
            </div>
          </el-form-item>
          <el-form-item v-else :key="f.key" :label="f.label">
            <div style="width:100%">
              <el-switch v-if="f.type === 'switch'" v-model="currentModel[f.key]" />
              <el-input-number v-else-if="f.type === 'number'" v-model="currentModel[f.key]" :min="f.min" :max="f.max" style="width:100%" />
              <el-select v-else-if="f.type === 'select'" v-model="currentModel[f.key]" style="width:100%">
                <el-option v-for="o in f.options" :key="o.value" :label="o.label" :value="o.value" />
              </el-select>
              <el-input
                v-else
                v-model="currentModel[f.key]"
                :type="f.secret ? 'password' : 'text'"
                :placeholder="f.secret && mode === 'edit' ? '留空则不修改' : f.placeholder"
              />
              <div v-if="f.hint" style="color:#909399;font-size:12px;line-height:1.5">{{ f.hint }}</div>
            </div>
          </el-form-item>
        </template>
        </div>
      </el-form>

      <section v-if="activeRow" class="wx-access-section">
        <h3>接入信息</h3>
        <el-form label-width="150px" size="small">
          <el-form-item v-if="activeRow.webhook_url" label="Webhook URL">
            <el-input :value="activeRow.webhook_url" readonly>
              <el-button slot="append" icon="el-icon-document-copy" title="复制" @click="copy(activeRow.webhook_url, 'Webhook')" />
            </el-input>
          </el-form-item>
          <el-form-item v-if="channelType === 'wechat_mp'" label="服务器出口 IP">
            <el-input :value="outboundIp" readonly>
              <el-button slot="append" icon="el-icon-document-copy" title="复制" @click="copy(outboundIp, 'IP')" />
            </el-input>
          </el-form-item>
        </el-form>
      </section>

      <p v-if="channelType === 'wecom_contact'" class="wx-note">
        客户联系出站通过群发任务发送，成员需在企微客户端确认。
      </p>
    </div>
  </channel-workspace-shell>
</template>

<script>
import ChannelWorkspaceShell from '@/pages/smcicc/channel/ChannelWorkspaceShell.vue'
import {
  ROUTE_APP_TYPE_OPTIONS,
  ROUTE_TRIGGER_OPTIONS,
  ROUTES_FIELD,
  cloneRoutes,
  emptyRouteRow,
} from '@/config/channel-routes'
const mpFields = [
  { key: 'name', label: '渠道名称', required: true },
  { key: 'inbox_name', label: '收件箱名称', placeholder: '默认同渠道名称' },
  { key: 'account_type', label: '账号类型', type: 'select', options: [
    { value: 'service', label: '服务号' },
    { value: 'subscribe', label: '订阅号' },
    { value: 'miniprogram', label: '小程序客服消息' },
  ]},
  // 渠道能力：未认证公众号（含个人订阅号、未认证企业订阅号）没有客服消息权限，
  // 主动推送必然失败。关掉「客服消息权限」并打开「启用被动回复」后，坐席/机器人的
  // 回复改为在客户下次发言的 5 秒内被动带回；认证通过后把开关打回去即可恢复主动推送。
  { key: 'supports_active_reply', label: '客服消息权限', type: 'switch',
    hint: '认证服务号/认证订阅号保持开启；未认证的（含个人订阅号）关闭' },
  { key: 'passive_reply_enabled', label: '启用被动回复', type: 'switch',
    hint: '关闭「客服消息权限」时必须开启，否则回复无处可送' },
  { key: 'route_ttl_seconds', label: '菜单路由 TTL(秒)', type: 'number', min: 30, max: 86400,
    hint: '被动模式下记住顾客菜单选择的时间，默认 300' },
  { key: 'pending_reply_max', label: '积压队列上限', type: 'number', min: 1, max: 200,
    hint: '客户未发言时最多暂存多少条待回复，超出丢弃最旧的' },
  // 坐席回复超时（两种渠道形态都适用，只是挂的流程不同）：
  // 客户发言后坐席在窗口内没回出内容，就把会话收回给 ITR 走超时流程。
  { key: 'reply_timeout_seconds', label: '坐席回复超时(秒)', type: 'number', min: 0, max: 300,
    hint: '0=不启用；微信订阅号建议 5（受微信 5 秒硬限约束）' },
  { key: 'reply_timeout_flow_id', label: '超时流程 ID', type: 'number', min: 0, max: 999999,
    hint: '超时后启动的 ITR 流程 id（0=不处理）' },
  { key: 'reply_timeout_level2_seconds', label: '二级超时(秒)', type: 'number', min: 0, max: 3600,
    hint: '再等这么久坐席仍未回，提示升级为「留言/按 9 转留言」；0=不启用。仅主动推送形态有效' },
  { key: 'pending_ttl_seconds', label: '积压存活(秒)', type: 'number', min: 0, max: 86400,
    hint: '坐席回复在积压队列里最多留多久（超期视为陈旧丢弃）；0=不过期' },
  // 闲置回收：客户最后发言后超过这么久没有新消息，就把会话从流程里放出来
  // （清坐席归属与流程状态），下一条消息重新走菜单/路由。
  // 不配的话，机器人会把会话停在菜单上等输入，客户不发 1/4 就永远出不来。
  { key: 'idle_recycle_seconds', label: '闲置回收(秒)', type: 'number', min: 0, max: 86400,
    hint: '客户最后发言后超过它无新消息则回收会话（下次重新开始）；默认 300，0=不回收' },
  // 路由配置：整组下发给 Omni，落在 channel_route 表里。
  // 同一触发点配多条时按「顺位」升序依次尝试，失败自动降到下一条。
  ROUTES_FIELD,
  { key: 'app_id', label: 'AppID', required: true },
  { key: 'app_secret', label: 'AppSecret', required: true, secret: true },
  { key: 'token', label: 'Token', required: true },
  { key: 'encoding_aes_key', label: 'EncodingAESKey', placeholder: '明文模式可留空' },
]

const routeTriggers = ROUTE_TRIGGER_OPTIONS
const appTypes = ROUTE_APP_TYPE_OPTIONS

const kfFields = [
  { key: 'name', label: '渠道名称', required: true },
  { key: 'corp_id', label: 'CorpID', required: true },
  { key: 'secret', label: 'Secret', required: true, secret: true },
  { key: 'token', label: 'Token', required: true },
  // 微信客服必须有 OpenKfId 才能收发消息（之前标成"可选"会让人以为可以不填）。
  { key: 'open_kfid', label: 'OpenKfId', required: true, placeholder: '形如 wkxxxx（微信客服 → 客服账号）' },
  { key: 'encoding_aes_key', label: 'EncodingAESKey', placeholder: '43 位，回调验证用' },
  // 路由：让这个渠道走自己的流程（例如 on_inbound → itr/1002），
  // 欢迎语和菜单与其它渠道互不影响。
  ROUTES_FIELD,
]

const contactFields = [
  { key: 'name', label: '渠道名称', required: true },
  { key: 'corp_id', label: 'CorpID', required: true },
  { key: 'contact_secret', label: '客户联系 Secret', required: true, secret: true },
  { key: 'token', label: 'Token', required: true },
  { key: 'agent_id', label: '接待成员 ID', placeholder: '可选数字' },
  { key: 'encoding_aes_key', label: 'EncodingAESKey' },
  ROUTES_FIELD,
]

/**
 * 服务器「出站」公网 IP —— 微信 IP 白名单要加的就是它。
 *
 * 注意别和域名解析的「入站」IP 搞混：微信发消息给我们走入站 IP（不需要白名单），
 * 而我们调微信 API 发客服消息时，微信看到的是这个出站 IP（必须在白名单里，否则 40164）。
 * 出口 IP 若发生变化，改这里即可。
 */
const OUTBOUND_IP = '120.85.107.221'

const CHANNEL_HINTS = {
  wechat_mp: '配置公众号或小程序客服消息 AppID、Token 等凭证，保存后同步到 OmniAgent 并生成 Webhook 地址。小程序请选账号类型「小程序客服消息」。',
  wecom_kf: '配置企业微信客服回调凭证，保存后同步到 OmniAgent 并生成 Webhook 地址。',
  wecom_contact: '配置企业微信客户联系回调凭证，保存后同步到 OmniAgent 并生成 Webhook 地址。',
}

const CHANNEL_LABELS = {
  wechat_mp: '公众号',
  wecom_kf: '微信客服',
  wecom_contact: '客户联系',
}

const ChannelForm = {
  props: ['fields', 'form', 'saving'],
  template: `
    <el-card shadow="never" style="margin-bottom:12px">
      <el-form label-width="130px" size="small">
        <el-form-item v-for="f in fields" :key="f.key" :label="f.label" :required="f.required">
          <div style="width:100%">
            <el-switch v-if="f.type === 'switch'" v-model="form[f.key]" />
            <el-input-number v-else-if="f.type === 'number'" v-model="form[f.key]" :min="f.min" :max="f.max" style="width:100%" />
            <el-select v-else-if="f.type === 'select'" v-model="form[f.key]" style="width:100%">
              <el-option v-for="o in f.options" :key="o.value" :label="o.label" :value="o.value" />
            </el-select>
            <el-input v-else v-model="form[f.key]" :type="f.secret ? 'password' : 'text'" :placeholder="f.placeholder" />
            <div v-if="f.hint" style="color:#909399;font-size:12px;line-height:1.5">{{ f.hint }}</div>
          </div>
        </el-form-item>
        <el-form-item>
          <el-button type="primary" :loading="saving" @click="$emit('submit')"></el-button>
        </el-form-item>
      </el-form>
    </el-card>
  `,
}

const ChannelTable = {
  props: ['rows', 'channelType', 'publicBaseUrl'],
  data() {
    return { infoVisible: false, infoRow: null, aesKey: '', savingKey: false }
  },
  computed: {
    isWechatMp() {
      return this.channelType === 'wechat_mp'
    },
    isWecomKf() {
      return this.channelType === 'wecom_kf'
    },
    infoTitle() {
      return `接入信息 - ${this.infoRow?.name || ''}`
    },
    hasAesKey() {
      return !!String(this.aesKey || '').trim()
    },
    outboundIp() {
      return OUTBOUND_IP
    },
    // 路由编辑器的下拉项（模块级常量，模板通过 computed 取）
    routeTriggers() {
      return routeTriggers
    },
    appTypes() {
      return appTypes
    },
    /** 生成好的接入配置文本，方便一次性贴给对接人 */
    configText() {
      const r = this.infoRow || {}
      const lines = [
        `【${r.name || ''}】接入配置`,
        '',
        `Webhook URL      : ${r.webhook_url || ''}`,
        `Token            : ${r.token || ''}`,
        `EncodingAESKey   : ${this.aesKey || '（未设置 = 明文模式）'}`,
        '',
        '建议（微信后台）：',
        '  消息加密  = 安全模式',
        '  数据格式  = XML',
        '',
        `服务器出口 IP 白名单 : ${OUTBOUND_IP}`,
      ]
      return lines.join('\n')
    },
  },
  methods: {
    // 路由编辑：新增一行默认给出常用配置（超时未回复 → ITR 流程），减少手填。
    addRouteRow(key) {
      if (!Array.isArray(this.editRow[key])) this.$set(this.editRow, key, [])
      this.editRow[key].push({
        trigger: 'on_agent_no_reply',
        priority: this.editRow[key].length,
        app_type: 'itr',
        flow_id: 0,
        agent_id: 0,
        robot_id: 0,
        agent_group_id: -1,
        skill_id: -1,
        media_type: 0,
        line_priority: 0,
        timeout_seconds: 0,
        enabled: true,
      })
    },
    removeRouteRow(key, idx) {
      if (Array.isArray(this.editRow[key])) this.editRow[key].splice(idx, 1)
    },
    async copy(text, label) {
      const t = String(text || '').trim()
      if (!t) {
        this.$message.warning(`暂无${label}`)
        return
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(t)
        } else {
          const ta = document.createElement('textarea')
          ta.value = t
          ta.style.position = 'fixed'
          ta.style.left = '-9999px'
          document.body.appendChild(ta)
          ta.select()
          document.execCommand('copy')
          document.body.removeChild(ta)
        }
        this.$message.success(`${label}已复制`)
      } catch {
        this.$message.error('复制失败，请手动选择复制')
      }
    },

    copyWebhook(row) {
      return this.copy(row.webhook_url, 'Webhook')
    },

    copyConfig() {
      return this.copy(this.configText, '接入配置')
    },

    openInfo(row) {
      this.infoRow = row
      this.aesKey = row.encoding_aes_key || ''
      this.infoVisible = true
    },

    /** 生成 43 位 EncodingAESKey（微信要求：32 字节 base64 去掉 =，且只用字母数字更安全） */
    genAesKey() {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
      const buf = new Uint8Array(43)
      if (window.crypto && window.crypto.getRandomValues) {
        window.crypto.getRandomValues(buf)
      } else {
        for (let i = 0; i < 43; i++) buf[i] = Math.floor(Math.random() * 256)
      }
      let key = ''
      for (let i = 0; i < 43; i++) key += chars[buf[i] % chars.length]
      this.aesKey = key
      this.$message.info('已生成新的 EncodingAESKey，点「保存到系统」后生效')
    },

    /** 把生成/修改后的 AESKey 写回渠道（安全模式要求两边一致，必须先保存再去微信后台点确定） */
    async saveAesKey() {
      if (!this.infoRow) return
      this.savingKey = true
      try {
        await this.$axios.post(
          `/api/integrations/wechat-channels/${this.channelType}/${this.infoRow.conf_id}/update`,
          { encoding_aes_key: this.aesKey },
        )
        this.$message.success('已保存到系统，现在可以去微信后台点「确定」了')
        this.$emit('refresh')
      } catch (e) {
        this.$message.error(e.response?.data?.message || '保存失败')
      } finally {
        this.savingKey = false
      }
    },
  },
  template: `
    <div>
      <el-table :data="rows" stripe border size="small" empty-text="暂无渠道">
        <el-table-column prop="name" label="名称" min-width="120" />
        <el-table-column prop="webhook_url" label="Webhook" min-width="260" show-overflow-tooltip />
        <el-table-column label="操作" width="240" fixed="right">
          <template slot-scope="{ row }">
            <el-button type="text" size="mini" @click="openInfo(row)">接入信息</el-button>
            <el-button type="text" size="mini" @click="$emit('edit', row)">编辑</el-button>
            <el-button type="text" size="mini" style="color:#f56c6c" @click="$emit('remove', row)">删除</el-button>
          </template>
        </el-table-column>
      </el-table>

      <el-dialog :title="infoTitle" :visible.sync="infoVisible" width="680px" append-to-body>
        <el-alert
          type="info"
          :closable="false"
          show-icon
          title="把下面三项填到微信后台"
          description="微信公众平台 → 设置与开发 → 基本配置 → 服务器配置（已启用）→ 修改"
          style="margin-bottom:14px"
        />

        <el-form label-width="130px" size="small">
          <el-form-item label="URL">
            <el-input :value="infoRow && infoRow.webhook_url" readonly>
              <el-button slot="append" icon="el-icon-document-copy" @click="copy(infoRow && infoRow.webhook_url, 'URL')" />
            </el-input>
          </el-form-item>

          <el-form-item label="Token">
            <el-input :value="infoRow && infoRow.token" readonly>
              <el-button slot="append" icon="el-icon-document-copy" @click="copy(infoRow && infoRow.token, 'Token')" />
            </el-input>
          </el-form-item>

          <el-form-item label="EncodingAESKey">
            <el-input v-model="aesKey" placeholder="留空 = 明文模式；安全模式必填 43 位">
              <el-button slot="append" icon="el-icon-document-copy" @click="copy(aesKey, 'EncodingAESKey')" />
            </el-input>
            <div style="margin-top:6px">
              <el-button size="mini" @click="genAesKey">随机生成</el-button>
              <el-button size="mini" type="primary" :loading="savingKey" @click="saveAesKey">保存到系统</el-button>
              <span v-if="hasAesKey" style="margin-left:8px;color:#67c23a;font-size:12px">已设置（安全模式）</span>
              <span v-else style="margin-left:8px;color:#e6a23c;font-size:12px">未设置（明文模式）</span>
            </div>
            <div style="margin-top:4px;font-size:12px;color:#909399">
              切安全模式时：先在系统里生成并「保存到系统」，再去微信后台填同一个值点确定。
            </div>
          </el-form-item>

          <el-form-item label="消息加密">
            <span style="color:#409eff;font-weight:600">安全模式</span>
            <span style="margin-left:8px;font-size:12px;color:#909399">（微信后台的选项，与上面 AESKey 必须同时设置）</span>
          </el-form-item>

          <el-form-item label="数据格式">
            <span style="color:#409eff;font-weight:600">XML</span>
            <span style="margin-left:8px;font-size:12px;color:#909399">（JSON 也支持）</span>
          </el-form-item>

          <el-form-item label="IP 白名单">
            <el-input :value="outboundIp" readonly>
              <el-button slot="append" icon="el-icon-document-copy" @click="copy(outboundIp, 'IP')" />
            </el-input>
            <div style="margin-top:4px;font-size:12px;color:#e6a23c">
              微信后台 → 基本配置 → IP 白名单，加入此「出站」IP。<br>
              不加也能收消息，但坐席主动回复会被拒（40164 invalid ip）。
            </div>
          </el-form-item>
        </el-form>

        <template slot="footer">
          <el-button type="primary" icon="el-icon-document-copy" @click="copyConfig">一键复制全部配置</el-button>
          <el-button @click="infoVisible = false">关闭</el-button>
        </template>
      </el-dialog>
    </div>
  `,
}

function emptyForm(type) {
  if (type === 'wechat_mp') {
    return {
      name: '', inbox_name: '', account_type: 'service', app_id: '', app_secret: '', token: '', encoding_aes_key: '',
      // 默认「有客服消息权限」：既有公众号行为不变，只有明确关掉才进被动模式
      supports_active_reply: true, passive_reply_enabled: false, route_ttl_seconds: 300, pending_reply_max: 20,
      // 回复超时默认关闭（0），保证既有渠道行为不变
      reply_timeout_seconds: 0, reply_timeout_flow_id: 0, reply_timeout_level2_seconds: 0,
    }
  }
  if (type === 'wecom_kf') {
    return { name: '', corp_id: '', secret: '', token: '', open_kfid: '', encoding_aes_key: '' }
  }
  return { name: '', corp_id: '', contact_secret: '', token: '', agent_id: '', encoding_aes_key: '' }
}

function fieldsFor(type) {
  if (type === 'wechat_mp') return mpFields
  if (type === 'wecom_kf') return kfFields
  return contactFields
}

export default {
  name: 'WechatChannelPanel',
  components: { ChannelWorkspaceShell },
  inject: { channelVdnId: { default: null } },
  props: {
    channelType: {
      type: String,
      required: true,
      validator: (v) => ['wechat_mp', 'wecom_kf', 'wecom_contact'].includes(v),
    },
  },
  data() {
    return {
      publicBaseUrl: '',
      channels: { wechat_mp: [], wecom_kf: [], wecom_contact: [] },
      loading: false,
      saving: false,
      form: { ...emptyForm(this.channelType), ...(this.channelVdnId ? { vdn_id: this.channelVdnId } : {}) },
      tenancyEnabled: false,
      editRow: null,
      activeId: '',
      mode: 'create',
    }
  },
  computed: {
    channelLabel() {
      return CHANNEL_LABELS[this.channelType] || '微信渠道'
    },
    channelHint() {
      return CHANNEL_HINTS[this.channelType] || ''
    },
    currentFields() {
      return fieldsFor(this.channelType)
    },
    currentRows() {
      return this.channels[this.channelType] || []
    },
    currentModel() {
      return this.mode === 'edit' && this.editRow ? this.editRow : this.form
    },
    activeRow() {
      return this.currentRows.find((row) => String(row.conf_id) === this.activeId) || null
    },
    configTitle() {
      return this.mode === 'edit' && this.activeRow
        ? (this.activeRow.name || this.channelLabel)
        : `新建${this.channelLabel}渠道`
    },
    outboundIp() {
      return OUTBOUND_IP
    },
    routeTriggers() {
      return ROUTE_TRIGGER_OPTIONS
    },
    appTypes() {
      return ROUTE_APP_TYPE_OPTIONS
    },
  },
  mounted() {
    this.fetchList()
  },
  methods: {
    startCreate() {
      this.mode = 'create'
      this.activeId = ''
      this.editRow = null
      this.form = { ...emptyForm(this.channelType), ...(this.channelVdnId ? { vdn_id: this.channelVdnId } : {}) }
    },

    selectChannel(row) {
      if (!row) return
      const copy = { ...row }
      this.currentFields.forEach((field) => {
        if (field.type === 'routes') copy[field.key] = cloneRoutes(row[field.key])
      })
      this.mode = 'edit'
      this.activeId = String(row.conf_id)
      this.editRow = copy
    },

    async fetchList(preferredId) {
      this.loading = true
      try {
        const res = await this.$axios.get('/api/integrations/wechat-channels/list')
        const data = res.data?.data || {}
        this.publicBaseUrl = data.public_base_url || ''
        this.tenancyEnabled = data.tenancy_enabled === true
        this.channels = Object.fromEntries(['wechat_mp', 'wecom_kf', 'wecom_contact'].map(type => [type, (data.channels?.[type] || []).filter(row => !this.channelVdnId || Number(row.vdn_id) === this.channelVdnId)]))
        const targetId = preferredId != null ? String(preferredId) : this.activeId
        const selected = this.currentRows.find((row) => String(row.conf_id) === targetId)
        if (selected) this.selectChannel(selected)
        else if (this.currentRows.length) this.selectChannel(this.currentRows[0])
        else this.startCreate()
      } catch (e) {
        this.$message.error('加载微信渠道失败')
      } finally {
        this.loading = false
      }
    },

    validateCurrent() {
      if (this.channelVdnId && Number(this.currentModel.vdn_id) !== this.channelVdnId) {
        this.$message.warning('渠道归属必须与当前 VDN 一致'); return false
      }
      if (this.tenancyEnabled && (!Number.isSafeInteger(Number(this.currentModel.vdn_id)) || Number(this.currentModel.vdn_id) <= 0)) {
        this.$message.warning('必须明确指定已映射的 VDN；旧渠道请先审核归属')
        return false
      }
      for (const field of this.currentFields) {
        const value = this.currentModel[field.key]
        const hasStoredSecret = this.mode === 'edit' && field.secret && this.currentModel[`${field.key}_masked`]
        if (field.required && field.type !== 'switch' && !hasStoredSecret && !String(value ?? '').trim()) {
          this.$message.warning(`请填写 ${field.label}`)
          return false
        }
      }
      return true
    },

    saveCurrent() {
      if (!this.validateCurrent()) return
      if (this.mode === 'edit') this.saveEdit()
      else this.createChannel()
    },

    async createChannel() {
      this.saving = true
      try {
        const payload = { channel_type: this.channelType, ...this.form }
        if (payload.agent_id) payload.agent_id = parseInt(payload.agent_id, 10) || undefined
        await this.$axios.post('/api/integrations/wechat-channels/create', payload)
        this.$message.success('已创建并同步到 OmniAgent')
        const createdName = this.form.name
        this.form = { ...emptyForm(this.channelType), ...(this.channelVdnId ? { vdn_id: this.channelVdnId } : {}) }
        await this.fetchList()
        const created = this.currentRows.find((row) => row.name === createdName)
        if (created) this.selectChannel(created)
      } catch (e) {
        this.$message.error(e.response?.data?.message || '创建失败')
      } finally {
        this.saving = false
      }
    },

    async saveEdit() {
      if (!this.editRow?.conf_id) return
      this.saving = true
      try {
        const body = { ...this.editRow }
        delete body.conf_id
        delete body.webhook_url
        delete body.omni_channel_id
        delete body.omni_inbox_id
        delete body.app_secret_masked
        delete body.secret_masked
        delete body.contact_secret_masked
        if (body.agent_id) body.agent_id = parseInt(body.agent_id, 10) || undefined
        await this.$axios.post(
          `/api/integrations/wechat-channels/${this.channelType}/${this.editRow.conf_id}/update`,
          body,
        )
        this.$message.success('已更新')
        await this.fetchList(this.editRow.conf_id)
      } catch (e) {
        this.$message.error(e.response?.data?.message || '更新失败')
      } finally {
        this.saving = false
      }
    },

    async removeChannel(row) {
      if (!row) return
      try {
        await this.$confirm(`确定删除渠道「${row.name}」？`, '确认', { type: 'warning' })
      } catch {
        return
      }
      try {
        await this.$axios.post(`/api/integrations/wechat-channels/${this.channelType}/${row.conf_id}/delete`)
        this.$message.success('已删除')
        this.startCreate()
        await this.fetchList()
      } catch (e) {
        this.$message.error(e.response?.data?.message || '删除失败')
      }
    },

    addRouteRow(key) {
      if (!Array.isArray(this.currentModel[key])) this.$set(this.currentModel, key, [])
      this.currentModel[key].push(emptyRouteRow(this.currentModel[key].length))
    },

    removeRouteRow(key, index) {
      if (Array.isArray(this.currentModel[key])) this.currentModel[key].splice(index, 1)
    },

    async copy(text, label) {
      const value = String(text || '').trim()
      if (!value) {
        this.$message.warning(`暂无${label}`)
        return
      }
      try {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          await navigator.clipboard.writeText(value)
        } else {
          const textarea = document.createElement('textarea')
          textarea.value = value
          textarea.style.position = 'fixed'
          textarea.style.left = '-9999px'
          document.body.appendChild(textarea)
          textarea.select()
          document.execCommand('copy')
          document.body.removeChild(textarea)
        }
        this.$message.success(`${label}已复制`)
      } catch (error) {
        this.$message.error('复制失败，请手动选择复制')
      }
    },
  },
}
</script>

<style scoped>
.wx-ch {
  width: 100%;
  height: 100%;
  min-width: 0;
  min-height: 0;
}

.wx-list-item {
  display: flex;
  width: 100%;
  min-height: 44px;
  align-items: center;
  gap: 10px;
  padding: 0 14px;
  border: 0;
  border-left: 3px solid transparent;
  color: var(--cfg-text, #565b66);
  background: transparent;
  cursor: pointer;
  font: inherit;
  text-align: left;
  transition: background-color 160ms ease, color 160ms ease, border-color 160ms ease;
}

.wx-list-item:hover {
  background: #f3f6fb;
}

.wx-list-item.active {
  border-left-color: var(--cfg-accent, #457ff5);
  color: var(--cfg-accent, #457ff5);
  background: #eaf2ff;
}

.wx-list-item i {
  flex: 0 0 auto;
  font-size: 16px;
}

.wx-list-item span {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wx-empty {
  padding: 24px 12px;
  color: var(--cfg-muted, #909399);
  font-size: 13px;
  text-align: center;
}

.wx-editor {
  min-height: 100%;
}

.wx-guidance {
  margin-bottom: 18px;
  padding: 12px 14px;
  border: 1px solid #e8edf5;
  border-radius: 4px;
  color: var(--cfg-muted, #7a8190);
  background: #f7f9fc;
  font-size: 12px;
  line-height: 1.6;
}

.wx-guidance p {
  margin: 0;
}

.wx-guidance p + p {
  margin-top: 4px;
}

.wx-field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  column-gap: 24px;
}

.wx-field-full {
  grid-column: 1 / -1;
}

.wx-access-section {
  margin-top: 8px;
  padding-top: 18px;
  border-top: 1px solid var(--cfg-border, #e4e7ed);
}

.wx-access-section h3 {
  margin: 0 0 16px;
  color: var(--cfg-heading, #222329);
  font-size: 14px;
  font-weight: 650;
}

.wx-note {
  margin-top: 8px;
  color: #e6a23c;
  font-size: 12px;
}

@media (max-width: 1100px) {
  .wx-field-grid {
    grid-template-columns: minmax(0, 1fr);
  }

  .wx-field-full {
    grid-column: auto;
  }
}
</style>
