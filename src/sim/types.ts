export interface Vec2 {
  x: number;
  y: number;
}

export interface HeroStats {
  /** Units per second. */
  speed: number;
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

export interface Hero {
  id: number;
  position: Vec2;
  radius: number;
  /** Unit vector toward where the Hero last aimed. */
  facing: Vec2;
  stats: HeroStats;
  /** Null while the Hero is free to act. */
  attack: Attack | null;
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
  bodyHandle: number;
}

export interface RoomTemplate {
  width: number;
  height: number;
  entryPoint: Vec2;
  /** One Enemy stands on each of them when the Room loads. */
  spawnPoints: Vec2[];
}

export interface Command {
  heroId: number;
  /** Any length: only the direction matters. Zero means stand still. */
  move: Vec2;
  /** From the Hero toward the aimed point; any length. Zero keeps the Hero's facing. */
  aim: Vec2;
  /** Level-triggered: true for as long as the Player holds the Attack input. */
  attack: boolean;
}

export interface Wall {
  center: Vec2;
  halfExtents: Vec2;
}

export interface Room {
  width: number;
  height: number;
  walls: Wall[];
}

export interface RunState {
  seed: number;
  tick: number;
  room: Room;
  heroes: Hero[];
  enemies: Enemy[];
}
