import { colliderOutlines, step, TICKS_PER_SECOND, type Command, type Run } from "../sim";
import type { Frame, FrameSource } from "../view/frame";

const TICK_SECONDS = 1 / TICKS_PER_SECOND;
// A frame longer than this is a stall, not a slow display: the excess time is dropped, never replayed.
const MAX_TICKS_PER_FRAME = 5;

export interface Loop extends FrameSource {
  suspend(): void;
  resume(): void;
}

export function createLoop(run: Run, sampleCommands: () => Command[]): Loop {
  const frame: Frame = { previous: structuredClone(run.state), current: run.state, alpha: 1 };
  let accumulator = 0;
  let suspended = false;
  let discardNextDelta = false;

  return {
    frame,
    colliderOutlines: () => colliderOutlines(run),
    advance(deltaSeconds) {
      if (suspended) return;
      if (discardNextDelta) {
        discardNextDelta = false;
        return;
      }

      accumulator += deltaSeconds;
      const ticks = Math.min(Math.floor(accumulator / TICK_SECONDS), MAX_TICKS_PER_FRAME);
      for (let tick = 0; tick < ticks; tick++) {
        // Only the state just before the last tick is ever drawn.
        if (tick === ticks - 1) frame.previous = structuredClone(run.state);
        step(run, sampleCommands());
      }
      accumulator = ticks === MAX_TICKS_PER_FRAME ? 0 : accumulator - ticks * TICK_SECONDS;
      frame.alpha = accumulator / TICK_SECONDS;
    },
    suspend() {
      suspended = true;
    },
    resume() {
      suspended = false;
      // The first frame back measures the whole time spent hidden.
      discardNextDelta = true;
    },
  };
}
