import { useEffect, useState } from "react";
import { createRun, DEFAULT_ROOM_TEMPLATE, DEFAULT_TUNING, initSimulation } from "../sim";
import { GameView } from "../view/GameView";
import { listenToMovementKeys } from "../view/keyboard";
import { createLoop, type Loop } from "./loop";

export function App() {
  const [loop, setLoop] = useState<Loop | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stop = () => {};

    void initSimulation().then(() => {
      if (cancelled) return;

      const run = createRun({
        seed: Math.floor(Math.random() * 2 ** 32),
        heroStats: DEFAULT_TUNING.heroStats,
        tuning: DEFAULT_TUNING,
        roomTemplate: DEFAULT_ROOM_TEMPLATE,
      });
      const keys = listenToMovementKeys(window);
      const runLoop = createLoop(run, () =>
        run.state.heroes.map((hero) => ({ heroId: hero.id, move: keys.read() })),
      );

      const onVisibilityChange = () => (document.hidden ? runLoop.suspend() : runLoop.resume());
      document.addEventListener("visibilitychange", onVisibilityChange);
      stop = () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        keys.dispose();
      };

      setLoop(runLoop);
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return loop && <GameView source={loop} />;
}
