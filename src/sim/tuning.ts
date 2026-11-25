import type { HeroStats } from "./types";

export interface AttackTuning {
  windupTicks: number;
  activeTicks: number;
  recoveryTicks: number;
  damage: number;
  /** Radius of the sector, from the attacker's centre. */
  reach: number;
  /** Full opening of the sector, in radians. */
  angle: number;
}

export interface HeroAttackTuning extends AttackTuning {
  /** Strength of the push given to each Enemy the Attack damages. */
  knockbackImpulse: number;
}

export interface Tuning {
  heroStats: HeroStats;
  heroAttack: HeroAttackTuning;
  heroRadius: number;
  enemyHealth: number;
  enemyRadius: number;
  /** How fast an Enemy loses the speed it got from a push; higher stops it sooner. */
  enemyDamping: number;
  wallThickness: number;
}

export const DEFAULT_TUNING: Tuning = {
  heroStats: { speed: 6 },
  heroAttack: {
    windupTicks: 4,
    activeTicks: 5,
    recoveryTicks: 9,
    damage: 25,
    reach: 2.4,
    angle: Math.PI * 0.6,
    knockbackImpulse: 6,
  },
  heroRadius: 0.5,
  enemyHealth: 50,
  enemyRadius: 0.5,
  enemyDamping: 8,
  wallThickness: 1,
};
