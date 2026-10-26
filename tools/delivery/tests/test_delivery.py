"""Synthetic transport fixtures only; no customer release or real VM evidence."""
import base64
import hashlib
import gzip
import importlib.util
import io
import json
import os
from pathlib import Path
import shutil
import ssl
import subprocess
import sys
import tarfile
import tempfile
import threading
import unittest
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from unittest.mock import patch

HERE = Path(__file__).resolve().parents[1]

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

r = load('delivery_runtime_test', HERE / 'runtime.py')
sys.modules['smc_delivery_runtime'] = r
b = load('delivery_builder_test', HERE / 'build-installers.py')

class Fixture(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='smc-transport-TEST-ONLY-')
        self.root = Path(self.temp.name)
        self.key = self.root / 'test-private.pem'
        self.pub = self.root / 'test-public.pem'
        subprocess.run(['openssl', 'genpkey', '-algorithm', 'ED25519', '-out', str(self.key)], check=True, capture_output=True)
        subprocess.run(['openssl', 'pkey', '-in', str(self.key), '-pubout', '-out', str(self.pub)], check=True, capture_output=True)
        self.pem = self.pub.read_text()
        der = subprocess.check_output(['openssl', 'pkey', '-pubin', '-in', str(self.pub), '-outform', 'DER'])
        self.fp = hashlib.sha256(der).hexdigest()
        self.archive = self.root / 'signed-input.tar.gz'
        self.files = {'install.sh': b'#!/usr/bin/env bash\nset -eu\nprintf "%s\\n" "$@" > "$TEST_INSTALL_LOG"\n', 'VERSION': b'4.0.0-test\n', 'seed/empty.sql': b'-- synthetic, no business rows\n', 'TEST-ONLY.txt': b'SYNTHETIC TEST ONLY\n'}
        self.profile = {'profile': 'candidate', 'customer_release_ready': False}
        self.write_archive()
    def tearDown(self):
        self.temp.cleanup()
    def write_archive(self, extras=None, unsafe=None, unsigned=False):
        payload = {'schema_version': 1, 'version': '4.0.0-test', 'platform': 'linux/amd64', 'release': self.profile,
                   'components': [], 'files': [{'path': p, 'size': len(data), 'sha256': hashlib.sha256(data).hexdigest()} for p, data in self.files.items()]}
        msg, sig = self.root / 'message', self.root / 'signature'
        msg.write_bytes(r.canonical(payload))
        subprocess.run(['openssl', 'pkeyutl', '-sign', '-rawin', '-inkey', str(self.key), '-in', str(msg), '-out', str(sig)], check=True, capture_output=True)
        document = {'payload': payload, 'signature': {'algorithm': 'ed25519', 'value': base64.b64encode(sig.read_bytes()).decode()}}
        if unsigned: document['signature']['value'] = base64.b64encode(bytes(64)).decode()
        content = dict(self.files)
        content['manifest.json'] = json.dumps(document).encode()
        content.update(extras or {})
        with tarfile.open(self.archive, 'w:gz') as archive:
            for p, data in content.items():
                info = tarfile.TarInfo('signed-release/' + p); info.size = len(data); info.mode = 0o700 if p.endswith('.sh') else 0o600
                archive.addfile(info, io.BytesIO(data))
            if unsafe: archive.addfile(unsafe)
    def inspect(self):
        return r.inspect_archive(self.archive, self.pem, self.fp)
    def build(self, **kwargs):
        return b.create_packages(self.archive, self.pub, self.fp, 'https://downloads.example.invalid/releases/4.0.0/', self.root / 'output', allow_candidate=True, **kwargs)

class ArchiveTests(Fixture):
    def test_signed_inventory_and_candidate_status_are_checked(self):
        info = self.inspect()
        self.assertEqual(info['profile'], 'candidate')
        self.assertEqual(info['root'], 'signed-release')
        self.assertEqual(info['license_model'], 'legacy-native')
        self.assertEqual(info['sha256'], r.file_sha256(self.archive))
    def test_bad_signature_or_wrong_trusted_key_cannot_reach_execution(self):
        with self.assertRaises(r.DeliveryError): r.inspect_archive(self.archive, self.pem, '0' * 64)
        self.write_archive(unsigned=True)
        with self.assertRaisesRegex(r.DeliveryError, 'signature'): self.inspect()
    def test_unsigned_extras_missing_files_links_traversal_and_duplicate_members_are_rejected(self):
        self.write_archive(extras={'unsigned.txt': b'not signed'})
        with self.assertRaises(r.DeliveryError): self.inspect()
        for name, kind in [('signed-release/../../escaped', tarfile.DIRTYPE), ('signed-release/link', tarfile.SYMTYPE)]:
            item = tarfile.TarInfo(name); item.type = kind; item.linkname = '/etc/passwd'
            self.write_archive(unsafe=item)
            with self.assertRaises(r.DeliveryError): self.inspect()
        self.write_archive()
        with tarfile.open(self.archive, 'r:gz') as src: members=[(x, src.extractfile(x).read()) for x in src.getmembers()]
        with tarfile.open(self.archive, 'w:gz') as dst:
            for item, data in members + members[:1]: dst.addfile(item, io.BytesIO(data))
        with self.assertRaises(r.DeliveryError): self.inspect()
        self.assertFalse((self.root / 'escaped').exists())
    def test_unsigned_members_after_tar_end_markers_are_not_ignored(self):
        extra=io.BytesIO()
        with tarfile.open(fileobj=extra,mode='w') as archive:
            entry=tarfile.TarInfo('signed-release/hidden-after-end.txt');entry.size=6;archive.addfile(entry,io.BytesIO(b'HIDDEN'))
        self.archive.write_bytes(gzip.compress(gzip.decompress(self.archive.read_bytes())+extra.getvalue()))
        with self.assertRaises(r.DeliveryError):self.inspect()
    def test_modified_signed_file_is_rejected(self):
        self.write_archive()
        with tarfile.open(self.archive, 'r:gz') as src: members=[(x, src.extractfile(x).read()) for x in src.getmembers()]
        with tarfile.open(self.archive, 'w:gz') as dst:
            for item, data in members:
                if item.name.endswith('/VERSION'): data=b'4.0.0-evil\n';item.size=len(data)
                dst.addfile(item, io.BytesIO(data))
        with self.assertRaises(r.DeliveryError): self.inspect()
    def test_extracted_installer_only_runs_after_validation_with_argument_boundaries_preserved(self):
        info=self.inspect(); cache=self.root/'cache';cache.mkdir(); calls=[]
        def runner(argv, **options):
            self.assertEqual(argv[0], 'bash'); self.assertEqual(Path(argv[1]).read_bytes(), self.files['install.sh'])
            self.assertEqual(argv[-2:], ['--target', '/opt/name with spaces'])
            self.assertIn('--offline', argv); self.assertEqual(options['env']['PYTHONDONTWRITEBYTECODE'], '1')
            calls.append(argv);return subprocess.CompletedProcess(argv, 7)
        self.assertEqual(r.run_installer(self.archive, info, ['--target','/opt/name with spaces'], cache, runner=runner), 7)
        self.assertEqual(len(calls),1)
        with self.assertRaises(r.DeliveryError): r.run_installer(self.archive, info, ['--bundle', '/elsewhere'], cache, runner=runner)
        self.assertEqual(len(calls),1)
        self.assertEqual(self.archive.read_bytes()[:2], b'\x1f\x8b')

class BuildTests(Fixture):
    def test_both_packages_reuse_identical_signed_payload_and_do_not_ship_private_key(self):
        result=self.build(); out=self.root/'output'
        offline=out/result['offline']; online=out/result['online']
        self.assertEqual(offline.read_bytes(), self.archive.read_bytes())
        with tarfile.open(online, 'r:gz') as t:
            names=t.getnames(); self.assertFalse(any(x.endswith('.pem') for x in names))
            script=t.extractfile(next(x for x in names if x.endswith('/installer.py'))).read()
            self.assertNotIn(self.key.read_bytes(), script)
            self.assertIn(self.fp.encode(), script)
            self.assertIn(result['sha256'].encode(), script)
            self.assertLess(online.stat().st_size, 40000)
        self.assertIn('candidate', result['offline'])
        self.assertIn(result['offline'], (out/'SHA256SUMS').read_text())
        with self.assertRaises(r.DeliveryError): self.build()
    def test_new_nested_output_directory_can_be_created(self):
        output=self.root/'new-parent'/'new-output'
        result=b.create_packages(self.archive,self.pub,self.fp,'https://example.invalid/releases',output,allow_candidate=True)
        self.assertTrue((output/result['online']).is_file())
    def test_explicit_candidate_opt_in_and_formal_delivery_gate_are_preserved(self):
        with self.assertRaises(r.DeliveryError): b.create_packages(self.archive,self.pub,self.fp,'https://example.invalid',self.root/'refused')
        self.assertFalse((self.root/'refused').exists())
        self.profile={'profile':'production','signing_public_key_sha256':self.fp};self.files.pop('TEST-ONLY.txt');self.write_archive()
        with self.assertRaisesRegex(r.DeliveryError, 'receipt|gate'): self.build()
        self.assertFalse((self.root/'output').exists())
    def test_candidate_input_cannot_include_environment_or_private_license_files(self):
        for filename in ['.env','private.key','vendor-private.pem','smcloud_license.txt']:
            with self.subTest(filename=filename):
                self.files[filename]=b'NEVER SHIP THIS';self.write_archive()
                with self.assertRaisesRegex(r.DeliveryError, 'secret|license|private'):self.build()
                self.assertFalse((self.root/'output').exists());self.files.pop(filename)
    def test_https_without_embedded_credentials_is_required(self):
        for url in ['http://example.invalid/releases', 'https://name:password@example.invalid/releases', 'file:///tmp/archive', 'https://example.invalid/#fragment']:
            with self.subTest(url=url), self.assertRaises(r.DeliveryError):
                b.create_packages(self.archive,self.pub,self.fp,url,self.root/'url-refused',allow_candidate=True)
        self.assertFalse((self.root/'url-refused').exists())

class DownloadTests(Fixture):
    def setUp(self):
        super().setUp(); cert=self.root/'tls-cert.pem';tlskey=self.root/'tls-key.pem'
        config=self.root/'tls.cnf';config.write_text('[req]\ndistinguished_name=dn\nprompt=no\nx509_extensions=v3\n[dn]\nCN=localhost\n[v3]\nsubjectAltName=DNS:localhost,IP:127.0.0.1\nbasicConstraints=critical,CA:TRUE\n',encoding='ascii')
        subprocess.run(['openssl','req','-config',str(config),'-x509','-newkey','rsa:2048','-nodes','-days','1','-keyout',str(tlskey),'-out',str(cert),'-subj','/CN=localhost','-addext','subjectAltName=DNS:localhost,IP:127.0.0.1'],check=True,capture_output=True)
        self.requests=[];self.content=self.archive.read_bytes();self.ignore_range=False;self.corrupt=False;self.redirect=False;self.cut_once=False
        self.bad_hash=False;self.bad_range=False
        fixture=self
        class Handler(BaseHTTPRequestHandler):
            def log_message(self,*args): pass
            def do_GET(self):
                fixture.requests.append(self.headers.get('Range'))
                if fixture.redirect:
                    self.send_response(302);self.send_header('Location','http://127.0.0.1/insecure');self.end_headers();return
                data=fixture.content + (b'x' if fixture.corrupt else b'');start=0
                if fixture.bad_hash:data=bytes([data[0]^1])+data[1:]
                if self.headers.get('Range') and not fixture.ignore_range: start=int(self.headers['Range'][6:].split('-')[0])
                self.send_response(206 if start else 200)
                if start:self.send_header('Content-Range',f'bytes {start+1 if fixture.bad_range else start}-{len(data)-1}/{len(data)}')
                self.send_header('Content-Length',str(len(data)-start));self.end_headers()
                if fixture.cut_once:
                    fixture.cut_once=False;self.wfile.write(data[start:start+100]);self.wfile.flush();self.connection.shutdown(2);return
                self.wfile.write(data[start:])
        self.server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
        ctx=ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER);ctx.load_cert_chain(cert,tlskey)
        self.server.socket=ctx.wrap_socket(self.server.socket,server_side=True)
        self.thread=threading.Thread(target=self.server.serve_forever,daemon=True);self.thread.start()
        self.cert=cert
        self.ca=ssl.create_default_context(cafile=str(cert));self.url=f'https://localhost:{self.server.server_port}/signed.tar.gz'
        self.dest=self.root/'cache'/'payload.tar.gz';self.dest.parent.mkdir();self.sha=r.file_sha256(self.archive)
    def tearDown(self):
        self.server.shutdown();self.server.server_close();self.thread.join(5);super().tearDown()
    def fetch(self):return r.download(self.url,self.dest,self.sha,len(self.content),ssl_context=self.ca,attempts=2,retry_delay=0)
    def test_https_download_and_cache_reuse(self):
        self.assertEqual(self.fetch().read_bytes(),self.content)
        self.fetch();self.assertEqual(len(self.requests),1)
    def test_partial_download_resumes_and_handles_servers_ignoring_range(self):
        Path(str(self.dest)+'.part').write_bytes(self.content[:100]);self.fetch()
        self.assertEqual(self.requests[0],'bytes=100-');self.assertEqual(self.dest.read_bytes(),self.content)
        self.dest.unlink();self.requests.clear();Path(str(self.dest)+'.part').write_bytes(self.content[:100]);self.ignore_range=True;self.fetch()
        self.assertEqual(self.dest.read_bytes(),self.content)
    def test_interrupted_transfer_is_resumed_without_restarting_installer(self):
        self.cut_once=True;self.fetch();self.assertGreaterEqual(len(self.requests),2)
        self.assertEqual(self.dest.read_bytes(),self.content)
    def test_corrupt_payload_or_http_downgrade_never_publishes_cache(self):
        self.corrupt=True
        with self.assertRaises(r.DeliveryError):self.fetch()
        self.assertFalse(self.dest.exists());self.corrupt=False;self.redirect=True
        with self.assertRaises(r.DeliveryError):self.fetch()
        self.assertFalse(self.dest.exists())
    def test_wrong_content_hash_or_content_range_is_rejected_before_installation(self):
        self.bad_hash=True
        with self.assertRaisesRegex(r.DeliveryError, 'SHA-256'):self.fetch()
        self.assertFalse(self.dest.exists());self.bad_hash=False
        Path(str(self.dest)+'.part').write_bytes(self.content[:100]);self.bad_range=True
        with self.assertRaisesRegex(r.DeliveryError, 'range'):self.fetch()
        self.assertFalse(self.dest.exists())
    def test_generated_online_entrypoint_verifies_over_real_https_without_mutating_its_bundle(self):
        result=b.create_packages(self.archive,self.pub,self.fp,self.url.rsplit('/',1)[0],self.root/'generated',allow_candidate=True)
        folder=self.root/'unpacked';folder.mkdir()
        with tarfile.open(self.root/'generated'/result['online'],'r:gz') as source:
            for member in source:
                parts=r.safe_parts(member.name);target=folder.joinpath(*parts)
                target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(source.extractfile(member).read())
        script=next(folder.rglob('installer.py'))
        before={x.relative_to(folder).as_posix():r.file_sha256(x) for x in folder.rglob('*') if x.is_file()}
        env=dict(os.environ,SSL_CERT_FILE=str(self.cert),PYTHONDONTWRITEBYTECODE='1')
        for _ in range(2):
            process=subprocess.run([sys.executable,str(script),'verify','--cache-dir',str(self.root/'verified-cache')],env=env,capture_output=True,text=True)
            self.assertEqual(process.returncode,0,process.stderr);self.assertIn('legacy',process.stdout)
        self.assertEqual(len(self.requests),1)
        self.assertEqual(before,{x.relative_to(folder).as_posix():r.file_sha256(x) for x in folder.rglob('*') if x.is_file()})
        refused=subprocess.run([sys.executable,str(script),'install','--cache-dir',str(self.root/'never-created')],env=env,capture_output=True,text=True)
        self.assertNotEqual(refused.returncode,0);self.assertIn('--allow-candidate',refused.stderr)
        self.assertFalse((self.root/'never-created').exists())
    @unittest.skipUnless(sys.platform.startswith('linux'), 'Actual bash installation delegation is validated in the isolated Linux container')
    def test_generated_entrypoint_executes_verified_native_installer_twice_without_touching_data(self):
        result=b.create_packages(self.archive,self.pub,self.fp,self.url.rsplit('/',1)[0],self.root/'native-generated',allow_candidate=True)
        folder=self.root/'native-unpacked';folder.mkdir()
        with tarfile.open(self.root/'native-generated'/result['online'],'r:gz') as source:
            for member in source:
                target=folder.joinpath(*r.safe_parts(member.name));target.parent.mkdir(parents=True,exist_ok=True);target.write_bytes(source.extractfile(member).read())
        launcher=next(folder.rglob('install.sh'));(launcher.parent/'json.py').write_text("raise RuntimeError('UNSIGNED_PYTHON_SHADOW_MODULE')\n");log=self.root/'delegated-arguments';data=self.root/'customer-data';data.mkdir();(data/'keep').write_text('KEEP BUSINESS DATA')
        env=dict(os.environ,SSL_CERT_FILE=str(self.cert),PYTHONDONTWRITEBYTECODE='1',TEST_INSTALL_LOG=str(log))
        for _ in range(2):
            process=subprocess.run(['bash',str(launcher),'install','--allow-candidate','--cache-dir',str(self.root/'native-cache'),'--','--yes','--target',str(data)],env=env,capture_output=True,text=True)
            self.assertEqual(process.returncode,0,process.stderr)
            args=log.read_text().splitlines();self.assertEqual(args[:3],['install','--offline','--bundle']);self.assertEqual(args[-3:],['--yes','--target',str(data)])
            self.assertEqual((data/'keep').read_text(),'KEEP BUSINESS DATA')
        self.assertEqual(len(self.requests),1)
    def test_cached_or_partial_symlink_cannot_overwrite_an_unrelated_file(self):
        if os.name=='nt': self.skipTest('Windows symlink privilege is not assumed; same check runs in Linux validation')
        sentinel=self.root/'sentinel';sentinel.write_bytes(b'preserve')
        Path(str(self.dest)+'.part').symlink_to(sentinel)
        with self.assertRaises(r.DeliveryError):self.fetch()
        self.assertEqual(sentinel.read_bytes(),b'preserve')

if __name__=='__main__': unittest.main()
