#!/usr/bin/env python3
"""Package only tracked public files; personal workspaces are never included."""
from pathlib import Path
import hashlib,json,zipfile
from check_release import check,files,ROOT
report=check();version=json.loads((ROOT/'package.json').read_text())['version'];out=ROOT/'exports';out.mkdir(exist_ok=True)
archive=out/f'a-room-in-the-woods-{version}.zip'
with zipfile.ZipFile(archive,'w',compression=zipfile.ZIP_DEFLATED,compresslevel=9) as z:
 for p in files():z.write(p,Path('a-room-in-the-woods')/p.relative_to(ROOT))
with zipfile.ZipFile(archive) as z:
 assert z.testzip() is None
checksum=hashlib.sha256(archive.read_bytes()).hexdigest();(out/'SHA256SUMS.txt').write_text(f'{checksum}  {archive.name}\n')
print(json.dumps({'archive':str(archive),'sha256':checksum,'bytes':archive.stat().st_size,'checks':report},indent=2))
