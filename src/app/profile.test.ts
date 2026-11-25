import { describe, expect, test } from "bun:test";
import {
  bankRun,
  buyTalentLevel,
  canBuyTalentLevel,
  createMemoryStorage,
  createProfile,
  loadProfile,
  nextTalentLevelCost,
  saveProfile,
  startingHeroStats,
  type Profile,
} from "./profile";

function profileWith(overrides: Partial<Profile>): Profile {
  return { ...createProfile(), ...overrides };
}

describe("a fresh Profile", () => {
  test("has no Gold and no Talent level", () => {
    const profile = createProfile();

    expect(profile.gold).toBe(0);
    expect(profile.talentLevel).toBe(0);
  });
});

describe("banking a finished Run", () => {
  test("adds the Gold earned to the Profile after a victory", () => {
    const profile = bankRun(profileWith({ gold: 40 }), { outcome: "victory", goldEarned: 75 });

    expect(profile.gold).toBe(115);
  });

  test("adds the Gold earned to the Profile after a defeat alike", () => {
    const profile = bankRun(profileWith({ gold: 40 }), { outcome: "defeat", goldEarned: 15 });

    expect(profile.gold).toBe(55);
  });

  test("leaves the Talent level as it was", () => {
    const profile = bankRun(profileWith({ talentLevel: 2 }), { outcome: "defeat", goldEarned: 15 });

    expect(profile.talentLevel).toBe(2);
  });
});

describe("the Talent", () => {
  test("costs 20 Gold times the level bought: 20, 40, 60, 80, then 100", () => {
    const costs = [0, 1, 2, 3, 4].map((talentLevel) =>
      nextTalentLevelCost(profileWith({ talentLevel })),
    );

    expect(costs).toEqual([20, 40, 60, 80, 100]);
  });

  test("has no next level to cost anything once at level 5", () => {
    expect(nextTalentLevelCost(profileWith({ talentLevel: 5 }))).toBeNull();
  });
});

describe("buying a Talent level", () => {
  test("raises the level by one and takes its cost from the Gold", () => {
    const profile = buyTalentLevel(profileWith({ gold: 70, talentLevel: 2 }));

    expect(profile).toEqual(profileWith({ gold: 10, talentLevel: 3 }));
  });

  test("is possible with exactly the Gold it costs", () => {
    const profile = profileWith({ gold: 20 });

    expect(canBuyTalentLevel(profile)).toBe(true);
    expect(buyTalentLevel(profile)).toEqual(profileWith({ gold: 0, talentLevel: 1 }));
  });

  test("is refused without enough Gold", () => {
    const profile = profileWith({ gold: 39, talentLevel: 1 });

    expect(canBuyTalentLevel(profile)).toBe(false);
    expect(buyTalentLevel(profile)).toBeNull();
  });

  test("is refused at the highest level, whatever the Gold", () => {
    const profile = profileWith({ gold: 1000, talentLevel: 5 });

    expect(canBuyTalentLevel(profile)).toBe(false);
    expect(buyTalentLevel(profile)).toBeNull();
  });

  test("takes a first-time Player from level 0 to level 5 for 300 Gold in all", () => {
    let profile = profileWith({ gold: 300 });

    for (let level = 1; level <= 5; level++) {
      profile = buyTalentLevel(profile) ?? profile;
      expect(profile.talentLevel).toBe(level);
    }

    expect(profile.gold).toBe(0);
  });
});

describe("the Hero's starting stats", () => {
  const BASE = { speed: 6, maxHealth: 100 };

  test("are the base stats for a Profile without a Talent level", () => {
    expect(startingHeroStats(createProfile(), BASE)).toEqual({ speed: 6, maxHealth: 100 });
  });

  test("gain 10 maximum health per Talent level", () => {
    const maxHealths = [1, 2, 5].map(
      (talentLevel) => startingHeroStats(profileWith({ talentLevel }), BASE).maxHealth,
    );

    expect(maxHealths).toEqual([110, 120, 150]);
  });

  test("keep every other stat of the base", () => {
    expect(startingHeroStats(profileWith({ talentLevel: 3 }), BASE).speed).toBe(6);
  });
});

describe("storing the Profile", () => {
  test("gives it back as it was saved", () => {
    const storage = createMemoryStorage();
    const profile = profileWith({ gold: 135, talentLevel: 2 });

    saveProfile(storage, profile);

    expect(loadProfile(storage)).toEqual(profile);
  });

  test("keeps only the last one saved", () => {
    const storage = createMemoryStorage();

    saveProfile(storage, profileWith({ gold: 135 }));
    saveProfile(storage, profileWith({ gold: 15, talentLevel: 3 }));

    expect(loadProfile(storage)).toEqual(profileWith({ gold: 15, talentLevel: 3 }));
  });
});

describe("loading the Profile", () => {
  test("gives a fresh one when none was ever saved", () => {
    expect(loadProfile(createMemoryStorage())).toEqual(createProfile());
  });

  test("gives a fresh one when what is stored cannot be read", () => {
    expect(loadProfile(createMemoryStorage("{ gold: lots"))).toEqual(createProfile());
  });

  test("gives a fresh one when what is stored is not a Profile", () => {
    const stored = [
      "null",
      "[]",
      '"profile"',
      '{"version":1}',
      '{"version":1,"gold":"lots","talentLevel":1}',
    ];

    for (const text of stored) {
      expect(loadProfile(createMemoryStorage(text))).toEqual(createProfile());
    }
  });

  test("gives a fresh one when the stored Gold or Talent level is not a possible one", () => {
    const stored = [
      '{"version":1,"gold":-5,"talentLevel":1}',
      '{"version":1,"gold":12.5,"talentLevel":1}',
      '{"version":1,"gold":50,"talentLevel":6}',
      '{"version":1,"gold":50,"talentLevel":-1}',
      '{"version":1,"gold":50,"talentLevel":1.5}',
    ];

    for (const text of stored) {
      expect(loadProfile(createMemoryStorage(text))).toEqual(createProfile());
    }
  });

  test("gives a fresh one when the stored version is unknown", () => {
    const fromTheFuture = JSON.stringify({
      ...profileWith({ gold: 135, talentLevel: 2 }),
      version: 2,
    });

    expect(loadProfile(createMemoryStorage(fromTheFuture))).toEqual(createProfile());
  });

  test("gives a fresh one when the storage itself fails", () => {
    const denied = {
      read(): string | null {
        throw new Error("storage denied");
      },
      write() {},
    };

    expect(loadProfile(denied)).toEqual(createProfile());
  });
});
