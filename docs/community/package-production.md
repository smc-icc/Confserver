# 专业版、企业版安装包制作手册

整个平台的在线/离线交付入口及制作脚本见 [在线与离线安装手册](online-offline-installation.md)。本文的 .smcu 为应用授权和组件升级包；平台首次安装内核的当前适配边界见该手册。

当前工具把交付分为 TARS 原生服务发布包和 `.smcu` 统一升级包。`.smcu` 内含签名授权、签名组件安装计划，企业版另含签名流程设计器插件。原生服务二进制先上传目标 TARS 发布中心，安装计划通过该环境的 `patchId` 引用；当前 `.smcu` 不内嵌这些二进制，也不自动从供应商仓库下载。

菜单入口：ICC 配置 → 左侧最下方“版本与功能组件”。客户选择“升级专业版本”或“升级为企业版本”后上传对应的 `.smcu` 文件。

## 1. 准备交付信息和签名密钥

供应商需要准备：目标部署 ID、版本号、该部署递增的授权修订号、有效期、原生服务构建产物、经过验证的部署清单、目标 TARS 节点和发布包 ID。企业版还需要三项并发额度以及私有 EnterpriseFlowDesigner 工程。

使用两套 Ed25519 密钥：

|用途|供应商保管|客户 ConfServer 配置|
|---|---|---|
|授权签名|license-private.pem|SMC_LICENSE_PUBLIC_KEY_FILE 指向配套公钥|
|组件及流程插件签名|plugin-private.pem|SMC_PLUGIN_PUBLIC_KEY_FILE 指向配套公钥|

已有部署继续使用与其公钥配套的私钥。私钥保留在供应商签发环境；客户只部署公钥。不使用本地容器测试密钥签发正式授权。`deploymentId` 必须等于客户的 `SMC_DEPLOYMENT_ID`，也可通过管理端 capabilities 接口读取；`revision` 必须大于该部署历史已接受的最高授权修订号，不能因授权到期而重新从 1 开始。

以下 PowerShell 示例在 `E:/sm-cloud/smc-icc` 运行，假设私钥位于 `E:/smc-signing`，交付工作目录为 `E:/smc-release/customer-a-1.0.0`。这些目录和客户字段需要替换，命令不生成正式签名密钥。

```powershell
$ErrorActionPreference = 'Stop'
$packRoot = 'E:/smc-release/customer-a-1.0.0'
New-Item -ItemType Directory -Path $packRoot
Copy-Item ConfServer/docs/community/upgrade-examples/*.json -Destination $packRoot
```

每条命令均需确认退出码为 0 后再执行下一条；签名与合并工具不会覆盖已有输出，使用新的空交付目录。先编辑副本，再执行签名；示例中的 customer-a、日期、节点和额度不能直接视为实际客户配置。

## 2. 制作并上传 TARS 原生服务发布包

沿用各服务现有构建和 TARS 发布流程，编译目标 Linux/CPU 架构的二进制，生成发布包，上传目标环境的发布中心，记录每个服务对应的 `patchId`。`bundle-upgrade.cjs` 不编译 C++ 服务，也不代替 TARS 发布包制作工具。

专业版的逻辑模块是 `icc`、`ivr`、`itr`。ICC 计划按实际依赖列出 CCS/TAS/ACD 等服务，IVR、ITR 列出对应运行服务。语音、视频和标准流程模板、放音资源及底层驱动的依赖必须在实际部署清单中体现；编辑器插件不进入专业版。

企业版在上述基础上包括 `outbound`、`aiqc` 和 `flow-designer`。逻辑功能模块与物理进程并非总是一一对应，不能把模块名大写后虚构一个服务。当前安装器要求每份原生组件计划至少包含一个真实服务，统一升级预检还会拒绝多个计划中重复的 application/serverName/nodeName。若某个部署的外呼与基础 ICC 共用 TASServer，必须先确定该拓扑的组件安装模型，当前工具不会自动把同一进程映射成多个模块。正式企业整包不能仅凭清单样例生成并宣布可用。

`patchId` 是目标 TARS 发布中心的记录 ID，不能直接复用其他客户的 ID。同一服务二进制可以复用，但目标部署的安装计划、发布包 ID 和签名需要匹配。

## 3. 编写并签署组件计划

[icc.plan.example.json](upgrade-examples/icc.plan.example.json) 演示复用已登记的 CCS/TAS/ACD 服务。目录中还提供 IVR、ITR、AIQC 的对应模板。先复制并重命名为 `icc.plan.json`，填入真实节点和发布包 ID。示例故意使用 `patchId: 0`，未填写时服务器会拒绝安装。

已有服务必须明确 `allowExisting: true`。全新服务必须提供真实的 `deploy` 及 `deploy.adapters`：服务器模板、服务类型、Obj、绑定地址、端口及线程等配置使用已验证的部署数据，不从示例猜测。`configs` 可补充 `{filename,content}` 配置文件，但不会覆盖已存在的配置文件；安装器也不执行整库初始化或任意 SQL。

每个逻辑模块一份 `smc-component/1` 载荷，`module` 分别为 icc、ivr、itr；企业版再准备 outbound、aiqc。所有计划的 deploymentId 必须与授权一致。ICC 计划中的 `connections.ccsAgentObj` 供首次初始化 Omni 连接使用。

```powershell
# 每个文件均是已填写实际部署配置的 JSON 载荷
foreach ($module in @('icc', 'ivr', 'itr')) {
  node ConfServer/tools/sign-community.cjs `
    "$packRoot/$module.plan.json" `
    E:/smc-signing/plugin-private.pem `
    "$packRoot/$module.plan.signed.json"
  if ($LASTEXITCODE -ne 0) { throw "组件签名失败：$module" }
}

# 企业版在实际部署计划确认后追加两份组件签名
foreach ($module in @('outbound', 'aiqc')) {
  node ConfServer/tools/sign-community.cjs `
    "$packRoot/$module.plan.json" `
    E:/smc-signing/plugin-private.pem `
    "$packRoot/$module.plan.signed.json"
  if ($LASTEXITCODE -ne 0) { throw "组件签名失败：$module" }
}
```

签名工具只校验载荷种类并签名，不代替部署模型和依赖验收；服务器安装前会验证签名、部署、字段和实际发布包归属。

## 4. 制作专业版授权与升级包

使用 [professional.license.json](upgrade-examples/professional.license.json) 模板。关键字段：

```json
{
  "edition": "professional",
  "modules": ["icc", "ivr", "itr"],
  "limits": {
    "voiceSeats": 2,
    "sipTrunks": 2,
    "concurrentCalls": 2,
    "videoConcurrentCalls": 2
  }
}
```

这是完整授权中的相关字段，完整文件还需要 kind、deploymentId、licenseId、revision、notBefore、expiresAt。专业版的坐席、语音、视频和中继四项授权额度固定为 2，不能靠填写更大数字扩容；不授权 IVR/ITR 设计器。

```powershell
node ConfServer/tools/sign-community.cjs `
  "$packRoot/professional.license.json" `
  E:/smc-signing/license-private.pem `
  "$packRoot/professional.license.signed.json"
if ($LASTEXITCODE -ne 0) { throw "专业版授权签名失败" }

node ConfServer/tools/bundle-upgrade.cjs `
  "$packRoot/professional.manifest.json" `
  "$packRoot/smc-icc-professional-1.0.0.smcu"
```

专业版 manifest：

```json
{
  "license": "professional.license.signed.json",
  "components": [
    "icc.plan.signed.json",
    "ivr.plan.signed.json",
    "itr.plan.signed.json"
  ]
}
```

不添加 `plugin` 字段；专业版上传带流程设计器的包会被拒绝。

## 5. 制作企业版授权、设计器和升级包

使用 [enterprise.license.json](upgrade-examples/enterprise.license.json) 模板。modules 包含 icc、ivr、itr、outbound、aiqc、flow-designer。voiceSeats、concurrentCalls、videoConcurrentCalls 三项必须显式填写非负整数，例如坐席 20、语音 30、视频 6；sipTrunks 等其他配额按实际授权填写。示例 revision=2 表示同一部署从 revision=1 升级；正式签发以该部署签发台账为准。

```powershell
node ConfServer/tools/sign-community.cjs `
  "$packRoot/enterprise.license.json" `
  E:/smc-signing/license-private.pem `
  "$packRoot/enterprise.license.signed.json"
if ($LASTEXITCODE -ne 0) { throw "企业版授权签名失败" }

# 供应商构建机需要先安装 ConfServer/client 的锁定依赖。
# 每次构建使用新的空输出目录，防止混入以前的静态文件。
node ConfServer/tools/build-flow-plugin.cjs `
  --source EnterpriseFlowDesigner `
  --out "$packRoot/designer-build-1.0.0" `
  --version 1.0.0 `
  --key E:/smc-signing/plugin-private.pem
if ($LASTEXITCODE -ne 0) { throw "企业流程插件构建失败" }

Copy-Item "$packRoot/designer-build-1.0.0/flow-designer-1.0.0.smcp" `
  -Destination "$packRoot/flow-designer-1.0.0.smcp"

node ConfServer/tools/bundle-upgrade.cjs `
  "$packRoot/enterprise.manifest.json" `
  "$packRoot/smc-icc-enterprise-1.0.0.smcu"
```

一个 `.smcp` 包同时包含 IVR 和 ITR 两个设计器；不需要分别构建两次。省略 `--key` 只会生成不能安装的 unsigned 审查包。

企业版 manifest：

```json
{
  "license": "enterprise.license.signed.json",
  "components": [
    "icc.plan.signed.json",
    "ivr.plan.signed.json",
    "itr.plan.signed.json",
    "outbound.plan.signed.json",
    "aiqc.plan.signed.json"
  ],
  "plugin": "flow-designer-1.0.0.smcp"
}
```

专业版升级企业版时，可以省略已经安装且不需要更新的组件计划；对应模块必须在该部署有有效安装记录。未安装组件及未安装的企业插件必须包含，签名授权始终必需。通过此方式可避免无意义地重新发布已有话务进程。

## 6. 检查与客户安装

`bundle-upgrade.cjs` 读取清单中相对于清单文件的路径并合并已签名文档，不需要私钥；它不会替客户验证公钥、部署 ID 或 TARS 发布包是否存在。输出文件默认不覆盖，重做时使用新的输出文件名。总升级包上限 67 MiB；插件解包文件总量上限 32 MiB、最多 2048 个文件，不含 source map。

供应商先在隔离环境演练：预检、专业/企业授权、安装健康确认、失败恢复、标准流程与通话，再交付配套的 TARS 发布包和 `.smcu`。客户在对应版本按钮选择 `.smcu` 后，系统预检全部内容，通过后依次导入授权、安装原生组件、安装企业插件、启用功能。失败保留任务和已有业务数据。首次启用 ICC 后仍需受控重启 Omni 后端。

当前没有“把任意 tar.gz 或 Docker 镜像拖进页面就自动安装”的通用离线安装器。离线现场可以先将原生发布包导入本地 TARS 发布中心，再签发与该发布中心记录匹配的升级计划。

签名保证真实性与完整性，不加密交付内容。Community 不包含 EnterpriseFlowDesigner 源工程，但企业插件含浏览器必须下载的前端构建代码以及可读的 backend.cjs，不能把签名机制当作 JavaScript 源码保密机制。

三项额度已经进入授权和 Omni 能力契约；原生 CCS/TAS/ACD 的并发硬限制仍需接通与验收。不能仅凭签名包制作完成就宣称已完成底层额度强制执行。

## 本次菜单调整验证

2026-10-26 在 smc-icc-community-test 实际浏览器验证的一级菜单顺序为：VDN 成员与权限 → 系统账号 → VDN管理 → 版本与功能组件。最后一项保持独立菜单、点击路由正常，浏览器无页面异常或控制台错误；当前仍为 community、revision=0。ConfServer Community 58 项回归通过，公共构建检查 98 个资源通过。仅更新该测试组 ConfServer，镜像标签 community-menu-bottom-20261026。
