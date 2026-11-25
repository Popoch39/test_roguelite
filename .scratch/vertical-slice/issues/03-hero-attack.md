# 03: Hero Attack defeats an Enemy

**What to build:** The Room now contains Enemies that stand still. The Player aims with the mouse and makes an Attack with the left button: the Hero stops, the Attack goes through its Windup, Active Phase and Recovery, its area is visible while it can deal damage, and every Enemy inside is damaged once, pushed back and flashes. Enemies show their remaining health and disappear when defeated. Holding the button chains Attacks. Enemies do not move or attack yet. See the spec in this feature's directory, `GLOSSARY.md`, and ADR 0001 and ADR 0002.

**Blocked by:** 01 (Walking skeleton)

**Status:** ready-for-agent

- [ ] Enemies exist in the simulation as dynamic bodies with locked rotation, a stable identifier and health; Enemies and the Hero do not overlap each other.
- [ ] The aim direction goes from the Hero to the point where the cursor's ray meets the ground plane, and is part of each tick's command.
- [ ] An Attack starts when requested during combat and the Hero is free to act; it runs through Windup, Active Phase and Recovery with durations in ticks taken from the tuning table.
- [ ] The Attack's direction is fixed at the tick it starts; the Hero's velocity is zero for the whole Attack.
- [ ] During the Active Phase, each tick, a shape query finds the Enemies inside a circular sector in front of the Hero (reach and angle from the tuning table); each Enemy is damaged at most once per Attack; collision events are not used.
- [ ] A damaged Enemy loses health and receives a knockback impulse; an Enemy at zero health is removed from the simulation in the same tick.
- [ ] Holding the attack button starts a new Attack as soon as the Recovery ends; there is no input buffering.
- [ ] The view shows a facing marker on the Hero, the Attack's sector during its Active Phase, a flash on a damaged Enemy and a health bar above each Enemy.
- [ ] Simulation tests cover: the three phases and their durations, the Hero not moving during an Attack, an Enemy inside the sector being damaged and one outside not, at most one damage per Enemy per Attack, knockback, removal at zero health, and chaining while the button is held.
- [ ] Typecheck, lint and tests pass; aiming and feedback are checked by hand in the browser; the work is committed.
