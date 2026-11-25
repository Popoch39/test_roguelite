export interface Vec2 {
  x: number;
  y: number;
}

export interface HeroStats {
  /** Units per second. */
  speed: number;
}

export interface Hero {
  id: number;
  position: Vec2;
  radius: number;
  stats: HeroStats;
  bodyHandle: number;
}

export interface RoomTemplate {
  width: number;
  height: number;
  entryPoint: Vec2;
}

export interface Command {
  heroId: number;
  /** Any length: only the direction matters. Zero means stand still. */
  move: Vec2;
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
}
