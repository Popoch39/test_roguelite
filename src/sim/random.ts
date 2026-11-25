/** Whatever holds the generator's state: the Run's state, so that the state alone says what comes next. */
export interface RandomSource {
  randomState: number;
}

/** A number from 0 up to, but not including, 1. */
export function nextRandom(source: RandomSource): number {
  // Mulberry32: small, fast, and its whole state is one 32-bit unsigned integer.
  source.randomState = (source.randomState + 0x6d2b79f5) >>> 0;
  let mixed = source.randomState;
  mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
  mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
  return ((mixed ^ (mixed >>> 14)) >>> 0) / 2 ** 32;
}

/** `count` of the items in a drawn order, every sequence of them as likely as any other. */
export function drawSequence<Item>(
  source: RandomSource,
  items: readonly Item[],
  count: number,
): Item[] {
  const left = [...items];
  const drawn: Item[] = [];
  while (drawn.length < count && left.length > 0) {
    drawn.push(...left.splice(Math.floor(nextRandom(source) * left.length), 1));
  }
  return drawn;
}

/** `count` of the items, every choice of them as likely as any other; those drawn keep the order they had. */
export function drawSubset<Item>(
  source: RandomSource,
  items: readonly Item[],
  count: number,
): Item[] {
  const drawn: Item[] = [];
  for (const [index, item] of items.entries()) {
    // Each item is taken with the odds that leave the remaining ones just able to complete the draw.
    if (nextRandom(source) * (items.length - index) < count - drawn.length) drawn.push(item);
  }
  return drawn;
}
