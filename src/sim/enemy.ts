import * as RAPIER from "@dimforge/rapier2d-compat";
import type { Tuning } from "./tuning";
import type { Enemy, Vec2 } from "./types";

export function spawnEnemy(world: RAPIER.World, id: number, position: Vec2, tuning: Tuning): Enemy {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y)
      .lockRotations()
      // Nothing sets an Enemy's velocity, so without damping a push would send it sliding forever.
      .setLinearDamping(tuning.enemyDamping),
  );
  world.createCollider(RAPIER.ColliderDesc.ball(tuning.enemyRadius), body);

  return {
    id,
    position: { ...position },
    radius: tuning.enemyRadius,
    health: tuning.enemyHealth,
    maxHealth: tuning.enemyHealth,
    lastDamagedTick: null,
    bodyHandle: body.handle,
  };
}
