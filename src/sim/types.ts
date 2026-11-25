export interface Vec2 {
  x: number;
  y: number;
}

export interface HeroStats {
  /** Units per second. */
  speed: number;
  maxHealth: number;
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
  health: number;
  /** Null until the Hero is first damaged. */
  lastDamagedTick: number | null;
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
  pillars: Pillar[];
  /** The colliders of the walls and pillars, to remove when the Hero leaves the Room. */
  colliderHandles: number[];
}

export type RunPhase = "combat" | "ended";

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
  /** The identifier the next character to appear will get: none is ever given twice in a Run. */
  nextId: number;
  heroes: Hero[];
  enemies: Enemy[];
}
