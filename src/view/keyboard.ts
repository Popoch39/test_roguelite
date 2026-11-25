import type { Vec2 } from "../sim";

export interface MovementKeys {
  /** The movement direction held right now, in simulation coordinates. */
  read(): Vec2;
  dispose(): void;
}

// `KeyboardEvent.code` names the physical key, so these are W, A, S, D on QWERTY and Z, Q, S, D on AZERTY.
const UP = "KeyW";
const LEFT = "KeyA";
const DOWN = "KeyS";
const RIGHT = "KeyD";

export interface DashKey {
  /** Whether the Dash key was pressed since the last call: each press is reported once, however long it is held. */
  takeRequest(): boolean;
  dispose(): void;
}

const DASH = "Space";

export function listenToDashKey(target: Window): DashKey {
  let requested = false;

  const onKeyDown = (event: KeyboardEvent) => {
    // A held key repeats its keydown; only the press itself is a request.
    if (event.code === DASH && !event.repeat) requested = true;
  };
  // A press left unread when the window loses focus would fire a Dash on return.
  const onBlur = () => {
    requested = false;
  };

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("blur", onBlur);

  return {
    takeRequest() {
      const taken = requested;
      requested = false;
      return taken;
    },
    dispose() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("blur", onBlur);
    },
  };
}

export function listenToMovementKeys(target: Window): MovementKeys {
  const held = new Set<string>();

  const onKeyDown = (event: KeyboardEvent) => held.add(event.code);
  const onKeyUp = (event: KeyboardEvent) => held.delete(event.code);
  // A key released while the window is unfocused never sends its keyup.
  const onBlur = () => held.clear();

  target.addEventListener("keydown", onKeyDown);
  target.addEventListener("keyup", onKeyUp);
  target.addEventListener("blur", onBlur);

  const axis = (negative: string, positive: string) =>
    (held.has(positive) ? 1 : 0) - (held.has(negative) ? 1 : 0);

  return {
    // The camera looks toward -z, so the top of the screen is the simulation's -y.
    read: () => ({ x: axis(LEFT, RIGHT), y: axis(UP, DOWN) }),
    dispose() {
      target.removeEventListener("keydown", onKeyDown);
      target.removeEventListener("keyup", onKeyUp);
      target.removeEventListener("blur", onBlur);
    },
  };
}
