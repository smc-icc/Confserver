/**
 * 各渠道表单字段（对照 Chatwoot channels/*.vue 与 OmniAgent Prisma）
 */
import { ROUTES_FIELD } from './channel-routes'

export const CHANNEL_LABELS = {
  web_widget: '网站 Widget',
  api: 'API',
  telegram: 'Telegram',
  line: 'LINE',
  twilio_sms: 'Twilio SMS',
  sms: '通用 SMS',
  email: '电子邮件',
  whatsapp: 'WhatsApp',
  facebook: 'Facebook',
  instagram: 'Instagram',
  tiktok: 'TikTok',
  weibo: '微博',
  miniprogram: '微信小程序',
};

export const CHANNEL_HINTS = {
  web_widget: '配置网站聊天挂件，保存后获得 website_token 与嵌入脚本地址。',
  api: 'API / APP 渠道：客户系统或移动端 SDK 经 /webhooks/api/{identifier} 入站；可强制 HMAC（X-Omni-Signature）。保存后获得 identifier 与 hmac_token。演示页 /demo/app-channel.html。',
  telegram: '填写 Bot Token 后自动向 Telegram 注册 Webhook。',
  line: '在 LINE Developers 控制台获取 Channel ID / Secret / Access Token，Webhook 指向生成的地址。',
  twilio_sms: 'Twilio Account SID、Auth Token 与发信号码或 Messaging Service SID。',
  sms: '通用短信渠道（Bandwidth 等），填写号码与 provider_config JSON。',
  email: '配置 IMAP 入站拉取与 SMTP 出站；启用 IMAP 后 OmniAgent 后台定时轮询。',
  whatsapp: 'WhatsApp Cloud API：手机号、provider（whatsapp_cloud）与 access_token。',
  facebook: '首期手动填写 Meta 长期 Page Access Token（无需 OAuth 嵌入）。',
  instagram: 'Instagram 专业账号 access_token；Webhook 与 Facebook 共用 /webhooks/instagram。',
  tiktok: 'TikTok Business API 凭证；需配置环境变量 TIKTOK_APP_ID。',
  weibo: '微博入站走 Omni /webhooks/weibo/{identifier}；出站推送到 webhook_url。兼容开放平台 uid/text/comment 字段。',
  miniprogram: '小程序客服组件走 Omni /webhooks/miniprogram/{identifier}。可用 APP SDK（HMAC）在小程序内嵌聊天，无需微信客服消息网关即可联调。',
};

const baseInbox = { key: 'inbox_name', label: '收件箱名称', required: true, placeholder: '客服收件箱' };

export const CHANNEL_FIELDS = {
  web_widget: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'website_url', label: '网站 URL', required: false, placeholder: 'https://example.com' },
    { key: 'widget_color', label: '挂件颜色', required: false, placeholder: '#1f93ff' },
    { key: 'welcome_title', label: '欢迎标题', required: false },
    { key: 'welcome_tagline', label: '欢迎副标题', required: false },
    { key: 'allowed_domains', label: '允许域名（逗号分隔）', required: false },
    ROUTES_FIELD,
  ],
  api: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'webhook_url', label: '出站 Webhook URL', required: false, placeholder: 'https://your-app.com/hooks/omni' },
    { key: 'hmac_mandatory', label: '强制 HMAC', type: 'switch', required: false },
    ROUTES_FIELD,
  ],
  telegram: [
    baseInbox,
    { key: 'bot_name', label: 'Bot 名称', required: false },
    { key: 'bot_token', label: 'Bot Token', required: true, secret: true },
    ROUTES_FIELD,
  ],
  line: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'line_channel_id', label: 'Channel ID', required: true },
    { key: 'line_channel_secret', label: 'Channel Secret', required: true, secret: true },
    { key: 'line_channel_token', label: 'Channel Access Token', required: true, secret: true },
    ROUTES_FIELD,
  ],
  twilio_sms: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'account_sid', label: 'Account SID', required: true },
    { key: 'auth_token', label: 'Auth Token', required: true, secret: true },
    { key: 'phone_number', label: '发信号码', required: false, placeholder: '+1234567890' },
    { key: 'messaging_service_sid', label: 'Messaging Service SID', required: false },
    ROUTES_FIELD,
  ],
  sms: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'phone_number', label: '号码', required: true },
    { key: 'provider', label: 'Provider', required: false, placeholder: 'bandwidth' },
    { key: 'provider_config', label: 'Provider Config (JSON)', type: 'textarea', required: false, placeholder: '{}' },
    ROUTES_FIELD,
  ],
  email: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'email', label: '邮箱地址', required: true },
    { key: 'forward_to_email', label: '转发地址', required: false },
    { key: 'imap_enabled', label: '启用 IMAP', type: 'switch', required: false },
    { key: 'imap_address', label: 'IMAP 地址', required: false },
    { key: 'imap_port', label: 'IMAP 端口', type: 'number', required: false, placeholder: '993' },
    { key: 'imap_login', label: 'IMAP 登录名', required: false },
    { key: 'imap_password', label: 'IMAP 密码', secret: true, required: false },
    { key: 'imap_enable_ssl', label: 'IMAP SSL', type: 'switch', required: false },
    { key: 'smtp_enabled', label: '启用 SMTP', type: 'switch', required: false },
    { key: 'smtp_address', label: 'SMTP 地址', required: false },
    { key: 'smtp_port', label: 'SMTP 端口', type: 'number', required: false, placeholder: '587' },
    { key: 'smtp_login', label: 'SMTP 登录名', required: false },
    { key: 'smtp_password', label: 'SMTP 密码', secret: true, required: false },
    { key: 'smtp_domain', label: 'SMTP 域名', required: false },
    { key: 'smtp_enable_starttls_auto', label: 'STARTTLS', type: 'switch', required: false },
    { key: 'smtp_authentication', label: 'SMTP 认证方式', required: false, placeholder: 'login' },
    { key: 'provider', label: 'Provider', required: false },
    ROUTES_FIELD,
  ],
  whatsapp: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'phone_number', label: '手机号（含国家码）', required: true },
    { key: 'provider', label: 'Provider', required: false, placeholder: 'whatsapp_cloud' },
    { key: 'access_token', label: 'Access Token', required: true, secret: true },
    ROUTES_FIELD,
  ],
  facebook: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'page_id', label: 'Page ID', required: true },
    { key: 'page_access_token', label: 'Page Access Token', required: true, secret: true },
    { key: 'user_access_token', label: 'User Access Token', required: false, secret: true },
    { key: 'instagram_id', label: '关联 Instagram ID', required: false },
    ROUTES_FIELD,
  ],
  instagram: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'instagram_id', label: 'Instagram ID', required: true },
    { key: 'access_token', label: 'Access Token', required: true, secret: true },
    { key: 'expires_at', label: '过期时间 (ISO)', required: false },
    ROUTES_FIELD,
  ],
  tiktok: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'business_id', label: 'Business ID', required: true },
    { key: 'access_token', label: 'Access Token', required: true, secret: true },
    { key: 'refresh_token', label: 'Refresh Token', required: false, secret: true },
    { key: 'expires_at', label: '过期时间 (ISO)', required: false },
    ROUTES_FIELD,
  ],
  weibo: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'app_key', label: 'App Key', required: false, placeholder: '微博开放平台 App Key' },
    { key: 'app_secret', label: 'App Secret', required: false, secret: true },
    { key: 'webhook_url', label: '出站 Webhook URL', required: false, placeholder: 'https://your-app.com/hooks/weibo' },
    { key: 'hmac_mandatory', label: '强制 HMAC', type: 'switch', required: false },
    ROUTES_FIELD,
  ],
  miniprogram: [
    baseInbox,
    { key: 'name', label: '渠道名称', required: true },
    { key: 'webhook_url', label: '出站 Webhook URL', required: false, placeholder: 'https://your-miniprogram-backend/hooks/omni' },
    { key: 'hmac_mandatory', label: '强制 HMAC', type: 'switch', required: false },
    ROUTES_FIELD,
  ],
};

export function emptyForm(channelType) {
  const fields = CHANNEL_FIELDS[channelType] || [];
  const form = {};
  for (const f of fields) {
    if (f.type === 'switch') form[f.key] = false;
    else if (f.type === 'number') form[f.key] = f.placeholder ? parseInt(f.placeholder, 10) : undefined;
    else if (f.type === 'routes') form[f.key] = [];
    else form[f.key] = '';
  }
  return form;
}
