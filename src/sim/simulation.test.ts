import { beforeAll, describe, expect, test } from "bun:test";
import {
  colliderOutlines,
  createRun,
  DEFAULT_TUNING,
  initSimulation,
  step,
  type AttackPhase,
  type Command,
  type Enemy,
  type Hero,
  type RoomTemplate,
  type Run,
  type RunOptions,
  type Tuning,
  type Vec2,
} from "./index";

const CONTACT_SLACK = 0.05;

const ROOM: RoomTemplate = {
  width: 20,
  height: 12,
  entryPoint: { x: -3, y: 2 },
  spawnPoints: [],
};

function startRun(overrides: Partial<RunOptions> = {}): Run {
  return createRun({
    seed: 1,
    heroStats: { speed: 6, maxHealth: 100 },
    tuning: DEFAULT_TUNING,
    roomTemplate: ROOM,
    ...overrides,
  });
}

function onlyHero(run: Run): Hero {
  const [hero] = run.state.heroes;
  if (!hero) throw new Error("the Run has no Hero");
  return hero;
}

function onlyEnemy(run: Run): Enemy {
  const [enemy] = run.state.enemies;
  if (!enemy) throw new Error("the Room has no Enemy");
  return enemy;
}

function distance(from: Vec2, to: Vec2): number {
  return Math.hypot(to.x - from.x, to.y - from.y);
}

const IDLE: Omit<Command, "heroId"> = { move: { x: 0, y: 0 }, aim: { x: 0, y: 0 }, attack: false };

function hold(run: Run, intent: Partial<typeof IDLE>, ticks: number): void {
  const heroId = onlyHero(run).id;
  for (let tick = 0; tick < ticks; tick++) {
    step(run, [{ ...IDLE, ...intent, heroId }]);
  }
}

/** The Hero's Attack phase after each of the ticks, null when it is not attacking. */
function attackPhasesWhileHolding(
  run: Run,
  intent: Partial<typeof IDLE>,
  ticks: number,
): (AttackPhase | null)[] {
  const phases: (AttackPhase | null)[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    hold(run, intent, 1);
    phases.push(onlyHero(run).attack?.phase ?? null);
  }
  return phases;
}

/** A wide Room with the Hero in the middle and an Enemy on each of the given points. */
function arena(...spawnPoints: Vec2[]): RoomTemplate {
  return { width: 40, height: 40, entryPoint: { x: 0, y: 0 }, spawnPoints };
}

function withAttack(heroAttack: Partial<Tuning["heroAttack"]>): Tuning {
  return { ...DEFAULT_TUNING, heroAttack: { ...DEFAULT_TUNING.heroAttack, ...heroAttack } };
}

/** Enemies that neither chase nor attack, for the tests about what the Hero does to them. */
function standing(tuning: Tuning): Tuning {
  return { ...tuning, enemySpeed: 0, enemyAttack: { ...tuning.enemyAttack, triggerRange: 0 } };
}

// A quarter-circle sector, three units deep, against standing Enemies half a unit wide.
const SWING: Tuning = standing({
  ...withAttack({
    windupTicks: 2,
    activeTicks: 3,
    recoveryTicks: 4,
    damage: 20,
    reach: 3,
    angle: Math.PI / 2,
  }),
  enemyHealth: 50,
  enemyRadius: 0.5,
});

/** Runs one whole Attack of the `SWING` tuning, from its first tick to the end of its Recovery. */
function attackOnce(run: Run, aim: Vec2): void {
  hold(run, { attack: true, aim }, 1);
  hold(run, {}, 2 + 3 + 4 - 1);
}

function holdMove(run: Run, move: Vec2, ticks: number): void {
  hold(run, { move }, ticks);
}

// An Enemy that reaches its speed of 3 units per second within one tick, and attacks from 1.5 units away
// into a quarter-circle sector two units deep.
const BITE: Tuning = {
  ...DEFAULT_TUNING,
  enemySpeed: 3,
  enemyAcceleration: 180,
  enemyAttack: {
    windupTicks: 20,
    activeTicks: 3,
    recoveryTicks: 10,
    damage: 15,
    reach: 2,
    angle: Math.PI / 2,
    triggerRange: 1.5,
  },
};

/** Enemies that chase but never start an Attack. */
function neverAttacking(tuning: Tuning): Tuning {
  return { ...tuning, enemyAttack: { ...tuning.enemyAttack, triggerRange: 0 } };
}

/** The only Enemy's Attack phase after each of the ticks, null while it chases. */
function enemyAttackPhasesWhileHolding(
  run: Run,
  intent: Partial<typeof IDLE>,
  ticks: number,
): (AttackPhase | null)[] {
  const phases: (AttackPhase | null)[] = [];
  for (let tick = 0; tick < ticks; tick++) {
    hold(run, intent, 1);
    phases.push(onlyEnemy(run).attack?.phase ?? null);
  }
  return phases;
}

function ticksOf(phase: AttackPhase | null, count: number): (AttackPhase | null)[] {
  return Array.from({ length: count }, () => phase);
}

/** The Hero against three Enemies of the default tuning, for 225 ticks of the same commands. */
function playFight(): Run {
  const run = startRun({ roomTemplate: arena({ x: 3, y: 0 }, { x: -4, y: 2 }, { x: 1, y: -5 }) });
  hold(run, { attack: true, aim: { x: 1, y: 0 } }, 90);
  hold(run, { move: { x: 0, y: 1 } }, 45);
  hold(run, { attack: true, aim: { x: -1, y: -1 } }, 90);
  return run;
}

beforeAll(async () => {
  await initSimulation();
});

describe("creating a Run", () => {
  test("places one Hero at the Room Template's entry point", () => {
    const { state } = startRun();

    expect(state.heroes).toHaveLength(1);
    expect(state.heroes[0]?.position).toEqual({ x: -3, y: 2 });
  });

  test("keeps the Run Seed it was created from", () => {
    expect(startRun({ seed: 1234 }).state.seed).toBe(1234);
  });

  test("starts in the combat phase, with no outcome yet", () => {
    const { state } = startRun();

    expect(state.phase).toBe("combat");
    expect(state.outcome).toBeNull();
  });

  test("gives the Hero its starting maximum health", () => {
    const hero = onlyHero(startRun({ heroStats: { speed: 6, maxHealth: 80 } }));

    expect(hero.health).toBe(80);
  });
});

describe("moving the Hero", () => {
  const OPEN_ROOM: RoomTemplate = {
    width: 40,
    height: 40,
    entryPoint: { x: 0, y: 0 },
    spawnPoints: [],
  };

  test.each([
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
    { x: 1, y: 1 },
    { x: 1, y: -1 },
    { x: -1, y: 1 },
    { x: -1, y: -1 },
  ])("moves the Hero along the movement direction %o", (direction) => {
    const run = startRun({ roomTemplate: OPEN_ROOM });

    holdMove(run, direction, 30);

    const { position } = onlyHero(run);
    expect(Math.sign(Math.round(position.x)) + 0).toBe(direction.x);
    expect(Math.sign(Math.round(position.y)) + 0).toBe(direction.y);
  });

  test("covers the Hero's speed in units over 60 ticks", () => {
    const run = startRun({ roomTemplate: OPEN_ROOM, heroStats: { speed: 4, maxHealth: 100 } });

    holdMove(run, { x: 1, y: 0 }, 60);

    expect(onlyHero(run).position.x).toBeCloseTo(4, 2);
  });

  test("is no faster on a diagonal than in a straight line", () => {
    const straight = startRun({ roomTemplate: OPEN_ROOM });
    const diagonal = startRun({ roomTemplate: OPEN_ROOM });

    holdMove(straight, { x: 1, y: 0 }, 60);
    holdMove(diagonal, { x: 1, y: 1 }, 60);

    const straightDistance = Math.hypot(
      onlyHero(straight).position.x,
      onlyHero(straight).position.y,
    );
    const diagonalDistance = Math.hypot(
      onlyHero(diagonal).position.x,
      onlyHero(diagonal).position.y,
    );
    expect(diagonalDistance).toBeCloseTo(straightDistance, 2);
  });

  test("stands still on a tick without a command", () => {
    const run = startRun({ roomTemplate: OPEN_ROOM });
    holdMove(run, { x: 1, y: 0 }, 10);
    const stoppedAt = { ...onlyHero(run).position };

    for (let tick = 0; tick < 10; tick++) step(run, []);

    expect(onlyHero(run).position.x).toBeCloseTo(stoppedAt.x, 2);
    expect(onlyHero(run).position.y).toBeCloseTo(stoppedAt.y, 2);
  });

  test("ignores a command addressed to another identifier", () => {
    const run = startRun({ roomTemplate: OPEN_ROOM });
    const strangerId = onlyHero(run).id + 1;

    for (let tick = 0; tick < 10; tick++) {
      step(run, [{ ...IDLE, heroId: strangerId, move: { x: 1, y: 0 } }]);
    }

    expect(onlyHero(run).position).toEqual({ x: 0, y: 0 });
  });
});

describe("stepping a Run", () => {
  test("advances exactly one tick per step", () => {
    const run = startRun();
    expect(run.state.tick).toBe(0);

    step(run, []);
    expect(run.state.tick).toBe(1);

    step(run, []);
    step(run, []);
    expect(run.state.tick).toBe(3);
  });

  test("gives the same outcome for the same Run Seed and commands", () => {
    const script: Vec2[] = [
      { x: 1, y: 0 },
      { x: 1, y: 1 },
      { x: 0, y: 0 },
      { x: -1, y: 1 },
      { x: 0, y: -1 },
      { x: 1, y: -1 },
    ];
    const play = (): Run => {
      const run = startRun();
      for (const move of script) holdMove(run, move, 90);
      return run;
    };

    const first = play();
    const second = play();

    expect(second.state).toEqual(first.state);
    expect(first.state.tick).toBe(540);
  });

  test("plays a fight out the same way twice", () => {
    const first = playFight();
    const second = playFight();

    expect(second.state).toEqual(first.state);
    expect(first.state.enemies.length).toBeLessThan(3);
    expect(onlyHero(first).health).toBeLessThan(100);
  });

  test("keeps its state as plain serializable data", () => {
    const run = startRun();
    holdMove(run, { x: 1, y: 1 }, 5);

    expect(JSON.parse(JSON.stringify(run.state))).toStrictEqual(run.state);
  });
});

describe("walls", () => {
  // Inner faces at x = ±10 and y = ±6.
  const WALLED_ROOM: RoomTemplate = {
    width: 20,
    height: 12,
    entryPoint: { x: 0, y: 0 },
    spawnPoints: [],
  };
  test.each([
    { direction: { x: 1, y: 0 }, axis: "x", limit: 10 },
    { direction: { x: -1, y: 0 }, axis: "x", limit: 10 },
    { direction: { x: 0, y: 1 }, axis: "y", limit: 6 },
    { direction: { x: 0, y: -1 }, axis: "y", limit: 6 },
  ] as const)("stop the Hero moving $direction", ({ direction, axis, limit }) => {
    const run = startRun({ roomTemplate: WALLED_ROOM });

    holdMove(run, direction, 300);

    const hero = onlyHero(run);
    const reach = Math.abs(hero.position[axis]) + hero.radius;
    expect(reach).toBeLessThanOrEqual(limit + CONTACT_SLACK);
    expect(reach).toBeGreaterThan(limit - CONTACT_SLACK);
  });

  test("let the Hero slide along them", () => {
    const corridor: RoomTemplate = {
      width: 4,
      height: 60,
      entryPoint: { x: 0, y: -25 },
      spawnPoints: [],
    };
    const run = startRun({ roomTemplate: corridor });
    holdMove(run, { x: 1, y: 1 }, 60);
    const pressedAgainstWall = { ...onlyHero(run).position };

    holdMove(run, { x: 1, y: 1 }, 60);

    // Along the wall the Hero keeps the diagonal's share of its speed: 6 / sqrt(2), about 4.24.
    const hero = onlyHero(run);
    expect(hero.position.x + hero.radius).toBeLessThanOrEqual(2 + CONTACT_SLACK);
    expect(hero.position.y - pressedAgainstWall.y).toBeGreaterThan(4);
  });

  test("stop a Hero sized by the tuning table", () => {
    const run = startRun({
      roomTemplate: WALLED_ROOM,
      tuning: { ...DEFAULT_TUNING, heroRadius: 1.5 },
    });

    holdMove(run, { x: 1, y: 0 }, 300);

    const reach = onlyHero(run).position.x + 1.5;
    expect(reach).toBeLessThanOrEqual(10 + CONTACT_SLACK);
    expect(reach).toBeGreaterThan(10 - CONTACT_SLACK);
  });
});

describe("collider outlines", () => {
  test("trace the Hero at its position and radius", () => {
    const run = startRun({
      roomTemplate: arena(),
      heroStats: { speed: 4, maxHealth: 100 },
      tuning: { ...DEFAULT_TUNING, heroRadius: 1.5 },
    });
    // One second at 4 units per second: the Hero now stands at (4, 0).
    holdMove(run, { x: 1, y: 0 }, 60);

    const aroundHero = colliderOutlines(run)
      .flatMap(({ start, end }) => [start, end])
      .filter(({ x, y }) => Math.hypot(x - 4, y) < 3);
    const xs = aroundHero.map(({ x }) => x);
    const ys = aroundHero.map(({ y }) => y);
    expect(Math.min(...xs)).toBeCloseTo(2.5, 1);
    expect(Math.max(...xs)).toBeCloseTo(5.5, 1);
    expect(Math.min(...ys)).toBeCloseTo(-1.5, 1);
    expect(Math.max(...ys)).toBeCloseTo(1.5, 1);
  });

  test("trace the walls at their position and thickness", () => {
    // A 20 by 12 Room: inner faces at x = ±10 and y = ±6, outer faces one wall thickness further out.
    const outlines = colliderOutlines(
      startRun({ tuning: { ...DEFAULT_TUNING, wallThickness: 2 } }),
    );
    const SLACK = 0.01;
    const runsAlong = (axis: "x" | "y", at: number, from: number, to: number): boolean => {
      const across = axis === "x" ? "y" : "x";
      return outlines.some(
        ({ start, end }) =>
          Math.abs(start[axis] - at) < SLACK &&
          Math.abs(end[axis] - at) < SLACK &&
          Math.min(start[across], end[across]) < from + SLACK &&
          Math.max(start[across], end[across]) > to - SLACK,
      );
    };

    expect(runsAlong("x", -10, -6, 6)).toBe(true);
    expect(runsAlong("x", 10, -6, 6)).toBe(true);
    expect(runsAlong("y", -6, -10, 10)).toBe(true);
    expect(runsAlong("y", 6, -10, 10)).toBe(true);
    expect(runsAlong("x", -12, -6, 6)).toBe(true);
    expect(runsAlong("x", 12, -6, 6)).toBe(true);
    expect(runsAlong("y", -8, -10, 10)).toBe(true);
    expect(runsAlong("y", 8, -10, 10)).toBe(true);
  });

  test("leave the Run untouched when read every tick", () => {
    const observed = startRun();
    const unobserved = startRun();

    // Long enough to end pressed into a corner, so contacts are part of what must not change.
    for (let tick = 0; tick < 240; tick++) {
      holdMove(observed, { x: 1, y: 1 }, 1);
      colliderOutlines(observed);
      holdMove(unobserved, { x: 1, y: 1 }, 1);
    }

    expect(observed.state).toEqual(unobserved.state);
    expect(observed.state.tick).toBe(240);
  });
});

describe("Enemies", () => {
  test("stand on every spawn point of the Room Template, with the tuning table's health", () => {
    const { state } = startRun({
      roomTemplate: arena({ x: 4, y: 0 }, { x: 4, y: 3 }),
      tuning: { ...DEFAULT_TUNING, enemyHealth: 40 },
    });

    expect(state.enemies.map((enemy) => enemy.position)).toEqual([
      { x: 4, y: 0 },
      { x: 4, y: 3 },
    ]);
    expect(state.enemies.map((enemy) => enemy.health)).toEqual([40, 40]);
  });

  test("keep distinct identifiers from tick to tick", () => {
    const run = startRun({ roomTemplate: arena({ x: 4, y: 0 }, { x: 4, y: 3 }) });
    const ids = run.state.enemies.map((enemy) => enemy.id);

    holdMove(run, { x: 0, y: 1 }, 30);

    expect(new Set(ids).size).toBe(2);
    expect(run.state.enemies.map((enemy) => enemy.id)).toEqual(ids);
  });

  test("close the distance to the Hero in a straight line, at their speed", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 0, y: 9 }) });

    hold(run, {}, 60);

    // One second at 3 units per second, starting 9 units away.
    expect(onlyEnemy(run).position.x).toBeCloseTo(0, 2);
    expect(onlyEnemy(run).position.y).toBeCloseTo(6, 1);
  });

  test("head for wherever the Hero now stands", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 0, y: 9 }) });

    // The Hero ends 6 units to the right of where it started.
    holdMove(run, { x: 1, y: 0 }, 60);

    expect(onlyEnemy(run).position.x).toBeGreaterThan(0.5);
    expect(onlyEnemy(run).position.y).toBeLessThan(7);
  });

  test("never damage the Hero by contact alone", () => {
    const run = startRun({ tuning: neverAttacking(BITE), roomTemplate: arena({ x: 3, y: 0 }) });

    holdMove(run, { x: 1, y: 0 }, 120);

    const hero = onlyHero(run);
    const enemy = onlyEnemy(run);
    expect(distance(hero.position, enemy.position)).toBeLessThan(
      hero.radius + enemy.radius + CONTACT_SLACK,
    );
    expect(hero.health).toBe(100);
  });

  test("stay apart from each other when they converge on the Hero", () => {
    const run = startRun({
      tuning: neverAttacking(BITE),
      roomTemplate: arena(
        { x: 6, y: 0 },
        { x: 6, y: 1.1 },
        { x: 6, y: -1.1 },
        { x: -6, y: 0.3 },
        { x: 0.4, y: 6 },
      ),
    });

    let closestPair = Infinity;
    for (let tick = 0; tick < 300; tick++) {
      hold(run, {}, 1);
      const { enemies } = run.state;
      for (const [index, enemy] of enemies.entries()) {
        for (const other of enemies.slice(index + 1)) {
          closestPair = Math.min(closestPair, distance(enemy.position, other.position));
        }
      }
    }

    // Two Enemies half a unit wide touch when their centres are one unit apart.
    expect(closestPair).toBeGreaterThan(1 - CONTACT_SLACK);
    for (const enemy of run.state.enemies) {
      expect(distance(onlyHero(run).position, enemy.position)).toBeLessThan(3);
    }
  });

  test("are carried back by the push of the Hero's Attack before they chase again", () => {
    const run = startRun({
      tuning: { ...BITE, enemyAcceleration: 30, heroAttack: SWING.heroAttack },
      roomTemplate: arena({ x: 2.5, y: 0 }),
    });
    // The Windup, then the first tick of the Active Phase, which damages the approaching Enemy.
    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 2 + 1);
    expect(onlyEnemy(run).health).toBe(30);
    const whenDamaged = distance(onlyHero(run).position, onlyEnemy(run).position);

    hold(run, {}, 6);
    const pushedTo = distance(onlyHero(run).position, onlyEnemy(run).position);
    expect(pushedTo).toBeGreaterThan(whenDamaged + 0.3);

    hold(run, {}, 30);
    expect(distance(onlyHero(run).position, onlyEnemy(run).position)).toBeLessThan(pushedTo);
  });

  test("walk 3.5 units per second with the default tuning", () => {
    const run = startRun({ roomTemplate: arena({ x: 0, y: 12 }) });

    hold(run, {}, 120);

    // Two seconds, less the fraction of a second an Enemy takes to reach its speed.
    const walked = 12 - onlyEnemy(run).position.y;
    expect(walked).toBeLessThanOrEqual(7);
    expect(walked).toBeGreaterThan(6.5);
  });

  test("and the Hero do not overlap each other", () => {
    const run = startRun({ roomTemplate: arena({ x: 2, y: 0 }) });
    const hero = onlyHero(run);
    const enemy = onlyEnemy(run);

    for (let tick = 0; tick < 120; tick++) {
      holdMove(run, { x: 1, y: 0 }, 1);

      expect(distance(hero.position, enemy.position)).toBeGreaterThan(
        hero.radius + enemy.radius - CONTACT_SLACK,
      );
    }
  });

  test("come to rest once the Hero stops pushing them", () => {
    const run = startRun({ tuning: standing(DEFAULT_TUNING), roomTemplate: arena({ x: 2, y: 0 }) });
    holdMove(run, { x: 1, y: 0 }, 60);

    holdMove(run, { x: 0, y: 0 }, 60);
    const restingAt = { ...onlyEnemy(run).position };
    holdMove(run, { x: 0, y: 0 }, 60);

    expect(distance(onlyEnemy(run).position, restingAt)).toBeLessThan(0.01);
  });
});

describe("an Enemy's Attack", () => {
  test("starts once the Hero is within trigger range, and stops the Enemy there", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 4, y: 0 }) });

    hold(run, {}, 40);
    expect(onlyEnemy(run).attack).toBeNull();

    // 2.5 units to walk at 3 units per second take 50 ticks; a few more leave it early in its Windup.
    hold(run, {}, 15);
    expect(onlyEnemy(run).attack?.phase).toBe("windup");
    const stoppedAt = { ...onlyEnemy(run).position };
    const fromHero = distance(onlyHero(run).position, stoppedAt);
    expect(fromHero).toBeLessThanOrEqual(1.5);
    expect(fromHero).toBeGreaterThan(1.4);

    hold(run, {}, 10);
    expect(onlyEnemy(run).attack?.phase).toBe("windup");
    expect(distance(onlyEnemy(run).position, stoppedAt)).toBeLessThan(0.01);
  });

  test("goes through Windup, Active Phase and Recovery for the tuning table's durations", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 1.2, y: 0 }) });

    const phases = enemyAttackPhasesWhileHolding(run, {}, 20 + 3 + 10);

    expect(phases).toEqual([
      ...ticksOf("windup", 20),
      ...ticksOf("active", 3),
      ...ticksOf("recovery", 10),
    ]);
  });

  test("damages the Hero when its Active Phase starts, not before, and only once", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 1.2, y: 0 }) });

    hold(run, {}, 20);
    expect(onlyHero(run).health).toBe(100);

    hold(run, {}, 1);
    expect(onlyHero(run).health).toBe(85);

    // The rest of the Active Phase and the whole Recovery.
    hold(run, {}, 2 + 10);
    expect(onlyHero(run).health).toBe(85);
  });

  test("damages the Hero again with the Attack that follows", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 1.2, y: 0 }) });

    hold(run, {}, 20 + 3 + 10);
    hold(run, {}, 20 + 1);

    expect(onlyHero(run).health).toBe(70);
  });

  test("marks the damaged Hero with the tick of the damage", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 1.2, y: 0 }) });
    hold(run, {}, 20);
    expect(onlyHero(run).lastDamagedTick).toBeNull();

    const firstActiveTick = run.state.tick;
    hold(run, {}, 5);

    expect(onlyHero(run).lastDamagedTick).toBe(firstActiveTick);
  });

  test("keeps the direction of the tick its Windup started, so a Hero who steps out of its sector takes no damage", () => {
    // A narrow sector, deep enough that the Hero never leaves its reach by stepping aside.
    const narrow = { ...BITE.enemyAttack, reach: 3, angle: Math.PI / 6 };
    const run = startRun({
      tuning: { ...BITE, enemyAttack: narrow },
      roomTemplate: arena({ x: 1.4, y: 0 }),
    });
    hold(run, {}, 1);

    holdMove(run, { x: 0, y: 1 }, 19);
    expect(onlyEnemy(run).attack?.direction.x).toBeCloseTo(-1, 5);
    expect(onlyEnemy(run).attack?.direction.y).toBeCloseTo(0, 5);

    holdMove(run, { x: 0, y: 1 }, 3);
    expect(distance(onlyHero(run).position, onlyEnemy(run).position)).toBeLessThan(3);
    expect(onlyHero(run).health).toBe(100);
  });

  test("does no damage to a Hero who walked out of its reach during the Windup", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 1.4, y: 0 }) });
    hold(run, {}, 1);

    holdMove(run, { x: -1, y: 0 }, 19 + 3 + 10);

    expect(onlyHero(run).health).toBe(100);
  });

  test("holds the Enemy in place through its Recovery, then lets it chase again", () => {
    const run = startRun({ tuning: BITE, roomTemplate: arena({ x: 1.2, y: 0 }) });
    hold(run, {}, 20 + 3);
    const stoodAt = { ...onlyEnemy(run).position };

    // The Hero walks out of trigger range while the Enemy recovers.
    for (let tick = 0; tick < 10; tick++) {
      holdMove(run, { x: -1, y: 0 }, 1);

      expect(onlyEnemy(run).attack?.phase).toBe("recovery");
      expect(distance(onlyEnemy(run).position, stoodAt)).toBeLessThan(0.01);
    }

    holdMove(run, { x: -1, y: 0 }, 20);
    expect(onlyEnemy(run).attack).toBeNull();
    expect(onlyEnemy(run).position.x).toBeLessThan(stoodAt.x - 0.5);
  });

  test("is not interrupted when the Enemy is damaged and pushed back", () => {
    const run = startRun({
      tuning: { ...BITE, enemyAcceleration: 30, heroAttack: SWING.heroAttack },
      roomTemplate: arena({ x: 1.2, y: 0 }),
    });

    const phases = [
      ...enemyAttackPhasesWhileHolding(run, { attack: true, aim: { x: 1, y: 0 } }, 1),
      ...enemyAttackPhasesWhileHolding(run, {}, 20 + 3 + 10 - 1),
    ];

    expect(phases).toEqual([
      ...ticksOf("windup", 20),
      ...ticksOf("active", 3),
      ...ticksOf("recovery", 10),
    ]);
    expect(onlyEnemy(run).health).toBe(30);
    expect(onlyEnemy(run).position.x).toBeGreaterThan(1.7);
  });

  test("lasts 30, 6 and 30 ticks and takes 15 of the Hero's 100 health with the default tuning", () => {
    const run = startRun({
      heroStats: DEFAULT_TUNING.heroStats,
      roomTemplate: arena({ x: 1.2, y: 0 }),
    });
    expect(onlyHero(run).health).toBe(100);

    const phases = enemyAttackPhasesWhileHolding(run, {}, 30 + 6 + 30);

    const ticksIn = (phase: AttackPhase | null) => phases.filter((each) => each === phase).length;
    expect([ticksIn("windup"), ticksIn("active"), ticksIn("recovery")]).toEqual([30, 6, 30]);
    expect(onlyHero(run).health).toBe(85);
  });
});

describe("defeat", () => {
  test("ends the Run on the tick the Hero's health reaches zero, not before", () => {
    const run = startRun({
      tuning: BITE,
      heroStats: { speed: 6, maxHealth: 30 },
      roomTemplate: arena({ x: 1.2, y: 0 }),
    });

    // Up to the tick before the second Attack's Active Phase.
    hold(run, {}, 20 + 3 + 10 + 20);
    expect(onlyHero(run).health).toBe(15);
    expect(run.state.phase).toBe("combat");
    expect(run.state.outcome).toBeNull();

    hold(run, {}, 1);
    expect(onlyHero(run).health).toBe(0);
    expect(run.state.phase).toBe("ended");
    expect(run.state.outcome).toBe("defeat");
  });

  test("leaves the Hero's health at zero when the damage exceeds what was left", () => {
    const run = startRun({
      tuning: BITE,
      heroStats: { speed: 6, maxHealth: 10 },
      roomTemplate: arena({ x: 1.2, y: 0 }),
    });

    hold(run, {}, 20 + 1);

    expect(onlyHero(run).health).toBe(0);
    expect(run.state.outcome).toBe("defeat");
  });

  test("freezes the Run: further steps change nothing", () => {
    const run = startRun({
      tuning: BITE,
      heroStats: { speed: 6, maxHealth: 10 },
      roomTemplate: arena({ x: 1.2, y: 0 }, { x: 0, y: 8 }),
    });
    hold(run, {}, 20 + 1);
    const frozen = structuredClone(run.state);

    hold(run, { move: { x: -1, y: 0 }, aim: { x: 1, y: 0 }, attack: true }, 60);

    expect(run.state).toEqual(frozen);
    expect(run.state.tick).toBe(21);
  });
});

describe("aiming", () => {
  test("turns the Hero to face the aim direction, whatever its length", () => {
    const run = startRun();

    hold(run, { aim: { x: 0, y: 3 } }, 1);

    expect(onlyHero(run).facing.x).toBeCloseTo(0, 5);
    expect(onlyHero(run).facing.y).toBeCloseTo(1, 5);
  });

  test("keeps the Hero's facing while the aim direction is zero", () => {
    const run = startRun();
    hold(run, { aim: { x: -2, y: 0 } }, 1);

    hold(run, { aim: { x: 0, y: 0 } }, 5);

    expect(onlyHero(run).facing.x).toBeCloseTo(-1, 5);
    expect(onlyHero(run).facing.y).toBeCloseTo(0, 5);
  });
});

describe("the Hero's Attack", () => {
  test("goes through Windup, Active Phase and Recovery for the tuning table's durations", () => {
    const run = startRun({
      tuning: withAttack({ windupTicks: 2, activeTicks: 3, recoveryTicks: 4 }),
    });

    const phases = [
      ...attackPhasesWhileHolding(run, { attack: true }, 1),
      ...attackPhasesWhileHolding(run, {}, 10),
    ];

    expect(phases).toEqual([
      "windup",
      "windup",
      "active",
      "active",
      "active",
      "recovery",
      "recovery",
      "recovery",
      "recovery",
      null,
      null,
    ]);
  });

  test("lasts 4, 5 and 9 ticks with the default tuning", () => {
    const run = startRun();

    const phases = [
      ...attackPhasesWhileHolding(run, { attack: true }, 1),
      ...attackPhasesWhileHolding(run, {}, 20),
    ];

    const ticksIn = (phase: AttackPhase | null) => phases.filter((each) => each === phase).length;
    expect([ticksIn("windup"), ticksIn("active"), ticksIn("recovery")]).toEqual([4, 5, 9]);
  });

  test("keeps the Hero where it stood until the Recovery ends", () => {
    const run = startRun();
    holdMove(run, { x: 1, y: 0 }, 10);
    const stoodAt = { ...onlyHero(run).position };

    hold(run, { attack: true, move: { x: 1, y: 0 } }, 1);
    for (let tick = 1; tick < 4 + 5 + 9; tick++) {
      holdMove(run, { x: 1, y: 0 }, 1);

      expect(distance(onlyHero(run).position, stoodAt)).toBeLessThan(0.001);
    }

    holdMove(run, { x: 1, y: 0 }, 1);
    expect(onlyHero(run).position.x).toBeGreaterThan(stoodAt.x + 0.05);
  });

  test("keeps the aim direction of the tick it started, however the aim moves afterwards", () => {
    const run = startRun();

    hold(run, { attack: true, aim: { x: 5, y: 0 } }, 1);
    hold(run, { aim: { x: 0, y: -1 } }, 6);

    const hero = onlyHero(run);
    expect(hero.attack?.direction.x).toBeCloseTo(1, 5);
    expect(hero.attack?.direction.y).toBeCloseTo(0, 5);
    expect(hero.facing.x).toBeCloseTo(1, 5);
    expect(hero.facing.y).toBeCloseTo(0, 5);
  });

  test("damages an Enemy in front of the Hero once its Active Phase starts, not before", () => {
    const run = startRun({ tuning: SWING, roomTemplate: arena({ x: 2, y: 0 }) });

    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 2);
    expect(onlyEnemy(run).health).toBe(50);

    hold(run, {}, 1);
    expect(onlyEnemy(run).health).toBe(30);
  });

  test("damages an Enemy at most once, and the next Attack damages it again", () => {
    const run = startRun({ tuning: SWING, roomTemplate: arena({ x: 2, y: 0 }) });

    attackOnce(run, { x: 1, y: 0 });
    expect(onlyEnemy(run).health).toBe(30);

    attackOnce(run, { x: 1, y: 0 });
    expect(onlyEnemy(run).health).toBe(10);
  });

  test.each([
    { where: "behind the Hero", at: { x: -2, y: 0 } },
    { where: "beyond its reach", at: { x: 4, y: 0 } },
    { where: "beside the Hero, outside its angle", at: { x: 0, y: 2 } },
  ])("leaves an Enemy $where unharmed", ({ at }) => {
    const run = startRun({ tuning: SWING, roomTemplate: arena(at) });

    attackOnce(run, { x: 1, y: 0 });

    expect(onlyEnemy(run).health).toBe(50);
  });

  test("damages every Enemy inside its sector and none outside", () => {
    const run = startRun({
      tuning: SWING,
      roomTemplate: arena({ x: 2, y: 0 }, { x: 1.5, y: 1.2 }, { x: 1.5, y: -1.2 }, { x: -2, y: 0 }),
    });

    attackOnce(run, { x: 1, y: 0 });

    expect(run.state.enemies.map((enemy) => enemy.health)).toEqual([30, 30, 30, 50]);
  });

  test.each([
    // 55 degrees off the Attack direction, 10 past the sector's edge, 2 units away.
    { where: "the edge of its angle", at: { x: 1.147, y: 1.638 } },
    { where: "the end of its reach", at: { x: 3.3, y: 0 } },
  ])("damages an Enemy whose body crosses $where", ({ at }) => {
    const run = startRun({ tuning: SWING, roomTemplate: arena(at) });

    attackOnce(run, { x: 1, y: 0 });

    expect(onlyEnemy(run).health).toBe(30);
  });

  test("covers the sector along its own direction", () => {
    const run = startRun({ tuning: SWING, roomTemplate: arena({ x: 0, y: -2 }, { x: 2, y: 0 }) });

    attackOnce(run, { x: 0, y: -1 });

    expect(run.state.enemies.map((enemy) => enemy.health)).toEqual([30, 50]);
  });

  test("pushes a damaged Enemy away from the Hero and leaves the others in place", () => {
    const run = startRun({
      tuning: { ...SWING, heroAttack: { ...SWING.heroAttack, knockbackImpulse: 6 } },
      roomTemplate: arena({ x: 0, y: -2 }, { x: 0, y: 2 }),
    });

    attackOnce(run, { x: 0, y: -1 });

    const [damaged, unharmed] = run.state.enemies;
    expect(damaged?.position.y).toBeLessThan(-2.2);
    expect(damaged?.position.x).toBeCloseTo(0, 2);
    expect(unharmed?.position).toEqual({ x: 0, y: 2 });
  });

  test("removes an Enemy from the Room on the tick its health reaches zero", () => {
    const run = startRun({
      tuning: { ...SWING, enemyHealth: 20 },
      roomTemplate: arena({ x: 2, y: 0 }, { x: -2, y: 0 }),
    });
    const ids = run.state.enemies.map((enemy) => enemy.id);

    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 2);
    expect(run.state.enemies.map((enemy) => enemy.id)).toEqual(ids);

    hold(run, {}, 1);
    expect(run.state.enemies.map((enemy) => enemy.id)).toEqual(ids.slice(1));
  });

  test("leaves nothing of a defeated Enemy in the Hero's way", () => {
    const withEnemy = startRun({
      tuning: { ...SWING, enemyHealth: 20 },
      roomTemplate: arena({ x: 2, y: 0 }),
    });
    const alone = startRun({ tuning: SWING, roomTemplate: arena() });

    for (const run of [withEnemy, alone]) {
      attackOnce(run, { x: 1, y: 0 });
      holdMove(run, { x: 1, y: 0 }, 60);
    }

    expect(onlyHero(withEnemy).position).toEqual(onlyHero(alone).position);
  });

  test("chains into a new Attack the tick its Recovery ends while the request is held", () => {
    const run = startRun({ tuning: SWING, roomTemplate: arena({ x: 2, y: 0 }) });

    const phases = attackPhasesWhileHolding(run, { attack: true, aim: { x: 1, y: 0 } }, 20);

    const oneAttack: AttackPhase[] = [
      "windup",
      "windup",
      "active",
      "active",
      "active",
      "recovery",
      "recovery",
      "recovery",
      "recovery",
    ];
    expect(phases).toEqual([...oneAttack, ...oneAttack, "windup", "windup"]);
    expect(onlyEnemy(run).health).toBe(10);
  });

  test("aims each chained Attack along the aim direction of the tick it starts", () => {
    const run = startRun({ tuning: SWING });

    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 2 + 3 + 4);
    hold(run, { attack: true, aim: { x: 0, y: -1 } }, 1);

    expect(onlyHero(run).attack?.direction.x).toBeCloseTo(0, 5);
    expect(onlyHero(run).attack?.direction.y).toBeCloseTo(-1, 5);
  });

  test("forgets a request released before its Recovery ends", () => {
    const run = startRun({ tuning: SWING });

    const phases = [
      ...attackPhasesWhileHolding(run, { attack: true }, 8),
      ...attackPhasesWhileHolding(run, {}, 3),
    ];

    expect(phases.slice(-3)).toEqual(["recovery", null, null]);
  });

  test("keeps the state plain serializable data while it runs", () => {
    const run = startRun({ tuning: SWING, roomTemplate: arena({ x: 2, y: 0 }) });

    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 4);

    expect(JSON.parse(JSON.stringify(run.state))).toStrictEqual(run.state);
  });

  test("carries the reach and angle of its sector from the tuning table", () => {
    const run = startRun({ tuning: SWING });

    hold(run, { attack: true }, 1);

    expect(onlyHero(run).attack).toMatchObject({ reach: 3, angle: Math.PI / 2 });
  });

  test("marks a damaged Enemy with the tick of the damage", () => {
    const run = startRun({ tuning: SWING, roomTemplate: arena({ x: 2, y: 0 }) });
    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 2);
    expect(onlyEnemy(run).lastDamagedTick).toBeNull();

    const firstActiveTick = run.state.tick;
    hold(run, {}, 4);

    expect(onlyEnemy(run).lastDamagedTick).toBe(firstActiveTick);
  });

  test("is not interrupted when the Hero is damaged", () => {
    const run = startRun({
      tuning: { ...BITE, heroAttack: { ...SWING.heroAttack, windupTicks: 30 } },
      roomTemplate: arena({ x: 1.2, y: 0 }),
    });

    // Aimed away from the Enemy, whose Active Phase falls in the middle of this Windup.
    const phases = [
      ...attackPhasesWhileHolding(run, { attack: true, aim: { x: -1, y: 0 } }, 1),
      ...attackPhasesWhileHolding(run, {}, 30 + 3 + 4 - 1),
    ];

    expect(phases).toEqual([
      ...ticksOf("windup", 30),
      ...ticksOf("active", 3),
      ...ticksOf("recovery", 4),
    ]);
    expect(onlyHero(run).health).toBe(85);
  });

  test("does not start without a request", () => {
    const run = startRun();

    expect(attackPhasesWhileHolding(run, { move: { x: 1, y: 0 } }, 5)).toEqual(
      Array.from({ length: 5 }, () => null),
    );
  });
});
