# Modeling guide for Codex and contributors

The beginner never needs to operate Blender. Codex writes and runs the modeling scripts, keeps the editable source and exports web assets. Blender does not automatically turn the photographs into a faithful room.

## Files and commands

- `workspace/project.json`: the user's dimensions, location, stage, object states and model path.
- `workspace/references/`: private photos and notes, ignored by Git and not served by the studio.
- `workspace/customize.py`: repeatable photo-specific modeling refinements.
- `workspace/models/room.blend`: packed editable model.
- `workspace/models/room.glb`: browser model, with semantic IDs exported as glTF extras.
- `workspace/PROGRESS.md`: measured facts, assumptions, accepted stages and next step.
- `blender/build_room.py`: a dimensional scaffold; edit/extend when the photo layout requires it.
- `blender/woodland-library.blend`: original procedural environment, editable independently.

Run `python3 scripts/studio.py build` after the user has confirmed the layout. A build happens in a staging directory. A Blender failure cannot replace the last model. Successful builds save a version before and after. Set the `BLENDER` environment variable if the executable is not found automatically.

## Project shape

See [`examples/quiet-room.json`](../examples/quiet-room.json). It describes an invented room and must not replace a user's project. Width/depth/height are in metres. Furniture x/y positions are relative to the room centre. The built-in furniture shapes are desk, chair, cabinet and plant; build other shapes through customization.

To add photo-specific modeling:

```python
# workspace/customize.py

def customize(context):
    bpy = context['bpy']
    box = context['box']
    material = context['material']
    cx, cy = context['center']
    brass = material('Brushed brass', 'ae9462', rough=.48, metal=.72)
    obj = box('A personal shelf', (cx + 1.2, cy + .8, 1.25),
              (.8, .22, .035), brass)
    obj['item_id'] = 'my-shelf'
```

Use actual photos and dimensions to build the appropriate shape. Remove/replace the generic scaffold walls to create door/window openings instead of covering them with overlapping panels. The helper's current item ID is not a substitute for explicitly tagging custom objects. Related geometry shares the object's unique `item_id`.

Add labels and visibility in `workspace/project.json`:

```json
{"id":"my-shelf","label":{"en":"My shelf","zh":"我的小书架"},"added":true,"visible":true}
```

Place that entry in the `objects` list. The studio discovers the ID from the GLB, gives it a checkbox and a focus arrow, and retains the state. New reusable library objects should also be registered in the `optional` catalog in `studio/app.js`, with English/Chinese text in `studio/i18n.js`.

A lamp's emitted light, audio or runtime animation also needs the same visibility rule. The included campfire, celestial bodies, boat/mooring, dock lights and lake implement that pattern. Do not merely hide the decorative mesh.

## Coordinates and scale

Blender: metres, Z up, +Y north. The sample room centre is `(2.445, 1.165, 0)`. The browser maps `(x,y,z)` to `(x−2.445, z, 1.165−y)`, so Three.js +X is east, -Z is north, +Y is up. A surveyed room's orientation should be applied to the room geometry around its centre; do not rotate only its sun.

The library clearing is around Z=-4.64 m and the lake at Z=-6.2 m. The environment is an authored landscape, not a terrain generator for arbitrary building footprints. Fit supports, stairs, shoreline and tree exclusions to a user's room. Inspect any relocation from ground level. A large room may require substantial landscape work.

## Export contract

- Save the editable `.blend` with textures packed. Keep the procedural script and reference notes locally.
- Export GLB with `export_apply=True`, `export_extras=True`, cameras/lights excluded. Lighting is handled by the browser.
- Use unique `item_id` values, grouping pieces of the same logical object. Do not put unrelated objects under a parent whose visibility is controlled separately.
- Do not bake UI screenshots or public reference photos into unrelated meshes. A user-provided personal painting may be textured locally, but it is not a distributable starter asset.
- Prefer local textures and dependencies. Texture dimensions and repetition must match the model scale.
- Inspect surface normals, thin silhouettes, transparency, near/far views and grazing angles after export. A zero duplicate-face check only catches exact overlaps.
- For environment edits, export a new GLB from `woodland-library.blend`, retain its metadata and gzip it with `mtime=0`. Do not rerun the maintainer's extraction script against a user's private room.

## Flicker prevention

Use one physical ceiling slab. Leave real gaps between walls, cabinet trim and beams. Give screens one visible image plane and a non-overlapping bezel. Avoid multiple surfaces at essentially the same depth, including large overlapping transparent planes. The camera uses a 0.15 m near clip and 1600 m far clip for the large scene; do not arbitrarily shrink near to 0.0001. Fix coincident geometry before adding polygon offsets or depth flags.

## Maintainable refinements

Add a coherent detail at a time. Rebuild, inspect, save, then continue. Do not lose editable mesh/material relationships to optimize a screenshot. The library shares mesh geometry and the browser instances repeated environment meshes; preserve those savings. Keep a lighter graphics mode and do not add large uncompressed binary files to Git.
