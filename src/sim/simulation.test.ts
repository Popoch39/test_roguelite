import { beforeAll, describe, expect, test } from "bun:test";
import {
  colliderOutlines,
  createRun,
  DEFAULT_ROOM_TEMPLATES,
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
  pillars: [],
  spawnPoints: [],
};

interface SingleRoomOptions extends Omit<RunOptions, "roomTemplates"> {
  roomTemplate: RoomTemplate;
}

/** A Run of a single Room, with an Enemy on every spawn point of its Room Template. */
function startRun(overrides: Partial<SingleRoomOptions> = {}): Run {
  const { roomTemplate, tuning, ...options } = {
    seed: 1,
    heroStats: { speed: 6, maxHealth: 100 },
    tuning: DEFAULT_TUNING,
    roomTemplate: ROOM,
    ...overrides,
  };
  return createRun({
    ...options,
    tuning: { ...tuning, enemiesPerRoom: [roomTemplate.spawnPoints.length] },
    roomTemplates: [roomTemplate],
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

const IDLE: Omit<Command, "heroId"> = {
  move: { x: 0, y: 0 },
  aim: { x: 0, y: 0 },
  attack: false,
  dash: false,
};

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
  return { width: 40, height: 40, entryPoint: { x: 0, y: 0 }, pillars: [], spawnPoints };
}

/** A wide Room with a round pillar two units wide in its middle. */
function aroundPillar(entryPoint: Vec2, ...spawnPoints: Vec2[]): RoomTemplate {
  return {
    width: 40,
    height: 40,
    entryPoint,
    pillars: [{ center: { x: 0, y: 0 }, radius: 1 }],
    spawnPoints,
  };
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

// The same Enemy with an Attack that covers the whole Room, so that no Dash leaves its sector.
const ENGULF: Tuning = {
  ...BITE,
  enemyAttack: { ...BITE.enemyAttack, reach: 60, angle: 2 * Math.PI },
  dash: { durationTicks: 3, speed: 20, cooldownTicks: 20 },
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

function withDash(dash: Partial<Tuning["dash"]>): Tuning {
  return { ...DEFAULT_TUNING, dash: { ...DEFAULT_TUNING.dash, ...dash } };
}

// A Dash of 2 units: 6 ticks at 20 units per second, ready again 20 ticks after it starts.
const LEAP: Tuning = withDash({ durationTicks: 6, speed: 20, cooldownTicks: 20 });

/** The Hero against three Enemies of the default tuning, for 225 ticks of the same commands. */
function playFight(): Run {
  const run = startRun({ roomTemplate: arena({ x: 3, y: 0 }, { x: -4, y: 2 }, { x: 1, y: -5 }) });
  hold(run, { attack: true, aim: { x: 1, y: 0 } }, 90);
  hold(run, { move: { x: 0, y: 1 } }, 45);
  hold(run, { attack: true, aim: { x: -1, y: -1 } }, 90);
  return run;
}

/** A Room Template told apart by its width, with six spawn points far from its entry point. */
function hall(width: number): RoomTemplate {
  return {
    width,
    height: 20,
    entryPoint: { x: 2 - width / 2, y: 0 },
    pillars: [],
    spawnPoints: [
      { x: 4, y: -8 },
      { x: 4, y: 0 },
      { x: 4, y: 8 },
      { x: 10, y: -8 },
      { x: 10, y: 0 },
      { x: 10, y: 8 },
    ],
  };
}

const HALLS: RoomTemplate[] = [hall(30), hall(32), hall(34), hall(36)];

/** The one of `HALLS` the Hero now stands in. */
function currentHall(run: Run): RoomTemplate {
  const template = HALLS.find(({ width }) => width === run.state.room.width);
  if (!template) throw new Error("the Room comes from none of the halls");
  return template;
}

// An Attack that covers the whole Room and defeats every standing Enemy in it on its second tick.
const SWEEP: Tuning = {
  ...standing(
    withAttack({
      windupTicks: 1,
      activeTicks: 1,
      recoveryTicks: 1,
      damage: 50,
      reach: 100,
      angle: 2 * Math.PI,
    }),
  ),
  enemyHealth: 50,
  enemiesPerRoom: [2, 4, 5],
};

/** Holds the Attack request of the `SWEEP` tuning until the Hero has cleared the Room it stands in. */
function clearRoom(run: Run): void {
  const { roomIndex } = run.state;
  for (let tick = 0; tick < 6; tick++) {
    if (run.state.roomIndex !== roomIndex || run.state.phase !== "combat") return;
    hold(run, { attack: true }, 1);
  }
  throw new Error("the Room was not cleared");
}

function startRunOfRooms(overrides: Partial<RunOptions> = {}): Run {
  return createRun({
    seed: 1,
    heroStats: { speed: 6, maxHealth: 100 },
    tuning: SWEEP,
    roomTemplates: HALLS,
    ...overrides,
  });
}

/** Where the three Enemies of a one-Room Run stand when it starts. */
function spawnPointsDrawn(seed: number): string {
  const { state } = startRunOfRooms({
    seed,
    roomTemplates: [hall(30)],
    tuning: { ...SWEEP, enemiesPerRoom: [3] },
  });
  return JSON.stringify(state.enemies.map(({ position }) => position));
}

/** The widths of the halls a Run goes through, in order. */
function hallWidths(seed: number): number[] {
  const run = startRunOfRooms({ seed });
  return SWEEP.enemiesPerRoom.map(() => {
    const { width } = run.state.room;
    clearRoom(run);
    return width;
  });
}

/** A wide Room with a pillar two units wide, the Hero in its middle and one spawn point out of the way. */
function pillarAt(center: Vec2): RoomTemplate {
  return {
    width: 40,
    height: 40,
    entryPoint: { x: 0, y: 0 },
    pillars: [{ center, radius: 1 }],
    spawnPoints: [{ x: -10, y: -10 }],
  };
}

/** The default Run, but for Enemies that stand and a Hero whose Attack clears a Room at once. */
function startDefaultRun(seed: number): Run {
  return createRun({
    seed,
    heroStats: DEFAULT_TUNING.heroStats,
    tuning: standing({ ...DEFAULT_TUNING, heroAttack: SWEEP.heroAttack }),
    roomTemplates: DEFAULT_ROOM_TEMPLATES,
  });
}

/** A whole Run of the default content: the Enemies chase and attack, the Hero clears each Room after a while. */
function playDefaultRun(seed: number) {
  const run = createRun({
    seed,
    heroStats: DEFAULT_TUNING.heroStats,
    tuning: { ...DEFAULT_TUNING, heroAttack: SWEEP.heroAttack },
    roomTemplates: DEFAULT_ROOM_TEMPLATES,
  });
  const rooms = [];
  const spawnPoints = [];
  while (run.state.phase === "combat") {
    rooms.push(structuredClone(run.state.room));
    spawnPoints.push(run.state.enemies.map(({ position }) => ({ ...position })));
    holdMove(run, { x: 1, y: -1 }, 40);
    hold(run, {}, 80);
    clearRoom(run);
  }
  return { rooms, spawnPoints, state: run.state };
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

describe("creating a Run from content that cannot fill it", () => {
  test("refuses fewer Room Templates than the Run has Rooms", () => {
    expect(() => startRunOfRooms({ roomTemplates: HALLS.slice(0, 2) })).toThrow(
      "A Run of 3 Rooms needs 3 Room Templates, got 2",
    );
  });

  test("refuses a Room Template with fewer spawn points than its Room has Enemies", () => {
    expect(() => startRunOfRooms({ tuning: { ...SWEEP, enemiesPerRoom: [2, 7] } })).toThrow(
      "Every Room Template needs at least 7 spawn points",
    );
  });
});

describe("moving the Hero", () => {
  const OPEN_ROOM: RoomTemplate = {
    width: 40,
    height: 40,
    entryPoint: { x: 0, y: 0 },
    pillars: [],
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
    pillars: [],
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
      pillars: [],
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

describe("pillars", () => {
  test("stop the Hero", () => {
    const run = startRun({ roomTemplate: aroundPillar({ x: -4, y: 0 }) });

    holdMove(run, { x: 1, y: 0 }, 120);

    const hero = onlyHero(run);
    const reach = hero.position.x + hero.radius;
    expect(reach).toBeLessThanOrEqual(-1 + CONTACT_SLACK);
    expect(reach).toBeGreaterThan(-1 - CONTACT_SLACK);
  });

  test("let the Hero slide around them", () => {
    const run = startRun({ roomTemplate: aroundPillar({ x: -4, y: 0.4 }) });
    const hero = onlyHero(run);

    for (let tick = 0; tick < 120; tick++) {
      holdMove(run, { x: 1, y: 0 }, 1);

      expect(Math.hypot(hero.position.x, hero.position.y)).toBeGreaterThan(
        1 + hero.radius - CONTACT_SLACK,
      );
    }

    expect(hero.position.x).toBeGreaterThan(3);
  });

  test("let an Enemy slide around them on its way to the Hero", () => {
    const run = startRun({
      tuning: neverAttacking(BITE),
      roomTemplate: aroundPillar({ x: -4, y: 0 }, { x: 4, y: 0.4 }),
    });
    const hero = onlyHero(run);
    const enemy = onlyEnemy(run);

    // Eight units at 3 units per second take under three seconds in a straight line: four leave room for the detour.
    for (let tick = 0; tick < 240; tick++) {
      hold(run, {}, 1);

      expect(Math.hypot(enemy.position.x, enemy.position.y)).toBeGreaterThan(
        1 + enemy.radius - CONTACT_SLACK,
      );
    }

    expect(distance(hero.position, enemy.position)).toBeLessThan(
      hero.radius + enemy.radius + CONTACT_SLACK,
    );
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

describe("a Run of several Rooms", () => {
  test("starts with the first Room's count of Enemies, each on a spawn point of its own", () => {
    const run = startRunOfRooms();
    const { state } = run;

    const standsOn = state.enemies.map(({ position }) => `${position.x}:${position.y}`);
    expect(standsOn).toHaveLength(2);
    expect(new Set(standsOn).size).toBe(2);
    for (const { position } of state.enemies) {
      expect(currentHall(run).spawnPoints).toContainEqual(position);
    }
  });

  test("draws the spawn points with the Run Seed", () => {
    expect(spawnPointsDrawn(7)).toBe(spawnPointsDrawn(7));
    // Three spawn points out of six can be drawn twenty ways.
    const draws = new Set(Array.from({ length: 20 }, (_, seed) => spawnPointsDrawn(seed)));
    expect(draws.size).toBeGreaterThan(5);
  });

  test("loads the next Room, with its own count of Enemies, the tick the last Enemy is defeated", () => {
    const run = startRunOfRooms();
    expect(run.state.roomIndex).toBe(0);

    // The Windup: nothing is damaged yet.
    hold(run, { attack: true }, 1);
    expect(run.state.roomIndex).toBe(0);
    expect(run.state.enemies).toHaveLength(2);

    hold(run, { attack: true }, 1);
    expect(run.state.roomIndex).toBe(1);
    expect(run.state.enemies).toHaveLength(4);
    expect(run.state.phase).toBe("combat");
  });

  test("places the Hero at the entry point of each Room it enters", () => {
    const run = startRunOfRooms();

    for (const _ of SWEEP.enemiesPerRoom) {
      expect(onlyHero(run).position).toEqual(currentHall(run).entryPoint);

      holdMove(run, { x: 1, y: 1 }, 20);
      clearRoom(run);
    }
  });

  test("leaves nothing of the previous Room in the Hero's way", () => {
    // The same Room twice over, but for a pillar that stands on the Hero's right in one and below it in the other.
    const run = startRunOfRooms({
      tuning: { ...SWEEP, enemiesPerRoom: [1, 1] },
      roomTemplates: [pillarAt({ x: 3, y: 0 }), pillarAt({ x: 0, y: 3 })],
    });
    clearRoom(run);
    const [pillar] = run.state.room.pillars;
    const towardPreviousPillar = pillar?.center.x === 3 ? { x: 0, y: 1 } : { x: 1, y: 0 };

    // One second at 6 units per second, through where the previous Room's pillar stood.
    holdMove(run, towardPreviousPillar, 62);

    const { position } = onlyHero(run);
    expect(position.x + position.y).toBeGreaterThan(5.5);
  });

  test("gives the Enemies of each Room identifiers no earlier character had", () => {
    const run = startRunOfRooms();
    const seen = [onlyHero(run).id];

    for (const _ of SWEEP.enemiesPerRoom) {
      const ids = run.state.enemies.map(({ id }) => id);
      expect(ids.filter((id) => seen.includes(id))).toEqual([]);
      expect(new Set(ids).size).toBe(ids.length);
      seen.push(...ids);
      clearRoom(run);
    }
    expect(seen).toHaveLength(1 + 2 + 4 + 5);
  });

  test("carries the Hero's health over to the next Room, without healing", () => {
    const biteRoom = arena({ x: 1.2, y: 0 });
    const run = startRunOfRooms({
      tuning: { ...BITE, heroAttack: SWEEP.heroAttack, enemyHealth: 50, enemiesPerRoom: [1, 1] },
      roomTemplates: [biteRoom, { ...biteRoom }],
    });
    // The first Active Phase of the Enemy standing next to the Hero.
    hold(run, {}, 20 + 1);
    expect(onlyHero(run).health).toBe(85);

    clearRoom(run);
    expect(run.state.roomIndex).toBe(1);
    expect(onlyHero(run).health).toBe(85);
    expect(onlyHero(run).stats.maxHealth).toBe(100);

    hold(run, {}, 20 + 1);
    expect(onlyHero(run).health).toBe(70);
  });

  test("goes through Room Templates drawn with the Run Seed, never the same one twice", () => {
    expect(hallWidths(7)).toEqual(hallWidths(7));
    const sequences = new Set<string>();
    for (let seed = 0; seed < 20; seed++) {
      const widths = hallWidths(seed);
      expect(new Set(widths).size).toBe(3);
      expect([30, 32, 34, 36]).toEqual(expect.arrayContaining(widths));
      sequences.add(widths.join());
    }
    // Three of four Room Templates can follow one another in twenty-four ways.
    expect(sequences.size).toBeGreaterThan(5);
  });
});

describe("the default Room Templates", () => {
  test("number at least three, each with a few pillars", () => {
    expect(DEFAULT_ROOM_TEMPLATES.length).toBeGreaterThanOrEqual(3);
    for (const { pillars } of DEFAULT_ROOM_TEMPLATES) {
      expect(pillars.length).toBeGreaterThanOrEqual(2);
    }
  });

  test("have more spawn points than the seven Enemies of the fullest Room", () => {
    for (const { spawnPoints } of DEFAULT_ROOM_TEMPLATES) {
      expect(spawnPoints.length).toBeGreaterThan(7);
    }
  });

  test("keep every spawn point at least six units from the entry point", () => {
    for (const { entryPoint, spawnPoints } of DEFAULT_ROOM_TEMPLATES) {
      for (const spawnPoint of spawnPoints) {
        expect(distance(entryPoint, spawnPoint)).toBeGreaterThanOrEqual(6);
      }
    }
  });

  test("leave a character room to stand on the entry point and on every spawn point", () => {
    // Half a unit for the character's own radius, and as much again to move.
    const CLEARANCE = 1;
    for (const { width, height, entryPoint, spawnPoints, pillars } of DEFAULT_ROOM_TEMPLATES) {
      for (const point of [entryPoint, ...spawnPoints]) {
        expect(Math.abs(point.x)).toBeLessThanOrEqual(width / 2 - CLEARANCE);
        expect(Math.abs(point.y)).toBeLessThanOrEqual(height / 2 - CLEARANCE);
        for (const pillar of pillars) {
          expect(distance(point, pillar.center)).toBeGreaterThanOrEqual(pillar.radius + CLEARANCE);
        }
      }
    }
  });
});

describe("a Run of the default content", () => {
  test("has three Rooms of 3, then 5, then 7 Enemies, and ends in victory", () => {
    const run = startDefaultRun(1);

    const enemyCounts = [0, 1, 2].map((roomIndex) => {
      expect(run.state.roomIndex).toBe(roomIndex);
      const count = run.state.enemies.length;
      clearRoom(run);
      return count;
    });

    expect(enemyCounts).toEqual([3, 5, 7]);
    expect(run.state.outcome).toBe("victory");
  });

  test("lets the Hero enter every Room at least six units from each of its Enemies", () => {
    for (let seed = 0; seed < 10; seed++) {
      const run = startDefaultRun(seed);
      while (run.state.phase === "combat") {
        for (const enemy of run.state.enemies) {
          expect(distance(onlyHero(run).position, enemy.position)).toBeGreaterThanOrEqual(6);
        }
        clearRoom(run);
      }
    }
  });
});

describe("the Run Seed", () => {
  test("gives the same Rooms, spawn points and outcome for the same commands", () => {
    const first = playDefaultRun(42);
    const second = playDefaultRun(42);

    expect(second.rooms).toEqual(first.rooms);
    expect(second.spawnPoints).toEqual(first.spawnPoints);
    expect(second.state).toEqual(first.state);
    expect(first.rooms).toHaveLength(3);
    expect(first.state.outcome).toBe("victory");
  });

  test("can give other Rooms and spawn points when it changes", () => {
    const layouts = new Set<string>();
    const draws = new Set<string>();
    for (let seed = 0; seed < 10; seed++) {
      const { rooms, spawnPoints } = playDefaultRun(seed);
      layouts.add(JSON.stringify(rooms.map(({ walls, pillars }) => ({ walls, pillars }))));
      draws.add(JSON.stringify(spawnPoints));
    }

    expect(layouts.size).toBeGreaterThan(1);
    expect(draws.size).toBeGreaterThan(1);
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

describe("victory", () => {
  test("ends the Run the tick the last Enemy of the last Room is defeated, not before", () => {
    const run = startRunOfRooms();
    clearRoom(run);
    clearRoom(run);

    // The Recovery of the Attack that cleared the second Room, then the Windup of the next one.
    hold(run, { attack: true }, 2);
    expect(run.state.roomIndex).toBe(2);
    expect(run.state.enemies).toHaveLength(5);
    expect(run.state.phase).toBe("combat");
    expect(run.state.outcome).toBeNull();

    hold(run, { attack: true }, 1);
    expect(run.state.enemies).toHaveLength(0);
    expect(run.state.phase).toBe("ended");
    expect(run.state.outcome).toBe("victory");
  });

  test("freezes the Run: further steps change nothing", () => {
    const run = startRunOfRooms();
    for (const _ of SWEEP.enemiesPerRoom) clearRoom(run);
    const frozen = structuredClone(run.state);

    hold(run, { move: { x: 1, y: 0 }, aim: { x: 0, y: 1 }, attack: true }, 60);

    expect(run.state).toEqual(frozen);
    expect(frozen.outcome).toBe("victory");
  });

  test("gives way to defeat when the Hero falls on the tick it defeats the last Enemy", () => {
    const run = startRun({
      tuning: { ...BITE, heroAttack: { ...SWING.heroAttack, damage: 50 } },
      heroStats: { speed: 6, maxHealth: 15 },
      roomTemplate: arena({ x: 1.2, y: 0 }),
    });

    // The Enemy's Active Phase starts on tick 21: the Hero's two-tick Windup is timed to end with it.
    hold(run, {}, 18);
    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 2);
    expect(run.state.outcome).toBeNull();

    hold(run, {}, 1);
    expect(run.state.enemies).toHaveLength(0);
    expect(onlyHero(run).health).toBe(0);
    expect(run.state.outcome).toBe("defeat");
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
    // Clearing the Room would end the Run: an Enemy out of reach behind the Hero keeps it going.
    const bystander = { x: -10, y: 0 };
    const withEnemy = startRun({
      tuning: { ...SWING, enemyHealth: 20 },
      roomTemplate: arena({ x: 2, y: 0 }, bystander),
    });
    const alone = startRun({ tuning: SWING, roomTemplate: arena(bystander) });

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

describe("the Dash", () => {
  test("carries the Hero along the movement direction, at the tuning table's speed and for its duration", () => {
    const run = startRun({ tuning: LEAP, roomTemplate: arena() });

    hold(run, { dash: true, move: { x: 0, y: 3 }, aim: { x: 1, y: 0 } }, 1);
    hold(run, {}, 5);
    expect(onlyHero(run).position.x).toBeCloseTo(0, 2);
    expect(onlyHero(run).position.y).toBeCloseTo(2, 2);

    hold(run, {}, 10);
    expect(onlyHero(run).position.x).toBeCloseTo(0, 2);
    expect(onlyHero(run).position.y).toBeCloseTo(2, 2);
  });

  test("goes along the aim direction when the movement direction is zero", () => {
    const run = startRun({ tuning: LEAP, roomTemplate: arena() });

    hold(run, { dash: true, aim: { x: -4, y: 0 } }, 1);
    hold(run, {}, 5);

    expect(onlyHero(run).position.x).toBeCloseTo(-2, 2);
    expect(onlyHero(run).position.y).toBeCloseTo(0, 2);
  });

  test("goes the way the Hero faces when the command gives neither direction", () => {
    const run = startRun({ tuning: LEAP, roomTemplate: arena() });
    hold(run, { aim: { x: 0, y: -1 } }, 1);

    hold(run, { dash: true }, 1);
    hold(run, {}, 5);

    expect(onlyHero(run).position.x).toBeCloseTo(0, 2);
    expect(onlyHero(run).position.y).toBeCloseTo(-2, 2);
  });

  test.each([
    { phase: "windup", ticksIntoAttack: 1 },
    { phase: "active", ticksIntoAttack: 3 },
    { phase: "recovery", ticksIntoAttack: 6 },
  ] as const)("cancels the Hero's Attack in its $phase", ({ phase, ticksIntoAttack }) => {
    const run = startRun({
      tuning: { ...SWING, dash: LEAP.dash },
      roomTemplate: arena({ x: 2, y: 0 }),
    });
    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 1);
    hold(run, {}, ticksIntoAttack - 1);
    expect(onlyHero(run).attack?.phase).toBe(phase);
    const enemyHealth = onlyEnemy(run).health;

    hold(run, { dash: true, move: { x: -1, y: 0 } }, 1);
    expect(onlyHero(run).attack).toBeNull();

    hold(run, {}, 5);
    expect(onlyHero(run).attack).toBeNull();
    expect(onlyHero(run).position.x).toBeCloseTo(-2, 2);
    expect(onlyEnemy(run).health).toBe(enemyHealth);
  });

  test("out of an Attack goes along the aim direction of its own tick, not the Attack's", () => {
    const run = startRun({ tuning: { ...SWING, dash: LEAP.dash }, roomTemplate: arena() });
    hold(run, { attack: true, aim: { x: 1, y: 0 } }, 3);

    hold(run, { dash: true, aim: { x: 0, y: 1 } }, 1);
    hold(run, {}, 5);

    expect(onlyHero(run).position.x).toBeCloseTo(0, 2);
    expect(onlyHero(run).position.y).toBeCloseTo(2, 2);
  });

  test("holds back a requested Attack until it is over", () => {
    const run = startRun({ tuning: { ...SWING, dash: LEAP.dash }, roomTemplate: arena() });

    const phases = [
      ...attackPhasesWhileHolding(run, { dash: true, attack: true, move: { x: 1, y: 0 } }, 1),
      ...attackPhasesWhileHolding(run, { attack: true }, 7),
    ];

    expect(phases).toEqual([...ticksOf(null, 6), "windup", "windup"]);
    expect(onlyHero(run).position.x).toBeCloseTo(2, 2);
  });

  test("spares the Hero an Enemy's Active Phase that it lasts through", () => {
    const run = startRun({ tuning: ENGULF, roomTemplate: arena({ x: 1.2, y: 0 }) });
    hold(run, {}, 20);

    // Three ticks of Dash over the three ticks of the Active Phase.
    hold(run, { dash: true, move: { x: -1, y: 0 } }, 1);
    hold(run, {}, 2);
    expect(onlyEnemy(run).attack?.phase).toBe("active");

    hold(run, {}, 10);
    expect(onlyHero(run).health).toBe(100);
    expect(onlyHero(run).lastDamagedTick).toBeNull();
  });

  test("leaves the Hero open to damage on the tick after its last", () => {
    const run = startRun({ tuning: ENGULF, roomTemplate: arena({ x: 1.2, y: 0 }) });
    hold(run, {}, 19);

    // Started one tick early: the Dash ends with one tick of the Active Phase still to come.
    hold(run, { dash: true, move: { x: -1, y: 0 } }, 1);
    hold(run, {}, 2);
    expect(onlyEnemy(run).attack?.phase).toBe("active");
    expect(onlyHero(run).health).toBe(100);

    hold(run, {}, 1);
    expect(onlyEnemy(run).attack?.phase).toBe("active");
    expect(onlyHero(run).health).toBe(85);
  });

  test("ignores a request made before its cooldown has elapsed, counted from its start", () => {
    const run = startRun({ tuning: LEAP, roomTemplate: arena() });
    hold(run, { dash: true, move: { x: 1, y: 0 } }, 1);
    hold(run, {}, 18);

    // The 19th tick after the one the Dash started on, with a cooldown of 20.
    hold(run, { dash: true, aim: { x: 1, y: 0 } }, 1);
    expect(onlyHero(run).dash).toBeNull();

    hold(run, {}, 10);
    expect(onlyHero(run).position.x).toBeCloseTo(2, 2);
  });

  test("can be made again once its cooldown has elapsed", () => {
    const run = startRun({ tuning: LEAP, roomTemplate: arena() });
    expect(onlyHero(run).dashReadyTick).toBe(0);
    hold(run, { dash: true, move: { x: 1, y: 0 } }, 1);
    expect(onlyHero(run).dashReadyTick).toBe(20);
    hold(run, {}, 19);
    expect(run.state.tick).toBe(20);

    hold(run, { dash: true, aim: { x: 1, y: 0 } }, 1);
    hold(run, {}, 5);

    expect(onlyHero(run).position.x).toBeCloseTo(4, 2);
    expect(onlyHero(run).dashReadyTick).toBe(40);
  });

  test("leaves the Hero's Attack running when its request is ignored", () => {
    const run = startRun({ tuning: { ...SWING, dash: LEAP.dash }, roomTemplate: arena() });
    hold(run, { dash: true, move: { x: 1, y: 0 } }, 1);
    hold(run, {}, 5);

    const phases = [
      ...attackPhasesWhileHolding(run, { attack: true }, 1),
      ...attackPhasesWhileHolding(run, { dash: true, move: { x: 1, y: 0 } }, 1),
      ...attackPhasesWhileHolding(run, {}, 1),
    ];

    expect(phases).toEqual(["windup", "windup", "active"]);
    expect(onlyHero(run).position.x).toBeCloseTo(2, 2);
  });

  // Inner faces at x = ±10; the Dash would carry the Hero 15 units.
  test("is stopped by a wall, tick after tick", () => {
    const run = startRun({
      tuning: withDash({ durationTicks: 50, speed: 18 }),
      roomTemplate: {
        width: 20,
        height: 12,
        entryPoint: { x: 0, y: 0 },
        pillars: [],
        spawnPoints: [],
      },
    });
    const hero = onlyHero(run);

    hold(run, { dash: true, move: { x: 1, y: 0 } }, 1);
    for (let tick = 1; tick < 50; tick++) {
      hold(run, {}, 1);

      expect(hero.position.x + hero.radius).toBeLessThanOrEqual(10 + CONTACT_SLACK);
    }

    expect(hero.position.x + hero.radius).toBeGreaterThan(10 - CONTACT_SLACK);
  });

  test("does not carry the Hero through an Enemy", () => {
    const run = startRun({
      tuning: standing(withDash({ durationTicks: 30 })),
      roomTemplate: arena({ x: 2, y: 0 }),
    });
    const hero = onlyHero(run);
    const enemy = onlyEnemy(run);

    hold(run, { dash: true, move: { x: 1, y: 0 } }, 1);
    for (let tick = 1; tick < 30; tick++) {
      hold(run, {}, 1);

      expect(enemy.position.x - hero.position.x).toBeGreaterThan(
        hero.radius + enemy.radius - CONTACT_SLACK,
      );
    }

    // The Enemy was pushed along rather than passed.
    expect(enemy.position.x).toBeGreaterThan(3);
  });

  test("is not made once the Run has ended", () => {
    const run = startRun({
      tuning: BITE,
      heroStats: { speed: 6, maxHealth: 10 },
      roomTemplate: arena({ x: 1.2, y: 0 }),
    });
    hold(run, {}, 20 + 1);
    expect(run.state.phase).toBe("ended");
    const frozen = structuredClone(run.state);

    hold(run, { dash: true, move: { x: -1, y: 0 } }, 5);

    expect(run.state).toEqual(frozen);
  });

  test("lasts 10 ticks, covers 3 units and is ready again 45 ticks after its start with the default tuning", () => {
    const run = startRun({ roomTemplate: arena() });

    hold(run, { dash: true, move: { x: 1, y: 0 } }, 1);
    let dashTicks = 1;
    for (let tick = 1; tick < 30; tick++) {
      hold(run, {}, 1);
      if (onlyHero(run).dash) dashTicks += 1;
    }

    expect(dashTicks).toBe(10);
    expect(onlyHero(run).position.x).toBeCloseTo(3, 2);
    expect(onlyHero(run).dashReadyTick).toBe(45);
  });

  test("keeps the state plain serializable data while it lasts", () => {
    const run = startRun({ roomTemplate: arena() });

    hold(run, { dash: true, move: { x: 1, y: 0 } }, 3);

    expect(onlyHero(run).dash).not.toBeNull();
    expect(JSON.parse(JSON.stringify(run.state))).toStrictEqual(run.state);
  });
});
