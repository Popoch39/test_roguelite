# 05: Dash

**What to build:** The Player presses the space bar and the Hero makes a Dash: a short burst of movement in the movement direction, or toward the cursor when standing still. The Dash cancels an Attack in any of its phases, makes the Hero immune to damage while it lasts, and then needs a moment before it can be used again. The HUD shows whether the Dash is ready. See the spec in this feature's directory, `GLOSSARY.md`, and ADR 0001 and ADR 0002.

**Blocked by:** 04 (Enemies chase and attack; the Hero can be defeated)

**Status:** ready-for-agent

- [ ] A Dash has a fixed duration and speed from the tuning table; its direction is the command's movement direction, or the aim direction when the movement direction is zero.
- [ ] A Dash cancels the Hero's Attack whether it is in its Windup, Active Phase or Recovery.
- [ ] The Hero takes no damage from an Enemy's Active Phase for the whole duration of the Dash.
- [ ] The Dash cooldown is counted from the start of the Dash; a request made before it has elapsed is ignored.
- [ ] One key press produces at most one Dash request, however long the key is held; Dash requests outside the combat phase are ignored.
- [ ] The Hero keeps colliding with Enemies, walls and pillars during a Dash.
- [ ] The HUD shows whether the Dash is ready.
- [ ] Simulation tests cover: both direction rules, cancelling an Attack in each phase, immunity during the Dash and vulnerability right after it, the cooldown, and walls stopping a Dash.
- [ ] Typecheck, lint and tests pass; the Dash is checked by hand in the browser; the work is committed.
