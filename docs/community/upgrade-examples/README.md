# 升级包示例

这里均为未签名的制作模板，不是可安装的专业版或企业版成品包。制作步骤见 [安装包制作手册](../package-production.md)。

- professional.license.json：专业版固定 2/2/2 额度的授权载荷。
- enterprise.license.json：企业版示例，坐席 20、语音并发 30、视频并发 6；签发时按实际合同调整。
- professional.manifest.json、enterprise.manifest.json：合并签名文档时使用的清单，路径相对于清单文件。
- ivr.plan.example.json、itr.plan.example.json、aiqc.plan.example.json：对应已登记服务的计划模板，同样需要替换节点和 patchId。
- icc.plan.example.json：仅演示复用已登记的 CCS/TAS/ACD 服务。patchId=0 和目标节点占位符必须替换；当前安装器会拒绝 patchId=0。它不是所有客户通用的完整 ICC 依赖清单。

复制到供应商私有交付目录后编辑，填入实际 deploymentId、递增 revision、有效期、节点、发布包 ID、配置和依赖。不要在公共工程内存放客户真实授权、私钥、连接凭据或生成后的商业交付物。所有计划最终须来自经过验证的真实部署清单；外呼与其他模块共享进程时，先确认组件映射；不能根据模块名称虚构服务名。
