# A Room in the Woods

**Bring your real-life space into a virtual world. Make it a place of your own.**

[简体中文](README.zh-CN.md) · [Start here](docs/en/START_HERE.md) · [Explore the project](docs/PROJECT.md)

![A warm personal room reimagined in a quiet woodland at night](docs/images/forest-home-night.png)

*The creator’s woodland home, shown for inspiration. Your project begins with your own real-life room.*

Recreate a space you know: its layout, furniture, materials, and the little details that make it yours. Start with photos and measurements of your real room, then give it a forest, a lake, and a little quiet.

You do not need to know how to model or write code. Bring a few photos of your room and tell Codex what you want. This project gives Codex a creation route, an editable 3D foundation, and a consistent woodland style.

It starts with **your room**. The finished example is optional.

## Start with one message

Copy this repository's URL into Codex and add:

> Help me make my own room with this project. Download it into a new folder, read its AGENTS.md and Start Here guide, and lead me one small step at a time. Start by asking for photos of the four sides of my room and the main dimensions. Handle the modeling and technical setup for me. Save a recoverable version before every change.

Speak English, Chinese, or your preferred language. The repository is English-first; Codex should continue in the language you use. The included studio and beginner guide have English and Chinese versions.

You will need a computer, your own Codex access, and a few room photos. The project itself needs no API key, account or paid asset. Codex may need your help with software installation permissions. You can also use **Code → Download ZIP**, unzip it and open the folder in Codex. No GitHub account is needed to download.

## What you do

1. **Take four photos.** One facing each wall, with the door, windows and large furniture visible.
2. **Share a few dimensions.** Room width, depth and height; then the key furniture sizes. Label estimates.
3. **Check the first room.** Help Codex get the layout and proportions right.
4. **Add the details.** Photograph the wood, floor, chair, ceiling and objects that make it yours.
5. **Grow the world around it.** Forest, warm light, a moving lake, a dock, a boat, a campfire.
6. **Enjoy it and keep refining.** Every step gets a recoverable version.

[Follow the illustrated guide →](docs/en/START_HERE.md)

## What is already included

- An onboarding studio that opens with a photo guide, not the creator's home.
- Original editable woodland geometry, dimensional room-building tools, and the Blender → GLB → browser workflow.
- A restrained illustrated style: cool pine greens, warm timber, broad coral sunsets, layered hills and water with visible motion and live reflections.
- Geography-aware sun, moon and shadows; local civil time including daylight-saving changes.
- Object-by-object show/hide/focus, plus an optional tent, hammock, campfire, seats, dock and boat.
- Forest sounds, night crickets, water and fire audio, all opt-in; movement can be paused.
- Full local snapshots of the models, source, textures and settings, with checksum validation and a safety snapshot before restore.
- English and Chinese guidance; your private workspace is excluded from Git by default.

![An editable example woodland](docs/images/woodland.png)

## What to expect

This is a **Codex-guided creation kit**, not an automatic photo-scanning service. Photos guide the modeling; missing dimensions and hidden surfaces need your judgment. The initial generated room is a scaffold that Codex refines with you. A close match comes from clear references, measured proportions, material details and several visual checks.

The included room is invented. The creator's personal room photos, family characters and branded artwork are not distributed. You can finish and enjoy your room locally; you do not have to publish anything.

## For people who like to look under the hood

Codex can run these commands for you. Use Python 3.10+ (`python` on Windows), Blender 4.5 LTS for modeling, and a current WebGL2 browser. Node 22+ is only needed for the JavaScript tests. Browser dependencies are bundled locally.

```sh
python3 scripts/studio.py doctor
python3 scripts/studio.py init --language en
python3 scripts/studio.py serve
```

Open the localhost address printed by the last command. Keep that process running while using the studio. The English/Chinese switch is in the header. **Explore an example** never changes your personal workspace.

- [How the project fits together](docs/PROJECT.md)
- [Modeling and object contract](docs/MAKING_MODELS.md)
- [Visual style](docs/STYLE.md)
- [Validation and current limits](docs/VALIDATION.md)
- [Credits and licenses](CREDITS.md)

Original code and original assets: [MIT](LICENSE). Bundled Three.js (MIT) and SunCalc (BSD-2-Clause) retain their own notices. Blender is an external tool and is not bundled.
