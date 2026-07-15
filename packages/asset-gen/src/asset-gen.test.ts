import { describe, expect, it } from 'vitest';
import { createInitialVector, type DecisionVector } from '@math-game/core-math';
import { paletteFromVector } from './palette';
import { generateSpriteSVG } from './sprite';
import { LSystem } from './lsystem';

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

describe('asset-gen', () => {
  it('is deterministic for palette, sprite, and l-system inputs', () => {
    const vector = makeVector({ morality: 0.4, aggression: 0.6, curiosity: 0.3, riskTolerance: 0.5, socialAffinity: 0.2, volatility: 0.8 });
    const paletteA = paletteFromVector(vector);
    const paletteB = paletteFromVector(vector);
    expect(paletteA).toEqual(paletteB);

    const spriteA = generateSpriteSVG(1234, 'enemy', paletteA);
    const spriteB = generateSpriteSVG(1234, 'enemy', paletteA);
    expect(spriteA).toEqual(spriteB);

    const lSystemA = new LSystem('A', new Map([['A', 'AB'], ['B', 'A']]));
    const lSystemB = new LSystem('A', new Map([['A', 'AB'], ['B', 'A']]));
    expect(lSystemA.generate(4)).toEqual(lSystemB.generate(4));
  });

  it('produces a valid svg string and a non-empty palette', () => {
    const vector = createInitialVector();
    const palette = paletteFromVector(vector);
    expect(palette.length).toBeGreaterThan(0);

    const sprite = generateSpriteSVG(7, 'item', palette);
    expect(sprite.startsWith('<svg')).toBe(true);
  });
});
