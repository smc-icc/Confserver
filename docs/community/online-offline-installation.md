# 在线与离线安装包：制作和用户执行

用户选择在线引导包或离线完整包中的一种即可。在线/离线是传输方式；开源版/专业版/企业版是功能与授权版本，不能混为六套独立产品。商业功能的 `.smcu` 升级包另按目标部署签发。

## 当前实现和边界

本次新增 `tools/delivery/build-installers.py` 和 `tools/delivery/runtime.py`，以已有、已签名的 Linux/amd64 发行介质为输入，生成两种交付入口。现有 `release/publish.sh` 继续负责构建签名离线介质，根目录 `install.sh` 继续负责安装，不重写其数据库、卷、恢复和初始化逻辑。

**现有根安装器仍要求旧的 smcloud_license.txt，尚未完成新版 Community 无 ICC 的首次安装、SMC 部署标识和公钥初始化及新版三版本原生授权联动。** 工具读取签名发行清单中的 `authorization_model`；缺失时按 `legacy-native` 明确标注并提示。它不会通过改文件名把旧发行包变成新版专业版/企业版。源码中已经存在的新 `.smcu` 升级协议，也不能代替首次安装内核适配。

因此，这次完成的是两个安装包的制作/传输/验证/一键执行工具。当前只有合成介质和隔离安装委托测试，不代表已制作可正式给客户的新版三版本平台安装包。正式交付还须提供已适配的新安装内核、真实镜像和空白初始化资产，并完成该精确介质的主机验收。

## 用户下载和执行

|环境|手动下载|脚本行为|
|---|---|---|
|服务器可访问供应商 HTTPS 下载站|online 小包|下载同版本完整离线介质，校验 SHA-256、Ed25519 清单和所有文件，再执行原安装器|
|隔离或无法访问下载站的服务器|offline 完整包|直接执行包内原安装器，安装阶段不从镜像仓库拉取内容|

在线方式减少用户手工搬运步骤，不减少实际完整镜像/模型下载量，也未实现逐组件在线按需下载。离线指安装介质完整，不能据此推导微信、邮件或外部 API 等业务渠道可脱网工作。

安装目标沿用 Linux/amd64。制作工具可在 Windows 或 Linux 的 Python 3.9+、OpenSSL 3 环境运行。Windows 上可以制作介质、下载和 verify；Windows 原生部署、macOS 和 ARM 安装不在本次范围。Docker Desktop 中的隔离 Linux 测试也不代替真实主机安装与整机重启验收。

目标 Linux 主机须预先安装原安装器要求的 Docker/Compose、Python 3.8+、OpenSSL 3、zstd、curl、iproute2、util-linux 等依赖。本工具不自动下载或安装 Docker，不执行未经固定校验的远程安装脚本。完全裸机需要先准备宿主运行时；真正完全离线时，Docker/系统依赖须另备与发行版匹配的离线安装介质。

### 在线用户

从供应商可信站点取得小包与对应 SHA256SUMS，验证后解压，进入在线包目录，执行：

```bash
# 一次启动安装向导。正式已验收的生产介质无需 candidate 参数。
sudo bash install.sh

# 仅下载并完成校验，不启动任何服务
bash install.sh verify

# 下载、校验并保留缓存，供后续执行使用
bash install.sh download --cache-dir /data/smc-installer-cache
```

在线入口内固定了版本、完整离线文件名、下载地址、文件大小、SHA-256、Ed25519 公钥及受信指纹。不会从远端获取一份可随意改写的新清单来决定要执行什么。网络中断保留 `.part`，重新执行同一命令可继续；服务端不支持 Range 时会从头下载。内容损坏、HTTPS 降级、签名不符、缺文件、额外文件、链接或路径穿越都会在执行安装器前拒绝。

缓存默认在运行用户的 `~/.cache/smc-icc/releases`，sudo 时通常为 root 的缓存。大介质建议指定空间充足的缓存盘。缓存空间还需容纳解包后的文件，不只看压缩包大小。同一介质的缓存并发由进程锁处理，安装业务并发仍由原安装器处理。

需要向原内核传递参数时放在 `--` 后，参数原样传递，不经过 shell 字符串拼接。例如，**当前旧许可内核**：

```bash
sudo bash install.sh install --cache-dir /data/smc-installer-cache -- \
  --yes --target /opt/smc-icc --license /secure/smcloud_license.txt
```

一次启动向导不等于完全无人值守。无人值守还需按内核要求准备 PUBLIC_IP、受保护的数据库/服务配置、许可与可选组件选择；密码不要放到下载 URL 或可公开查看的命令行中。`--yes` 的含义沿用原内核，并不代表自动启用所有商业或可选服务。

### 离线用户

下载完整 offline 包和 SHA256SUMS，在联网中转机搬运到目标服务器，校验后解压并进入包内原发行目录：

```bash
# 一次启动原安装向导
sudo bash install.sh --offline

# 当前旧许可内核的参数示例
sudo bash install.sh --offline --license /secure/smcloud_license.txt
```

包内顶层目录沿用原签名发行目录名，不会因为下载文件名增加 offline 而改变。具体目录名在本次输出的 README.txt 中列明。在线和离线最终调用同一个安装内核，所以其默认端口、数据卷、数据库处理、组件选择及许可要求一致；传输工具不会删除已有业务数据或数据卷，也不会替代原安装器对升级和备份的要求。

## 供应商制作

### 第一步：准备合格的原始离线介质

沿用工作区 `release/publish.sh`。candidate 和 production 流程不能混用：

- candidate 使用独立测试签名和测试资产，保留 TEST-ONLY，不可直接交给客户。
- production 继续执行原发行流程的受控签名、空白 seed 审批、依赖审计、镜像检查和精确介质 VM 验收。详见工作区 `release/DELIVERY.md`。
- 供应商分发签名私钥由自己保管，本次制作脚本只需要配套公钥与独立审批的公钥指纹。这个分发密钥与 `.smcu` 的授权签名、组件插件签名用途分别管理。
- 不把开发测试 Compose、容器检查点、真实业务数据库备份、客户许可、`.env` 或私钥当作可公开发行输入。

本工具不会替你生成 production 审批、审计或虚拟机收据，也不会用旧介质的记录证明新介质通过。

### 第二步：一次制作两种入口

在工作区根目录运行。下列变量须由实际发行流水线填写：

```bash
SIGNED_ARCHIVE=/srv/smc-release/input/smc-icc-release.tar.gz
RELEASE_PUBLIC_KEY=/secure/release-public.pem
# 从受控签名台账取得 DER 公钥指纹，不能盲信待安装包自带的公钥。
TRUSTED_RELEASE_KEY_SHA256=替换为已审批的64位十六进制指纹
VM_RECEIPT=/secure/acceptance/exact-artifact-vm.json
OUTPUT=/srv/smc-release/delivery/new-version

python3 ConfServer/tools/delivery/build-installers.py \
  --archive "$SIGNED_ARCHIVE" \
  --public-key "$RELEASE_PUBLIC_KEY" \
  --trusted-key-sha256 "$TRUSTED_RELEASE_KEY_SHA256" \
  --base-url https://downloads.example.com/smc-icc/new-version \
  --output "$OUTPUT" \
  --vm-receipt "$VM_RECEIPT" \
  --release-tools release
```

`--base-url` 是供应商将要托管输出的 HTTPS 目录，例子不是可用下载站。工具只生成文件，不上传、不创建镜像仓库、不发送消息，也不配置域名或 TLS。地址不能含用户名密码、临时查询串或 fragment；使用不会被覆盖的版本目录。

输入为 candidate 时须显式加 `--allow-candidate`，无需生产 VM 收据；生成的两个文件名和说明仍保留 candidate / TEST-ONLY。候选在线包的 install 也须显式 `--allow-candidate`；verify/download 只检查候选介质，不会因此启动服务。不得把这个参数作为正式交付捷径。

production 输入会再次调用原 `release/delivery.py.verify_delivery` 检查这个精确 tar.gz 的签名、文件、源发行门禁和真实 VM 收据。`--release-tools` 必须指向供应商受控工具目录，不要指向待安装包中的脚本。原离线介质的验收不代替新增在线引导入口的真实联网、断网恢复、主机安装及重启验收；`delivery.json` 明确标记在线主机验收未被本工具断言。

### 第三步：检查输出并发布

输出目录必须是新目录，不覆盖旧交付物：

```text
new-version/
  smc-icc-<version>-offline-linux-amd64.tar.gz
  smc-icc-<version>-online-linux-amd64.tar.gz
  SHA256SUMS
  README.txt
  delivery.json
```

candidate 文件名额外包含 candidate。offline 文件是原始签名 tar.gz 的逐字节复制，SHA-256 不变，原签名和精确介质验收不会因重打包而失效。online 小包包含 install.sh、嵌入固定元数据的 installer.py 和说明，不包含发行私钥。

把两个文件上传到 `--base-url` 指定的目录，校验站点下载的文件 SHA-256 与本地输出相同，再在下载页展示“在线安装”和“离线安装”两个选择。用户只手动选择一个。SHA256SUMS 也须经可信渠道分发，不能把从不可信站点下载的脚本依靠其自身校验变成可信入口。

页面版本选择可继续单独展示开源版、专业版、企业版。新版平台首次安装内核适配完成后，可复用这套交付工具；专业/企业 `.smcu` 的部署 ID、公钥和原生组件安装联动应按新版验收，不能自动沿用旧许可数据。

## 测试命令与证据范围

```bash
# 在具备 Python 3.9+ 与 OpenSSL 3 的制作机运行
python3 -m unittest discover -s ConfServer/tools/delivery/tests -p 'test_*.py' -v
# Windows 制作机可使用 python 替代 python3
```

回归覆盖签名、公钥指纹、完整文件清单、额外/修改文件、链接、路径穿越、候选与生产门禁、凭据文件拒绝、真实本机 HTTPS、Range/服务器忽略 Range、中断恢复、错误散列/长度/Range、HTTPS 降级、缓存复用，以及生成入口不改动自身目录。

Linux 隔离验证还实际执行生成的入口两次，原样传递目标参数到无害假安装器，确认测试数据哨兵保留。该测试不启动真实应用、不挂载业务卷、不连接 Docker socket，不是整机安装、真实业务链路或正式 VM 验收。Windows 上不能假定符号链接权限或运行 Linux bash，所以这两项只在隔离 Linux 中执行，不把 skip 说成通过。

## 2026-10-26 本地结果

- Linux/amd64 隔离容器：19/19 通过，包括真实本机 TLS 下载及生成入口实际委托假安装器两次；未挂载 Docker socket 或业务数据。
- Windows Python/OpenSSL：19 项中 17 项通过，Linux bash 委托和符号链接权限两项不在 Windows 执行，已在上述 Linux 回归通过。
- 现有 ConfServer Community JavaScript 回归 58/58 通过。
- 未修改根 release/publish.sh、install.sh、release/delivery.py 或已有签名介质；未构建/发布生产发行包；未重建、重启现有 main 或 Community 应用容器。
- 尚未完成新版三版本首次安装内核与原生并发硬限制、真实发行介质整机重启及联网/断网主机验收；所有合成签名与证书仅用于测试。
