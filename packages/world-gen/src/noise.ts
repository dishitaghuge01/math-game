import { mulberry32 } from '../../core-math/src/prng.js';

export function createSimplexNoise2D(seed: number): (x: number, y: number) => number {
  const rng = mulberry32(seed);
  const permutation: number[] = Array.from({ length: 512 }, (_, index) => index);

  for (let index = 255; index > 0; index -= 1) {
    const swapIndex = Math.floor(rng() * (index + 1));
    [permutation[index], permutation[swapIndex]] = [permutation[swapIndex], permutation[index]];
  }

  const p = permutation.slice(0, 256);
  const p2 = p.concat(p);

  return (x: number, y: number) => {
    const i = Math.floor(x) & 255;
    const j = Math.floor(y) & 255;
    const gi = p2[i + p2[j + 1]] % 8;
    const gx = [1, -1, 1, -1, 1, -1, 0, 0][gi];
    const gy = [1, 1, -1, -1, 0, 0, 1, -1][gi];
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const n0 = (gx * xf + gy * yf);
    const n1 = ((gx * (xf - 1) + gy * yf) * (xf < 1 ? 1 : 0));
    return n0 + n1;
  };
}

export function fractalNoise2D(
  noiseFn: (x: number, y: number) => number,
  x: number,
  y: number,
  octaves: number,
  persistence: number,
  frequency: number,
): number {
  let value = 0;
  let amplitude = 1;
  let totalAmplitude = 0;
  let currentFrequency = frequency;

  for (let index = 0; index < octaves; index += 1) {
    value += noiseFn(x * currentFrequency, y * currentFrequency) * amplitude;
    totalAmplitude += amplitude;
    amplitude *= persistence;
    currentFrequency *= 2;
  }

  return value / totalAmplitude;
}
