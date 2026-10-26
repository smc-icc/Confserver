# Community VDN 基本信息误报修复（2026-10-26）

## 复现与根因

本地地址 `http://127.0.0.1:3200/tars.html#/smcicc/system/vdn?tab=basic&vdnId=1`。
Community 的 ICC、ITR 能力关闭，但 VdnManager 进入/选择 VDN 时仍并行加载话务接入码、TAS 节点和 ITR 流程。`loadAccessCodeListByNotAssignSelf` 返回 403，使整个 Promise.all 进入“VDN 配置项加载失败”分支。`itrflow/list` 同样返回 403，虽然方法内部吞掉异常，也会触发浏览器错误。基础 VDN、父级列表、管理员和基本信息接口本身成功。

页面模板此前只隐藏话务页签，没有同步隐藏基础表单内的录音、转写、SIP 校验、发布节点、接入码和 ITR 默认流程字段。mounted 也在能力刷新完成前发起数据请求。

## 修复

- mounted 先确认能力，再开始 VDN 读取。基础管理不依赖 ICC 进程运行。
- 接入码仅在 ICC 可用时加载；节点仅在 ICC 或企业设计器可用时加载；ITR 列表仅在 ITR 或企业设计器可用时加载。
- 开源版现有、添加、复制 VDN 均不调用未授权的商业选项接口；基础信息失败仍会报告配置加载失败，不使用全局忽略 403 的方式隐藏真实错误。
- 主表单及新增/复制弹窗按能力隐藏话务与 ITR 字段。专业版保留运行配置，企业设计器按原权限控制。
- 保存时省略隐藏字段，保留既有话务配置供后续升级使用。后端 editVdn 不再用缺失 nodeIds 解释成清空；显式空数组仍支持清空。
- 修正 ID 文本解析：空字符串不再转为接入码 ID 0，省略的接入码字段不触发绑定写入。
- 保留现有商业接口的后端模块校验，不导入授权、不启动 ICC 进程、不修改 main 测试组。

## 验证

- 新增 7 项行为回归，先复现失败再修复：Community 现有/添加/复制请求、专业/企业能力、真实基础错误、初始化顺序、保存字段、保留省略绑定和显式清空。
- 全部 Community 回归 65/65 通过；相关登录/VDN ID/租户/locale 等合并检查 42/42 通过（含上述 7 项，不应重复加总成独立测试数）；既有 VDN 渠道和路由身份检查通过。
- Playwright + 本机 Chrome 实际访问原地址（本会话无 Browser 插件），主表单只有 VDN编号、VDN名称、父 VDN，未发起 AccessCode、loadTasList、loadVdnNodeBindList 或 itrflow/list 选项请求。无页面异常/控制台错误。
- 实际保存原值成功，HTTP 请求只包含 vdn.id、vdn.name、vdn.parentId；切换渠道与基本信息正常，旧 IVR 页签链接无法恢复未授权设计器。
- 直接调用接入码接口仍返回 403，授权守卫未放宽。
- 部署及原值保存前后，t_icc_vdn、t_icc_vdn_node_bind、t_icc_base_accesscode 按稳定顺序计算的联合 SHA-256 相同；业务数据维持用户23、联系人256、会话103、消息3088。
- 公共构建检查 98 个文件通过。仅替换 smc-icc-community-test 的 ConfServer，镜像标签 community-vdn-basic-20261026。
- 截图及报告保存在本机私有测试目录 `community/qa-vdn-basic-20261026`。此次未导入商业授权进行真实专业/企业通话验收；相关可用模块分支通过隔离行为测试覆盖。
