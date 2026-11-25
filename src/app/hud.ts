import { shallow } from "zustand/shallow";
import type { RunState } from "../sim";
import { useHudStore, type HudState } from "../view/hudStore";

/** Called after every tick, so it writes to the store only when a value the HUD shows has changed. */
export function syncHud(state: RunState): void {
  const [hero] = state.heroes;
  const next: HudState = {
    heroHealth: hero?.health ?? 0,
    heroMaxHealth: hero?.stats.maxHealth ?? 0,
    dashReady: hero !== undefined && state.tick >= hero.dashReadyTick,
    roomNumber: state.roomIndex + 1,
    roomCount: state.roomTemplates.length,
    runSeed: state.seed,
    upgradeOffer: state.upgradeOffer,
    goldEarned: state.goldEarned,
    outcome: state.outcome,
  };
  // Comparing each value by identity is enough for the offer too: the simulation replaces it, never changes it in place.
  if (!shallow(next, useHudStore.getState())) useHudStore.setState(next);
}
