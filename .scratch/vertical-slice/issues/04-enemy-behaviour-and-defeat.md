# 04: Enemies chase and attack; the Hero can be defeated

**What to build:** Enemies now come straight at the Hero. When one is close enough it stops, changes color during its Windup, then deals damage during its Active Phase to a Hero still inside its area, and pauses for its Recovery before resuming the chase. The Player sees the Hero's health on screen. When it reaches zero the Run ends in defeat, the game says so, and the Player can start again. See the spec in this feature's directory, `GLOSSARY.md`, and ADR 0001 and ADR 0002.

**Blocked by:** 03 (Hero Attack defeats an Enemy)

**Status:** ready-for-agent

- [ ] Enemy behaviour is a state machine: chase the nearest Hero in a straight line with no pathfinding; within trigger range, stop and start an Attack; go through Windup, Active Phase and Recovery; resume the chase.
- [ ] An Enemy's Attack direction is fixed at the start of its Windup, so a Hero who leaves the area before the Active Phase takes no damage.
- [ ] An Enemy's Attack damages the Hero at most once, and only during its Active Phase; contact alone never deals damage.
- [ ] Being damaged or pushed back does not interrupt an Enemy's Attack, and being damaged does not interrupt the Hero's.
- [ ] Enemies stay apart from each other rather than stacking on one spot.
- [ ] The Run has a phase; when the Hero's health reaches zero the phase becomes ended with a defeat outcome, and further steps change nothing.
- [ ] The HUD, as React DOM above the canvas fed by a zustand store updated only on change, shows the Hero's health; interface text is English.
- [ ] The view changes an Enemy's color during its Windup and flashes the Hero when damaged.
- [ ] On defeat the game shows the outcome and offers to start a new Run.
- [ ] Simulation tests cover: an Enemy closing the distance, stopping and attacking in range, damage only in the Active Phase, no damage after leaving the area during the Windup, no contact damage, the Recovery before chasing again, and defeat at zero health freezing the Run.
- [ ] Typecheck, lint and tests pass; the fight is checked by hand in the browser; the work is committed.
