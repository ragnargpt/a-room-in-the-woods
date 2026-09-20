# A Room in the Woods — instructions for Codex

You are helping a beginner make **their own room**, then grow a quiet illustrated woodland around it. Take care of the technical work. Speak the user's language, even though this repository's primary language is English. Read `docs/en/START_HERE.md` (or `docs/zh/START_HERE.md`), `docs/STYLE.md`, and `docs/MAKING_MODELS.md` before creating a scene.

## First contact

1. If this is only a repository link, download/clone into a new local folder, open that folder and read this file. Never overwrite an existing personal workspace or the creator's old project.
2. Run `python3 scripts/studio.py doctor` (Windows: `python`). Help install missing Python 3.10+ or Blender 4.5 LTS from official sources if needed. Do not make the user operate Blender. Node 22+ is needed only for automated JS tests.
3. Run `python3 scripts/studio.py init --language en` or `--language zh`. Open the local studio with `python3 scripts/studio.py serve`. Keep the server running and verify its health endpoint and browser page.
4. If `workspace/project.json` already exists, read it and `workspace/PROGRESS.md` first, then resume. Do not restart onboarding or replace their room with the sample.
5. Ask for four photos, facing each wall, and room width/depth/ceiling height. Then ask for major furniture sizes. Separate measured facts from estimates. Ask one manageable group of questions at a time. They do not need to know modeling or programming.
6. Ask for the city, or latitude/longitude and IANA timezone. Never silently assign the creator's city. Approximate city coordinates suffice. If known, ask which direction the window faces; otherwise explain that room orientation is provisional.

## A fixed creation route

**References → confirmed layout → room → materials → woodland → personal details.**

- Store reference photos and private notes in `workspace/references/`; never put them in public assets, docs, issues, commits or releases.
- Describe the proposed layout in plain language or a simple plan. Confirm ambiguous door/window/furniture placement with the user before marking `layoutConfirmed: true`.
- Set dimensions in metres and a unique ID per object in `workspace/project.json`. The user may give centimetres; convert them for them.
- `python3 scripts/studio.py build` produces the dimensional scaffold. **It does not reconstruct a room from photographs.** Refine doors, window openings, ceiling, furniture silhouettes and small identifying details in Blender using the photographs. Put repeatable modeling code in `workspace/customize.py`; see the modeling guide. Do not deliver the default example as the user's room.
- Show the room alone first. Verify proportions and positions from matching angles before decorating.
- Ask for material close-ups: wood grain, flooring, ceiling, chair upholstery, lamp and metal frames. Improve colors, roughness, geometry and texture scale before adding more objects.
- Preserve editable `.blend`, repeatable Python source, GLB and textures. Use Blender for designed geometry; use Three.js for display, controls, sky, water, wind and sound. Never substitute a flat generated scene image for the rotatable room.
- Once the room feels right, enable `environment` and fit the clearing, supports, access, shore and trees around its footprint. The bundled environment is a starting layout, not a one-size-fits-all collision-free solution.
- Every new object gets `item_id` on exported objects, an English/Chinese label, and an independent show/hide/focus control. The generic studio discovers IDs in the model. New library objects must also appear under Add something. Hide attached lights, sound, particles, ropes and reflections consistently.

## Non-negotiable defaults

- Preserve the palette, real 3D depth, coherent scale and quiet motion in `docs/STYLE.md`.
- Real sun/moon positions use latitude, longitude, date, timezone and daylight-saving rules. The scene uses metres; Three.js +X east, -Z north, +Y up. No fixed UTC offset and no fixed moon opposite the sun. Midnight sun / no rise or set should show “—”, not crash.
- Default sound off; start audio only from a deliberate click. Night crickets follow solar darkness. Pause audio in hidden tabs. Keep all motion disableable; respect reduced-motion preference.
- UI and documentation are English-first; reply and guide in the user's language. Keep English and Chinese text keys in sync.
- Do not publish any user's room/photos/workspace. Their goal is to enjoy their own place; publishing is optional and requires a separate request.

## Save, then change, then verify

Before every iteration: `python3 scripts/studio.py save "Before <change>"`. After acceptance: save another named version. The CLI build and UI setting changes also save automatically. The content-addressed archive includes actual editable source, textures, models and configuration, not just a Git commit. Never remove `.versions` to save space without explaining what is lost.

Maintain `workspace/PROGRESS.md`: completed stage, measured facts, remaining assumptions, files changed, verified views, latest version ID and one next step. Update the project's stage and nextStep accordingly. This supports a new Codex conversation without repeating the work.

After modeling or graphics changes:

1. Check close, medium and distant views, including below the ceiling and along the cabinet/beam intersection. Orbit while observing, not only a still screenshot.
2. Use real thickness and separate surfaces. Remove duplicate/coplanar faces and intersections. Fix geometry before using polygon offsets. Keep the camera near/far range sensible. Screen images belong on one surface, not duplicate overlapping glass panels.
3. Inspect dawn/day/sunset/night; sun/moon and cast shadows must agree. Lamps must not shine after their parent object is hidden.
4. Verify every new object hides, reappears and focuses. Test reduced motion and muted audio. Verify lake movement over time, not only screenshots.
5. Run `python3 -m unittest discover -s tests -p 'test_*.py'` and `node --test tests/*.test.mjs` when changing the supporting tools or time calculations. Run `python3 scripts/check_release.py` before public packaging.
6. Save actual screenshots for the user's review. State what is approximate and what was tested. ZIP integrity or a successful GLB export does not prove the visual result matches the room.

## Common commands

```sh
python3 scripts/studio.py doctor
python3 scripts/studio.py init --language en
python3 scripts/studio.py status
python3 scripts/studio.py serve
python3 scripts/studio.py save "Before changing the lamp"
python3 scripts/studio.py build
python3 scripts/studio.py versions
python3 scripts/studio.py restore VERSION_ID
```

`example` is for a **separate, empty copy** of the repository only. The browser's Explore an example is temporary and cannot overwrite the personal workspace. Never expose the local write-enabled server to the internet; public screenshots or static examples are separate deliverables.
