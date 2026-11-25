import { Vector3 } from "three";
import type { LineSegment, RunState } from "../sim";

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
  /** For the debug overlay: the physics colliders as they stand at the current tick. */
  colliderOutlines(): LineSegment[];
}

/** Writes the Hero's interpolated position into `target`, mapping simulation (x, y) to the ground plane (x, 0, z). */
export function heroGroundPosition(frame: Frame, heroId: number, target: Vector3): Vector3 {
  const current = frame.current.heroes.find((hero) => hero.id === heroId)?.position;
  if (!current) return target;
  const previous = frame.previous.heroes.find((hero) => hero.id === heroId)?.position ?? current;
  return target.set(
    previous.x + (current.x - previous.x) * frame.alpha,
    0,
    previous.y + (current.y - previous.y) * frame.alpha,
  );
}
