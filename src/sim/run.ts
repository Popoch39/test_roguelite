import * as RAPIER from "@dimforge/rapier2d-compat";
import { loadRoom } from "./room";
import type { Tuning } from "./tuning";
import type { Command, HeroStats, RoomTemplate, RunState, Vec2 } from "./types";

// Not re-exported from the public interface, so only the simulation can reach the physics world.
export const physicsWorld: unique symbol = Symbol("physicsWorld");

export interface Run {
  readonly state: RunState;
  readonly [physicsWorld]: RAPIER.World;
}

export interface RunOptions {
  seed: number;
  heroStats: HeroStats;
  tuning: Tuning;
  roomTemplate: RoomTemplate;
}

export const TICKS_PER_SECOND = 60;

const HERO_ID = 1;

export function createRun({ seed, heroStats, tuning, roomTemplate }: RunOptions): Run {
  const world = new RAPIER.World({ x: 0, y: 0 });
  world.timestep = 1 / TICKS_PER_SECOND;
  const room = loadRoom(world, roomTemplate, tuning);

  const { entryPoint } = roomTemplate;
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic().setTranslation(entryPoint.x, entryPoint.y).lockRotations(),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(tuning.heroRadius)
      // Without this, rubbing against a wall would eat part of the speed set each tick.
      .setFriction(0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min),
    body,
  );

  const state: RunState = {
    seed,
    tick: 0,
    room,
    heroes: [
      {
        id: HERO_ID,
        position: { ...entryPoint },
        radius: tuning.heroRadius,
        stats: { ...heroStats },
        bodyHandle: body.handle,
      },
    ],
  };

  return { state, [physicsWorld]: world };
}

export function step(run: Run, commands: readonly Command[]): void {
  const { state } = run;
  const world = run[physicsWorld];

  moveHeroes(state, world, commands);
  world.step();
  readPositions(state, world);
  state.tick += 1;
}

function moveHeroes(state: RunState, world: RAPIER.World, commands: readonly Command[]): void {
  for (const hero of state.heroes) {
    const command = commands.find(({ heroId }) => heroId === hero.id);
    const direction = normalize(command?.move ?? { x: 0, y: 0 });
    world
      .getRigidBody(hero.bodyHandle)
      .setLinvel({ x: direction.x * hero.stats.speed, y: direction.y * hero.stats.speed }, true);
  }
}

function readPositions(state: RunState, world: RAPIER.World): void {
  for (const hero of state.heroes) {
    const { x, y } = world.getRigidBody(hero.bodyHandle).translation();
    hero.position = { x, y };
  }
}

function normalize({ x, y }: Vec2): Vec2 {
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}
