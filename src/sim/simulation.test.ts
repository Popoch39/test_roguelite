import { beforeAll, describe, expect, test } from "bun:test";
import {
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

// A quarter-circle sector, three units deep, against Enemies half a unit wide.
const SWING: Tuning = {
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
};

/** Runs one whole Attack of the `SWING` tuning, from its first tick to the end of its Recovery. */
function attackOnce(run: Run, aim: Vec2): void {
  hold(run, { attack: true, aim }, 1);
  hold(run, {}, 2 + 3 + 4 - 1);
}

function holdMove(run: Run, move: Vec2, ticks: number): void {
  hold(run, { move }, ticks);
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

  test("stand still", () => {
    const run = startRun({ roomTemplate: arena({ x: 4, y: 0 }) });

    holdMove(run, { x: 0, y: 1 }, 60);

    expect(run.state.enemies[0]?.position).toEqual({ x: 4, y: 0 });
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
    const run = startRun({ roomTemplate: arena({ x: 2, y: 0 }) });
    holdMove(run, { x: 1, y: 0 }, 60);

    holdMove(run, { x: 0, y: 0 }, 60);
    const restingAt = { ...onlyEnemy(run).position };
    holdMove(run, { x: 0, y: 0 }, 60);

    expect(distance(onlyEnemy(run).position, restingAt)).toBeLessThan(0.01);
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

  test("does not start without a request", () => {
    const run = startRun();

    expect(attackPhasesWhileHolding(run, { move: { x: 1, y: 0 } }, 5)).toEqual(
      Array.from({ length: 5 }, () => null),
    );
  });
});
