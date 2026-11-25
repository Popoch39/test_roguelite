import { Vector3 } from "three";
import type { Combatant, LineSegment, RunState } from "../sim";

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

const FLASH_TICKS = 6;

/** Whether a character last damaged on that tick is still to be drawn flashing. */
export function isFlashing(frame: Frame, lastDamagedTick: number | null): boolean {
  return lastDamagedTick !== null && frame.current.tick - lastDamagedTick <= FLASH_TICKS;
}

/** Writes the Hero's interpolated position into `target`, mapping simulation (x, y) to the ground plane (x, 0, z). */
export function heroGroundPosition(frame: Frame, heroId: number, target: Vector3): Vector3 {
  // Entering a Room puts the Hero on its entry point at once: there is no way in between to draw.
  const alpha = frame.previous.roomIndex === frame.current.roomIndex ? frame.alpha : 1;
  return groundPosition(frame.previous.heroes, frame.current.heroes, heroId, alpha, target);
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
  previousTick: readonly Combatant[],
  currentTick: readonly Combatant[],
  id: number,
  alpha: number,
  target: Vector3,
): Vector3 {
  const current = currentTick.find((combatant) => combatant.id === id)?.position;
  if (!current) return target;
  const previous = previousTick.find((combatant) => combatant.id === id)?.position ?? current;
  return target.set(
    previous.x + (current.x - previous.x) * alpha,
    0,
    previous.y + (current.y - previous.y) * alpha,
  );
}
