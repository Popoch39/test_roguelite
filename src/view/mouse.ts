import type { Vec2 } from "../sim";

export interface Mouse {
  /** Whether the left button is held right now. */
  attackHeld(): boolean;
  /** The aim direction from a point of the simulation to the point under the cursor; zero until the cursor is placed. */
  aimFrom(origin: Vec2): Vec2;
  /** The cursor in client pixels, or null until it first moves. */
  cursor(): { x: number; y: number } | null;
  /** Only the view knows the camera, so it reports where the cursor's ray meets the ground, in simulation coordinates. */
  placeOnGround(point: Vec2): void;
  dispose(): void;
}

const LEFT_BUTTON = 0;

export function listenToMouse(target: Window): Mouse {
  let cursor: { x: number; y: number } | null = null;
  let groundPoint: Vec2 | null = null;
  let attackHeld = false;

  const onPointerMove = (event: PointerEvent) => {
    cursor = { x: event.clientX, y: event.clientY };
  };
  const onPointerDown = (event: PointerEvent) => {
    onPointerMove(event);
    if (event.button === LEFT_BUTTON) attackHeld = true;
  };
  const onPointerUp = (event: PointerEvent) => {
    if (event.button === LEFT_BUTTON) attackHeld = false;
  };
  // A button released while the window is unfocused never sends its pointerup.
  const onBlur = () => {
    attackHeld = false;
  };

  target.addEventListener("pointermove", onPointerMove);
  target.addEventListener("pointerdown", onPointerDown);
  target.addEventListener("pointerup", onPointerUp);
  target.addEventListener("blur", onBlur);

  return {
    attackHeld: () => attackHeld,
    aimFrom: (origin) =>
      groundPoint ? { x: groundPoint.x - origin.x, y: groundPoint.y - origin.y } : { x: 0, y: 0 },
    cursor: () => cursor,
    placeOnGround(point) {
      groundPoint = point;
    },
    dispose() {
      target.removeEventListener("pointermove", onPointerMove);
      target.removeEventListener("pointerdown", onPointerDown);
      target.removeEventListener("pointerup", onPointerUp);
      target.removeEventListener("blur", onBlur);
    },
  };
}
