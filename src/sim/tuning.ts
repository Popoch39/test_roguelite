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

export interface EnemyAttackTuning extends AttackTuning {
  /** Distance to the Hero, centre to centre, at which an Enemy stops chasing and starts its Attack. */
  triggerRange: number;
}

export interface DashTuning {
  durationTicks: number;
  /** Units per second. */
  speed: number;
  /** Counted from the tick the Dash starts. */
  cooldownTicks: number;
}

export interface Tuning {
  heroStats: HeroStats;
  heroAttack: HeroAttackTuning;
  dash: DashTuning;
  heroRadius: number;
  enemyHealth: number;
  enemyRadius: number;
  /** Units per second. */
  enemySpeed: number;
  /**
   * How fast an Enemy's velocity returns to the one it wants, in units per second squared.
   * Lower lets a push carry it further before it stops or chases again.
   */
  enemyAcceleration: number;
  enemyAttack: EnemyAttackTuning;
  /** Gold credited to the Run for each Enemy defeated. */
  enemyGold: number;
  /** How many Enemies each Room of a Run holds, in order: a Run has one Room per entry. */
  enemiesPerRoom: number[];
  wallThickness: number;
}

export const DEFAULT_TUNING: Tuning = {
  heroStats: { speed: 6, maxHealth: 100 },
  heroAttack: {
    windupTicks: 4,
    activeTicks: 5,
    recoveryTicks: 9,
    damage: 25,
    reach: 2.4,
    angle: Math.PI * 0.6,
    knockbackImpulse: 6,
  },
  dash: { durationTicks: 10, speed: 18, cooldownTicks: 45 },
  heroRadius: 0.5,
  enemyHealth: 50,
  enemyRadius: 0.5,
  enemySpeed: 3.5,
  enemyAcceleration: 30,
  enemyAttack: {
    windupTicks: 30,
    activeTicks: 6,
    recoveryTicks: 30,
    damage: 15,
    reach: 1.8,
    angle: Math.PI / 2,
    triggerRange: 1.5,
  },
  enemyGold: 5,
  enemiesPerRoom: [3, 5, 7],
  wallThickness: 1,
};
