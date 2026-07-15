import { describe, it, expect } from 'vitest';

import { createInitialVector, deriveSeed, mulberry32 } from '@math-game/core-math';
import { generatePlotSkeleton } from './plotSkeleton.js';

describe('narrative-gen', () => {
  it('generatePlotSkeleton is deterministic for same vector+seed', () => {
    const vector = createInitialVector();
    const seed = deriveSeed(vector, 'session-x', 'narrative:skeleton');
    const rngA = mulberry32(seed);
    const rngB = mulberry32(seed);
    const a = generatePlotSkeleton(vector, rngA, 6);
    const b = generatePlotSkeleton(vector, rngB, 6);
    expect(a).toEqual(b);
  });

  it('tone-mixed skeletons differ across distinct vectors', () => {
    const tragic = createInitialVector();
    tragic.morality = -0.9;
    tragic.volatility = 0.8;

    const communal = createInitialVector();
    communal.socialAffinity = 0.9;
    communal.morality = 0.5;

    const mysterious = createInitialVector();
    mysterious.curiosity = 0.9;
    mysterious.socialAffinity = -0.8;

    const seed = deriveSeed(tragic, 'session-x', 'narrative:skeleton');
    const rng = mulberry32(seed);

    const tNodes = generatePlotSkeleton(tragic, rng, 12).map((n) => n.symbol);
    const cNodes = generatePlotSkeleton(communal, mulberry32(seed), 12).map((n) => n.symbol);
    const mNodes = generatePlotSkeleton(mysterious, mulberry32(seed), 12).map((n) => n.symbol);

    const toneGroups = {
      tragic: new Set(['BETRAYAL', 'CONSEQUENCE']),
      communal: new Set(['GATHERING', 'ALLIANCE']),
      mysterious: new Set(['DISCOVERY', 'REVELATION']),
    } as const;

    const proportion = (arr: string[], group: Set<string>) => arr.filter((s) => group.has(s)).length / Math.max(1, arr.length);

    const pT = proportion(tNodes, toneGroups.tragic);
    const pC = proportion(cNodes, toneGroups.communal);
    const pM = proportion(mNodes, toneGroups.mysterious);

    expect(pT).toBeGreaterThan(0.3);
    expect(pC).toBeGreaterThan(0.3);
    expect(pM).toBeGreaterThan(0.3);
  });
});
