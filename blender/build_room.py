"""Editable room starter. Codex refines this scene from the user's photographs.

This dimensional scaffold is a starting point, not automatic photo reconstruction.
Add photo-specific geometry in workspace/customize.py: customize(context).
Coordinates are metres, Z up, +Y north. Furniture x/y are relative to room centre.
"""
import bpy, math, json, sys, importlib.util
from pathlib import Path
from mathutils import Vector

ROOT=Path(__file__).resolve().parents[1]
spec_path,out_path=sys.argv[sys.argv.index('--')+1:]
p=json.loads(Path(spec_path).read_text());out=Path(out_path);out.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.context.scene.unit_settings.system='METRIC'
room=p['room'];w,d,h=[float(room[k]) for k in ('width','depth','height')]
cx,cy=2.445,1.165
def lin(v): return v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
def material(name,color,rough=.65,metal=0,texture=None):
    m=bpy.data.materials.new(name);m.use_nodes=True
    c=tuple(lin(int(color[i:i+2],16)/255) for i in (0,2,4));m.diffuse_color=(*c,1)
    shader=m.node_tree.nodes.get('Principled BSDF');shader.inputs['Base Color'].default_value=(*c,1)
    shader.inputs['Roughness'].default_value=rough;shader.inputs['Metallic'].default_value=metal
    if texture:
        path=ROOT/'blender/textures'/texture
        if path.exists():
            t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bpy.data.images.load(str(path),check_existing=True)
            m.node_tree.links.new(t.outputs['Color'],shader.inputs['Base Color'])
    return m
wood=material('Warm oak','b89a6e',.63,texture='oak-color.jpg')
wood2=material('Warm birch','c6ac82',.66,texture='birch-color.jpg')
steel=material('Weathered charcoal steel','303d39',.62,.72)
wall=material('Warm mineral plaster','c5c8bb',.88)
concrete=material('Exposed concrete','92968e',.92,texture='concrete-color.jpg')
leather=material('Soft charcoal upholstery','293431',.72)
green=material('Forest green','496b53',.84)
leaf=material('Sage leaves','567958',.9)
ceramic=material('Warm ivory ceramic','d9cbb4',.75)
root=bpy.data.objects.new('My room',None);bpy.context.collection.objects.link(root)
root['item_id']='room'
active='room'
def tag(o,name,mat):
    o.name=name;o['item_id']=active;o['source']='Original editable room geometry'
    o.parent=root
    if mat: o.data.materials.append(mat)
    return o
def box(name,pos,size,mat,bevel=.006):
    bpy.ops.mesh.primitive_cube_add(size=1,location=pos);o=tag(bpy.context.object,name,mat);o.dimensions=size
    bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
    if bevel:
        m=o.modifiers.new('Soft physical edges','BEVEL');m.width=min(bevel,min(size)*.2);m.segments=3
        m=o.modifiers.new('Weighted corner normals','WEIGHTED_NORMAL')
    return o
def rod(name,a,b,r,mat):
    delta=Vector(b)-Vector(a);bpy.ops.mesh.primitive_cylinder_add(vertices=12,radius=r,depth=delta.length,location=(Vector(a)+Vector(b))*.5)
    o=tag(bpy.context.object,name,mat);o.rotation_euler=delta.to_track_quat('Z','Y').to_euler();return o
def ball(name,pos,scale,mat):
    bpy.ops.mesh.primitive_uv_sphere_add(segments=16,ring_count=10,radius=1,location=pos)
    o=tag(bpy.context.object,name,mat);o.scale=scale
    for face in o.data.polygons:face.use_smooth=True
    return o
def desk(f,x,y):
    fw,fd,fh=[float(f.get(k,v)) for k,v in [('width',1.6),('depth',.7),('height',.74)]]
    box('Desk top',(x,y,fh),(fw,fd,.055),wood2,.014)
    for sx in [-1,1]:
        box('Desk leg',(x+sx*(fw/2-.09),y,fh/2-.035),(.065,fd-.1,fh-.07),steel)
    box('Desk pad',(x+.15,y-.05,fh+.031),(.64,.33,.008),leather,.005)
    rod('Desk lamp stem',(x-fw*.36,y+.13,fh+.03),(x-fw*.36,y+.13,fh+.39),.012,steel)
    ball('Desk lamp shade',(x-fw*.36,y+.13,fh+.38),(.105,.105,.075),green)
def chair(f,x,y):
    box('Chair cushion',(x,y,.47),(.52,.48,.12),leather,.048)
    back=box('Chair back',(x,y-.24,.79),(.51,.09,.55),leather,.045);back.rotation_euler.x=math.radians(-7)
    for sx in [-1,1]:
        rod('Chair arm support',(x+sx*.29,y-.16,.44),(x+sx*.29,y-.16,.66),.014,steel)
        box('Chair arm',(x+sx*.29,y-.02,.66),(.065,.35,.055),wood2,.012)
    rod('Chair swivel',(x,y,.13),(x,y,.43),.035,steel)
    for n in range(5):
        a=n*math.tau/5;end=(x+.32*math.cos(a),y+.32*math.sin(a),.095)
        rod('Chair foot',(x,y,.16),end,.016,steel);ball('Chair wheel',end,(.036,.036,.036),leather)
def cabinet(f,x,y):
    fw,fd,fh=[float(f.get(k,v)) for k,v in [('width',1.2),('depth',.4),('height',.9)]]
    box('Cabinet body',(x,y,fh/2),(fw,fd,fh),wood2,.01)
    for z in [.25*fh,.68*fh]:box('Cabinet reveal',(x,y-fd/2-.003,z),(fw-.04,.007,.008),steel,.001)
    box('Cabinet door reveal',(x,y-fd/2-.003,fh/2),(.006,.007,fh-.05),steel,.001)
def plant(f,x,y):
    bpy.ops.mesh.primitive_cone_add(vertices=24,radius1=.18,radius2=.23,depth=.40,location=(x,y,.2));tag(bpy.context.object,'Plant pot',ceramic)
    rod('Plant stem',(x,y,.35),(x,y,1.25),.022,wood)
    for n in range(9):
        a=n*2.4;z=.64+n*.066
        rod('Plant twig',(x,y,z),(x+.28*math.cos(a),y+.28*math.sin(a),z+.12),.008,wood)
        o=ball('Plant leaf',(x+.29*math.cos(a),y+.29*math.sin(a),z+.13),(.18,.085,.025),leaf);o.rotation_euler=(.3,0,a)

# Individual boards, a single ceiling surface, and real wall thickness.
n=max(2,round(w/.19))
for i in range(n):
    box('Oak floorboard %02d'%i,(cx-w/2+(i+.5)*w/n,cy,-.035),(w/n-.003,d,.065),wood,.003)
box('Back wall',(cx,cy+d/2+.06,h/2),(w+.12,.12,h),wall)
box('Left wall',(cx-w/2-.06,cy,h/2),(.12,d,h),wall)
# Front and right remain open for easy inspection; Codex adds photo-specific windows/doors.
for x,y in [(cx-w/2,cy-d/2),(cx+w/2,cy-d/2),(cx+w/2,cy+d/2)]:
    box('Window mullion',(x,y,h/2),(.05,.05,h),steel)
active='ceiling'
box('Single concrete ceiling',(cx,cy,h+.045),(w+.16,d+.16,.09),concrete)
active='room'
for f in room.get('furniture',[]):
    active=f['id'];x,y=cx+float(f.get('x',0)),cy+float(f.get('y',0))
    fn={'desk':desk,'chair':chair,'cabinet':cabinet,'plant':plant}.get(f['type'])
    if not fn: raise ValueError('Unknown furniture type; implement it in workspace/customize.py: '+f['type'])
    fn(f,x,y)

# Structure is grouped separately; it appears only after the woodland stage.
active='architecture'
box('Floor steel rim',(cx,cy,-.17),(w+.25,d+.25,.19),steel)
for x in [cx-w/2+.12,cx+w/2-.12]:
    for y in [cy-d/2+.12,cy+d/2-.12]:
        box('Elevated support',(x,y,-2.39),(.14,.14,4.45),steel)
        box('Support footing',(x,y,-4.6),(.38,.38,.16),concrete)
for i in range(22):
    z=-4.55+i*4.55/21;y=cy-d/2-4.9+i*4.9/21
    box('Stair tread %02d'%i,(cx-w/2-.55,y,z),(.85,.26,.06),wood)
for sx in [-1,1]:
    x=cx-w/2-.55+sx*.43
    rod('Stair rail',(x,cy-d/2-4.9,-3.70),(x,cy-d/2,.85),.025,steel)
    for i in range(0,22,3):
        z=-4.55+i*4.55/21;y=cy-d/2-4.9+i*4.9/21
        rod('Stair baluster',(x,y,z),(x,y,z+.85),.018,steel)
custom=Path(spec_path).parent/'customize.py'
if custom.exists():
    spec=importlib.util.spec_from_file_location('room_customization',custom);module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
    module.customize({'bpy':bpy,'project':p,'root':root,'box':box,'rod':rod,'ball':ball,'material':material,'center':(cx,cy)})

# Check exact duplicate surfaces before export; near intersections also need visual QA.
seen={};duplicates=[]
for o in bpy.context.scene.objects:
    if o.type!='MESH':continue
    for poly in o.data.polygons:
        vertices=tuple(sorted(tuple(round(v,5) for v in o.matrix_world@o.data.vertices[i].co) for i in poly.vertices))
        if vertices in seen:duplicates.append([seen[vertices],o.name])
        else:seen[vertices]=o.name
if duplicates:raise ValueError('Duplicate geometry detected: '+str(duplicates[:6]))
bpy.ops.object.select_all(action='SELECT')
bpy.ops.file.pack_all()
bpy.ops.wm.save_as_mainfile(filepath=str(out/'room.blend'),compress=True)
bpy.ops.export_scene.gltf(filepath=str(out/'room.glb'),export_format='GLB',use_selection=True,export_apply=True,export_extras=True,export_lights=False,export_cameras=False)
(out/'geometry-check.json').write_text(json.dumps({'unit':'metres','dimensions':[w,d,h],'exactDuplicateFaces':duplicates,'visualQARequired':True,'items':sorted(set(o.get('item_id','room') for o in bpy.context.scene.objects))},indent=2))
