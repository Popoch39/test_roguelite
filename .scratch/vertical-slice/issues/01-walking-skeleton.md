# 01: Walking skeleton: a Hero moves in a walled Room

**What to build:** Opening the game shows a Hero, drawn as a primitive, standing in a rectangular walled Room seen from a tilted top-down camera. The Player moves the Hero in eight directions with the keyboard; walls stop the Hero and the camera follows smoothly. Behind this, the whole foundation exists end to end: the project toolchain, the headless simulation advancing in fixed ticks on Rapier 2D, the loop that drives it, and the React Three Fiber view that only draws it. There are no Enemies, no Attack and no HUD yet. See the spec in this feature's directory, `GLOSSARY.md`, and ADR 0001 and ADR 0002.

**Blocked by:** None (can start immediately)

**Status:** resolved

- [x] The project installs with Bun and has commands for dev server, build, typecheck, lint, format and tests; TypeScript is strict; linting uses oxlint and formatting uses oxfmt; the repository is under git.
- [x] Runtime dependencies are limited to three.js, React, React Three Fiber, Rapier 2D and zustand; the chosen Rapier 2D build loads under both Vite and the Bun test runner.
- [x] The code is split into simulation, view and app; the simulation imports nothing from React, three.js or the DOM, and an automated check (a lint rule, or a test scanning imports if the linter cannot express it) fails when it does.
- [x] The simulation exposes only: a one-time asynchronous initialisation, creation of a Run from a Run Seed and the Hero's starting stats, a `step` advancing exactly one tick from that tick's commands, and read access to the state.
- [x] Simulation state is plain data; the Hero lives in a collection with a stable identifier and commands address it by that identifier; tuning values come from one data table and Run creation accepts the tuning table and the Room layout as inputs.
- [x] The simulation never reads the wall clock, the platform's random source or the DOM.
- [x] The Hero is a dynamic body with locked rotation whose velocity is set each tick; diagonal movement is no faster than straight movement; the Hero cannot cross walls and slides along them.
- [x] The loop runs the simulation at 60 ticks per second whatever the display's refresh rate, caps the ticks run per frame, is suspended while the tab is hidden and does not catch up afterwards.
- [x] The view interpolates between the previous and the current tick, updates meshes imperatively with no per-frame React state, and maps simulation `(x, y)` to the ground plane `(x, 0, z)`.
- [x] The camera is a narrow-field perspective camera tilted at roughly 55 degrees that follows the Hero with light smoothing.
- [x] Movement is bound to the physical W, A, S, D key positions, so it works unchanged on AZERTY and QWERTY keyboards; inputs are sampled into one command per tick.
- [x] Simulation tests, run through the public interface only, cover: movement in each direction, equal speed on diagonals, walls stopping the Hero, and the same commands giving the same outcome.
- [x] Typecheck, lint and tests pass; movement and camera are checked by hand in the browser; the work is committed.

## Comments

Resolved on branch `vertical-slice` by merge commit `1eeb27d`; code review fixes for the whole branch followed in `3830f30`. Typecheck, lint, format check, tests and the production build pass on the merged branch. The browser check was made by the implementing agent driving a headless Chromium against the dev server and reading screenshots, not by a person: how the game feels in a real browser is still to be judged by the Player.
