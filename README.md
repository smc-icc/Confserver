# ConfServer Community

基于 TARS 的全媒体客服配置与运维平台，支持 VDN 租户管理、版本授权、组件安装与企业插件扩展。

Configuration and operations console for omnichannel customer service on TARS, supporting VDN tenant management, edition licensing, component installation, and enterprise plugins.

## 项目结构

- app/、midware/、sso/：配置管理与服务接口。
- client/：Vue 配置管理前端。
- tools/：Community 源码检查、升级签名、打包与交付工具。
- docs/community/：版本、授权、组件与安装说明。

## Community 范围

提供配置管理与 Omni 对接能力，商业模块按已安装、启用及有效授权共同控制。IVR/ITR 企业流程设计器实现不包含在此仓库，企业版通过独立签名插件交付；ICC 核心服务源码也不在此仓库。

未安装的商业服务不会出现在服务管理中；组件经部署、发布和状态确认，记录实际服务/节点安装收据后才展示。TARS 框架仍正常展示。

相关公开工程：OmniAgent 位于 GitHub 的 smc-icc/OmniAgent 仓库。

## 构建

Node.js 22，使用随仓库提供的锁文件。

~~~bash
cd client
npm ci
npm run build:community
~~~

从仓库根目录构建完整 ConfServer 镜像：

~~~bash
docker build -f docker/Dockerfile.community -t smc-icc/confserver:community .
~~~

实际运行需要自己的数据库、Redis、TARS 框架和部署配置，参见 [Community 手册](docs/community/README.md)。示例配置/默认凭据用于开发说明，不能直接作为公开生产配置。

## 文档

- [版本、授权与运行](docs/community/README.md)
- [专业版/企业版升级包制作](docs/community/package-production.md)
- [在线/离线安装交付工具](docs/community/online-offline-installation.md)
- [公开快照来源与范围](PUBLICATION.md)

原生并发硬限制、自动进程停启及新版首次安装内核仍有待联动与验收，具体边界见文档。

## License

BSD-3-Clause。保留上游 TARS 的原有声明；见 LICENSE、NOTICE 和 LICENSES/TARS-BSD-3-Clause.txt。
