#!/usr/bin/env python3
"""Produce byte-identical offline media and an HTTPS online bootstrap from it."""
import argparse
import hashlib
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import sys
import tarfile
import tempfile
import time
import urllib.parse

sys.dont_write_bytecode = True
HERE = Path(__file__).resolve().parent
if 'smc_delivery_runtime' in sys.modules:
    r = sys.modules['smc_delivery_runtime']
else:
    spec = importlib.util.spec_from_file_location('smc_delivery_runtime', HERE/'runtime.py')
    r = importlib.util.module_from_spec(spec)
    sys.modules['smc_delivery_runtime'] = r
    spec.loader.exec_module(r)


def production_gate(archive, public_key, fingerprint, receipt, release_tools):
    if receipt is None:
        raise r.DeliveryError('Production packaging requires the original exact-artifact VM receipt and release delivery gate')
    tools = Path(release_tools) if release_tools else Path(__file__).resolve().parents[3]/'release'
    helper = tools/'delivery.py'
    if not helper.is_file():
        raise r.DeliveryError('Production delivery gate helper is missing; provide the trusted release tools directory')
    spec = importlib.util.spec_from_file_location('smc_existing_delivery_gates', helper)
    gates = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(gates)
    try:
        return gates.verify_delivery(archive, receipt, public_key, fingerprint)
    except (ValueError, OSError, KeyError) as error:
        raise r.DeliveryError('Production delivery gate refused this archive: %s' % error) from None


def add_bytes(archive, name, data, executable=False):
    member = tarfile.TarInfo(name)
    member.size = len(data)
    member.mode = 0o700 if executable else 0o600
    member.mtime = int(time.time())
    archive.addfile(member, io.BytesIO(data))


def create_packages(archive, public_key, fingerprint, base_url, output, allow_candidate=False, receipt=None, release_tools=None):
    r.validate_url(base_url, base=True)
    archive, public_key, output = Path(archive).resolve(), Path(public_key).resolve(), Path(output).resolve()
    if output.exists():
        raise r.DeliveryError('Output already exists; choose a new output directory')
    pem = public_key.read_text(encoding='ascii')
    info = r.inspect_archive(archive, pem, fingerprint)
    if info['profile'] == 'candidate' and not allow_candidate:
        raise r.DeliveryError('TEST-ONLY candidate input requires explicit --allow-candidate; cannot promote it to production')
    gate = None
    if info['profile'] == 'production':
        gate = production_gate(archive, public_key, fingerprint, receipt, release_tools)
    for name in info['files']:
        basename = Path(name).name.lower()
        if basename == 'smcloud_license.txt' or basename == '.env' or basename.startswith('.env.') or basename.endswith(('.key', '-private.pem', '_private.pem')):
            raise r.DeliveryError('Release includes a private key, environment secret, or customer license file')
    version = info['payload']['version']
    prefix = 'smc-icc-%s%s' % (version, '-candidate' if info['profile'] == 'candidate' else '')
    offline = prefix + '-offline-linux-amd64.tar.gz'
    online = prefix + '-online-linux-amd64.tar.gz'
    online_root = online[:-7]
    url = base_url.rstrip('/') + '/' + urllib.parse.quote(offline)
    metadata = {'schema_version': 1, 'version': version, 'platform': 'linux/amd64', 'profile': info['profile'],
                'sha256': info['sha256'], 'size': info['size'], 'archive_name': offline, 'url': url,
                'public_key_pem': pem, 'public_key_sha256': fingerprint, 'license_model': info['license_model']}
    runtime = (HERE/'runtime.py').read_text(encoding='utf-8-sig')
    runtime += '\n\nMETADATA = ' + repr(metadata) + '\nif __name__ == "__main__":\n    sys.exit(main(METADATA))\n'
    launcher = '''#!/usr/bin/env bash
set -Eeuo pipefail
umask 077
export PYTHONDONTWRITEBYTECODE=1
command -v python3 >/dev/null || { echo "Python 3.8+ required" >&2; exit 1; }
HERE=$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd -P)
exec python3 -I "$HERE/installer.py" "$@"
'''
    native_auth = ('This payload still requires legacy smcloud_license.txt. It is NOT a new Community/professional/enterprise installer.\n'
                   if info['license_model'] == 'legacy-native' else 'Authorization model declared by signed release: %s\n' % info['license_model'])
    candidate = 'TEST-ONLY CANDIDATE. Not approved for customer delivery.\n' if info['profile'] == 'candidate' else ''
    online_readme = candidate + '''SMC-ICC online bootstrap
Only this small archive is downloaded manually. Execution fetches the complete offline release over HTTPS.
No bandwidth reduction or per-component remote fetching is implied.
Install target: Linux/amd64, with Docker/Compose and the prerequisites of the underlying signed installer already installed.
Do not run a cached/modified entrypoint from an untrusted download site.

Verify and cache without installation:
  bash install.sh verify
Install with the native interactive wizard:
  sudo bash install.sh%s
Pass native installer options after --:
  sudo bash install.sh%s -- --yes --target /opt/smc-icc --license /secure/smcloud_license.txt
Native install parameters and licensing depend on the signed payload; this transport does not change them.

The payload SHA-256, size, Ed25519 public key and version are embedded in installer.py.
Interrupted transfers retain .part files; rerun the same command to resume.
HTTPS downgrades, changed payloads, unsigned files, archive links and traversal are rejected before installation.
Cache defaults to ~/.cache/smc-icc/releases; choose --cache-dir for a larger data disk.
The transport never removes customer data volumes or runs database reset commands.
Installing delegates to the signed installer; preserve its backups and read its migration requirements.
''' % (' --allow-candidate' if info['profile'] == 'candidate' else '', ' --allow-candidate' if info['profile'] == 'candidate' else '') + '\n' + native_auth
    readme = candidate + '''用户只选择一种安装方式：

在线：下载 %(online)s，解压后执行 sudo bash install.sh%(candidate)s。
离线：下载 %(offline)s，解压进入 %(root)s，执行 sudo bash install.sh --offline。
在线入口会自动下载同一份完整离线介质；用户无需手动下载两份。
服务器须提前装好 Docker、Compose 及原安装器要求的宿主依赖；本工具不下载或安装 Docker。
Windows 可制作介质、执行下载和 verify；安装目标仍为 Linux/amd64。
专业版/企业版 .smcu 属于应用授权和组件升级，与在线/离线交付方式分别管理。
%(auth)s

供应商上传在线包和离线包到配置的 HTTPS 发布目录；在线包内固定指向离线文件名。
保持目录和发行介质不可变，不能替换同名内容；新版本生成新的两个文件及 SHA256SUMS。
SHA256SUMS 应通过供应商可信渠道分发；在线入口本身的可信下载不能由其自身校验替代。
production 输入仍须通过原 release/delivery.py 的精确介质 VM 收据门禁。
原离线介质的验收不代表新在线入口已完成真实主机联网/断网/重启验收。
''' % {'online': online, 'offline': offline, 'root': info['root'], 'candidate': ' --allow-candidate' if info['profile'] == 'candidate' else '', 'auth': native_auth}
    output.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if shutil.disk_usage(output.parent).free < info['size'] + 32 * 1024 * 1024:
        raise r.DeliveryError('Insufficient output disk space')
    output.mkdir(mode=0o700)
    stage = Path(tempfile.mkdtemp(prefix='.smc-package-', dir=output))
    try:
        shutil.copyfile(archive, stage/offline)
        (stage/offline).chmod(0o600)
        if r.file_sha256(stage/offline) != info['sha256']:
            raise r.DeliveryError('Source archive changed while copying')
        with tarfile.open(stage/online, 'w:gz', compresslevel=1) as bundle:
            add_bytes(bundle, online_root+'/install.sh', launcher.encode(), executable=True)
            add_bytes(bundle, online_root+'/installer.py', runtime.encode())
            add_bytes(bundle, online_root+'/README.txt', online_readme.encode())
            if info['profile'] == 'candidate':
                add_bytes(bundle, online_root+'/TEST-ONLY.txt', candidate.encode())
        checksums = '%s  %s\n%s  %s\n' % (info['sha256'], offline, r.file_sha256(stage/online), online)
        (stage/'SHA256SUMS').write_text(checksums, encoding='ascii')
        (stage/'README.txt').write_text(readme, encoding='utf-8')
        report = {'schema_version': 1, 'version': version, 'platform': 'linux/amd64', 'profile': info['profile'],
                  'offline': offline, 'online': online, 'sha256': info['sha256'], 'url': url,
                  'offline_bytes_unchanged': True, 'license_model': info['license_model'],
                  'source_delivery_gate': gate, 'online_host_acceptance': 'not_asserted'}
        (stage/'delivery.json').write_text(json.dumps(report, indent=2)+'\n', encoding='utf-8')
        for entry in stage.iterdir():
            os.replace(entry, output/entry.name)
    finally:
        resolved = stage.resolve()
        if resolved.parent != output or not resolved.name.startswith('.smc-package-'):
            raise r.DeliveryError('Refusing cleanup outside package output')
        shutil.rmtree(resolved)
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--archive', required=True, help='Existing signed release .tar.gz; never a development Compose snapshot')
    parser.add_argument('--public-key', required=True)
    parser.add_argument('--trusted-key-sha256', required=True, help='Approved DER public-key fingerprint, obtained independently')
    parser.add_argument('--base-url', required=True, help='Immutable HTTPS directory, without credentials or expiring query string')
    parser.add_argument('--output', required=True, help='New output directory; existing directories are not overwritten')
    parser.add_argument('--allow-candidate', action='store_true')
    parser.add_argument('--vm-receipt')
    parser.add_argument('--release-tools', help='Trusted original release tools directory, default workspace/release')
    args = parser.parse_args()
    try:
        report = create_packages(args.archive, args.public_key, args.trusted_key_sha256, args.base_url, args.output,
                                 args.allow_candidate, args.vm_receipt, args.release_tools)
        print(json.dumps(report, indent=2))
        if report['license_model'] == 'legacy-native':
            print('NOTICE: legacy native licensing remains; the new three-edition first-install kernel is not asserted.', file=sys.stderr)
        return 0
    except (r.DeliveryError, OSError) as error:
        print('Packaging failed: %s' % error, file=sys.stderr)
        return 1

if __name__ == '__main__':
    sys.exit(main())
