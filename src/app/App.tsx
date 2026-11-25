import { useEffect, useState } from "react";
import { createRun, DEFAULT_ROOM_TEMPLATES, DEFAULT_TUNING, initSimulation } from "../sim";
import { BetweenRuns } from "../view/BetweenRuns";
import { GameView } from "../view/GameView";
import { Hud } from "../view/Hud";
import { listenToDashKey, listenToMovementKeys } from "../view/keyboard";
import { listenToMouse, type Mouse } from "../view/mouse";
import { syncHud } from "./hud";
import { createLoop, type Loop } from "./loop";
import {
  bankRun,
  buyTalentLevel,
  canBuyTalentLevel,
  createBrowserStorage,
  loadProfile,
  nextTalentLevelCost,
  saveProfile,
  startingHeroStats,
  TALENT,
  type Profile,
} from "./profile";
import { chooseRunSeed } from "./runSeed";

/** What the page has once the simulation is initialised, whichever screen is shown. */
interface Game {
  mouse: Mouse;
  startRun: () => void;
  leaveRun: () => void;
  buyTalentLevel: () => void;
}

interface Playing {
  loop: Loop;
  /** Counts the Runs started since the page loaded, so that each one gets a view of its own. */
  runNumber: number;
}

export function App() {
  const [game, setGame] = useState<Game | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  // Null on the between-Runs screen.
  const [playing, setPlaying] = useState<Playing | null>(null);

  useEffect(() => {
    let cancelled = false;
    let stop = () => {};

    void initSimulation().then(() => {
      if (cancelled) return;

      const keys = listenToMovementKeys(window);
      const dashKey = listenToDashKey(window);
      const mouse = listenToMouse(window);
      const storage = createBrowserStorage();
      // The tick that ends a Run reads the Profile outside React, so the latest one is kept here too.
      let latestProfile = loadProfile(storage);
      let loop: Loop | null = null;
      let runNumber = 0;

      // Written the moment it changes: closing the tab right after must not lose it.
      const keepProfile = (next: Profile) => {
        latestProfile = next;
        saveProfile(storage, next);
        setProfile(next);
      };

      const startRun = () => {
        // No tick reads the Dash key between Runs: a press made there must not become this Run's first Dash.
        dashKey.takeRequest();
        const run = createRun({
          seed: chooseRunSeed(window.location.search),
          heroStats: startingHeroStats(latestProfile, DEFAULT_TUNING.heroStats),
          tuning: DEFAULT_TUNING,
          roomTemplates: DEFAULT_ROOM_TEMPLATES,
        });
        let banked = false;
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
          (state) => {
            syncHud(state);
            // The loop keeps ticking under the end-of-Run summary, and the Run must be banked only once.
            if (state.outcome && !banked) {
              banked = true;
              keepProfile(
                bankRun(latestProfile, { outcome: state.outcome, goldEarned: state.goldEarned }),
              );
            }
          },
        );
        syncHud(run.state);
        loop = started;
        runNumber += 1;
        setPlaying({ loop: started, runNumber });
      };

      const leaveRun = () => {
        loop = null;
        setPlaying(null);
      };

      const onVisibilityChange = () => (document.hidden ? loop?.suspend() : loop?.resume());
      document.addEventListener("visibilitychange", onVisibilityChange);
      stop = () => {
        document.removeEventListener("visibilitychange", onVisibilityChange);
        keys.dispose();
        dashKey.dispose();
        mouse.dispose();
      };

      setProfile(latestProfile);
      setGame({
        mouse,
        startRun,
        leaveRun,
        buyTalentLevel() {
          const bought = buyTalentLevel(latestProfile);
          if (bought) keepProfile(bought);
        },
      });
    });

    return () => {
      cancelled = true;
      stop();
    };
  }, []);

  if (!game || !profile) return null;

  if (!playing) {
    return (
      <BetweenRuns
        gold={profile.gold}
        talentLevel={profile.talentLevel}
        talentHighestLevel={TALENT.highestLevel}
        nextTalentLevelCost={nextTalentLevelCost(profile)}
        canBuyTalentLevel={canBuyTalentLevel(profile)}
        heroMaxHealth={startingHeroStats(profile, DEFAULT_TUNING.heroStats).maxHealth}
        onBuyTalentLevel={game.buyTalentLevel}
        onStartRun={game.startRun}
      />
    );
  }

  return (
    <>
      {/* Keyed by Run: the meshes are built from the characters the Run started with. */}
      <GameView key={playing.runNumber} source={playing.loop} mouse={game.mouse} />
      <Hud onLeaveRun={game.leaveRun} />
    </>
  );
}
