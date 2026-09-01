function hashSeed(seed) {
  const text = String(seed);
  let hash = 2166136261;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function createPrng(seed) {
  let state = hashSeed(seed) || 0x6d2b79f5;
  return function next() {
    state += 0x6d2b79f5;
    let value = state;
    value = Math.imul(value ^ (value >>> 15), value | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomInt(rng, min, maxExclusive) {
  if (!Number.isInteger(min) || !Number.isInteger(maxExclusive) || maxExclusive <= min) throw new RangeError('invalid integer range');
  return min + Math.floor(rng() * (maxExclusive - min));
}
