# Vertical slice: a playable Run on the foundation architecture

Status: ready-for-agent

## Problem Statement

The developer wants to build a solo, top-down action roguelite for the browser with three.js and Rapier, but has never built a game of this genre and does not know how one is architected: where the game loop lives, how game rules are kept apart from rendering, how the state of a Room, of a Run and of what persists between Runs are separated, and how to avoid closing the door on co-op later. The repository contains no code yet, only a glossary and two ADRs.

## Solution

Build a small vertical slice that is kept as the foundation of the game: little content, but every architectural building block present once.

From the Player's point of view: the game opens on a between-Runs screen showing their Gold and their Talent. They start a Run and guide a Hero, seen from a tilted top-down camera, through three combat Rooms of rising difficulty. The Hero moves, makes melee Attacks toward the cursor and Dashes out of danger. Enemies chase the Hero and announce their own Attacks with a visible Windup. Clearing a Room offers a choice of one Upgrade among three; clearing the third Room wins the Run; dropping to zero health loses it. Either way, the Gold earned is added to the Player's Profile, where it buys levels of a permanent Talent that makes the next Run a little easier.

From the developer's point of view: the game rules run in a headless simulation that can be tested without a browser, and the 3D view only draws it.

## User Stories

### Starting and the between-Runs screen

1. As a Player, I want the game to open on a between-Runs screen, so that I can see my Profile before committing to a Run.
2. As a Player, I want to see my total Gold on the between-Runs screen, so that I know what I can afford.
3. As a Player, I want to see my Talent's current level and the Gold cost of its next level, so that I can decide whether to buy it.
4. As a Player, I want to buy a Talent level with Gold, so that my next Hero starts with more maximum health.
5. As a Player, I want the buy action to be unavailable when I lack the Gold or the Talent is at its highest level, so that I cannot make an invalid purchase.
6. As a Player, I want a clear button to start a Run, so that I can get into the action in one click.
7. As a first-time Player, I want to start with an empty Profile and still be able to start a Run immediately, so that nothing blocks my first attempt.

### Moving and seeing

8. As a Player, I want to move the Hero in eight directions with the keyboard, so that I can position myself in the Room.
9. As a Player on an AZERTY or a QWERTY keyboard, I want movement bound to the physical key positions, so that the controls work without any configuration.
10. As a Player, I want diagonal movement to be no faster than straight movement, so that movement feels fair and predictable.
11. As a Player, I want the Hero to be stopped by walls and pillars and to slide along them, so that the Room's layout matters without feeling sticky.
12. As a Player, I want a tilted top-down camera that follows the Hero smoothly, so that I always see the action around me and the volumes of the characters.
13. As a Player, I want the Hero's facing to be readable at a glance, so that I know where an Attack will go.
14. As a Player, I want motion to look smooth whatever my screen's refresh rate, so that the game feels the same on a 60 Hz and a 144 Hz display.

### Fighting

15. As a Player, I want to make an Attack toward my cursor with the left mouse button, so that I aim independently of my movement.
16. As a Player, I want my Attack to have a brief Windup, an Active Phase and a Recovery, so that attacking is a commitment with a readable rhythm.
17. As a Player, I want the Hero to stand still during an Attack, so that choosing when to attack is a real decision.
18. As a Player, I want to see the area my Attack covers while it is in its Active Phase, so that I learn its reach and width.
19. As a Player, I want my Attack to damage every Enemy inside its area, each at most once per Attack, so that I am rewarded for positioning against a group.
20. As a Player, I want Enemies I damage to be pushed back and to flash, so that I get clear confirmation and some breathing room.
21. As a Player, I want holding the attack button to chain Attacks as soon as each Recovery ends, so that I do not have to hammer the mouse.
22. As a Player, I want to Dash with the space bar, so that I can escape an incoming Attack.
23. As a Player, I want the Dash to go in my movement direction, or toward the cursor when I am standing still, so that it always does something sensible.
24. As a Player, I want the Dash to cancel my Attack in any of its phases, so that I am never locked into a mistake.
25. As a Player, I want to be invulnerable for the duration of the Dash, so that a well-timed Dash through an Enemy's Active Phase is rewarded.
26. As a Player, I want the Dash to have a cooldown and to see when it is ready again, so that I use it deliberately.
27. As a Player, I want each press of the Dash key to produce at most one Dash, so that holding the key does not burn my cooldown.

### Enemies

28. As a Player, I want Enemies to come straight at the Hero, so that every Room turns into a fight quickly.
29. As a Player, I want Enemies to keep apart from each other rather than stack on one spot, so that I can read how many there are.
30. As a Player, I want an Enemy to stop and visibly change color during its Windup, so that I can see an Attack coming and react.
31. As a Player, I want an Enemy's Attack to keep the direction it had when its Windup started, so that moving or Dashing out of its area actually avoids it.
32. As a Player, I want to take damage only from an Enemy's Active Phase and never from mere contact, so that every hit I take was avoidable.
33. As a Player, I want Enemies to have a Recovery after attacking, so that I get an opening to counter.
34. As a Player, I want each Enemy to show its remaining health, so that I can choose whom to finish first.
35. As a Player, I want a defeated Enemy to disappear at once and credit me its Gold, so that the Room visibly empties and my reward needs no pick-up.

### Run structure

36. As a Player, I want a Run to be a sequence of three Rooms, so that a full attempt fits in a few minutes.
37. As a Player, I want each Room to hold more Enemies than the previous one, so that the Run builds tension.
38. As a Player, I want all of a Room's Enemies to be present when I enter, so that I can size up the fight from the start.
39. As a Player, I want to enter each Room away from its Enemies, so that I am not damaged before I can act.
40. As a Player, I want Rooms to differ in layout from one to the next and from Run to Run, so that Runs do not feel identical.
41. As a Player, I want my health to carry over between Rooms without automatic healing, so that every hit I take matters for the whole Run.
42. As a Player, I want to see my health, the current Room's number out of three and the Gold earned this Run at all times, so that I always know where I stand.
43. As a Player, I want the Run to end in defeat the moment my Hero's health reaches zero, so that the stakes are clear.
44. As a Player, I want the Run to end in victory as soon as the third Room is cleared, so that the goal is unambiguous.
45. As a Player, I want an end-of-Run summary showing victory or defeat and the Gold earned, so that I understand what the Run was worth.
46. As a Player, I want to go from the summary back to the between-Runs screen, so that I can spend my Gold and try again.

### Upgrades

47. As a Player, I want a choice of three different Upgrades as soon as I clear the first and the second Room, so that my Hero grows during the Run.
48. As a Player, I want the fight to be suspended while I choose, so that I can read the options calmly.
49. As a Player, I want each Upgrade to state plainly which stat it improves and by how much, so that I can make an informed choice.
50. As a Player, I want to pick an Upgrade with the mouse or with the 1, 2, 3 keys, so that choosing is quick.
51. As a Player, I want Upgrades to improve maximum health, Attack damage, movement speed, Dash cooldown or Attack reach, so that I can shape how my Hero plays.
52. As a Player, I want Upgrades of the same kind to stack, so that I can specialise.
53. As a Player, I want the maximum-health Upgrade to also heal me by the amount gained, so that it is never a dead choice.
54. As a Player, I want all Upgrades to be gone when the Run ends, so that each Run is a fresh build.

### Gold, Talent and Profile

55. As a Player, I want the Gold I earned to be added to my Profile whether I win or die, so that even a failed Run moves me forward.
56. As a Player, I want my Profile to be stored the moment a Run ends, so that closing the tab on the summary does not lose my Gold.
57. As a Player, I want my Profile to still be there when I come back another day in the same browser, so that my progress is kept.
58. As a Player, I want my Talent to have five levels with a rising Gold cost, so that I have a reason to do several Runs.
59. As a Player, I want my Talent levels to raise my Hero's maximum health at the start of every Run, so that buying them has a visible effect.
60. As a Player whose stored Profile is unreadable or from an unknown version, I want the game to start with a fresh Profile instead of crashing, so that I can always play.

### Developer and architecture

61. As a developer, I want all game rules in a simulation module that imports nothing from React, three.js or the DOM, so that I can test it without a browser and reuse it on a server later.
62. As a developer, I want the simulation to advance in fixed ticks of one sixtieth of a second, so that gameplay behaves the same at any frame rate and durations are expressed in ticks.
63. As a developer, I want every Player intent to reach the simulation as a plain-data command for a given tick, so that inputs can later be sent over a network.
64. As a developer, I want all of a Run's randomness to come from its Run Seed, so that I can reproduce a Run to investigate a bug.
65. As a developer, I want the Run Seed shown on screen and overridable from the page address, so that I can replay a specific Run.
66. As a developer, I want the simulation state to be plain serializable data, so that snapshots for a future server stay possible.
67. As a developer, I want an automated check that fails when the simulation imports rendering or browser code, so that the boundary cannot erode silently.
68. As a developer, I want the simulation to stop while the tab is hidden and not to try to catch up afterwards, so that returning to the tab does not fast-forward the fight.
69. As a developer, I want a debug overlay, toggled by a key, that draws the physics colliders and the tick counter, so that I can see what the simulation really does.
70. As a developer, I want all tuning values (health, speeds, phase durations, damage, Gold, costs) and all Room Templates and Upgrades defined as data, so that I can rebalance without touching the rules.
71. As a developer, I want commands for typecheck, lint, format and tests, so that every step can be verified before it is committed.
72. As a developer, I want one commit per working milestone, so that I can study how the architecture was built up.

## Implementation Decisions

### Shape of the codebase

- One package with three areas and a one-way dependency rule: **simulation** (pure TypeScript game rules and physics), **view** (React Three Fiber rendering and input capture), **app** (screens, Profile, storage, the loop that drives the simulation). The view and the app depend on the simulation; the simulation depends on neither. See ADR 0001.
- Toolchain: Bun as package manager, script runner and test runner; Vite as dev server and bundler; TypeScript in strict mode; oxlint for linting; oxfmt for formatting; git, with one commit per working milestone.
- Runtime dependencies are limited to three.js, React, React Three Fiber, Rapier 2D and zustand. No ECS library, no `@react-three/rapier`, no drei.

### Simulation

- Physics is Rapier 2D; simulation coordinates `(x, y)` map to the 3D ground plane `(x, 0, z)` in the view. See ADR 0002. The Rapier build must be one that loads the same way under Vite and under the Bun test runner.
- The simulation is a deep module with a small interface: an asynchronous one-time initialisation (loading the physics engine); creating a Run from a Run Seed and the Hero's starting stats; a `step` that advances the state by exactly one tick given that tick's commands; and read access to the state. Nothing else is public.
- State is plain data: the Run's phase, the index of the current Room, the Gold earned so far, the random generator's state, the Upgrades taken, and collections of Heroes and Enemies with stable identifiers. The prototype has exactly one Hero, but it lives in a collection and commands are addressed to it by identifier, as agreed for the future co-op. Physics bodies are owned by the physics world and referenced from the state by handle.
- Rules are plain functions over that state, called by `step` in a fixed order (commands, Hero actions, Enemy behaviour, physics step, Attack resolution, deaths and Gold, Run phase transitions). No classes with behaviour.
- A command carries, for one tick and one Hero: a movement direction, an aim direction, whether an Attack is requested, whether a Dash is requested, and an optional Upgrade choice. Attack is level-triggered (held means keep attacking); Dash is edge-triggered by the input layer (one request per key press). There is no input buffering.
- The simulation never reads the wall clock, never calls the platform's random source and never touches the DOM. All randomness comes from a small seedable generator whose state is part of the simulation state. Repeatability is expected on one machine for the same Run Seed and commands; bit-exact agreement across machines is not a goal.
- Durations are expressed in ticks at 60 ticks per second.
- Hero and Enemies are dynamic rigid bodies with locked rotation whose velocity is set every tick; the physics engine resolves walls, pillars and the separation between characters. Knockback is an impulse. The Hero keeps colliding with Enemies and obstacles during a Dash.
- Attacks never use collision events. During the Active Phase, each tick, a shape query finds the targets inside a circular sector in front of the attacker (reach and angle), and each target is damaged at most once per Attack.
- Hero Attack: aimed along the command's aim direction at the tick it starts; the Hero's velocity is zero for the whole Attack. Being damaged does not interrupt it.
- Dash: fixed duration and speed; direction is the movement direction, or the aim direction when the movement direction is zero. It cancels an Attack in any phase, makes the Hero immune to damage for its duration, and has a cooldown counted from its start. Dash and Attack requests are ignored outside the combat phase.
- Enemy behaviour is a small state machine: chase the nearest Hero in a straight line; when within trigger range, stop and start an Attack whose direction is fixed at the start of the Windup; go through Windup, Active Phase and Recovery; resume the chase. There is no pathfinding. Being damaged or pushed back does not interrupt an Enemy's Attack.
- Only Active Phases deal damage; contact does not.
- A defeated Enemy is removed in the same tick and its Gold is added to the Run's tally.
- Run phases live in the simulation: **combat**; **choosing an Upgrade** (entered the tick the last Enemy of Room 1 or Room 2 is defeated; the simulation is otherwise frozen until a valid choice command arrives); **ended**, with an outcome of victory (last Enemy of Room 3 defeated) or defeat (Hero health at zero, checked before victory). Once ended, `step` changes nothing.
- Loading a Room builds the colliders of its Room Template, places the Hero at the template's entry point with its current health, and places Enemies on spawn points drawn with the Run Seed. Enemy counts per Room are 3, 5 and 7.
- Room Templates are data: outer walls of a rectangle, a few round pillars, one entry point, and more spawn points than the largest Enemy count, all at a safe distance from the entry point. At least three templates exist; a Run draws its three Rooms from them with the Run Seed, without repetition.
- Upgrades are data: a name, the stat affected and the amount. The pool covers maximum health, Attack damage, movement speed, Dash cooldown and Attack reach. An offer is three distinct Upgrades drawn with the Run Seed; an Upgrade may be offered again later in the Run. Effective stats are computed from base stats plus the sum of the modifiers taken, so stacking is additive; the Dash cooldown has a floor. The maximum-health Upgrade also raises current health by the same amount.
- Starting values, all tunable and all defined in one data table: Hero health 100, Hero speed 6 units per second, Hero Attack 4 / 5 / 9 ticks (Windup / Active Phase / Recovery) for 25 damage; Dash 10 ticks with a 45-tick cooldown; Enemy health 50, Enemy speed 3.5 units per second, Enemy Attack 30 / 6 / 30 ticks for 15 damage; 5 Gold per Enemy.

### Profile and app

- The simulation knows nothing of the Profile. The app turns the Profile's Talent level into the Hero's starting stats when it creates a Run, and reads the outcome and the Gold earned when the Run ends.
- The Profile holds the Gold total, the Talent level and a format version. Its rules are pure functions: bank a finished Run's Gold (on victory and on defeat alike), and buy a Talent level (refused without enough Gold or at the highest level).
- The single Talent raises the Hero's starting maximum health by 10 per level, up to level 5. The cost of the next level is 20 Gold times that level (20, 40, 60, 80, 100).
- Storage goes through a small interface with two implementations: the browser's local storage, and an in-memory one for tests. Loading a missing, unreadable or unknown-version Profile yields a fresh one. The Profile is written when a Run ends and after each purchase. Gold from a Run abandoned by closing the tab is lost.
- The app has three screens: between-Runs, in-Run, and end-of-Run summary. The Run Seed is random for each new Run unless the page address supplies one.
- The loop driver accumulates real time and calls `step` at 60 ticks per second, with a cap on the ticks run per frame; it is suspended while the tab is hidden. It keeps the previous and the current positions so the view can interpolate.

### View

- React Three Fiber draws the simulation and holds no game rules. Character and obstacle meshes are primitives, updated imperatively every frame from interpolated simulation positions, with no React state per frame.
- A perspective camera with a narrow field of view, tilted at roughly 55 degrees, follows the Hero with light smoothing.
- Input capture: movement from the physical W, A, S, D key positions; Attack on the left mouse button; Dash on the space bar; the aim direction is from the Hero to the point where the cursor's ray meets the ground plane. Inputs are sampled into one command per tick.
- Visual feedback is limited to what makes combat readable: a flash on a damaged character, the Attack's sector shown during its Active Phase, a color change on an Enemy during its Windup, a facing marker on the Hero, and health bars above Enemies.
- The HUD is React DOM above the canvas: Hero health, Dash readiness, Room number, Gold earned this Run, Run Seed, the Upgrade choice (click or keys 1 to 3), the end-of-Run summary and the between-Runs screen. Its slow-changing state lives in a zustand store that the app updates only when a value changes. All interface text is English, written inline, with no translation layer.
- A debug overlay, toggled by a key, draws the physics colliders and shows the tick counter.

## Testing Decisions

- A good test exercises behaviour through a public interface and asserts only on what a caller can observe. It does not reach into internal helpers, does not assert on the order of internal rule functions, and does not depend on exact floating-point positions (it asserts on outcomes: who was damaged, which phase the Run is in, whether a wall was crossed).
- There are two test seams, agreed with the developer:
  1. **The simulation interface.** Tests create a Run with a fixed Run Seed, feed sequences of commands over a number of ticks, and assert on the resulting state. This single seam covers movement and walls, the three phases of an Attack, damage and knockback, Dash cancel, Dash invulnerability and cooldown, Enemy chase and Attack, absence of contact damage, Gold tally, Room clearing, the Upgrade offer (three distinct, repeatable for a given Run Seed) and its effects (stacking, heal on maximum health, cooldown floor), health carried between Rooms, victory after the third Room, defeat at zero health, and the same Run Seed with the same commands giving the same outcome.
  2. **The Profile module.** Tests cover banking Gold after a victory and after a defeat, buying Talent levels (cost progression, insufficient Gold, level cap), the Talent's effect on the Hero's starting stats, a storage round trip through the in-memory implementation, and recovery from missing, unreadable and unknown-version data.
- To keep simulation tests short, Run creation accepts the tuning table and the Room Templates as inputs, so a test can use a tiny empty Room and a single Enemy rather than steering through real content.
- The import boundary of the simulation is checked automatically: by a lint rule if the linter can express it, otherwise by a test that scans the simulation's imports.
- The view, the camera, input capture and the HUD have no automated tests. They are verified by hand in the browser at each milestone, with the debug overlay.
- Tests run with the Bun test runner. There is no prior art in the repository: these are its first tests and set the pattern.

## Out of Scope

- Multiplayer of any kind, a server, networking, and state snapshot or restore. Only the constraints that keep server-authoritative co-op possible are honoured.
- Gamepad and touch controls, key rebinding, a pause menu.
- Combos, the ranged throw, spells, and any Upgrade that changes behaviour rather than a stat.
- A boss, a second kind of Enemy, projectiles, pathfinding, inner walls or corridors, procedural Room generation.
- Doors or exits to walk through between Rooms; healing between Rooms.
- More than one Talent; Gold as objects to pick up.
- Sound, music, particles, screen shake, hit-stop, models, textures, animations.
- Translation, accessibility options, settings.
- Deployment, hosting, installable app, leaderboard, analytics.
- Automated browser tests.
- Any name, character, art or setting taken from the game that inspired the genre choice: the universe is original and abstract.

## Further Notes

- Build order, one commit per milestone, each verified by typecheck, lint, tests and a manual check in the browser:
  1. Foundation: project scaffold, the fixed-tick loop, a Hero moving in a walled Room, the camera, the debug overlay.
  2. Combat: Attack, Dash, Enemy behaviour, damage and defeat on both sides.
  3. Run: the three Rooms, Room Templates, the Upgrade choice, the end of the Run.
  4. Profile: Gold, the Talent, storage, the between-Runs screen.
- To verify when installing, rather than assume: which Rapier 2D build loads under both Vite and the Bun test runner, and whether oxlint can restrict imports for one folder.
- The between-Runs screen has no glossary term yet. If it grows into something the Player talks about, name it through domain modeling before the word spreads in the code.
- The starting values are guesses meant to make the first playable build fair; expect to tune them by playing.
- Decisions behind this spec are recorded in `GLOSSARY.md`, ADR 0001 (headless simulation, React Three Fiber as a view only) and ADR 0002 (Rapier 2D under a 3D view).
