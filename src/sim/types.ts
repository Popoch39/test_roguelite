export interface Vec2 {
  x: number;
  y: number;
}

/** What a Hero starts a Run with. */
export interface HeroStats {
  /** Units per second. */
  speed: number;
  maxHealth: number;
}

/** A Hero's stats as they stand now: each is one an Upgrade can improve. */
export interface EffectiveStats extends HeroStats {
  attackDamage: number;
  /** Radius of the Attack's sector, from the Hero's centre. */
  attackReach: number;
  /** Counted from the tick the Dash starts. */
  dashCooldownTicks: number;
}

export type AttackPhase = "windup" | "active" | "recovery";

export interface Attack {
  phase: AttackPhase;
  /** Ticks since the Attack started; 0 on the tick it starts. */
  elapsedTicks: number;
  /** Unit vector, fixed when the Attack starts. */
  direction: Vec2;
  /** Radius of the sector, from the attacker's centre. */
  reach: number;
  /** Full opening of the sector, in radians. */
  angle: number;
  /** Who this Attack already damaged, so that no one is damaged twice by it. */
  damagedIds: number[];
}

export interface Dash {
  /** Ticks since the Dash started; 0 on the tick it starts. */
  elapsedTicks: number;
  /** Unit vector, fixed when the Dash starts. */
  direction: Vec2;
}

export interface Hero {
  id: number;
  position: Vec2;
  radius: number;
  /** Unit vector toward where the Hero last aimed. */
  facing: Vec2;
  /** What the Hero started the Run with, before any Upgrade. */
  baseStats: HeroStats;
  /** The base stats plus the sum of the Upgrades taken. */
  stats: EffectiveStats;
  health: number;
  /** Null until the Hero is first damaged. */
  lastDamagedTick: number | null;
  /** Null while the Hero is free to act. */
  attack: Attack | null;
  /** Null while the Hero is not dashing. */
  dash: Dash | null;
  /** The first tick on which a Dash request is accepted again. */
  dashReadyTick: number;
  bodyHandle: number;
}

export interface Enemy {
  id: number;
  position: Vec2;
  radius: number;
  health: number;
  maxHealth: number;
  /** Null until the Enemy is first damaged. */
  lastDamagedTick: number | null;
  /** Null while the Enemy chases. */
  attack: Attack | null;
  bodyHandle: number;
}

export interface Pillar {
  center: Vec2;
  radius: number;
}

export interface RoomTemplate {
  width: number;
  height: number;
  entryPoint: Vec2;
  pillars: Pillar[];
  /** Where Enemies can stand when the Room loads; which of them are used is drawn with the Run Seed. */
  spawnPoints: Vec2[];
}

export type UpgradeStat = keyof EffectiveStats;

export interface Upgrade {
  name: string;
  stat: UpgradeStat;
  /** Added to the stat: negative for the Dash cooldown, which improves by going down. */
  amount: number;
}

export interface Command {
  heroId: number;
  /** Any length: only the direction matters. Zero means stand still. */
  move: Vec2;
  /** From the Hero toward the aimed point; any length. Zero keeps the Hero's facing. */
  aim: Vec2;
  /** Level-triggered: true for as long as the Player holds the Attack input. */
  attack: boolean;
  /** Edge-triggered by the input layer: true on one tick per press of the Dash input. */
  dash: boolean;
  /** Position, from 0, of the Upgrade picked from the offer; left out on a tick without a pick. */
  upgradeChoice?: number;
}

export interface Wall {
  center: Vec2;
  halfExtents: Vec2;
}

export interface Room {
  width: number;
  height: number;
  walls: Wall[];
  pillars: Pillar[];
  /** The colliders of the walls and pillars, to remove when the Hero leaves the Room. */
  colliderHandles: number[];
}

export type RunPhase = "combat" | "choosing" | "ended";

export type RunOutcome = "victory" | "defeat";

export interface RunState {
  seed: number;
  /** State of the generator every random choice of the Run is drawn from. */
  randomState: number;
  tick: number;
  phase: RunPhase;
  /** Null until the Run has ended. */
  outcome: RunOutcome | null;
  /** The Room Templates of the Run's Rooms, in the order the Hero goes through them. */
  roomTemplates: RoomTemplate[];
  /** Position of the current Room in the Run, from 0. */
  roomIndex: number;
  room: Room;
  /** What the Player picks one Upgrade from; empty outside the choosing phase. */
  upgradeOffer: Upgrade[];
  /** The Upgrades taken so far in the Run, in the order they were chosen; the same one can be there twice. */
  upgrades: Upgrade[];
  /** Gold of the Enemies defeated so far in the Run. */
  goldEarned: number;
  /** The identifier the next character to appear will get: none is ever given twice in a Run. */
  nextId: number;
  heroes: Hero[];
  enemies: Enemy[];
}
