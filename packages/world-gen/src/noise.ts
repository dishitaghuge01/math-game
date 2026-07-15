import { mulberry32 } from '@math-game/core-math';

const GRADIENTS = [
  [1, 1],
  [-1, 1],
  [1, -1],
  [-1, -1],
  [1, 0],
  [-1, 0],
  [0, 1],
  [0, -1],
] as const;

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
    const xf = x - Math.floor(x);
    const yf = y - Math.floor(y);
    const i = Math.floor(x) & 255;
    const j = Math.floor(y) & 255;
    const i1 = (i + 1) & 255;
    const j1 = (j + 1) & 255;

    const gi00 = p2[i + p2[j]] % GRADIENTS.length;
    const gi10 = p2[i1 + p2[j]] % GRADIENTS.length;
    const gi01 = p2[i + p2[j1]] % GRADIENTS.length;
    const gi11 = p2[i1 + p2[j1]] % GRADIENTS.length;

    const [gx00, gy00] = GRADIENTS[gi00];
    const [gx10, gy10] = GRADIENTS[gi10];
    const [gx01, gy01] = GRADIENTS[gi01];
    const [gx11, gy11] = GRADIENTS[gi11];

    const dot00 = gx00 * xf + gy00 * yf;
    const dot10 = gx10 * (xf - 1) + gy10 * yf;
    const dot01 = gx01 * xf + gy01 * (yf - 1);
    const dot11 = gx11 * (xf - 1) + gy11 * (yf - 1);

    const fadeX = fade(xf);
    const fadeY = fade(yf);

    const top = lerp(dot00, dot10, fadeX);
    const bottom = lerp(dot01, dot11, fadeX);
    return lerp(top, bottom, fadeY);
  };
}

function fade(t: number): number {
  return ((6 * t - 15) * t + 10) * t * t * t;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
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
