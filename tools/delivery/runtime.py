#!/usr/bin/env python3
"""Trusted online transport; execute only an immutable, fully verified release."""
import argparse
import base64
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import re
import shutil
import ssl
import stat
import subprocess
import sys
import tarfile
import tempfile
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid

sys.dont_write_bytecode = True
CHUNK = 1024 * 1024
MAX_MANIFEST = 8 * 1024 * 1024
ED25519_DER_PREFIX = bytes.fromhex('302a300506032b6570032100')

class DeliveryError(RuntimeError):
    pass

class IncompleteDownload(DeliveryError):
    pass

def canonical(value):
    return json.dumps(value, ensure_ascii=True, sort_keys=True, separators=(',', ':')).encode()

def file_sha256(path):
    digest = hashlib.sha256()
    with Path(path).open('rb') as stream:
        for block in iter(lambda: stream.read(CHUNK), b''):
            digest.update(block)
    return digest.hexdigest()

def unique_keys(pairs):
    value = {}
    for key, item in pairs:
        if key in value:
            raise DeliveryError('Duplicate JSON key in release metadata')
        value[key] = item
    return value

def safe_parts(name):
    if not isinstance(name, str) or not name or '\\' in name or ':' in name or name.startswith('/'):
        raise DeliveryError('Unsafe archive path')
    parts = name.split('/')
    if any(not p or p in ('.', '..') or any(ord(c) < 32 or ord(c) == 127 for c in p) for p in parts):
        raise DeliveryError('Unsafe archive path')
    return parts

def public_key_der(pem):
    if not isinstance(pem, str) or len(pem) > 65536:
        raise DeliveryError('Invalid release public key')
    try:
        result = subprocess.run(['openssl', 'pkey', '-pubin', '-outform', 'DER'],
                                input=pem.encode(), capture_output=True, check=True)
    except (OSError, subprocess.SubprocessError):
        raise DeliveryError('OpenSSL could not read the release public key') from None
    der = result.stdout
    if len(der) != 44 or not der.startswith(ED25519_DER_PREFIX):
        raise DeliveryError('Release key must be Ed25519')
    return der

def verify_signature(document, pem, fingerprint):
    if not re.fullmatch('[0-9a-f]{64}', fingerprint or ''):
        raise DeliveryError('A trusted release key fingerprint is required')
    if hashlib.sha256(public_key_der(pem)).hexdigest() != fingerprint:
        raise DeliveryError('Release public key fingerprint mismatch')
    try:
        signature = document['signature']
        if signature['algorithm'] != 'ed25519':
            raise DeliveryError('Unsupported signature algorithm')
        sig = base64.b64decode(signature['value'], validate=True)
        if len(sig) != 64:
            raise ValueError()
        message = canonical(document['payload'])
    except (KeyError, TypeError, ValueError):
        raise DeliveryError('Invalid release signature document') from None
    with tempfile.TemporaryDirectory(prefix='smc-signature-') as temporary:
        folder = Path(temporary)
        (folder/'public').write_text(pem, encoding='ascii')
        (folder/'message').write_bytes(message)
        (folder/'signature').write_bytes(sig)
        try:
            result = subprocess.run(['openssl', 'pkeyutl', '-verify', '-pubin', '-inkey', str(folder/'public'),
                                     '-rawin', '-in', str(folder/'message'), '-sigfile', str(folder/'signature')],
                                    capture_output=True)
        except OSError:
            raise DeliveryError('OpenSSL signature verification unavailable') from None
        if result.returncode:
            raise DeliveryError('Release manifest signature invalid')

def inspect_archive(archive_path, pem, fingerprint):
    """Stream all files; do not extract or import code from an unverified archive."""
    actual, names, roots = {}, set(), set()
    document = None
    manifest_name = None
    try:
        with tarfile.open(archive_path, 'r|gz', ignore_zeros=True) as archive:
            for member in archive:
                name = member.name.rstrip('/') if member.isdir() else member.name
                parts = safe_parts(name)
                if name in names or len(names) >= 200000:
                    raise DeliveryError('Duplicate or excessive archive paths')
                names.add(name)
                roots.add(parts[0])
                if not (member.isdir() or member.isfile()):
                    raise DeliveryError('Archive links and special files are prohibited')
                if member.isdir():
                    continue
                if len(parts) < 2 or member.size < 0:
                    raise DeliveryError('Files must be inside one release directory')
                with archive.extractfile(member) as stream:
                    if len(parts) == 2 and parts[-1] == 'manifest.json':
                        if document is not None or member.size > MAX_MANIFEST:
                            raise DeliveryError('Expected one bounded release manifest')
                        document = json.loads(stream.read(), object_pairs_hook=unique_keys)
                        manifest_name = name
                    else:
                        digest = hashlib.sha256()
                        for block in iter(lambda: stream.read(CHUNK), b''):
                            digest.update(block)
                        actual[name] = {'sha256': digest.hexdigest(), 'size': member.size}
    except (tarfile.TarError, OSError, EOFError, ValueError, TypeError):
        raise DeliveryError('Release archive is malformed or incomplete') from None
    if document is None or len(roots) != 1:
        raise DeliveryError('Expected one signed release root')
    verify_signature(document, pem, fingerprint)
    payload = document['payload']
    if not isinstance(payload, dict) or payload.get('schema_version') != 1 or payload.get('platform') != 'linux/amd64':
        raise DeliveryError('Unsupported release schema or target platform')
    version = payload.get('version', '')
    if not isinstance(version, str) or not re.fullmatch(r'\d+\.\d+\.\d+(?:-[A-Za-z0-9.-]+)?', version):
        raise DeliveryError('Invalid signed release version')
    entries = payload.get('files')
    if not isinstance(entries, list) or len(entries) > 200000:
        raise DeliveryError('Invalid signed file inventory')
    root = next(iter(roots))
    if manifest_name != root + '/manifest.json':
        raise DeliveryError('Release manifest root mismatch')
    expected = {}
    for entry in entries:
        if not isinstance(entry, dict):
            raise DeliveryError('Invalid signed file inventory')
        safe_parts(entry.get('path'))
        name = root + '/' + entry['path']
        if name in expected or not re.fullmatch('[0-9a-f]{64}', entry.get('sha256', '')) or type(entry.get('size')) is not int or entry['size'] < 0:
            raise DeliveryError('Invalid or duplicate signed file entry')
        expected[name] = {'sha256': entry['sha256'], 'size': entry['size']}
    if actual != expected:
        raise DeliveryError('Unsigned, missing, or changed files in release archive')
    if any(root + '/' + p not in expected for p in ('install.sh', 'VERSION')):
        raise DeliveryError('Signed release installer or VERSION missing')
    profile = payload.get('release', {})
    if not isinstance(profile, dict) or profile.get('profile') not in ('candidate', 'production'):
        raise DeliveryError('Release has no explicit candidate/production profile')
    return {'payload': payload, 'root': root, 'files': expected, 'sha256': file_sha256(archive_path),
            'size': Path(archive_path).stat().st_size, 'profile': profile['profile'],
            'license_model': profile.get('authorization_model', 'legacy-native')}

def validate_url(url, base=False):
    try:
        parsed = urllib.parse.urlsplit(url)
        if (parsed.scheme != 'https' or not parsed.hostname or parsed.username is not None or parsed.password is not None
                or parsed.fragment or (base and parsed.query) or any(ord(c) < 32 for c in url)):
            raise ValueError()
        parsed.port
    except (ValueError, TypeError, AttributeError):
        raise DeliveryError('A stable HTTPS URL without embedded credentials is required') from None
    return url

class SecureRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        validate_url(newurl)
        return super().redirect_request(req, fp, code, msg, headers, newurl)

def regular_file(path):
    try:
        info = Path(path).lstat()
    except FileNotFoundError:
        return False
    if not stat.S_ISREG(info.st_mode) or info.st_nlink != 1:
        raise DeliveryError('Cache path is not a private regular file')
    return True

def private_open(path, append=False):
    regular_file(path)
    flags = os.O_WRONLY | os.O_CREAT | (os.O_APPEND if append else os.O_TRUNC) | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_BINARY', 0)
    return os.fdopen(os.open(path, flags, 0o600), 'ab' if append else 'wb')

def download(url, dest, expected_sha, expected_size, ssl_context=None, attempts=3, retry_delay=1):
    validate_url(url)
    if not re.fullmatch('[0-9a-f]{64}', expected_sha or '') or type(expected_size) is not int or expected_size <= 0:
        raise DeliveryError('Invalid pinned archive digest or size')
    dest = Path(dest)
    dest.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
    if regular_file(dest):
        if dest.stat().st_size == expected_size and file_sha256(dest) == expected_sha:
            return dest
        dest.rename(dest.with_name(dest.name + '.corrupt-' + uuid.uuid4().hex))
    part = Path(str(dest) + '.part')
    opener = urllib.request.build_opener(SecureRedirect(), urllib.request.HTTPSHandler(context=ssl_context or ssl.create_default_context()))
    for attempt in range(attempts):
        offset = part.stat().st_size if regular_file(part) else 0
        if offset > expected_size:
            part.unlink(); offset = 0
        if offset == expected_size:
            if file_sha256(part) == expected_sha:
                os.replace(part, dest); return dest
            part.unlink()
            raise DeliveryError('Downloaded archive SHA-256 mismatch; no installer executed')
        headers = {'User-Agent': 'SMC-ICC-delivery/1', 'Accept-Encoding': 'identity'}
        if offset:
            headers['Range'] = 'bytes=%d-' % offset
        try:
            with opener.open(urllib.request.Request(url, headers=headers), timeout=30) as response:
                status = response.status
                if status == 206:
                    match = re.fullmatch(r'bytes (\d+)-(\d+)/(\d+)', response.headers.get('Content-Range', ''))
                    if not match or tuple(map(int, (match[1], match[3]))) != (offset, expected_size) or int(match[2]) >= expected_size or int(match[2]) < offset:
                        raise DeliveryError('Invalid resumed download range')
                    remaining = int(match[2]) - offset + 1
                elif status == 200:
                    offset = 0; remaining = expected_size
                else:
                    raise DeliveryError('Unexpected HTTPS download status')
                length = response.headers.get('Content-Length')
                if length is not None and (not length.isdigit() or int(length) != remaining):
                    raise DeliveryError('Download length differs from the pinned archive')
                written = offset
                with private_open(part, append=bool(offset)) as output:
                    while True:
                        block = response.read(CHUNK)
                        if not block:
                            break
                        written += len(block)
                        if written > expected_size:
                            raise DeliveryError('Download exceeds the pinned archive size')
                        output.write(block)
                if written != expected_size:
                    raise IncompleteDownload('Incomplete HTTPS transfer')
            if file_sha256(part) != expected_sha:
                part.unlink()
                raise DeliveryError('Downloaded archive SHA-256 mismatch; no installer executed')
            os.replace(part, dest)
            return dest
        except (urllib.error.URLError, OSError, IncompleteDownload):
            if attempt + 1 == attempts:
                raise DeliveryError('HTTPS transfer interrupted; check network/certificates and rerun to resume') from None
            time.sleep(retry_delay)
    raise DeliveryError('HTTPS download did not complete')

@contextmanager
def cache_lock(folder, digest):
    folder = Path(folder)
    folder.mkdir(parents=True, exist_ok=True, mode=0o700)
    path = folder / (digest + '.lock')
    regular_file(path)
    flags = os.O_RDWR | os.O_CREAT | getattr(os, 'O_NOFOLLOW', 0) | getattr(os, 'O_BINARY', 0)
    with os.fdopen(os.open(path, flags, 0o600), 'r+b') as stream:
        if stream.seek(0, 2) == 0:
            stream.write(b'1'); stream.flush()
        stream.seek(0)
        try:
            if os.name == 'nt':
                import msvcrt
                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl
                fcntl.flock(stream.fileno(), fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError:
            raise DeliveryError('Another process is using this release cache') from None
        try:
            yield
        finally:
            stream.seek(0)
            if os.name == 'nt':
                msvcrt.locking(stream.fileno(), msvcrt.LK_UNLCK, 1)
            else:
                fcntl.flock(stream.fileno(), fcntl.LOCK_UN)

def remove_owned_stage(stage, parent):
    stage, parent = Path(stage).resolve(), Path(parent).resolve()
    if stage.parent != parent or not stage.name.startswith('.smc-extract-'):
        raise DeliveryError('Refusing to remove a directory outside the installer cache')
    shutil.rmtree(stage)

def run_installer(archive_path, info, installer_args, cache, runner=subprocess.run):
    if any(arg in ('install', 'verify', 'download', 'list', '--offline') or arg == '--bundle' or arg.startswith('--bundle=') for arg in installer_args):
        raise DeliveryError('Installer action and bundle location cannot be overridden')
    if file_sha256(archive_path) != info['sha256']:
        raise DeliveryError('Archive changed after verification')
    cache = Path(cache).resolve()
    cache.mkdir(parents=True, exist_ok=True, mode=0o700)
    required = sum(entry['size'] for entry in info['files'].values())
    if shutil.disk_usage(cache).free < required + 16 * 1024 * 1024:
        raise DeliveryError('Insufficient cache space to extract the selected release')
    stage = Path(tempfile.mkdtemp(prefix='.smc-extract-', dir=cache))
    try:
        seen = set()
        with tarfile.open(archive_path, 'r|gz', ignore_zeros=True) as archive:
            for member in archive:
                name = member.name.rstrip('/') if member.isdir() else member.name
                parts = safe_parts(name)
                if parts[0] != info['root'] or name in seen or not (member.isdir() or member.isfile()):
                    raise DeliveryError('Unsafe extraction inventory')
                seen.add(name)
                target = stage.joinpath(*parts)
                if member.isdir():
                    target.mkdir(parents=True, exist_ok=True, mode=0o700); continue
                target.parent.mkdir(parents=True, exist_ok=True, mode=0o700)
                expected = info['files'].get(name)
                if expected is None and name != info['root'] + '/manifest.json':
                    raise DeliveryError('Unsigned file during extraction')
                digest = hashlib.sha256(); total = 0
                with archive.extractfile(member) as source, target.open('xb') as output:
                    for block in iter(lambda: source.read(CHUNK), b''):
                        total += len(block); digest.update(block); output.write(block)
                if expected is not None and (total != expected['size'] or digest.hexdigest() != expected['sha256']):
                    raise DeliveryError('Release changed while extracting')
                target.chmod(0o700 if member.mode & 0o111 else 0o600)
        if not set(info['files']).issubset(seen):
            raise DeliveryError('Release files missing during extraction')
        root = stage / info['root']
        env = dict(os.environ, PYTHONDONTWRITEBYTECODE='1')
        result = runner(['bash', str(root/'install.sh'), 'install', '--offline', '--bundle', str(root), *installer_args], cwd=root, env=env)
        return result.returncode
    finally:
        remove_owned_stage(stage, cache)

def main(metadata, argv=None):
    parser = argparse.ArgumentParser(description='Download, verify and run the same SMC-ICC offline installer.')
    parser.add_argument('action', nargs='?', choices=('install', 'verify', 'download'), default='install')
    parser.add_argument('--cache-dir', default=str(Path.home()/'.cache'/'smc-icc'/'releases'))
    parser.add_argument('--allow-candidate', action='store_true')
    # Native installer arguments follow --; their values are never shell-expanded.
    arguments = list(sys.argv[1:] if argv is None else argv)
    split = arguments.index('--') if '--' in arguments else len(arguments)
    args = parser.parse_args(arguments[:split]); extra = arguments[split+1:] if split < len(arguments) else []
    try:
        if sys.version_info < (3, 8):
            raise DeliveryError('Python 3.8 or newer is required')
        validate_url(metadata['url'])
        if metadata.get('schema_version') != 1 or metadata.get('platform') != 'linux/amd64':
            raise DeliveryError('Unsupported online installer metadata')
        if metadata.get('profile') == 'candidate' and args.action == 'install' and not args.allow_candidate:
            raise DeliveryError('TEST-ONLY candidate requires --allow-candidate; not a customer release')
        if args.action != 'install' and extra:
            raise DeliveryError('Native installer arguments apply only to install')
        if args.action == 'install' and (platform.system() != 'Linux' or platform.machine().lower() not in ('x86_64', 'amd64')):
            raise DeliveryError('Installation target must be Linux/amd64; verify/download also work on build hosts')
        if metadata.get('profile') not in ('candidate', 'production'):
            raise DeliveryError('Unknown signed release profile')
        # Check the verification tool/key before downloading a large payload.
        fingerprint = metadata.get('public_key_sha256', '')
        if not re.fullmatch('[0-9a-f]{64}', fingerprint) or hashlib.sha256(public_key_der(metadata.get('public_key_pem'))).hexdigest() != fingerprint:
            raise DeliveryError('Pinned release public key mismatch')
        digest = metadata['sha256']
        if not re.fullmatch('[0-9a-f]{64}', digest or ''):
            raise DeliveryError('Invalid pinned release digest')
        cache = Path(args.cache_dir).resolve()
        with cache_lock(cache, digest):
            archive = download(metadata['url'], cache/(digest+'.tar.gz'), digest, metadata['size'])
            info = inspect_archive(archive, metadata['public_key_pem'], metadata['public_key_sha256'])
            if (info['sha256'] != digest or info['profile'] != metadata['profile']
                    or info['payload']['version'] != metadata['version']):
                raise DeliveryError('Pinned release identity changed')
            print('[smc-icc] Verified %s (%s); authorization model: %s' % (metadata['version'], info['profile'], info['license_model']), flush=True)
            if info['license_model'] == 'legacy-native':
                print('[smc-icc] This release uses the legacy native license; it is not a new Community/professional/enterprise installer.', flush=True)
            if args.action != 'install':
                print('[smc-icc] Verified archive cached at: %s' % archive, flush=True)
                return 0
            return run_installer(archive, info, extra, cache)
    except (DeliveryError, OSError, tarfile.TarError) as error:
        print('[smc-icc] %s' % (str(error) if isinstance(error, DeliveryError) else 'Local operation failed; existing data and volumes were not removed'), file=sys.stderr)
        return 1
