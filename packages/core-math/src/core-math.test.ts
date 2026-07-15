import { describe, expect, it } from 'vitest';

import { ALPHA_SMOOTHING, BETA_VOLATILITY } from './constants.js';
import { createInitialVector, updateVector } from './decisionVector.js';
import { fnv1a } from './hash.js';
import { dotProduct, sigmoid, softmax } from './mappingFunctions.js';
import { mulberry32, seededChoice, seededRange } from './prng.js';
import { deriveSeed } from './seed.js';

describe('core-math', () => {
  it('fnv1a is deterministic and unsigned 32-bit', () => {
    const value = fnv1a('hello');
    const again = fnv1a('hello');
    expect(again).toBe(value);
    expect(Number.isInteger(value)).toBe(true);
    expect(value).toBeGreaterThanOrEqual(0);
    expect(value).toBeLessThan(2 ** 32);
  });

  it('mulberry32 reproduces the same sequence for the same seed and differs across seeds', () => {
    const first = mulberry32(12345);
    const second = mulberry32(12345);
    const firstValues = Array.from({ length: 8 }, () => first());
    const secondValues = Array.from({ length: 8 }, () => second());
    expect(firstValues).toEqual(secondValues);

    const other = mulberry32(54321);
    const otherValues = Array.from({ length: 8 }, () => other());
    expect(otherValues).not.toEqual(firstValues);
  });

  it('deriveSeed is stable and namespace-sensitive', () => {
    const vector = createInitialVector();
    const same = deriveSeed(vector, 'session-1', 'world:chunk:12');
    const sameAgain = deriveSeed(vector, 'session-1', 'world:chunk:12');
    expect(same).toBe(sameAgain);

    const allegianceVector = {
      ...vector,
      allegiance: {
        guild: 0.2,
        cult: -0.4,
      },
    };
    const reversedVector = {
      ...vector,
      allegiance: Object.fromEntries(Object.entries(allegianceVector.allegiance).reverse()),
    };
    const sameOrderIndependent = deriveSeed(reversedVector, 'session-1', 'world:chunk:12');
    const sameSeed = deriveSeed(allegianceVector, 'session-1', 'world:chunk:12');
    expect(sameOrderIndependent).toBe(sameSeed);

    const differentNamespace = deriveSeed(allegianceVector, 'session-1', 'narrative:node:7');
    expect(differentNamespace).not.toBe(sameSeed);
  });

  it('updateVector applies smoothing and preserves bounds', () => {
    const prev = createInitialVector();
    const impact = { morality: 1, aggression: 0.5 };
    const next = updateVector(prev, impact);

    expect(next.morality).toBeCloseTo(ALPHA_SMOOTHING * 1 + (1 - ALPHA_SMOOTHING) * prev.morality, 12);
    expect(next.aggression).toBeCloseTo(ALPHA_SMOOTHING * 0.5 + (1 - ALPHA_SMOOTHING) * prev.aggression, 12);
    expect(next.curiosity).toBe(prev.curiosity);
    expect(next.riskTolerance).toBe(prev.riskTolerance);

    const repeated: Array<ReturnType<typeof updateVector>> = [];
    let current = next;
    repeated.push(current);
    for (let index = 1; index < 20; index += 1) {
      current = updateVector(current, impact);
      repeated.push(current);
    }

    for (let index = 1; index < repeated.length; index += 1) {
      const previous = repeated[index - 1];
      const currentValue = repeated[index];
      expect(currentValue.morality).toBeGreaterThanOrEqual(previous.morality);
      expect(currentValue.morality).toBeLessThanOrEqual(1);
    }

    const extreme = updateVector(createInitialVector(), {
      morality: 5,
      aggression: 5,
      curiosity: 5,
      riskTolerance: 5,
      socialAffinity: 5,
      allegiance: { guild: 5 },
    });

    expect(extreme.morality).toBeLessThanOrEqual(1);
    expect(extreme.morality).toBeGreaterThanOrEqual(-1);
    expect(extreme.aggression).toBeLessThanOrEqual(1);
    expect(extreme.aggression).toBeGreaterThanOrEqual(0);
    expect(extreme.curiosity).toBeLessThanOrEqual(1);
    expect(extreme.curiosity).toBeGreaterThanOrEqual(0);
    expect(extreme.riskTolerance).toBeLessThanOrEqual(1);
    expect(extreme.riskTolerance).toBeGreaterThanOrEqual(0);
    expect(extreme.socialAffinity).toBeLessThanOrEqual(1);
    expect(extreme.socialAffinity).toBeGreaterThanOrEqual(-1);
    expect(extreme.volatility).toBeLessThanOrEqual(1);
    expect(extreme.volatility).toBeGreaterThanOrEqual(0);
    expect(extreme.allegiance.guild).toBeLessThanOrEqual(1);
    expect(extreme.allegiance.guild).toBeGreaterThanOrEqual(-1);
  });

  it('updateVector leaves absent fields unchanged and volatility uses the documented smoothing rule', () => {
    const prev = createInitialVector();
    const impact = { morality: 1 };
    const next = updateVector(prev, impact);

    expect(next.aggression).toBe(prev.aggression);
    expect(next.curiosity).toBe(prev.curiosity);
    expect(next.riskTolerance).toBe(prev.riskTolerance);
    expect(next.socialAffinity).toBe(prev.socialAffinity);
    expect(next.volatility).toBeCloseTo(BETA_VOLATILITY * 1 + (1 - BETA_VOLATILITY) * prev.volatility, 12);
  });

  it('sigmoid, softmax, and dotProduct behave as expected', () => {
    expect(sigmoid(0)).toBeCloseTo(0.5, 12);

    const softmaxed = softmax([1, 2, 3]);
    expect(softmaxed.reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 12);
    expect(softmaxed[2]).toBeGreaterThan(softmaxed[1]);
    expect(softmaxed[1]).toBeGreaterThan(softmaxed[0]);

    const dot = dotProduct({ morality: 1, aggression: 2 }, { morality: 0.4, curiosity: 0.6 });
    expect(dot).toBeCloseTo(0.4, 12);
  });

  it('seededRange and seededChoice use the supplied RNG', () => {
    const rng = mulberry32(9);
    const range = seededRange(rng, 1, 4);
    expect(range).toBeGreaterThanOrEqual(1);
    expect(range).toBeLessThan(4);

    const values = ['a', 'b', 'c'];
    const choice = seededChoice(rng, values);
    expect(values).toContain(choice);
  });
});
