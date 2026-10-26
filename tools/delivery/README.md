# 在线/离线交付工具

- `build-installers.py`：供应商输入已有的已签名发行 tar.gz、公钥、受信公钥指纹和 HTTPS 发布目录，一次生成离线完整包、在线引导包、SHA256SUMS、README.txt、delivery.json。离线文件逐字节保持不变。
- `runtime.py`：在线包的 Python 模板；生成时嵌入固定版本、SHA-256、大小、公钥和下载地址。用户使用产物内 `install.sh` 执行，不直接运行本模板。
- `tests/test_delivery.py`：独立密钥、合成介质、本机 TLS 服务及无害安装器。不是客户发行包或正式 VM 验收。

操作手册：[`docs/community/online-offline-installation.md`](../../docs/community/online-offline-installation.md)。

```text
python tools/delivery/build-installers.py --help
python -m unittest discover -s tools/delivery/tests -p "test_*.py" -v
```

制作主机需要 Python 3.9+ 与 OpenSSL 3；安装目标沿用已有内核的 Linux/amd64、Docker/Compose 和宿主依赖。production 继续调用工作区 release/delivery.py 的精确介质收据门禁。candidate 必须显式标识，不能改名升级成 production。

现有安装内核仍采用旧原生 smcloud_license.txt，不能把传输工具说成已完成新版 Community/专业/企业首次安装内核。对应边界在产物和操作手册中保留；本工具不生成生产签名、审批、验收记录，不触碰现有测试或生产数据卷。
