"""Maintainer-only extraction. Run with Blender --background --python this.py -- baseline.blend.

Exports only the original procedural landscape and reusable objects. No personal
room, portrait, screenshot, reference photo, branded poster or baked screen.
"""
import bpy, sys, json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
baseline = Path(sys.argv[sys.argv.index('--') + 1])
bpy.ops.wm.open_mainfile(filepath=str(baseline))
old = bpy.context.scene
deps = bpy.context.evaluated_depsgraph_get()
scene = bpy.data.scenes.new('Woodland library')
scene.unit_settings.system = 'METRIC'
collection = bpy.data.collections.new('Woodland library')
scene.collection.children.link(collection)
kept = []
boat_root = bpy.data.objects.new('Moored boat', None)
boat_root['v5_root'] = 'boat'
boat_root['item_id'] = 'boat'
collection.objects.link(boat_root)
for obj in list(old.objects):
    if obj.type != 'MESH':
        continue
    layer = obj.get('v3_layer')
    item = None
    if layer in {'forest', 'ground', 'mountains', 'tree'}:
        item = 'environment'
    elif obj.get('v5_part') in {'dock', 'boat', 'mooring'}:
        item = obj.get('v5_part')
    elif obj.get('v44_part') == 'tent':
        item = 'tent'
    elif obj.get('v43_part') == 'hammock':
        item = 'hammock'
    elif obj.get('v4_part') == 'camp':
        item = 'camp_seats' if any(s in obj.name for s in ['座凳', '坐凳', '座椅', '木凳']) else 'campfire'
    elif obj.name.startswith('WoodChair_'):
        item = 'wood_chair'
    if not item:
        continue
    evaluated = obj.evaluated_get(deps)
    mesh = bpy.data.meshes.new_from_object(evaluated, depsgraph=deps)
    clone = bpy.data.objects.new(obj.name, mesh)
    collection.objects.link(clone)
    clone.matrix_world = obj.matrix_world.copy()
    for k, v in obj.items():
        try: clone[k] = v
        except TypeError: pass
    clone['item_id'] = item
    if item == 'boat':
        # Keep the same original pivot used by the runtime water/rope animation.
        parent = obj.parent
        if parent and parent.get('v5_root') == 'boat':
            boat_root.matrix_world = parent.matrix_world.copy()
        matrix = clone.matrix_world.copy()
        clone.parent = boat_root
        clone.matrix_world = matrix
    kept.append(clone)
bpy.context.window.scene = scene
for other in list(bpy.data.scenes):
    if other != scene: bpy.data.scenes.remove(other)
keep_ids = {o.as_pointer() for o in scene.objects}
for obj in list(bpy.data.objects):
    if obj.as_pointer() not in keep_ids: bpy.data.objects.remove(obj, do_unlink=True)
bpy.ops.outliner.orphans_purge(do_recursive=True)
images = [i.name for i in bpy.data.images if i.users]
assert not any(any(x in n.lower() for x in ['photo', 'firewatch', 'screen', 'portrait']) for n in images), images
# Translate library identity without changing geometry or material provenance.
for index, obj in enumerate(kept):
    obj.name = '%s_%04d' % (obj['item_id'], index)
    obj['source'] = 'Original procedural woodland library'
    if obj['item_id'] == 'wood_chair':
        obj.location.x += 3.0
        obj.location.y -= 6.0
        obj.location.z -= 4.62
scene.render.engine = 'CYCLES'
bpy.ops.object.select_all(action='SELECT')
out = ROOT / 'studio/assets/woodland.glb'
bpy.ops.export_scene.gltf(filepath=str(out), export_format='GLB', use_selection=True,
    export_apply=True, export_extras=True, export_lights=False, export_cameras=False)
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(ROOT / 'blender/woodland-library.blend'), compress=True)
(ROOT / 'studio/assets/library-audit.json').write_text(json.dumps({
    'objects': len(kept), 'images': images, 'personal_room': False,
    'family_characters': False, 'reference_photos': False, 'branded_artwork': False,
    'items': sorted(set(o['item_id'] for o in kept)),
    'origin': 'Original procedural geometry from the creator’s woodland project',
}, indent=2))
print('Library exported:', out, len(kept), 'objects')
