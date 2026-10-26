# Community 版本管理与统一升级（2026-10-26）

## 本次范围

Community 分支实现版本管理菜单、专业版/企业版两个升级入口、可恢复的统一升级任务和授权额度契约。现有业务数据库不做迁移、清空或初始化；流程设计器继续通过独立签名插件交付。部署仅更新 smc-icc-community-test 的 ConfServer 和 Omni 后端，不修改 main 测试组。

TARS 页面保留已登记组件，登记记录不代表已安装或已运行。进程以当前状态、上报状态及 PID 判断。“流量状态 Active”改为“流量开关：开启”，加提示说明其与进程状态的区别。Community 容器仅启动 TARS 框架，不自动启动 ICC 原生话务进程。

## 版本契约

|版本|额度|运行与设计能力|
|---|---|---|
|Community 开源版|话务额度 0|全媒体；无 ICC、IVR/ITR 运行与设计权限|
|professional 专业版|voiceSeats=2、sipTrunks=2、concurrentCalls=2、videoConcurrentCalls=2|ICC、标准 IVR（改放音）、ITR 运行；无 IVR/ITR 设计器、外呼或质检|
|enterprise 企业版|voiceSeats、concurrentCalls、videoConcurrentCalls 必须由新升级授权显式指定；其他额度原样保留|目录中所有功能，含两个流程设计器|

旧 registered 授权继续兼容，界面显示“专业版（原注册版）”，同样将上述四项额度固定为 2。旧 enterprise 授权的读取和独立导入接口保持兼容；统一升级入口要求完整模块与三项并发额度，不把缺失值解释为无限。

额度是 ConfServer→Omni 的授权契约。当前原生 CCS/TAS/ACD 尚未实现按该契约跨进程强制限制并发，不应据此宣称已完成商业防绕过。开源服务中的布尔开关也不是闭源话务内核的授权边界。停用功能只撤回入口/API 能力，不自动停止或排空原生进程；首次安装 ICC 后仍需受控重启 Omni 后端以初始化连接。

## 升级包与供应商制作

客户只选择一个对应版本的 .smcu（JSON）升级包。结构：

~~~json
{"kind":"smc-upgrade/1","license":{"payload":"...","signature":"..."},"components":[{"payload":"...","signature":"..."}],"plugin":{"payload":"...","signature":"..."}}
~~~

license 为授权公钥签名的 smc-license/1。components 为组件公钥签名的 smc-component/1 安装计划。企业版 plugin 为原有 smc-plugin/1 签名文件（含两套设计器）；专业版禁止包含此字段。已经安装的组件和企业插件允许省略，否则需提供全部对应模块。未安装插件不会随 Community 发布。

专业版授权 modules 至少为 icc、ivr、itr；企业版至少为 icc、ivr、itr、outbound、aiqc、flow-designer。部署 ID 必须匹配，授权 revision 必须递增。企业额度示例：

~~~json
{"voiceSeats":20,"concurrentCalls":30,"videoConcurrentCalls":6,"sipTrunks":10}
~~~

使用 tools/sign-community.cjs 生成授权和组件签名文件，使用私有 EnterpriseFlowDesigner 的构建工具生成插件。再编写只含文件路径的供应商清单：

~~~json
{"license":"license.signed.json","components":["icc.signed.json","ivr.signed.json","itr.signed.json"],"plugin":"flow-designer.smcp"}
~~~

专业版清单移除 plugin；企业版增加 outbound、aiqc 组件签名文件。执行：

~~~sh
node tools/bundle-upgrade.cjs manifest.json professional.smcu
~~~

此命令只合并已有签名文档，不需要私钥，最终所有签名与部署约束由服务器预检。TARS 原生二进制须预先上传发布中心，计划通过 patchId 引用。升级包不内嵌 TARS 二进制，也未配置自动下载供应商仓库。已有服务只有计划显式 allowExisting 时才允许复用，原有生产配置不会覆盖。

## 状态、接口和恢复

菜单位于 ICC 配置左侧最下方的一级导航“版本与功能组件”，仅系统管理员可见。用户看到当前版本、语音/视频/坐席授权额度、两种升级入口、组件状态和任务进度。

- POST /pages/server/api/smcicc/community/upgrade：{bundle,edition,expectedRevision}，先检查管理员身份，再解析大包；全部签名、部署、模块、额度、插件文件及 TARS 发布包预检通过才保存任务。
- POST .../upgrade/job：{id,retry}，执行或继续原任务。查询同一任务不会重复导入授权、重复发布已完成服务。
- GET .../upgrade/current：重开页面恢复任务；响应只含任务摘要，不回传签名插件正文。

任务保存在 SMC_COMMUNITY_STATE_DIR/upgrades，沿用单协调器进程约束。顺序：预检→导入授权→逐个组件安装与健康确认→企业插件安装→原子启用本次全部模块。签名包和进度均持久化；重启继续使用原 TARS 子任务编号。未完成安装时不会自动开放新功能。

失败保留授权和已安装组件，页面提示“继续升级”；不回滚或删除业务数据。TARS 提交结果未知时需要先查询确认，不能盲目重放发布。升级入口不支持企业版降级；已有未完成任务时不接受另一份升级计划。升级期间应避免通过兼容的旧管理 API 修改授权或模块；授权被替换时原任务停止，需管理员检查状态后处理。

旧 license、plugins/install、components/install API 保留给既有集成；页面不再展示这三个独立入口。

## 验证计划

授权签名/额度与旧版本兼容；错误版本、缺少模块或额度在写入前拒绝；专业版和企业版完整安装；TARS 失败重试、重启恢复和幂等；管理员上传前鉴权；Omni 识别 professional。容器验证独立菜单、两个升级动作、无效包不改变状态、服务状态提示及 Community 无 ICC 原生进程。真实原生二进制全套安装与超额拒绝不包含在隔离适配器测试结论中。

## 2026-10-26 本地验证结果

- ConfServer Community 回归 58/58：签名与部署绑定、专业版固定额度、企业版指定额度、完整升级、失败重试、进程重启恢复、配置修订冲突与检查点中断恢复、供应商打包工具、上传前鉴权与详细错误展示。TARS 发布任务使用隔离适配器；模块状态和插件安装使用真实文件实现。
- ConfServer 登录/验证码/locale/租户相关检查 32/32；Omni Community 23/23；Omni 权限回归 91/91；TypeScript 检查及两个 Docker 构建通过。
- 容器实际页面验证：一级菜单无父级子菜单；仅刷新、升级专业版本、升级为企业版本三个按钮。两个升级按钮均实际打开文件选择器并发送对应 edition。有效测试签名但缺少组件的包返回 400，选错目标版本返回 403，签名无效返回 403；页面显示具体原因。匿名访问被现有 SSO 返回未登录结果拦截（HTTP 200、ret_code 500，为旧 SSO 协议）。
- 验证前后版本为 community、revision=0、三项并发均为 0；未生成 modules.json 或升级任务，也未安装/启动任何话务服务。业务表数量维持 users=23、contacts=256、conversations=103、messages=3088。
- ACDServer 当前状态与上报状态均 Inactive、PID=0；框架容器进程中没有 CCS/TAS/ACD/IVR/ITR。流量开关与历史状态记录的说明已在页面验证。
- 最终公共构建检查 98 个资源文件通过，没有设计器实现或 source map。桌面页面无未处理的浏览器异常。由于本会话未提供 Browser 插件，使用 Playwright + 本机 Chrome 验证。截图及脱敏结果保存在本机私有测试目录 community/qa-upgrades-20261026。
- 仅替换 Community 的 ConfServer、Omni 后端镜像，标签均为 community-upgrade-20261026；未操作 main 测试组。未在真实 TARS 发布中心安装完整商业二进制，也未声称验证原生并发硬限制。
