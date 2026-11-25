import { create } from "zustand";
import type { RunOutcome } from "../sim";

/** What the HUD shows of a Run: values that change now and then, never every frame. */
export interface HudState {
  heroHealth: number;
  heroMaxHealth: number;
  dashReady: boolean;
  /** Null while the Run is still being played. */
  outcome: RunOutcome | null;
}

export const useHudStore = create<HudState>(() => ({
  heroHealth: 0,
  heroMaxHealth: 0,
  dashReady: false,
  outcome: null,
}));
