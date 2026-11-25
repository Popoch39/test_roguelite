import type { DashTuning } from "./tuning";
import type { Dash, Vec2 } from "./types";

export function startDash(direction: Vec2, tuning: DashTuning): Dash | null {
  return tuning.durationTicks > 0 ? { elapsedTicks: 0, direction: { ...direction } } : null;
}

/** The Dash one tick later, or null once its duration is over. */
export function advanceDash(dash: Dash, tuning: DashTuning): Dash | null {
  const elapsedTicks = dash.elapsedTicks + 1;
  return elapsedTicks < tuning.durationTicks ? { ...dash, elapsedTicks } : null;
}
