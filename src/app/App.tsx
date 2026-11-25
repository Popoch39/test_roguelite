import { useEffect, useState } from "react";
import { createRun, DEFAULT_ROOM_TEMPLATE, DEFAULT_TUNING, initSimulation } from "../sim";
import { GameView } from "../view/GameView";
import { listenToMovementKeys } from "../view/keyboard";
import { listenToMouse, type Mouse } from "../view/mouse";
import { createLoop, type Loop } from "./loop";

export function App() {
  const [running, setRunning] = useState<{ loop: Loop; mouse: Mouse } | null>(null);

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
      const mouse = listenToMouse(window);
      const loop = createLoop(run, () =>
        run.state.heroes.map((hero) => ({
          heroId: hero.id,
          move: keys.read(),
          aim: mouse.aimFrom(hero.position),
          attack: mouse.attackHeld(),
        })),
      );

      const onVisibilityChange = () => (document.hidden ? loop.suspend() : loop.resume());
      document.addEventListener("visibilitychange", onVisibilityChange);
      stop = () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        keys.dispose();
        mouse.dispose();
      };

      setRunning({ loop, mouse });
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return running && <GameView source={running.loop} mouse={running.mouse} />;
}
