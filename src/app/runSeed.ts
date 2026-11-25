// The simulation's generator starts from a 32-bit unsigned integer.
const RUN_SEED_COUNT = 2 ** 32;

/** The Run Seed the page address asks for, as in `?seed=1234`, or null when it gives none that can be used. */
function runSeedFromAddress(search: string): number | null {
  const text = new URLSearchParams(search).get("seed");
  if (text === null || !/^\d+$/.test(text)) return null;
  const seed = Number(text);
  return seed < RUN_SEED_COUNT ? seed : null;
}

/** The Run Seed of a new Run: the one the page address supplies, so that a Run can be replayed, or else a random one. */
export function chooseRunSeed(search: string): number {
  return runSeedFromAddress(search) ?? Math.floor(Math.random() * RUN_SEED_COUNT);
}
