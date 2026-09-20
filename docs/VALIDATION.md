# Validation and current limits

Initial release: **0.1.0**, 2026-09-20.

Brand update: **0.1.1**, 2026-09-20. Verified the Room2World browser title, English/Chinese branding, guide/repository links and refreshed interface screenshots. The 12 automated tests pass; this update does not change the model or rendering pipeline.

## Verified

- Built the invented sample through the full local CLI → Blender 4.5.3 → packed `.blend` + GLB path in a disposable workspace. Successful build saved a before and an after version. The exported room reports no exact duplicate faces.
- Python tests cover restoring editable source and textures, preserving newly added reference photos, recovering files added after a snapshot, corruption rejection before writes, path traversal rejection, private environment/symlink exclusion, non-destructive initialization and the layout confirmation gate.
- JavaScript tests cover Shanghai civil time, New York winter/summer offsets, spring-forward gaps, repeated autumn hours, sun direction and solar darkness, polar day with no sunrise/sunset, invalid dates/coordinates, and English/Chinese interface coverage.
- Onboarding layout inspected at 1440 px and 390 px widths, with no horizontal overflow.
- Actual browser inspection: default onboarding, optional example, close room and woodland views, live lake, daylight and broad sunset, night mode, object visibility and camera presets, English/Chinese switch, return to the user's empty starting point.
- Runtime checks: night audio context running with non-zero cricket gains; hiding a lit campfire sets both its light and fire sound to zero; pausing movement freezes the lake simulation time; hidden lake stays hidden; mute works. See [browser checks](browser-checks.json).
- Repository release checks: local documentation links, bundled dependency hashes, compressed GLB integrity, absence of private paths, and exclusion of workspace/version files.

The interface screenshots in `docs/images` come from the actual starter studio. `forest-home-night.png` is the creator-supplied README showcase image of their personal woodland project. The photo directions diagram is an explanatory illustration. No simulated screenshots of a private conversation are used.

## Limits to keep clear

- This is an early creation kit, not automatic photogrammetry. The generated room is a scaffold. Codex must refine it from the user's references and obtain agreement on uncertain measurements.
- Native Blender building was checked on macOS. The CLI includes Linux/PATH and Windows executable discovery, but native Windows/Linux Blender builds have not yet been visually verified.
- The woodland has an authored clearing and a fixed lake layout. New room footprints, building rotations and object relocations need a geometry/clearance pass. Generic terrain-aware arbitrary placement is not implemented.
- The controls provide orbit, pan, zoom and named views. A collision-aware first-person walking system is not included in this initial starter.
- Sun/moon positions are geographic. Sunset color, haze and ambient fill are artistic, and real weather is not modeled. Rise/set times are approximations, not navigation-grade astronomy.
- Audio is original synthesized ambience, not field recordings. Browser sound starts only after a user gesture.
- The default browser preview uses the local computer. A public repository does not expose a person's local studio or private photos.
- Local snapshots protect against bad edits, not loss of the computer. Users should keep their own separate backup of the project folder.
- Exact duplicate-face detection is a useful guard, not proof of visual accuracy or freedom from all near-coplanar flicker. Visual inspection remains part of each model iteration.
