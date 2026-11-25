import type { HeroStats } from "./types";

export interface Tuning {
  heroStats: HeroStats;
  heroRadius: number;
  wallThickness: number;
}

export const DEFAULT_TUNING: Tuning = {
  heroStats: { speed: 6 },
  heroRadius: 0.5,
  wallThickness: 1,
};
