import * as RAPIER from "@dimforge/rapier2d-compat";
import { advanceAttack, attackSector, charactersInSector, startAttack } from "./attack";
import { actEnemies, spawnEnemy } from "./enemy";
import { loadRoom } from "./room";
import type { Tuning } from "./tuning";
import type { Command, HeroStats, RoomTemplate, RunState } from "./types";
import { normalize } from "./vec";

// Not re-exported from the public interface, so only the simulation can reach the physics world.
export const physicsWorld: unique symbol = Symbol("physicsWorld");

const tuningTable: unique symbol = Symbol("tuningTable");

export interface Run {
  readonly state: RunState;
  readonly [physicsWorld]: RAPIER.World;
  readonly [tuningTable]: Tuning;
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
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(entryPoint.x, entryPoint.y)
      .lockRotations()
      // Lets the solver see a contact one tick ahead: two characters closing fast would otherwise overlap first.
      .setSoftCcdPrediction(tuning.heroRadius),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(tuning.heroRadius)
      // Without this, rubbing against a wall would eat part of the speed set each tick.
      .setFriction(0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min),
    body,
  );

  const enemies = roomTemplate.spawnPoints.map((spawnPoint, index) =>
    spawnEnemy(world, HERO_ID + 1 + index, spawnPoint, tuning),
  );

  const state: RunState = {
    seed,
    tick: 0,
    phase: "combat",
    outcome: null,
    room,
    heroes: [
      {
        id: HERO_ID,
        position: { ...entryPoint },
        radius: tuning.heroRadius,
        facing: { x: 1, y: 0 },
        stats: { ...heroStats },
        health: heroStats.maxHealth,
        lastDamagedTick: null,
        attack: null,
        bodyHandle: body.handle,
      },
    ],
    enemies,
  };

  return { state, [physicsWorld]: world, [tuningTable]: tuning };
}

export function step(run: Run, commands: readonly Command[]): void {
  const { state } = run;
  if (state.phase === "ended") return;
  const world = run[physicsWorld];

  actHeroes(state, world, commands, run[tuningTable]);
  actEnemies(state, world, run[tuningTable]);
  world.step();
  readPositions(state, world);
  resolveHeroAttacks(state, world, run[tuningTable]);
  resolveEnemyAttacks(state, world, run[tuningTable]);
  removeDefeatedEnemies(state, world);
  endRunOnDefeat(state);
  state.tick += 1;
}

function actHeroes(
  state: RunState,
  world: RAPIER.World,
  commands: readonly Command[],
  tuning: Tuning,
): void {
  for (const hero of state.heroes) {
    const command = commands.find(({ heroId }) => heroId === hero.id);
    if (hero.attack) hero.attack = advanceAttack(hero.attack, tuning.heroAttack);
    if (!hero.attack) {
      const aim = normalize(command?.aim ?? { x: 0, y: 0 });
      if (aim.x !== 0 || aim.y !== 0) hero.facing = aim;
      if (command?.attack) hero.attack = startAttack(hero.facing, tuning.heroAttack);
    }

    const speed = hero.attack ? 0 : hero.stats.speed;
    const direction = normalize(command?.move ?? { x: 0, y: 0 });
    world
      .getRigidBody(hero.bodyHandle)
      .setLinvel({ x: direction.x * speed, y: direction.y * speed }, true);
  }
}

function resolveHeroAttacks(state: RunState, world: RAPIER.World, tuning: Tuning): void {
  const { damage, knockbackImpulse } = tuning.heroAttack;
  for (const hero of state.heroes) {
    const { attack } = hero;
    if (attack?.phase !== "active") continue;
    const sector = attackSector(hero.position, attack);
    for (const enemy of charactersInSector(world, state.enemies, sector)) {
      if (attack.damagedIds.includes(enemy.id)) continue;
      attack.damagedIds.push(enemy.id);
      enemy.health -= damage;
      enemy.lastDamagedTick = state.tick;

      const away = normalize({
        x: enemy.position.x - hero.position.x,
        y: enemy.position.y - hero.position.y,
      });
      world
        .getRigidBody(enemy.bodyHandle)
        .applyImpulse({ x: away.x * knockbackImpulse, y: away.y * knockbackImpulse }, true);
    }
  }
}

function resolveEnemyAttacks(state: RunState, world: RAPIER.World, tuning: Tuning): void {
  for (const enemy of state.enemies) {
    const { attack } = enemy;
    if (attack?.phase !== "active") continue;
    const sector = attackSector(enemy.position, attack);
    for (const hero of charactersInSector(world, state.heroes, sector)) {
      if (attack.damagedIds.includes(hero.id)) continue;
      attack.damagedIds.push(hero.id);
      hero.health = Math.max(hero.health - tuning.enemyAttack.damage, 0);
      hero.lastDamagedTick = state.tick;
    }
  }
}

function removeDefeatedEnemies(state: RunState, world: RAPIER.World): void {
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) world.removeRigidBody(world.getRigidBody(enemy.bodyHandle));
  }
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0);
}

function endRunOnDefeat(state: RunState): void {
  if (state.heroes.every((hero) => hero.health <= 0)) {
    state.phase = "ended";
    state.outcome = "defeat";
  }
}

function readPositions(state: RunState, world: RAPIER.World): void {
  for (const character of [...state.heroes, ...state.enemies]) {
    const { x, y } = world.getRigidBody(character.bodyHandle).translation();
    character.position = { x, y };
  }
}
