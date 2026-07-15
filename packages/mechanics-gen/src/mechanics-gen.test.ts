import { describe, expect, it } from 'vitest';
import { createInitialVector, type DecisionVector } from '@math-game/core-math';
import { enemyStatsFor } from './balance';
import { lootWeights } from './lootTable';

function makeVector(overrides: Partial<DecisionVector>): DecisionVector {
  return {
    morality: 0,
    aggression: 0,
    curiosity: 0,
    riskTolerance: 0,
    socialAffinity: 0,
    allegiance: {},
    volatility: 0,
    ...overrides,
  };
}

describe('mechanics-gen', () => {
  it('produces positive enemy stats and normalized loot weights for extreme vectors', () => {
    const zeroVector = makeVector({});
    const maxVector = makeVector({
      morality: 1,
      aggression: 1,
      curiosity: 1,
      riskTolerance: 1,
      socialAffinity: 1,
      volatility: 1,
    });
    const mixedVector = makeVector({
      morality: 0.2,
      aggression: 0.7,
      curiosity: 0.4,
      riskTolerance: 0.6,
      socialAffinity: 0.3,
      volatility: 0.8,
    });

    const zeroStats = enemyStatsFor(zeroVector, 5);
    const maxStats = enemyStatsFor(maxVector, 5);
    const mixedStats = enemyStatsFor(mixedVector, 5);

    expect(zeroStats.health).toBeGreaterThan(0);
    expect(zeroStats.count).toBeGreaterThan(0);
    expect(maxStats.health).toBeGreaterThan(0);
    expect(maxStats.count).toBeGreaterThan(0);
    expect(mixedStats.health).toBeGreaterThan(0);
    expect(mixedStats.count).toBeGreaterThan(0);

    const weights = lootWeights(mixedVector);
    const totalWeight = Object.values(weights).reduce((sum, weight) => sum + weight, 0);
    expect(totalWeight).toBeCloseTo(1, 5);
    expect(Object.values(weights).every((weight) => weight >= 0)).toBe(true);
  });

  it('is deterministic for the same vector and base difficulty', () => {
    const vector = createInitialVector();
    const first = enemyStatsFor(vector, 6);
    const second = enemyStatsFor(vector, 6);
    expect(first).toEqual(second);
    expect(lootWeights(vector)).toEqual(lootWeights(vector));
  });
});
