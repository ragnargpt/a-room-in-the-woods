#!/usr/bin/env python3
"""Local creation tools. Python standard library only; no account or API key.

Workspace state and reference photos are never committed by default. Snapshots
retain actual source/assets using a content-addressed store, not only a git hash.
"""
import argparse, copy, hashlib, json, os, re, shutil, subprocess, sys, tempfile, time, threading
from datetime import datetime, timezone
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import urlparse, unquote

ROOT = Path(__file__).resolve().parents[1]
SKIP = {'.git', '.versions', '.recovery', 'node_modules', '__pycache__', 'exports', 'output'}
WRITE_LOCK = threading.RLock()
STAGES = ['references', 'layout', 'room', 'materials', 'woodland', 'details']
DEFAULT = {
    'schemaVersion': 1, 'name': 'My room in the woods', 'language': 'en',
    'stage': 'references', 'layoutConfirmed': False, 'assumptions': [], 'nextStep': 'Add four room photos and key dimensions.',
    'location': None, 'room': {'width': None, 'depth': None, 'height': None, 'furniture': []},
    'environment': False, 'model': None, 'objects': [], 'referenceNotes': [],
}

def write_json(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    tmp = path.with_suffix(path.suffix + '.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    tmp.replace(path)

def project(root=ROOT):
    path = root / 'workspace/project.json'
    return json.loads(path.read_text(encoding='utf-8')) if path.exists() else copy.deepcopy(DEFAULT)

def validate(p):
    if p.get('schemaVersion') != 1: raise ValueError('Unsupported project schema.')
    if p.get('language') not in {'en', 'zh'}: raise ValueError('Choose en or zh.')
    if p.get('stage') not in STAGES: raise ValueError('Unknown creation stage.')
    if not isinstance(p.get('name'), str) or len(p['name']) > 160: raise ValueError('Invalid name.')
    location = p.get('location')
    if location:
        if not (-90 <= float(location['lat']) <= 90 and -180 <= float(location['lon']) <= 180):
            raise ValueError('Invalid latitude/longitude.')
        if not isinstance(location.get('timeZone'), str) or not location['timeZone']: raise ValueError('An IANA time zone is required.')
        try:
            from zoneinfo import ZoneInfo
            ZoneInfo(location['timeZone'])
        except ImportError: pass
        except Exception:
            # Windows may lack OS tzdata. Intl in the browser checks again.
            if '/' not in location['timeZone'] and location['timeZone'] != 'UTC': raise ValueError('Invalid time zone.')
    room = p.get('room', {})
    for key in ['width', 'depth', 'height']:
        value = room.get(key)
        if value is not None and (isinstance(value, bool) or not .5 <= float(value) <= 30):
            raise ValueError('Room dimensions must be metres between 0.5 and 30.')
    model = p.get('model')
    if model is not None and (not isinstance(model,str) or not model.startswith('models/') or '..' in Path(model).parts or not model.endswith('.glb')): raise ValueError('Models must be GLB files inside workspace/models.')
    if not isinstance(p.get('objects',[]),list): raise ValueError('Objects must be a list.')
    furniture = room.get('furniture',[])
    fids = [f.get('id') for f in furniture]
    if len(fids)!=len(set(fids)) or any(not isinstance(i,str) or not i for i in fids): raise ValueError('Furniture needs unique IDs.')
    if any(i in {'room','ceiling','architecture','environment','lake','sun','moon','tent','boat','dock','campfire','camp_seats','hammock','wood_chair','mooring'} for i in fids): raise ValueError('Furniture ID conflicts with a reserved scene object.')
    ids = [o.get('id') for o in p.get('objects', [])]
    if len(ids) != len(set(ids)) or any(not isinstance(i,str) or not i for i in ids): raise ValueError('Object IDs must be unique strings.')
    return p

def tracked_files(root):
    for path in sorted(root.rglob('*')):
        rel = path.relative_to(root)
        if any(part in SKIP or part.startswith('.env') for part in rel.parts): continue
        if path.is_symlink(): continue
        if path.is_file() and path.suffix not in {'.pyc', '.log', '.blend1', '.tmp'} and path.name != '.DS_Store':
            yield path, rel.as_posix()

def snapshot(label, root=ROOT):
    store = root / '.versions'
    files = {}
    for path, rel in tracked_files(root):
        data = path.read_bytes(); digest = hashlib.sha256(data).hexdigest()
        target = store / 'objects' / digest[:2] / digest[2:]
        if not target.exists():
            target.parent.mkdir(parents=True, exist_ok=True); target.write_bytes(data)
        files[rel] = {'sha256': digest, 'mode': path.stat().st_mode & 0o777}
    identifier = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S') + '-' + str(time.time_ns())[-6:]
    manifest = {'id': identifier, 'label': label, 'created': datetime.now(timezone.utc).isoformat(), 'files': files}
    write_json(store / 'manifests' / (identifier + '.json'), manifest)
    return {'id': identifier, 'label': label, 'created': manifest['created'], 'files': len(files)}

def versions(root=ROOT):
    result = []
    for path in sorted((root / '.versions/manifests').glob('*.json'), reverse=True):
        value = json.loads(path.read_text());result.append({k: value[k] for k in ['id','label','created']})
    return result

def restore(identifier, root=ROOT):
    if not identifier or '/' in identifier or '\\' in identifier: raise ValueError('Invalid version ID.')
    manifest = json.loads((root / '.versions/manifests' / (identifier+'.json')).read_text())
    # Validate all paths and hashes before modifying a single project file.
    entries = []
    for name, meta in manifest['files'].items():
        target = (root / name).resolve()
        if not target.is_relative_to(root.resolve()) or set(Path(name).parts) & SKIP: raise ValueError('Unsafe snapshot path.')
        digest = meta['sha256']
        if not isinstance(digest,str) or not re.fullmatch('[a-f0-9]{64}',digest): raise ValueError('Invalid snapshot checksum.')
        data = (root / '.versions/objects' / digest[:2] / digest[2:]).read_bytes()
        if hashlib.sha256(data).hexdigest() != digest: raise ValueError('Snapshot checksum mismatch.')
        entries.append((target, data, meta['mode']))
    backup = snapshot('Before restoring '+identifier, root)
    for path, name in list(tracked_files(root)):
        if name not in manifest['files'] and not name.startswith('workspace/references/'):
            recovery = root / '.recovery' / backup['id'] / name
            recovery.parent.mkdir(parents=True,exist_ok=True); shutil.move(str(path),str(recovery))
    for path, data, mode in entries:
        path.parent.mkdir(parents=True,exist_ok=True);path.write_bytes(data);path.chmod(mode)
    return {'restored': identifier, 'safetyVersion': backup['id']}

def find_blender():
    candidates = [os.environ.get('BLENDER'), shutil.which('blender'), '/Applications/Blender.app/Contents/MacOS/Blender']
    if os.name == 'nt':
        candidates += [str(p) for p in Path(os.environ.get('PROGRAMFILES','C:/Program Files')).glob('Blender Foundation/Blender */blender.exe')]
    return next((p for p in candidates if p and Path(p).is_file()), None)

def init(language='en', name=None, root=ROOT):
    path = root / 'workspace/project.json'
    if path.exists(): return project(root)
    p = copy.deepcopy(DEFAULT);p['language']=language
    if name: p['name']=name
    (root/'workspace/references').mkdir(parents=True,exist_ok=True)
    write_json(path,p);snapshot('Started my room',root);return p

def build(root=ROOT):
    p=validate(project(root))
    if not p.get('layoutConfirmed'): raise ValueError('Confirm the room layout with the user first, then set layoutConfirmed to true.')
    if any(p['room'].get(k) is None for k in ['width','depth','height']): raise ValueError('Room width, depth and height are needed before building.')
    blender=find_blender()
    if not blender: raise ValueError('Blender was not found. Ask Codex to help install Blender, or set BLENDER to its executable.')
    before=snapshot('Before room build',root)
    # Build into staging. A failed Blender run never replaces the last good room.
    with tempfile.TemporaryDirectory(prefix='woodland-build-') as tmp:
        out=Path(tmp)
        result=subprocess.run([blender,'--background','--factory-startup','--python-exit-code','1','--python',str(root/'blender/build_room.py'),'--',str(root/'workspace/project.json'),str(out)],capture_output=True,text=True)
        (root/'workspace/build.log').write_text(result.stdout+'\n'+result.stderr)
        if result.returncode or not (out/'room.glb').exists(): raise RuntimeError('Room build failed. The previous version is safe; see workspace/build.log.')
        dest=root/'workspace/models';dest.mkdir(parents=True,exist_ok=True)
        for item in out.iterdir(): shutil.copy2(item,dest/item.name)
    p['model']='models/room.glb';p['stage']='room';p['nextStep']='Compare the room with the photos; then add material close-ups.'
    write_json(root/'workspace/project.json',p)
    return {'before':before,'after':snapshot('Room built and exported',root),'project':p}

class Handler(SimpleHTTPRequestHandler):
    def __init__(self,*args,**kwargs): super().__init__(*args,directory=str(ROOT/'studio'),**kwargs)
    def log_message(self,fmt,*args): pass
    def json(self,status,value):
        data=json.dumps(value,ensure_ascii=False).encode();self.send_response(status)
        self.send_header('Content-Type','application/json; charset=utf-8');self.send_header('Cache-Control','no-store')
        self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data)
    def do_GET(self):
        path=urlparse(self.path).path
        if path=='/api/project': return self.json(200,project())
        if path=='/api/versions': return self.json(200,versions())
        if path.startswith('/workspace/'):
            target=(ROOT/unquote(path.lstrip('/'))).resolve()
            allowed=(ROOT/'workspace/models').resolve()
            if not target.is_relative_to(allowed) or not target.is_file(): return self.send_error(404)
            data=target.read_bytes();self.send_response(200);self.send_header('Content-Type',self.guess_type(str(target)))
            self.send_header('Cache-Control','no-store');self.send_header('Content-Length',str(len(data)));self.end_headers();self.wfile.write(data);return
        if path=='/health': return self.json(200,{'ok':True})
        return super().do_GET()
    def do_POST(self):
        with WRITE_LOCK:
            self.handle_post()
    def handle_post(self):
        # Local-only writes, no CORS, no shell execution, and reject cross-origin requests.
        origin=self.headers.get('Origin');host=self.headers.get('Host','')
        if origin and origin not in {'http://'+host,'https://'+host}: return self.json(403,{'error':'Cross-origin writes are disabled.'})
        if self.headers.get('Sec-Fetch-Site')=='cross-site': return self.json(403,{'error':'Cross-site writes are disabled.'})
        if host.split(':')[0] not in {'localhost','127.0.0.1'}: return self.json(403,{'error':'Localhost only.'})
        try:
            length=int(self.headers.get('Content-Length','0'))
            if length<1 or length>262144: raise ValueError('Invalid request size.')
            data=json.loads(self.rfile.read(length))
            path=urlparse(self.path).path
            if path=='/api/project':
                p=validate(data);snapshot('Before project update');write_json(ROOT/'workspace/project.json',p)
                saved=snapshot('Project updated');return self.json(200,{'project':p,'version':saved})
            if path=='/api/snapshot': return self.json(200,snapshot(str(data.get('label','Saved version'))[:200]))
            if path=='/api/restore': return self.json(200,restore(data.get('id','')))
            return self.json(404,{'error':'Unknown action.'})
        except Exception as e: return self.json(400,{'error':str(e)})

def main():
    parser=argparse.ArgumentParser(description='A Room in the Woods — local creation tools')
    sub=parser.add_subparsers(dest='command',required=True)
    p=sub.add_parser('init');p.add_argument('--language',choices=['en','zh'],default='en');p.add_argument('--name')
    sub.add_parser('doctor');sub.add_parser('build');sub.add_parser('status');sub.add_parser('versions')
    p=sub.add_parser('save');p.add_argument('label',nargs='?',default='Saved version')
    p=sub.add_parser('restore');p.add_argument('id')
    p=sub.add_parser('serve');p.add_argument('--port',type=int,default=8787)
    p=sub.add_parser('example');p.add_argument('--language',choices=['en','zh'],default='en')
    args=parser.parse_args()
    if args.command=='init': result=init(args.language,args.name)
    elif args.command=='doctor': result={'python':sys.version.split()[0],'blender':find_blender(),'readyForModeling':bool(find_blender()),'projectExists':(ROOT/'workspace/project.json').exists()}
    elif args.command=='status': result=project()
    elif args.command=='save': result=snapshot(args.label)
    elif args.command=='versions': result=versions()
    elif args.command=='restore': result=restore(args.id)
    elif args.command=='build': result=build()
    elif args.command=='example':
        if (ROOT/'workspace/project.json').exists(): raise ValueError('A workspace already exists. Use a separate copy for the example; never replace a personal room.')
        p=json.loads((ROOT/'examples/quiet-room.json').read_text());p['language']=args.language
        write_json(ROOT/'workspace/project.json',p);result=build()
    elif args.command=='serve':
        init();server=None
        for port in range(args.port,args.port+20):
            try: server=ThreadingHTTPServer(('127.0.0.1',port),Handler);break
            except OSError: continue
        if not server: raise RuntimeError('No available preview port. Ask Codex to choose another port.')
        print('Open http://127.0.0.1:'+str(server.server_port)+'/',flush=True)
        try: server.serve_forever()
        except KeyboardInterrupt: server.server_close()
        return
    print(json.dumps(result,ensure_ascii=False,indent=2))

if __name__=='__main__':
    try: main()
    except Exception as e: print('Error: '+str(e),file=sys.stderr);sys.exit(1)
