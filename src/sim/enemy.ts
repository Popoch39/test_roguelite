import type * as RAPIER from "@dimforge/rapier2d-compat";
import { advanceAttack, startAttack } from "./attack";
import { createCombatant } from "./physics";
import type { Tuning } from "./tuning";
import type { Enemy, Hero, RunState, Vec2 } from "./types";
import { distance, normalize, subtract } from "./vec";

export function spawnEnemy(world: RAPIER.World, id: number, position: Vec2, tuning: Tuning): Enemy {
  return {
    ...createCombatant(world, id, position, tuning.enemyRadius),
    health: tuning.enemyHealth,
    maxHealth: tuning.enemyHealth,
    lastDamagedTick: null,
    attack: null,
  };
}

export function actEnemies(state: RunState, world: RAPIER.World, tuning: Tuning): void {
  const { enemyAttack } = tuning;
  for (const enemy of state.enemies) {
    const wasChasing = !enemy.attack;
    if (enemy.attack) enemy.attack = advanceAttack(enemy.attack, enemyAttack);

    const target = nearestHero(enemy.position, state.heroes);
    const toward = target ? normalize(subtract(target.position, enemy.position)) : { x: 0, y: 0 };
    if (
      !enemy.attack &&
      target &&
      distance(enemy.position, target.position) <= enemyAttack.triggerRange
    ) {
      enemy.attack = startAttack(toward, enemyAttack);
    }

    const body = world.getRigidBody(enemy.bodyHandle);
    if (wasChasing && enemy.attack) {
      // Steering would let the chase carry the Enemy, and the area of its Attack with it, past the spot where
      // its Windup starts. An Attack that follows another needs no stop: the Enemy already stands there, unless
      // a push is carrying it, and a push must go on.
      body.setLinvel({ x: 0, y: 0 }, true);
    } else {
      const speed = enemy.attack ? 0 : tuning.enemySpeed;
      steer(
        body,
        { x: toward.x * speed, y: toward.y * speed },
        tuning.enemyAcceleration * world.timestep,
      );
    }
  }
}

function nearestHero(from: Vec2, heroes: readonly Hero[]): Hero | undefined {
  let nearest: Hero | undefined;
  for (const hero of heroes) {
    if (!nearest || distance(from, hero.position) < distance(from, nearest.position)) {
      nearest = hero;
    }
  }
  return nearest;
}

/**
 * Moves the body's velocity toward the wanted one by a bounded amount instead of overwriting it,
 * so that the impulse of a push is worn down over several ticks rather than erased by the next one.
 */
function steer(body: RAPIER.RigidBody, wanted: Vec2, maxChange: number): void {
  const current = body.linvel();
  const gap = subtract(wanted, current);
  const length = Math.hypot(gap.x, gap.y);
  const share = length <= maxChange ? 1 : maxChange / length;
  body.setLinvel({ x: current.x + gap.x * share, y: current.y + gap.y * share }, true);
}
