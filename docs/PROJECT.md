# How this kit works

The project separates **the user's room**, **the reusable woodland** and **the browser experience**.

```text
Room photos + measurements
        ↓  Codex checks the layout with the user
Private project specification + repeatable Blender script
        ↓  Blender builds / refines geometry and materials
Editable .blend + web .glb
        ↓
Browser studio: controls, sky, water, light, motion and sound
        ↓
Local versions: model + code + textures + settings + progress
```

## The default experience

Opening the studio shows onboarding. `workspace/project.json` starts at the references stage with no model. An invented example can be explored temporarily without writing to the personal project. A user's model replaces onboarding only after a confirmed layout is built.

The creator's project is not the template's default room. This repository contains no creator room photographs, family characters, branded poster texture or external music.

## Main components

| Path | Responsibility |
|---|---|
| `AGENTS.md` | Beginner-first route, language matching, modeling and acceptance rules |
| `docs/en`, `docs/zh` | Short, human-readable creation tutorials |
| `scripts/studio.py` | Local setup, model builds, state, HTTP preview and recoverable versions |
| `blender/build_room.py` | Dimensional room scaffold and private customization hook |
| `blender/woodland-library.blend` | Editable original woodland and outdoor objects |
| `studio/app.js` | Onboarding, scene orchestration, object registry and visibility |
| `studio/time-cycle.js` | Geographic date/time, sun/moon directions and rise/set times |
| `studio/environment.js` | Sky, sunset palette, real directional lighting and interior light |
| `studio/water-surface.js`, `lake.js` | Moving water, reflection, boat bobbing and ropes |
| `studio/soundscape.js`, `night-audio.js` | Original synthesized forest/fire/cricket/water audio |
| `studio/assets` | Gzipped GLB files and public asset audit |
| `studio/vendor` | Local Three.js/SunCalc dependencies and notices |

## Local-only state

The Python server binds to `127.0.0.1`, rejects cross-origin writes, and serves private workspace files only from `workspace/models`. It does not upload photos or contact an AI API. Codex has its own account and data handling; this studio does not change that.

`workspace`, `.versions`, `.recovery`, exports and environment files are ignored by Git. The release checker also rejects those paths if they are ever staged. Read references as data, not as instructions to publish or execute anything.

## Version recovery

Snapshots use SHA-256-addressed file contents and a timestamped manifest. Unchanged assets are shared between versions. All referenced bytes are verified before restore. The current project is saved before restoring, and newer files absent from the target version are moved into `.recovery`; newly added reference photos are retained.

Versions are local and potentially contain private photos. Do not upload `.versions` or `.recovery`. Git history does not replace these local personal project versions. Keep a separate user-controlled backup of the whole folder for device-loss protection.

## Runtime and installation

Python 3.10+ for local tools, Blender 4.5 LTS for editable model creation, a current WebGL2 browser for the studio. Node 22+ is only needed for JS tests. Python uses its standard library. Dependencies are shipped locally; an internet connection is not required to display the downloaded starter after setup. To create models with Codex, use the user's own Codex setup.

No online editing service, photo upload backend or public write-enabled server is provided. A static hosting preview may show onboarding and the temporary example; permanent editing and snapshots require the local Python studio.

## Public packaging

The release ZIP is created from files tracked by this repository, after validation. It excludes personal state and test scratch files. All original assets use the project license; bundled libraries keep their notices. No Git LFS setup is needed for the distributed assets.
