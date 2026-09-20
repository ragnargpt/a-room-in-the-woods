#!/usr/bin/env python3
"""Check public files and local links without publishing or reading ignored photos."""
import gzip,hashlib,json,re,struct,subprocess,sys
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
PRIVATE={'workspace','.versions','.recovery','node_modules','exports','output','__pycache__'}
def files():
 if (ROOT/'.git').exists():
  names=subprocess.check_output(['git','ls-files','-z'],cwd=ROOT).decode().split('\0')
  return [ROOT/n for n in names if n]
 return [p for p in ROOT.rglob('*') if p.is_file() and not set(p.relative_to(ROOT).parts)&PRIVATE and '.git' not in p.parts and p.suffix not in {'.pyc','.blend1','.log'}]
def check():
 problems=[];paths=files();assert paths,'No release files.'
 for p in paths:
  rel=p.relative_to(ROOT)
  if set(rel.parts)&PRIVATE or p.name.startswith('.env') or p.is_symlink():problems.append('Private/unsafe path: '+str(rel))
  if p.stat().st_size>50_000_000:problems.append('Oversize asset: '+str(rel))
  if p.suffix in {'.md','.json','.js','.html','.py','.css','.yml'}:
   text=p.read_text()
   for token in ['/Users/','codex-clipboard-','REPOSITORY_OWNER','ghp_','github_pat_']:
    # The checker names the patterns it checks; it is not a leaked credential.
    if token in text and p.name!='check_release.py':problems.append('Unresolved/private marker in '+str(rel)+': '+token)
   if p.suffix=='.md':
    for target in re.findall(r'\]\(([^)]+)\)',text):
     if target.startswith(('http:','https:','mailto:','#')):continue
     target=target.split('#')[0]
     if target and not (p.parent/target).exists():problems.append('Broken documentation link: '+str(rel)+' -> '+target)
 for name,digest in json.loads((ROOT/'studio/vendor/checksums.json').read_text()).items():
  if hashlib.sha256((ROOT/'studio/vendor'/name).read_bytes()).hexdigest()!=digest:problems.append('Vendor checksum mismatch: '+name)
 for name in ['woodland','example-room']:
  b=gzip.decompress((ROOT/f'studio/assets/{name}.glb.gz').read_bytes())
  magic,version,total=struct.unpack_from('<4sII',b)
  if (magic,version,total)!=(b'glTF',2,len(b)):problems.append('Invalid GLB: '+name)
  size=struct.unpack_from('<I',b,12)[0];meta=json.loads(b[20:20+size]);serialized=json.dumps(meta)
  if '/Users/' in serialized or 'codex-clipboard-' in serialized:problems.append('Private path in GLB: '+name)
  for image in meta.get('images',[]):
   if image.get('uri','').startswith(('http:','https:','file:')):problems.append('External image dependency: '+name)
 audit=json.loads((ROOT/'studio/assets/library-audit.json').read_text())
 if any(audit[k] for k in ['personal_room','family_characters','reference_photos','branded_artwork']):problems.append('Private content in library audit')
 if problems:raise ValueError('\n'.join(problems))
 return {'public_files':len(paths),'largest_MB':round(max(p.stat().st_size for p in paths)/1e6,2),'links':'ok','vendor_hashes':'ok','GLB_assets':'ok','private_paths':'excluded'}
if __name__=='__main__':
 try:print(json.dumps(check(),indent=2))
 except Exception as e:print(str(e),file=sys.stderr);sys.exit(1)
