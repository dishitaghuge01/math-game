export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), 1 | state);
    value = (value + Math.imul(value ^ (value >>> 7), 61 | value)) ^ value;
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function seededRange(rng: () => number, min: number, max: number): number {
  return min + rng() * (max - min);
}

export function seededChoice<T>(rng: () => number, array: T[]): T {
  if (array.length === 0) {
    throw new Error('Cannot choose from an empty array');
  }

  return array[Math.floor(rng() * array.length)];
}
