import * as RAPIER from "@dimforge/rapier2d-compat";
import { advanceAttack, startAttack } from "./attack";
import type { Tuning } from "./tuning";
import type { Enemy, Hero, RunState, Vec2 } from "./types";
import { distance, normalize } from "./vec";

export function spawnEnemy(world: RAPIER.World, id: number, position: Vec2, tuning: Tuning): Enemy {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y)
      .lockRotations()
      // Lets the solver see a contact one tick ahead: two characters closing fast would otherwise overlap first.
      .setSoftCcdPrediction(tuning.enemyRadius),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(tuning.enemyRadius)
      // With friction, an Enemy pressing on a pillar on its way to the Hero sticks to it instead of sliding around.
      .setFriction(0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min),
    body,
  );

  return {
    id,
    position: { ...position },
    radius: tuning.enemyRadius,
    health: tuning.enemyHealth,
    maxHealth: tuning.enemyHealth,
    lastDamagedTick: null,
    attack: null,
    bodyHandle: body.handle,
  };
}

export function actEnemies(state: RunState, world: RAPIER.World, tuning: Tuning): void {
  const { enemyAttack } = tuning;
  for (const enemy of state.enemies) {
    if (enemy.attack) enemy.attack = advanceAttack(enemy.attack, enemyAttack);

    const target = nearestHero(enemy.position, state.heroes);
    const toward = target
      ? normalize({
          x: target.position.x - enemy.position.x,
          y: target.position.y - enemy.position.y,
        })
      : { x: 0, y: 0 };
    if (
      !enemy.attack &&
      target &&
      distance(enemy.position, target.position) <= enemyAttack.triggerRange
    ) {
      enemy.attack = startAttack(toward, enemyAttack);
    }

    const speed = enemy.attack ? 0 : tuning.enemySpeed;
    steer(
      world.getRigidBody(enemy.bodyHandle),
      { x: toward.x * speed, y: toward.y * speed },
      tuning.enemyAcceleration * world.timestep,
    );
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
  const gap = { x: wanted.x - current.x, y: wanted.y - current.y };
  const length = Math.hypot(gap.x, gap.y);
  const share = length <= maxChange ? 1 : maxChange / length;
  body.setLinvel({ x: current.x + gap.x * share, y: current.y + gap.y * share }, true);
}
