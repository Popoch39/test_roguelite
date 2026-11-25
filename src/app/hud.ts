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
    outcome: state.outcome,
  };
  const shown = useHudStore.getState();
  if (
    next.heroHealth !== shown.heroHealth ||
    next.heroMaxHealth !== shown.heroMaxHealth ||
    next.dashReady !== shown.dashReady ||
    next.roomNumber !== shown.roomNumber ||
    next.roomCount !== shown.roomCount ||
    next.runSeed !== shown.runSeed ||
    next.outcome !== shown.outcome
  ) {
    useHudStore.setState(next);
  }
}
