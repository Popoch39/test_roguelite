import { beforeAll, describe, expect, test } from "bun:test";
import {
  colliderOutlines,
  createRun,
  DEFAULT_TUNING,
  initSimulation,
  step,
  type Hero,
  type RoomTemplate,
  type Run,
  type RunOptions,
  type Vec2,
} from "./index";

const ROOM: RoomTemplate = { width: 20, height: 12, entryPoint: { x: -3, y: 2 } };

function startRun(overrides: Partial<RunOptions> = {}): Run {
  return createRun({
    seed: 1,
    heroStats: { speed: 6 },
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

function holdMove(run: Run, move: Vec2, ticks: number): void {
  const heroId = onlyHero(run).id;
  for (let tick = 0; tick < ticks; tick++) {
    step(run, [{ heroId, move }]);
  }
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
});

describe("moving the Hero", () => {
  const OPEN_ROOM: RoomTemplate = { width: 40, height: 40, entryPoint: { x: 0, y: 0 } };

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
    const run = startRun({ roomTemplate: OPEN_ROOM, heroStats: { speed: 4 } });

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

    for (let tick = 0; tick < 10; tick++) step(run, [{ heroId: strangerId, move: { x: 1, y: 0 } }]);

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

  test("keeps its state as plain serializable data", () => {
    const run = startRun();
    holdMove(run, { x: 1, y: 1 }, 5);

    expect(JSON.parse(JSON.stringify(run.state))).toStrictEqual(run.state);
  });
});

describe("walls", () => {
  // Inner faces at x = ±10 and y = ±6.
  const WALLED_ROOM: RoomTemplate = { width: 20, height: 12, entryPoint: { x: 0, y: 0 } };
  const CONTACT_SLACK = 0.05;

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
    const corridor: RoomTemplate = { width: 4, height: 60, entryPoint: { x: 0, y: -25 } };
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
      roomTemplate: { width: 40, height: 40, entryPoint: { x: 0, y: 0 } },
      heroStats: { speed: 4 },
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
