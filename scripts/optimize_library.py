"""Repack the editable procedural library for distribution."""
import bpy, hashlib, gzip, json
from array import array
from pathlib import Path
ROOT=Path(__file__).resolve().parents[1]
bpy.ops.wm.open_mainfile(filepath=str(ROOT/'blender/woodland-library.blend'))
# Share identical geometry, preserving every object transform and semantic ID.
cache={}; reused=0
for obj in bpy.context.scene.objects:
    if obj.type!='MESH': continue
    mesh=obj.data
    coords=array('f',[0.0])*(len(mesh.vertices)*3); mesh.vertices.foreach_get('co',coords)
    indices=array('i',[0])*len(mesh.loops); mesh.loops.foreach_get('vertex_index',indices)
    digest=hashlib.sha256(coords.tobytes()+indices.tobytes())
    digest.update(str([(p.loop_total,p.material_index,p.use_smooth) for p in mesh.polygons]).encode())
    digest.update(str([m.name if m else '' for m in mesh.materials]).encode())
    for uv in mesh.uv_layers:
        values=array('f',[0.0])*(len(uv.data)*2); uv.data.foreach_get('uv',values);digest.update(values.tobytes())
    key=digest.hexdigest()
    if key in cache: obj.data=cache[key]; reused+=1
    else: cache[key]=mesh
for image in list(bpy.data.images):
    if image.type=='RENDER_RESULT' or image.name=='Render Result': bpy.data.images.remove(image)
bpy.ops.outliner.orphans_purge(do_recursive=True)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT/'blender/woodland-library.blend'),compress=True)
bpy.ops.object.select_all(action='SELECT')
out=ROOT/'studio/assets/woodland.glb'
bpy.ops.export_scene.gltf(filepath=str(out),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_lights=False,export_cameras=False)
data=out.read_bytes(); compressed=gzip.compress(data,compresslevel=9,mtime=0)
(Path(str(out)+'.gz')).write_bytes(compressed);out.unlink()
audit=json.loads((ROOT/'studio/assets/library-audit.json').read_text());audit.update(shared_meshes=reused,unique_meshes=len(cache),bytes=len(data),gzip_bytes=len(compressed));audit['images']=[i.name for i in bpy.data.images if i.users]
(ROOT/'studio/assets/library-audit.json').write_text(json.dumps(audit,indent=2)+'\n')
print('DONE',audit)
