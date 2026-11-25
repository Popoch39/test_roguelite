import { useEffect, useState } from "react";
import { createRun, DEFAULT_ROOM_TEMPLATES, DEFAULT_TUNING, initSimulation } from "../sim";
import { GameView } from "../view/GameView";
import { Hud } from "../view/Hud";
import { listenToDashKey, listenToMovementKeys, listenToUpgradePick } from "../view/keyboard";
import { listenToMouse, type Mouse } from "../view/mouse";
import { syncHud } from "./hud";
import { createLoop, type Loop } from "./loop";
import { chooseRunSeed } from "./runSeed";

interface Playing {
  loop: Loop;
  mouse: Mouse;
  /** Counts the Runs started since the page loaded, so that each one gets a view of its own. */
  runNumber: number;
  startRun: () => void;
  pickUpgrade: (choice: number) => void;
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
      const upgradePick = listenToUpgradePick(window);
      const mouse = listenToMouse(window);
      let loop: Loop | null = null;
      let runNumber = 0;

      const startRun = () => {
        const run = createRun({
          seed: chooseRunSeed(window.location.search),
          heroStats: DEFAULT_TUNING.heroStats,
          tuning: DEFAULT_TUNING,
          roomTemplates: DEFAULT_ROOM_TEMPLATES,
        });
        const started = createLoop(
          run,
          () => {
            // Read once per tick: the press is spent on the first command that carries it.
            const dash = dashKey.takeRequest();
            // Taken on every tick, so that a key pressed during the fight is not kept for the next offer.
            const upgradeChoice = upgradePick.take();
            return run.state.heroes.map((hero) => ({
              heroId: hero.id,
              move: keys.read(),
              aim: mouse.aimFrom(hero.position),
              attack: mouse.attackHeld(),
              dash,
              upgradeChoice,
            }));
          },
          syncHud,
        );
        syncHud(run.state);
        loop = started;
        runNumber += 1;
        setPlaying({ loop: started, mouse, runNumber, startRun, pickUpgrade: upgradePick.pick });
      };

      const onVisibilityChange = () => (document.hidden ? loop?.suspend() : loop?.resume());
      document.addEventListener("visibilitychange", onVisibilityChange);
      stop = () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        keys.dispose();
        dashKey.dispose();
        upgradePick.dispose();
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
        {/* Keyed by Run: the meshes are built from the characters the Run started with. */}
        <GameView key={playing.runNumber} source={playing.loop} mouse={playing.mouse} />
        <Hud onNewRun={playing.startRun} onPickUpgrade={playing.pickUpgrade} />
      </>
    )
  );
}
