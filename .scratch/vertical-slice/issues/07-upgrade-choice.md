# 07: Upgrade choice between Rooms

**What to build:** As soon as the first or the second Room is cleared, the fight is suspended and the Player is offered three different Upgrades, each stating which stat it improves and by how much. The Player picks one with the mouse or with the 1, 2, 3 keys, and the next Room loads. Upgrades improve maximum health, Attack damage, movement speed, Dash cooldown or Attack reach, stack when taken more than once, and are gone when the Run ends. See the spec in this feature's directory, `GLOSSARY.md`, and ADR 0001 and ADR 0002.

**Blocked by:** 05 (Dash) and 06 (A Run of three Rooms)

**Status:** ready-for-agent

- [ ] Upgrades are data: a name, the stat affected and the amount; the pool covers maximum health, Attack damage, movement speed, Dash cooldown and Attack reach.
- [ ] Clearing the first or second Room puts the Run in a choosing phase instead of loading the next Room; the simulation is otherwise frozen until a valid choice command arrives, then the next Room loads. Clearing the third Room still ends the Run with no offer.
- [ ] An offer is three distinct Upgrades drawn with the Run Seed; an Upgrade may be offered again later in the same Run.
- [ ] The choice reaches the simulation as a command; invalid choices, and Attack or Dash requests during the choosing phase, are ignored.
- [ ] Effective stats are computed from base stats plus the sum of the modifiers taken, so stacking is additive; the Dash cooldown cannot go below its floor.
- [ ] The maximum-health Upgrade also raises current health by the same amount; no other healing happens between Rooms.
- [ ] A new Run starts with no Upgrades.
- [ ] The HUD shows the three offered Upgrades with their effect in plain English and accepts a click or the 1, 2, 3 keys.
- [ ] Simulation tests cover: the offer appearing after the first and second Rooms only, three distinct Upgrades, the same offer for the same Run Seed, the effect of each stat, additive stacking, the heal on maximum health, the Dash cooldown floor, and ignored commands while choosing.
- [ ] Typecheck, lint and tests pass; the choice is checked by hand in the browser with mouse and keys; the work is committed.
