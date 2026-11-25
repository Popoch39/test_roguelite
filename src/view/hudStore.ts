import { create } from "zustand";
import type { RunOutcome, Upgrade } from "../sim";

/** What the HUD shows of a Run: values that change now and then, never every frame. */
export interface HudState {
  heroHealth: number;
  heroMaxHealth: number;
  dashReady: boolean;
  /** Position of the current Room in the Run, from 1. */
  roomNumber: number;
  roomCount: number;
  runSeed: number;
  /** Empty unless the Player is choosing an Upgrade. */
  upgradeOffer: Upgrade[];
  /** Null while the Run is still being played. */
  outcome: RunOutcome | null;
}

export const useHudStore = create<HudState>(() => ({
  heroHealth: 0,
  heroMaxHealth: 0,
  dashReady: false,
  roomNumber: 0,
  roomCount: 0,
  runSeed: 0,
  upgradeOffer: [],
  outcome: null,
}));
