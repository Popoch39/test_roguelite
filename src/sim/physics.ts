import * as RAPIER from "@dimforge/rapier2d-compat";

let loading: Promise<void> | undefined;

export function initSimulation(): Promise<void> {
  loading ??= RAPIER.init();
  return loading;
}
