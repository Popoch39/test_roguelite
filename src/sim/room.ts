import * as RAPIER from "@dimforge/rapier2d-compat";
import type { Tuning } from "./tuning";
import type { Room, RoomTemplate, Wall } from "./types";

export function loadRoom(world: RAPIER.World, template: RoomTemplate, tuning: Tuning): Room {
  const walls = outerWalls(template, tuning.wallThickness);
  const colliders = [
    ...walls.map(({ center, halfExtents }) =>
      RAPIER.ColliderDesc.cuboid(halfExtents.x, halfExtents.y).setTranslation(center.x, center.y),
    ),
    ...template.pillars.map(({ center, radius }) =>
      RAPIER.ColliderDesc.ball(radius).setTranslation(center.x, center.y),
    ),
  ];
  return {
    width: template.width,
    height: template.height,
    walls,
    pillars: template.pillars,
    colliderHandles: colliders.map((collider) => world.createCollider(collider).handle),
  };
}

export function unloadRoom(world: RAPIER.World, room: Room): void {
  for (const handle of room.colliderHandles) {
    world.removeCollider(world.getCollider(handle), false);
  }
}

function outerWalls({ width, height }: RoomTemplate, thickness: number): Wall[] {
  const halfWidth = width / 2;
  const halfHeight = height / 2;
  const halfThickness = thickness / 2;
  // The side walls run the full outer height so the four corners are closed.
  const side = { x: halfThickness, y: halfHeight + thickness };
  const end = { x: halfWidth, y: halfThickness };
  return [
    { center: { x: -halfWidth - halfThickness, y: 0 }, halfExtents: side },
    { center: { x: halfWidth + halfThickness, y: 0 }, halfExtents: side },
    { center: { x: 0, y: -halfHeight - halfThickness }, halfExtents: end },
    { center: { x: 0, y: halfHeight + halfThickness }, halfExtents: end },
  ];
}
