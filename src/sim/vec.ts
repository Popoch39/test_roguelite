import type { Vec2 } from "./types";

export function distance(from: Vec2, to: Vec2): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

export function subtract(to: Vec2, from: Vec2): Vec2 {
  return { x: to.x - from.x, y: to.y - from.y };
}

export function scale({ x, y }: Vec2, factor: number): Vec2 {
  return { x: x * factor, y: y * factor };
}

export function normalize({ x, y }: Vec2): Vec2 {
  const length = Math.hypot(x, y);
  return length === 0 ? { x: 0, y: 0 } : { x: x / length, y: y / length };
}
