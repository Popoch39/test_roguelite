import * as RAPIER from "@dimforge/rapier2d-compat";
import type { AttackTuning } from "./tuning";
import type { Attack, AttackPhase, Enemy, Vec2 } from "./types";

export interface Sector {
  apex: Vec2;
  /** Unit vector along the sector's axis. */
  direction: Vec2;
  reach: number;
  /** Full opening, in radians. */
  angle: number;
}

export function startAttack(direction: Vec2, tuning: AttackTuning): Attack | null {
  const phase = phaseAt(0, tuning);
  return (
    phase && {
      phase,
      elapsedTicks: 0,
      direction: { ...direction },
      reach: tuning.reach,
      angle: tuning.angle,
      damagedIds: [],
    }
  );
}

/** The Attack one tick later, or null once its Recovery is over. */
export function advanceAttack(attack: Attack, tuning: AttackTuning): Attack | null {
  const elapsedTicks = attack.elapsedTicks + 1;
  const phase = phaseAt(elapsedTicks, tuning);
  return phase && { ...attack, phase, elapsedTicks };
}

function phaseAt(
  elapsedTicks: number,
  { windupTicks, activeTicks, recoveryTicks }: AttackTuning,
): AttackPhase | null {
  if (elapsedTicks < windupTicks) return "windup";
  if (elapsedTicks < windupTicks + activeTicks) return "active";
  if (elapsedTicks < windupTicks + activeTicks + recoveryTicks) return "recovery";
  return null;
}

/** The Enemies whose body overlaps the sector, among the bodies the last physics step placed. */
export function enemiesInSector(
  world: RAPIER.World,
  enemies: readonly Enemy[],
  sector: Sector,
): Enemy[] {
  const bodiesInReach = new Set<number>();
  // The engine has no sector shape: a disc of the same reach finds the candidates, the angle sorts them.
  world.intersectionsWithShape(sector.apex, 0, new RAPIER.Ball(sector.reach), (collider) => {
    const body = collider.parent();
    if (body) bodiesInReach.add(body.handle);
    return true;
  });
  return enemies.filter(
    (enemy) =>
      bodiesInReach.has(enemy.bodyHandle) &&
      discOverlapsOpening(enemy.position, enemy.radius, sector),
  );
}

/** Whether a disc already known to be within reach also lies within the sector's opening. */
function discOverlapsOpening(center: Vec2, radius: number, sector: Sector): boolean {
  const { apex, direction, reach } = sector;
  const offset = { x: center.x - apex.x, y: center.y - apex.y };
  const distance = Math.hypot(offset.x, offset.y);
  if (distance <= radius) return true;

  const halfAngle = sector.angle / 2;
  const alongAxis = offset.x * direction.x + offset.y * direction.y;
  if (alongAxis >= distance * Math.cos(halfAngle)) return true;

  // A centre outside the opening can still reach in across one of the two straight edges.
  return [halfAngle, -halfAngle].some((turn) => {
    const edge = rotate(direction, turn);
    const along = Math.min(Math.max(offset.x * edge.x + offset.y * edge.y, 0), reach);
    return Math.hypot(offset.x - edge.x * along, offset.y - edge.y * along) <= radius;
  });
}

function rotate({ x, y }: Vec2, angle: number): Vec2 {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  return { x: x * cos - y * sin, y: x * sin + y * cos };
}
