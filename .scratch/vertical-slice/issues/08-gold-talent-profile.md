# 08: Gold, Talent and Profile

**What to build:** Defeating an Enemy now earns Gold, shown on the HUD during the Run and on the end-of-Run summary. When the Run ends, in victory or in defeat, that Gold is added to the Player's Profile and stored at once. The game opens on a between-Runs screen showing total Gold and the Talent's level; the Player can buy the next Talent level when they can afford it, then start a Run whose Hero has more maximum health. The Profile is still there when the Player comes back later in the same browser. See the spec in this feature's directory, `GLOSSARY.md`, and ADR 0001 and ADR 0002.

**Blocked by:** 06 (A Run of three Rooms)

**Status:** ready-for-agent

- [ ] Each defeated Enemy adds its Gold, from the tuning table, to the Run's tally in the same tick; nothing has to be picked up.
- [ ] The simulation knows nothing of the Profile: the app turns the Talent level into the Hero's starting stats when creating a Run, and reads the outcome and the Gold earned when it ends.
- [ ] The Profile holds the Gold total, the Talent level and a format version; its rules are pure functions.
- [ ] Banking a finished Run adds its Gold to the Profile after a victory and after a defeat alike.
- [ ] The Talent raises the Hero's starting maximum health by 10 per level, up to level 5; the next level costs 20 Gold times that level; a purchase without enough Gold or at the highest level is refused.
- [ ] Storage goes through a small interface with a browser local-storage implementation and an in-memory one for tests; a missing, unreadable or unknown-version Profile loads as a fresh one.
- [ ] The Profile is written when a Run ends and after each purchase; Gold from a Run abandoned by closing the tab is lost.
- [ ] The game opens on the between-Runs screen, which shows total Gold, the Talent's level, the cost of its next level, a buy action that is unavailable when the purchase is invalid, and a button to start a Run; a first-time Player can start a Run immediately.
- [ ] The HUD shows the Gold earned this Run; the end-of-Run summary shows it too and leads back to the between-Runs screen.
- [ ] Simulation tests cover the Gold tally; Profile tests cover banking after victory and after defeat, cost progression, insufficient Gold, the level cap, the Talent's effect on starting stats, a storage round trip, and recovery from missing, unreadable and unknown-version data.
- [ ] Typecheck, lint and tests pass; earning, buying and reloading the page are checked by hand in the browser; the work is committed.
