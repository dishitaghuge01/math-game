import { type DecisionVector } from '../../core-math/src/decisionVector.js';
import { mulberry32, seededRange } from '../../core-math/src/prng.js';
import { deriveSeed } from '../../core-math/src/seed.js';

import { DEFAULT_OCTAVES, DEFAULT_PERSISTENCE, terrainAmplitude, terrainFrequency } from './constants.js';
import { createSimplexNoise2D, fractalNoise2D } from './noise.js';

export interface TerrainParams {
  width: number;
  height: number;
  octaves?: number;
  persistence?: number;
}

export function generateHeightmap(
  seed: number,
  w: number,
  h: number,
  params: TerrainParams & { riskTolerance: number; volatility: number; curiosity: number },
): number[][] {
  const width = w;
  const height = h;
  const octaves = params.octaves ?? DEFAULT_OCTAVES;
  const persistence = params.persistence ?? DEFAULT_PERSISTENCE;
  const noise = createSimplexNoise2D(seed);
  const amplitude = terrainAmplitude(params.riskTolerance, params.volatility);
  const frequency = terrainFrequency(params.curiosity);

  const rng = mulberry32(seed + 1);
  const heights: number[][] = [];
  for (let y = 0; y < height; y += 1) {
    const row: number[] = [];
    for (let x = 0; x < width; x += 1) {
      const sample = fractalNoise2D(noise, x, y, octaves, persistence, frequency);
      const normalized = (sample + 1) / 2;
      const jitter = seededRange(rng, -0.05, 0.05);
      row.push(Math.max(0, Math.min(1, normalized * (1 + amplitude) + jitter)));
    }
    heights.push(row);
  }

  return heights;
}
