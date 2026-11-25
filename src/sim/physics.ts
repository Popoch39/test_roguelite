import * as RAPIER from "@dimforge/rapier2d-compat";
import type { Combatant, Vec2 } from "./types";

let loading: Promise<void> | undefined;

export function initSimulation(): Promise<void> {
  loading ??= RAPIER.init();
  return loading;
}

/** Puts a Hero or an Enemy into the physics world, as a disc that cannot turn. */
export function createCombatant(
  world: RAPIER.World,
  id: number,
  position: Vec2,
  radius: number,
): Combatant {
  const body = world.createRigidBody(
    RAPIER.RigidBodyDesc.dynamic()
      .setTranslation(position.x, position.y)
      .lockRotations()
      // Lets the solver see a contact one tick ahead: two combatants closing fast would otherwise overlap first.
      .setSoftCcdPrediction(radius),
  );
  world.createCollider(
    RAPIER.ColliderDesc.ball(radius)
      // Friction would eat part of the speed a Hero is given each tick along a wall, and leave an Enemy
      // that presses on a pillar on its way to the Hero stuck to it instead of sliding around.
      .setFriction(0)
      .setFrictionCombineRule(RAPIER.CoefficientCombineRule.Min),
    body,
  );
  return { id, position: { ...position }, radius, bodyHandle: body.handle };
}
