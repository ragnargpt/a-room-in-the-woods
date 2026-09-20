# Contributing

Keep the first-time path simple. A visitor should be able to share this repository with Codex, provide photos and measurements, and build a personal room without learning modeling or publishing.

Before changing the workflow, read `AGENTS.md` and `docs/STYLE.md`. Preserve the editable Blender route and the model/source/texture snapshot contract. Add English and Chinese interface text together. Test new visible objects for independent show/hide, focus and associated light/sound behavior. Check camera motion at near/far distances for flickering surfaces.

Run:

```sh
python3 -m unittest discover -s tests -p 'test_*.py'
node --test tests/*.test.mjs
python3 scripts/check_release.py
```

For geometry changes, also build the example in a disposable folder, inspect the actual browser rendering, and attach a screenshot. Never attach private reference photos, accounts, personal workspace files or complete local version archives to issues or pull requests.
