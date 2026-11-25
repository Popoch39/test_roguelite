import { useEffect, useState } from "react";
import { createRun, DEFAULT_ROOM_TEMPLATE, DEFAULT_TUNING, initSimulation } from "../sim";
import { GameView } from "../view/GameView";
import { Hud } from "../view/Hud";
import { listenToDashKey, listenToMovementKeys } from "../view/keyboard";
import { listenToMouse, type Mouse } from "../view/mouse";
import { syncHud } from "./hud";
import { createLoop, type Loop } from "./loop";

interface Playing {
  loop: Loop;
  mouse: Mouse;
  /** Counts the Runs started since the page loaded, so that each one gets a view of its own. */
  runNumber: number;
  startRun: () => void;
}

export function App() {
  const [playing, setPlaying] = useState<Playing | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stop = () => {};

    void initSimulation().then(() => {
      if (cancelled) return;

      const keys = listenToMovementKeys(window);
      const dashKey = listenToDashKey(window);
      const mouse = listenToMouse(window);
      let loop: Loop | null = null;
      let runNumber = 0;

      const startRun = () => {
        const run = createRun({
          seed: Math.floor(Math.random() * 2 ** 32),
          heroStats: DEFAULT_TUNING.heroStats,
          tuning: DEFAULT_TUNING,
          roomTemplate: DEFAULT_ROOM_TEMPLATE,
        });
        const started = createLoop(
          run,
          () => {
            // Read once per tick: the press is spent on the first command that carries it.
            const dash = dashKey.takeRequest();
            return run.state.heroes.map((hero) => ({
              heroId: hero.id,
              move: keys.read(),
              aim: mouse.aimFrom(hero.position),
              attack: mouse.attackHeld(),
              dash,
            }));
          },
          syncHud,
        );
        syncHud(run.state);
        loop = started;
        runNumber += 1;
        setPlaying({ loop: started, mouse, runNumber, startRun });
      };

      const onVisibilityChange = () => (document.hidden ? loop?.suspend() : loop?.resume());
      document.addEventListener("visibilitychange", onVisibilityChange);
      stop = () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        keys.dispose();
        dashKey.dispose();
        mouse.dispose();
      };

      startRun();
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  return (
    playing && (
      <>
        {/* Keyed by Run: the meshes are built from the Room and the characters the Run started with. */}
        <GameView key={playing.runNumber} source={playing.loop} mouse={playing.mouse} />
        <Hud onNewRun={playing.startRun} />
      </>
    )
  );
}
