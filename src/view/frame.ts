import { Vector3 } from "three";
import type { RunState, Vec2 } from "../sim";

/** What to draw: the simulation between its previous tick (alpha 0) and its current one (alpha 1). */
export interface Frame {
  previous: RunState;
  current: RunState;
  alpha: number;
}

export interface FrameSource {
  /** Called once per rendered frame, before anything is drawn. */
  advance(deltaSeconds: number): void;
  readonly frame: Frame;
}

/** Writes the Hero's interpolated position into `target`, mapping simulation (x, y) to the ground plane (x, 0, z). */
export function heroGroundPosition(frame: Frame, heroId: number, target: Vector3): Vector3 {
  return groundPosition(frame.previous.heroes, frame.current.heroes, heroId, frame.alpha, target);
}

/** The same for an Enemy; `target` is left untouched once the Enemy is gone. */
export function enemyGroundPosition(frame: Frame, enemyId: number, target: Vector3): Vector3 {
  return groundPosition(
    frame.previous.enemies,
    frame.current.enemies,
    enemyId,
    frame.alpha,
    target,
  );
}

function groundPosition(
  previousTick: readonly { id: number; position: Vec2 }[],
  currentTick: readonly { id: number; position: Vec2 }[],
  id: number,
  alpha: number,
  target: Vector3,
): Vector3 {
  const current = currentTick.find((character) => character.id === id)?.position;
  if (!current) return target;
  const previous = previousTick.find((character) => character.id === id)?.position ?? current;
  return target.set(
    previous.x + (current.x - previous.x) * alpha,
    0,
    previous.y + (current.y - previous.y) * alpha,
  );
}
