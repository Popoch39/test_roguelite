# 02: Debug overlay

**What to build:** A developer presses a key and sees what the simulation really contains, drawn over the 3D view: the outline of every physics collider and the current tick counter. Pressing the key again hides it. See the spec in this feature's directory, `GLOSSARY.md`, and ADR 0001 and ADR 0002.

**Blocked by:** 01 (Walking skeleton)

**Status:** resolved

- [x] A key toggles the overlay on and off; it is off by default.
- [x] Every collider present in the physics world (walls, Hero, and anything added by later tickets without extra work) is outlined at its true simulation position and size.
- [x] The tick counter is displayed and advances at 60 per second while the simulation runs.
- [x] The overlay reads the simulation and never changes it; the simulation still imports nothing from the view.
- [x] Typecheck, lint and tests pass; the overlay is checked by hand in the browser; the work is committed.

## Comments

Resolved on branch `vertical-slice` by merge commit `8137d01`; code review fixes for the whole branch followed in `3830f30`. Typecheck, lint, format check, tests and the production build pass on the merged branch. The browser check was made by the implementing agent driving a headless Chromium against the dev server and reading screenshots, not by a person: how the game feels in a real browser is still to be judged by the Player.
