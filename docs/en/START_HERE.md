# Your own room, one small step at a time

The goal is simple: make a place that feels like yours. You bring the photos and choices. Codex takes care of the technical work.

## 1. Open a conversation with Codex

Copy this project's GitHub link into Codex and say:

> Please download this project into a new folder, read its AGENTS.md and beginner guide, and help me make my own room. I do not know modeling or coding. Guide me one small step at a time and handle the setup for me.

Codex should read the instructions, prepare the local folder and open the studio. If a tool needs installing or your computer asks for permission, it will tell you what to do. You need your own access to Codex; the project itself needs no account or API key.

![The first screen asks for your room, not a finished house](../images/welcome.png)

**You should see:** a welcome page with three simple steps. The example is only there to explore.

## 2. Take four photos and share the main dimensions

Stand near the middle of the room. Take one photo facing each wall. Keep the same orientation and include the corners, door, windows and large furniture. Daylight and ordinary phone photos are enough.

![Four views and the measurements to collect](../images/photo-guide.svg)

Tell Codex:

| What | What to provide |
|---|---|
| Room | Width × depth × ceiling height |
| Door and windows | Which wall, approximate width/height, distance from a corner if known |
| Main furniture | Desk, cabinet and large chair sizes; where each belongs |
| Location | Your city; which way the main window faces if you know |
| Keep / leave out | What matters to you; what clutter should be ignored |

Centimetres or metres are both fine. If you do not know a measurement, say it is an estimate. Do not guess silently.

> Here are the four sides of my room. It is about 4.6 m wide, 3.4 m deep and 2.6 m high. These are estimates. The desk is 1.7 × 0.7 × 0.74 m. Keep the lamp and plant; ignore the laundry. I live in London. Please explain the layout you see before building.

These dimensions are **an example**, not a recommended size for your room.

**You should see:** a plain-language layout or simple plan that you can correct. Confirm it when the major positions look right.

## 3. Check the first room

Codex builds a room you can rotate in the browser. First check the space, not the decoration:

- Is the door on the right wall? Are the windows the right size?
- Does the room feel too tall, short, narrow or wide?
- Are the desk, chair and cabinet in the right places?

![An invented room used only to demonstrate inspection](../images/room.png)

> The desk is right, but the cabinet should be closer to the door. Make the ceiling a little lower. Save this version before changing anything.

A screenshot with an arrow or a rectangle is often the easiest explanation. The initial scaffold is a starting point; Codex then shapes it to your photos. You do not need to open the modeling software yourself.

**You should see:** your room's recognizable layout from several angles, with a saved version.

## 4. Make it feel like your real room

This is the most useful extra photo step. **Photograph the materials and distinctive objects close up.** One wide room photo often cannot show these clearly.

| Extra photo | Tell Codex what matters |
|---|---|
| Floor, straight down | Board width, grain direction and warm/cool tone |
| Cabinet front and side | Wood color, doors, handles and finish |
| Door, closed | Frame, glass pattern, hinges and handle |
| Chair, front and side | Overall silhouette, arms, upholstery and base |
| Ceiling | Exposed concrete, beams, pipes and fixtures |
| Lamp or favorite object | Its real color, shape and approximate size |

Use even daylight when possible. A close-up with harsh yellow lighting can make a neutral material look orange. For a recognizable object, include one full view and a detail view. Ask Codex to ignore clothing or unrelated clutter.

> This is the actual cabinet finish. The current one is too pale; match this warm wood and subtle grain. The lamp is green. The ceiling is exposed concrete. Please improve these details while keeping the layout the same.

**You should see:** a closer material match, not just more objects. Check it in daylight before judging it at sunset.

## 5. Give the room a world

Once the room feels familiar, ask:

> Put this room in a quiet illustrated woodland. Keep the project's visual style, add a believable entrance and a path down to the lake, and keep my room layout intact. Show me a saved version before adding more details.

The starter provides pines, hills, a flowing lake, a dock and a boat. Codex fits the architecture and clearing to your room. A very large or differently shaped room may need more landscape adjustments.

![The woodland is editable and grows around the room](../images/woodland.png)

Choose your city under **Time & light**. The sun and moon follow its date and local time. Try Dawn, Day, Sunset and Night to inspect the light. If you do not know the room's compass direction, the first orientation is provisional.

**You should see:** a coherent place: room → steps → clearing → shoreline → water. Objects stand on real ground, and the water meets the shore.

## 6. Add the things you love

Use **Add something** for a tent, hammock, campfire, seats, dock or boat. Each item has its own checkbox and a look-here arrow.

For a personal object, send a photo and a placement screenshot:

> Add this painting to the wall beside my desk. Here is the original image and a screenshot marking the position. Give it its own show/hide control and save a new version.

![A lake view from the studio](../images/lake.png)

You can turn on forest and lakeside sound when you want to listen. Birds give way to crickets after dark. Movement can be paused. Sound starts off by default.

## 7. Save and come back whenever you like

Ask Codex to save before each change, or click **Save a version**. These versions include the editable model, textures, code and project settings. Restoring also saves your current work first.

> Save this as “My first woodland”. Write down what is complete and the next small improvement, so we can continue another day.

To return, open the same project folder in Codex and say:

> Continue my room. Read my saved progress, start the local studio and show me where we left off.

Keep the entire project folder, including its hidden `.versions` folder. Make a second copy on your own backup drive if you want protection from computer loss. Local version history cannot survive losing the computer itself.

You are done when it feels like your place. You do not need to upload it, learn GitHub or share it with anyone.

## If something looks wrong

- **The webpage is unavailable:** ask Codex to restart the local studio. Its address works while the local server is running.
- **Something flashes or disappears as you move:** send a screenshot and explain the angle. Ask Codex to fix intersecting geometry and check near and far views.
- **The room does not look like yours yet:** correct proportions first, then provide a material or object close-up.
- **The computer feels slow:** turn on Lighter graphics; ask Codex to reduce scene complexity if needed.
- **You want the previous result:** open Saved versions and restore it, or ask Codex to do it.
