# 06: A Run of three Rooms

**What to build:** A Run is now a sequence of three Rooms. Each Room comes from a handcrafted Room Template with walls and round pillars, and holds 3, then 5, then 7 Enemies, all present when the Hero arrives at the entry point. Clearing a Room leads straight to the next one, health carried over without healing. Clearing the third Room wins the Run. The Player always sees which Room they are in, and an end-of-Run summary shows victory or defeat and offers a new Run. The Run Seed decides layouts and spawn points, is shown on screen and can be set from the page address. See the spec in this feature's directory, `GLOSSARY.md`, and ADR 0001 and ADR 0002.

**Blocked by:** 04 (Enemies chase and attack; the Hero can be defeated)

**Status:** ready-for-agent

- [ ] Room Templates are data: the outer walls of a rectangle, a few round pillars, one entry point, and more spawn points than the largest Enemy count, all at a safe distance from the entry point; at least three templates exist.
- [ ] All randomness comes from a small seedable generator whose state is part of the simulation state.
- [ ] A Run draws its three Rooms from the templates with the Run Seed, without repetition, and draws each Room's spawn points with it.
- [ ] Loading a Room builds the colliders of its template, removes those of the previous Room, places the Hero at the entry point with its current health, and places 3, 5 or 7 Enemies according to the Room's position in the Run.
- [ ] The tick the last Enemy of the first or second Room is defeated, the next Room loads; the Hero's health is carried over unchanged.
- [ ] The tick the last Enemy of the third Room is defeated, the Run ends with a victory outcome; defeat is checked before victory.
- [ ] Enemies steer straight at the Hero and slide around pillars thanks to the physics, with no pathfinding.
- [ ] The Run Seed is random for each new Run unless the page address supplies one; the HUD shows it, together with the current Room's number out of three.
- [ ] An end-of-Run summary screen shows victory or defeat and lets the Player start a new Run.
- [ ] Simulation tests cover: Enemy counts per Room, the Hero entering away from Enemies, health carried between Rooms, victory after the third Room, and the same Run Seed with the same commands giving the same Rooms, spawn points and outcome while a different Run Seed can give different ones.
- [ ] Typecheck, lint and tests pass; a full Run is played by hand in the browser to victory and to defeat; the work is committed.
