import { physicsWorld, type Run } from "./run";
import type { Vec2 } from "./types";

export interface LineSegment {
  start: Vec2;
  end: Vec2;
}

/**
 * For debug drawing only. The outlines come from the physics engine's own debug renderer, so every collider
 * in the world is covered whichever rule created it. The engine also marks the origin of each rigid body
 * with short axis lines.
 */
export function colliderOutlines(run: Run): LineSegment[] {
  // Four numbers per segment: start x, start y, end x, end y.
  const { vertices } = run[physicsWorld].debugRender();
  const outlines: LineSegment[] = [];
  for (let offset = 0; offset < vertices.length; offset += 4) {
    const [startX = 0, startY = 0, endX = 0, endY = 0] = vertices.subarray(offset, offset + 4);
    outlines.push({ start: { x: startX, y: startY }, end: { x: endX, y: endY } });
  }
  return outlines;
}
