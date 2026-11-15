// One seeded generator for every random choice the game makes: lightning
// targets, particle scatter, ember drift, boss timings. The same seed always
// plays the same fight, so screenshots are reproducible and the game is fair.
// SplitMix64: tiny, fast, and good enough for gameplay randomness.

/** @returns a function that yields a float in [0, 1) on every call. */
export function createRandom(seed) {
  let state = BigInt(seed >>> 0) || 0x9e3779b97f4a7c15n;
  return function next() {
    state = (state + 0x9e3779b97f4a7c15n) & 0xffffffffffffffffn;
    let z = state;
    z = ((z ^ (z >> 30n)) * 0xbf58476d1ce4e5b9n) & 0xffffffffffffffffn;
    z = ((z ^ (z >> 27n)) * 0x94d049bb133111ebn) & 0xffffffffffffffffn;
    z = z ^ (z >> 31n);
    // Top 53 bits -> a float in [0, 1).
    return Number(z >> 11n) / 9007199254740992;
  };
}

/** Integer in [min, max] from a generator made by createRandom. */
export function randomInt(random, min, max) {
  return min + Math.floor(random() * (max - min + 1));
}

/** Pick one element of an array. */
export function randomPick(random, items) {
  return items[Math.floor(random() * items.length)];
}
