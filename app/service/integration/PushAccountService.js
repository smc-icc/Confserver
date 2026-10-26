const fs = require("node:fs");
const path = require("node:path");
const crypto = require("node:crypto");
const http = require("node:http");
const https = require("node:https");
const field = (key, label, secret = false, type = "text", required = true) => ({
  key,
  label,
  secret,
  type,
  required,
});
const PLATFORMS = [
  {
    id: "harmony",
    name: "鸿蒙 Push Kit",
    description: "HarmonyOS 应用通知和来电推送",
    capability: "notification",
    fields: [
      field("project_id", "项目 ID"),
      field("app_id", "应用 ID"),
      field("service_account_json", "服务账号私钥 JSON", true, "json"),
    ],
  },
  {
    id: "mipush",
    name: "小米 MiPush",
    description: "小米、Redmi 推送帐号",
    capability: "notification",
    fields: [
      field("app_id", "App ID"),
      field("app_key", "App Key", true),
      field("app_secret", "App Secret", true),
    ],
  },
  {
    id: "hms",
    name: "华为 Android",
    description: "HMS Android Push Kit",
    capability: "notification",
    fields: [
      field("app_id", "App ID"),
      field("client_id", "Client ID"),
      field("client_secret", "Client Secret", true),
    ],
  },
  {
    id: "oppo",
    name: "OPPO / HeyTap",
    description: "OPPO、OnePlus、realme 推送帐号",
    capability: "notification",
    fields: [
      field("app_key", "App Key", true),
      field("master_secret", "Master Secret", true),
      field("channel_id", "通知 Channel ID"),
    ],
  },
  {
    id: "vivo",
    name: "vivo Push",
    description: "vivo、iQOO 推送帐号",
    capability: "notification",
    fields: [
      field("app_id", "App ID"),
      field("app_key", "App Key", true),
      field("app_secret", "App Secret", true),
    ],
  },
  {
    id: "honor",
    name: "荣耀 HONOR Push",
    description: "配置可保存，发送适配待验证",
    capability: "发送适配待验证",
    fields: [
      field("app_id", "App ID"),
      field("client_id", "Client ID"),
      field("client_secret", "Client Secret", true),
    ],
  },
  {
    id: "fcm",
    name: "Google FCM",
    description: "具备 GMS 且网络可达的 Android 设备",
    capability: "data",
    fields: [
      field("project_id", "Firebase Project ID"),
      field("service_account_json", "服务账号 JSON", true, "json"),
    ],
  },
  {
    id: "apns",
    name: "Apple APNs",
    description: "iOS PushKit VoIP 推送帐号",
    capability: "voip",
    fields: [
      field("bundle_id", "Bundle ID"),
      field("key_id", "Key ID"),
      field("team_id", "Team ID"),
      field("private_key", "APNs .p8 私钥", true, "pem"),
      field("production", "生产环境", false, "boolean", false),
    ],
  },
];
function fail(message, status = 400) {
  const e = new Error(message);
  e.status = status;
  throw e;
}
function encryptionKey(encoded) {
  const raw = String(encoded || "").trim();
  const key = Buffer.from(raw, "base64");
  if (key.length !== 32 || key.toString("base64") !== raw)
    fail("Push encryption key unavailable / 推送加密密钥不可用", 503);
  return key;
}
function seal(row, fields, key) {
  const iv = crypto.randomBytes(12),
    cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey(key), iv);
  cipher.setAAD(
    Buffer.from(`push:v1:${row.id}:${row.provider}:${row.bundle_id}`),
  );
  const data = Buffer.concat([
    cipher.update(JSON.stringify(fields), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64url"),
    cipher.getAuthTag().toString("base64url"),
    data.toString("base64url"),
  ].join(":");
}
function open(row, key) {
  try {
    const parts = String(row.credentials).split(":");
    if (parts.length !== 4 || parts[0] !== "v1") throw Error();
    const iv = Buffer.from(parts[1], "base64url"),
      tag = Buffer.from(parts[2], "base64url");
    if (iv.length !== 12 || tag.length !== 16) throw Error();
    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      encryptionKey(key),
      iv,
    );
    decipher.setAAD(
      Buffer.from(`push:v1:${row.id}:${row.provider}:${row.bundle_id}`),
    );
    decipher.setAuthTag(tag);
    const value = JSON.parse(
      Buffer.concat([
        decipher.update(Buffer.from(parts[3], "base64url")),
        decipher.final(),
      ]).toString("utf8"),
    );
    if (!value || typeof value !== "object" || Array.isArray(value))
      throw Error();
    return value;
  } catch {
    fail("Push credential decryption failed / 推送凭据解密失败", 503);
  }
}
function validateFields(provider, fields, enabled) {
  const platform = PLATFORMS.find((p) => p.id === provider);
  if (!platform) fail("未知推送平台");
  const allowed = new Set(platform.fields.map((f) => f.key));
  for (const [key, value] of Object.entries(fields)) {
    if (!allowed.has(key)) fail("Unknown push field / 未知推送字段");
    if (typeof value !== "string" || Buffer.byteLength(value) > 65536)
      fail("推送字段格式不正确");
  }
  if (enabled)
    for (const f of platform.fields)
      if (f.required && !String(fields[f.key] || "").trim())
        fail(`缺少字段：${f.label}`);
  if (fields.service_account_json) {
    let value;
    try {
      value = JSON.parse(fields.service_account_json);
    } catch {
      fail("服务账号 JSON 格式不正确");
    }
    if (!value || typeof value !== "object" || !value.private_key)
      fail("服务账号缺少私钥");
    if (
      provider === "harmony" &&
      (!value.key_id ||
        !value.sub_account ||
        String(value.project_id) !== fields.project_id)
    )
      fail("服务账号 project / 项目标识不匹配");
    if (
      provider === "fcm" &&
      (value.type !== "service_account" || !value.client_email)
    )
      fail("FCM 服务账号 project / 项目标识不匹配");
    try {
      const k = crypto.createPrivateKey(value.private_key);
      if (
        k.asymmetricKeyType !== "rsa" ||
        (k.asymmetricKeyDetails.modulusLength || 0) < 2048 ||
        (provider === "harmony" &&
          k.asymmetricKeyDetails.modulusLength !== 4096)
      )
        throw Error();
    } catch {
      fail("服务账号私钥格式不正确");
    }
  }
  if (provider === "apns" && fields.private_key) {
    try {
      const k = crypto.createPrivateKey(
        fields.private_key.replace(/\\n/g, "\n"),
      );
      if (
        k.asymmetricKeyType !== "ec" ||
        k.asymmetricKeyDetails.namedCurve !== "prime256v1"
      )
        throw Error();
    } catch {
      fail("APNs 私钥格式不正确");
    }
  }
  if (
    provider === "apns" &&
    fields.production &&
    !["true", "false", "0", "1"].includes(fields.production)
  )
    fail("APNs 环境格式不正确");
  return platform;
}
function callOmni(resource, method, body) {
  const secret = process.env.PLATFORM_SYNC_SECRET;
  if (!secret) fail("推送同步凭据未配置", 503);
  const root = process.env.OMNIAGENT_URL;
  if (!root) fail("Omni 服务地址未配置", 503);
  const url = new URL(`/api/platform-config/push-accounts${resource}`, root);
  if (!["http:", "https:"].includes(url.protocol))
    fail("Omni 服务地址不正确", 503);
  const data = body === undefined ? null : JSON.stringify(body);
  return new Promise((resolve, reject) => {
    const req = (url.protocol === "https:" ? https : http).request(
      url,
      {
        method,
        timeout: resource === "/test" ? 15000 : 8000,
        headers: {
          "Content-Type": "application/json",
          "x-platform-sync-token": secret,
          ...(data ? { "Content-Length": Buffer.byteLength(data) } : {}),
        },
      },
      (res) => {
        let raw = "";
        res.on("data", (chunk) => {
          raw += chunk;
          if (Buffer.byteLength(raw) > 262144) {
            req.destroy();
            reject(Error("Omni response too large"));
          }
        });
        res.on("error", () => reject(Error("Omni transport failed")));
        res.on("end", () => {
          try {
            const parsed = JSON.parse(raw || "{}");
            if (
              res.statusCode >= 200 &&
              res.statusCode < 300 &&
              (resource !== "/sync" || parsed.success === true)
            )
              resolve(parsed);
            else
              reject(Error(`Omni rejected push operation (${res.statusCode})`));
          } catch {
            reject(Error("Omni push response invalid"));
          }
        });
      },
    );
    req.on("error", () => reject(Error("Omni transport failed")));
    req.on("timeout", () => {
      req.destroy();
      reject(Error("Omni push timeout"));
    });
    if (data) req.write(data);
    req.end();
  });
}
function createService(options) {
  const file = options.file;
  let queue = Promise.resolve(),
    timer;
  const serial = (fn) => {
    const next = queue.then(fn, fn);
    queue = next.catch(() => {});
    return next;
  };
  function read() {
    if (!fs.existsSync(file))
      return {
        version: 1,
        revision: 0,
        accounts: [],
        sync: { last_synced_revision: 0, pending: false },
      };
    try {
      const state = JSON.parse(fs.readFileSync(file, "utf8"));
      if (
        state.version !== 1 ||
        !Number.isSafeInteger(state.revision) ||
        state.revision < 0 ||
        !Array.isArray(state.accounts) ||
        !state.sync ||
        new Set(state.accounts.map((r) => r.id)).size !== state.accounts.length
      )
        throw Error();
      return state;
    } catch {
      fail("Stored push configuration unreadable / 推送配置不可读", 503);
    }
  }
  function write(state) {
    fs.mkdirSync(path.dirname(file), { recursive: true, mode: 0o700 });
    const tmp = `${file}.${crypto.randomUUID()}.tmp`;
    let fd;
    try {
      fd = fs.openSync(tmp, "wx", 0o600);
      fs.writeFileSync(fd, JSON.stringify(state, null, 2));
      fs.fsyncSync(fd);
      fs.closeSync(fd);
      fd = undefined;
      fs.renameSync(tmp, file);
    } finally {
      if (fd !== undefined) fs.closeSync(fd);
      if (fs.existsSync(tmp)) fs.unlinkSync(tmp);
    }
  }
  const decryptAccount = (row) => ({
    ...row,
    fields: open(row, options.key()),
  });
  function safe(row) {
    const fields = open(row, options.key()),
      platform = PLATFORMS.find((p) => p.id === row.provider);
    if (!platform) fail("Stored push configuration has unknown platform", 503);
    const publicFields = {};
    for (const f of platform.fields)
      if (!f.secret && fields[f.key] !== undefined)
        publicFields[f.key] = fields[f.key];
    return {
      id: row.id,
      provider: row.provider,
      name: row.name,
      bundle_id: row.bundle_id,
      enabled: row.enabled,
      fields: publicFields,
      configured_fields: Object.keys(fields).filter((k) => fields[k]),
      updated_at: row.updated_at,
    };
  }
  function status(state) {
    return {
      ...state.sync,
      pending: state.sync.last_synced_revision !== state.revision,
      revision: state.revision,
    };
  }
  async function syncState(state) {
    // Persist the exact revision before transmitting; restart retries must be idempotent.
    state.sync = { ...state.sync, pending: true };
    write(state);
    try {
      await options.sync({
        revision: state.revision,
        accounts: state.accounts.map(({ deleted, ...row }) => row),
      });
      state.sync = {
        pending: false,
        last_synced_revision: state.revision,
        last_synced_at: new Date().toISOString(),
      };
    } catch {
      state.sync = {
        ...state.sync,
        pending: true,
        last_error: "Omni 推送配置同步失败，请重试",
        last_attempt_at: new Date().toISOString(),
      };
    }
    write(state);
    return { sync: status(state) };
  }
  const api = {
    platforms: async () => ({ platforms: PLATFORMS }),
    list: async () => {
      const state = read();
      return { accounts: state.accounts.filter((row) => !row.deleted).map(safe), sync: status(state) };
    },
    save: (input) =>
      serial(async () => {
        if (!input || typeof input !== "object") fail("推送帐号格式不正确");
        const state = read();
        const prev = input.id
          ? state.accounts.find((a) => a.id === input.id && !a.deleted)
          : null;
        if (input.id && !prev) fail("推送帐号不存在", 404);
        const provider = prev ? prev.provider : input.provider;
        if (prev && input.provider && provider !== input.provider)
          fail("不能变更推送帐号平台");
        const platform = PLATFORMS.find((p) => p.id === provider);
        if (!platform) fail("未知推送平台");
        const name = String(input.name || "").trim(),
          bundle_id = String(input.bundle_id || "com.smcloud.omniagent").trim();
        if (!name || name.length > 100 || !/^\w[\w.-]{1,254}$/.test(bundle_id))
          fail("帐号名称或应用包名格式不正确");
        if (typeof input.enabled !== "boolean") fail("启用状态格式不正确");
        if (!prev) state.accounts = state.accounts.filter((a) => !(a.deleted && a.provider === provider && a.bundle_id === bundle_id));
      if (state.accounts.length >= 100 && !prev) fail("推送帐号数量已达上限");
        const fields = prev ? open(prev, options.key()) : {};
        if (
          input.fields !== undefined &&
          (!input.fields ||
            typeof input.fields !== "object" ||
            Array.isArray(input.fields))
        )
          fail("推送字段格式不正确");
        for (const [key, value] of Object.entries(input.fields || {})) {
          const f = platform.fields.find((f) => f.key === key);
          if (!f) fail("Unknown push field / 未知推送字段");
          if (typeof value !== "string") fail("推送字段格式不正确");
          if (f.secret && !value.trim() && fields[key]) continue;
          fields[key] = value.trim();
        }
        if (provider === "apns") {
          fields.bundle_id = bundle_id;
          if (!fields.production) fields.production = "false";
        }
        if (provider === "honor" && input.enabled)
          fail("荣耀发送适配待验证，可先停用保存帐号", 409);
        validateFields(provider, fields, input.enabled);
        if (
          input.enabled &&
          state.accounts.some(
            (a) =>
              a.id !== (prev && prev.id) &&
              a.enabled &&
              a.provider === provider &&
              a.bundle_id === bundle_id,
          )
        )
          fail("Only one enabled account / 此平台与应用已经有已启用帐号", 409);
        const row = {
          id: prev ? prev.id : crypto.randomUUID(),
          provider,
          name,
          bundle_id,
          enabled: input.enabled,
          updated_at: new Date().toISOString(),
        };
        row.credentials = seal(row, fields, options.key());
        if (prev) state.accounts[state.accounts.indexOf(prev)] = row;
        else state.accounts.push(row);
        state.revision++;
        await syncState(state);
        return { account: safe(row), sync: status(state) };
      }),
    remove: (input) =>
      serial(async () => {
        const state = read();
        const index = state.accounts.findIndex((a) => a.id === input.id);
        if (index < 0) fail("推送帐号不存在", 404);
        const previous = state.accounts[index];
      const tombstone = { ...previous, enabled: false, deleted: true, updated_at: new Date().toISOString() };
      tombstone.credentials = seal(tombstone, {}, options.key());
      state.accounts[index] = tombstone;
        state.revision++;
        await syncState(state);
        return { success: true, sync: status(state) };
      }),
    synchronize: () =>
      serial(async () => {
        const state = read();
        return syncState(state);
      }),
    test: (input) =>
      serial(async () => {
        if (
          typeof input.token !== "string" ||
          !input.token.trim() ||
          input.token.length > 4096 ||
          /[\r\n]/.test(input.token)
        )
          fail("有效设备 Token 必填");
        const state = read();
        const row = state.accounts.find((a) => a.id === input.id && !a.deleted);
        if (!row || !row.enabled) fail("推送帐号未启用", 409);
        if (status(state).pending) {
          await syncState(state);
          if (status(state).pending) fail("请先完成配置同步", 503);
        }
        return options.test({
          id: row.id,
          token: input.token.trim(),
          title: String(input.title || "Omni 推送测试").slice(0, 100),
          body: String(input.body || "这是一条本机连通性测试通知").slice(
            0,
            300,
          ),
        });
      }),
    decryptAccount,
    start: () => {
      if (!timer) {
        timer = setInterval(() => {
          try {
            const state = read();
            if (status(state).pending) void api.synchronize().catch(() => {});
          } catch {}
        }, 30000);
        timer.unref();
      }
    },
    stop: () => {
      if (timer) clearInterval(timer);
      timer = undefined;
    },
  };
  return api;
}
let current;
function service() {
  if (!current) {
    current = createService({
      file:
        process.env.PUSH_ACCOUNTS_FILE ||
        path.join(__dirname, "../../../config/push-accounts.json"),
      key: () =>
        process.env.PUSH_CONFIG_ENCRYPTION_KEY ||
        (process.env.PUSH_CONFIG_ENCRYPTION_KEY_FILE
          ? fs
              .readFileSync(process.env.PUSH_CONFIG_ENCRYPTION_KEY_FILE, "utf8")
              .trim()
          : ""),
      sync: (data) => callOmni("/sync", "POST", data),
      test: (data) => callOmni("/test", "POST", data),
    });
    current.start();
  }
  return current;
}
module.exports = {
  PLATFORMS,
  createService,
  seal,
  open,
  validateFields,
  getService: service,
};
