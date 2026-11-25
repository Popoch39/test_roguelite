import type { HeroStats, RunOutcome } from "../sim";

/** Everything a Player keeps between Runs. */
export interface Profile {
  /** Format of the stored data, so that a Profile written by another format is never misread. */
  version: number;
  gold: number;
  talentLevel: number;
}

const PROFILE_VERSION = 1;

/** The single Talent: each level makes the Hero of every later Run a little sturdier. */
export const TALENT = {
  highestLevel: 5,
  /** Added to the Hero's starting maximum health. */
  maxHealthPerLevel: 10,
  /** A level costs this much Gold times its own number. */
  goldPerLevel: 20,
};

/** What the Profile needs of a Run. It has an outcome: a Run still being played is never banked. */
export interface FinishedRun {
  outcome: RunOutcome;
  goldEarned: number;
}

export function createProfile(): Profile {
  return { version: PROFILE_VERSION, gold: 0, talentLevel: 0 };
}

/** The Gold of a Run is kept whether it was won or lost. */
export function bankRun(profile: Profile, run: FinishedRun): Profile {
  return { ...profile, gold: profile.gold + run.goldEarned };
}

/** The Gold the next Talent level costs, or null when the Talent is at its highest level. */
export function nextTalentLevelCost(profile: Profile): number | null {
  if (profile.talentLevel >= TALENT.highestLevel) return null;
  return (profile.talentLevel + 1) * TALENT.goldPerLevel;
}

export function canBuyTalentLevel(profile: Profile): boolean {
  const cost = nextTalentLevelCost(profile);
  return cost !== null && profile.gold >= cost;
}

/** The Profile after the purchase, or null when it is refused: not enough Gold, or no level left to buy. */
export function buyTalentLevel(profile: Profile): Profile | null {
  const cost = nextTalentLevelCost(profile);
  if (cost === null || profile.gold < cost) return null;
  return { ...profile, gold: profile.gold - cost, talentLevel: profile.talentLevel + 1 };
}

/** The stats the Hero of a new Run starts with: the base ones, raised by the Talent. */
export function startingHeroStats(profile: Profile, baseStats: HeroStats): HeroStats {
  return {
    ...baseStats,
    maxHealth: baseStats.maxHealth + profile.talentLevel * TALENT.maxHealthPerLevel,
  };
}

/** Where the Profile is kept between visits, as text. */
export interface ProfileStorage {
  /** Null when nothing was ever written. */
  read(): string | null;
  write(text: string): void;
}

const STORAGE_KEY = "roguelite-prototype.profile";

export function createBrowserStorage(): ProfileStorage {
  return {
    read: () => window.localStorage.getItem(STORAGE_KEY),
    write: (text) => window.localStorage.setItem(STORAGE_KEY, text),
  };
}

export function createMemoryStorage(initialText: string | null = null): ProfileStorage {
  let stored = initialText;
  return {
    read: () => stored,
    write(text) {
      stored = text;
    },
  };
}

function isCount(value: unknown): value is number {
  return typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
}

function isProfile(data: unknown): data is Profile {
  if (typeof data !== "object" || data === null) return false;
  const { version, gold, talentLevel } = data as Record<string, unknown>;
  return (
    version === PROFILE_VERSION &&
    isCount(gold) &&
    isCount(talentLevel) &&
    talentLevel <= TALENT.highestLevel
  );
}

/** Never fails: a Player whose Profile is missing, unreadable or from an unknown version starts with a fresh one. */
export function loadProfile(storage: ProfileStorage): Profile {
  try {
    const text = storage.read();
    const stored: unknown = text === null ? null : JSON.parse(text);
    return isProfile(stored) ? stored : createProfile();
  } catch {
    // The browser may deny its storage, and the text may not be JSON: either way no Profile can be read.
    return createProfile();
  }
}

export function saveProfile(storage: ProfileStorage, profile: Profile): void {
  storage.write(JSON.stringify(profile));
}
