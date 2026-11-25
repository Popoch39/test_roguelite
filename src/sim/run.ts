import * as RAPIER from "@dimforge/rapier2d-compat";
import { advanceAttack, attackSector, charactersInSector, startAttack } from "./attack";
import { actEnemies, spawnEnemy } from "./enemy";
import { drawSequence, drawSubset } from "./random";
import { loadRoom, unloadRoom } from "./room";
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
  roomTemplates: RoomTemplate[];
}

export const TICKS_PER_SECOND = 60;

const HERO_ID = 1;

export function createRun({ seed, heroStats, tuning, roomTemplates }: RunOptions): Run {
  const roomCount = tuning.enemiesPerRoom.length;
  if (roomTemplates.length < roomCount) {
    throw new Error(
      `A Run of ${roomCount} Rooms needs ${roomCount} Room Templates, got ${roomTemplates.length}`,
    );
  }
  // Asked of every Room Template, not only of those drawn, so that faulty content fails whatever the Run Seed.
  const mostEnemies = Math.max(...tuning.enemiesPerRoom);
  if (roomTemplates.some(({ spawnPoints }) => spawnPoints.length < mostEnemies)) {
    throw new Error(`Every Room Template needs at least ${mostEnemies} spawn points`);
  }

  const world = new RAPIER.World({ x: 0, y: 0 });
  world.timestep = 1 / TICKS_PER_SECOND;

  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
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

  const state: RunState = {
    seed,
    // The generator works on 32-bit unsigned integers.
    randomState: seed >>> 0,
    tick: 0,
    phase: "combat",
    outcome: null,
    roomTemplates: [],
    roomIndex: 0,
    // Nothing is loaded yet: entering the first Room fills in the Room, the Hero's position and the Enemies.
    room: { width: 0, height: 0, walls: [], pillars: [], colliderHandles: [] },
    nextId: HERO_ID + 1,
    heroes: [
      {
        id: HERO_ID,
        position: { x: 0, y: 0 },
        radius: tuning.heroRadius,
        facing: { x: 1, y: 0 },
        stats: { ...heroStats },
        health: heroStats.maxHealth,
        lastDamagedTick: null,
        attack: null,
        bodyHandle: body.handle,
      },
    ],
    enemies: [],
  };
  state.roomTemplates = drawSequence(state, roomTemplates, roomCount);
  enterRoom(state, world, tuning, 0);

  return { state, [physicsWorld]: world, [tuningTable]: tuning };
}

function enterRoom(state: RunState, world: RAPIER.World, tuning: Tuning, roomIndex: number): void {
  const template = state.roomTemplates[roomIndex];
  const enemyCount = tuning.enemiesPerRoom[roomIndex];
  if (!template || enemyCount === undefined) {
    throw new Error(`The Run has no Room ${roomIndex + 1}`);
  }

  unloadRoom(world, state.room);
  state.roomIndex = roomIndex;
  state.room = loadRoom(world, template, tuning);
  for (const hero of state.heroes) {
    world.getRigidBody(hero.bodyHandle).setTranslation(template.entryPoint, true);
    hero.position = { ...template.entryPoint };
  }
  state.enemies = drawSubset(state, template.spawnPoints, enemyCount).map((spawnPoint) =>
    spawnEnemy(world, state.nextId++, spawnPoint, tuning),
  );
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
  const enemiesDefeated = removeDefeatedEnemies(state, world);
  endRunOnDefeat(state);
  leaveClearedRoom(state, world, run[tuningTable], enemiesDefeated);
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

/** Returns how many Enemies were defeated this tick. */
function removeDefeatedEnemies(state: RunState, world: RAPIER.World): number {
  const enemiesBefore = state.enemies.length;
  for (const enemy of state.enemies) {
    if (enemy.health <= 0) world.removeRigidBody(world.getRigidBody(enemy.bodyHandle));
  }
  state.enemies = state.enemies.filter((enemy) => enemy.health > 0);
  return enemiesBefore - state.enemies.length;
}

function endRunOnDefeat(state: RunState): void {
  if (state.heroes.every((hero) => hero.health <= 0)) {
    state.phase = "ended";
    state.outcome = "defeat";
  }
}

/** A Room is cleared on the tick its last Enemy is defeated; one that never held an Enemy is never cleared. */
function leaveClearedRoom(
  state: RunState,
  world: RAPIER.World,
  tuning: Tuning,
  enemiesDefeated: number,
): void {
  if (state.phase !== "combat" || enemiesDefeated === 0 || state.enemies.length > 0) return;
  if (state.roomIndex + 1 < state.roomTemplates.length) {
    enterRoom(state, world, tuning, state.roomIndex + 1);
  } else {
    state.phase = "ended";
    state.outcome = "victory";
  }
}

function readPositions(state: RunState, world: RAPIER.World): void {
  for (const character of [...state.heroes, ...state.enemies]) {
    const { x, y } = world.getRigidBody(character.bodyHandle).translation();
    character.position = { x, y };
  }
}
