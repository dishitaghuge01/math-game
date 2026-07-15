import type { DecisionVector } from './decisionVector';

export const ALPHA_SMOOTHING = 0.20;
export const BETA_VOLATILITY = 0.30;
export const SIGMOID_STEEPNESS = 6;

export const PALETTE_BASE_HUE = 220;
export const PALETTE_MORALITY_HUE_WEIGHT = 140;
export const PALETTE_BASE_SATURATION = 40;
export const PALETTE_AGGRESSION_SATURATION_WEIGHT = 40;
export const PALETTE_BASE_LIGHTNESS = 45;
export const PALETTE_VOLATILITY_LIGHTNESS_WEIGHT = 20;
export const PALETTE_ACCENT_HUE_OFFSET = 40;
export const PALETTE_CURIOSITY_HUE_SWEEP = 80;
export const PALETTE_SECOND_ACCENT_HUE_OFFSET = 70;
export const PALETTE_MIN_SATURATION = 25;
export const PALETTE_SECOND_MIN_SATURATION = 30;
export const PALETTE_LIGHTNESS_INCREMENT = 15;
export const PALETTE_LIGHTNESS_DECREMENT = 10;
export const PALETTE_SATURATION_DECREMENT = 10;
export const PALETTE_SECOND_SATURATION_DECREMENT = 5;
export const PALETTE_MAX_LIGHTNESS = 85;
export const PALETTE_MIN_LIGHTNESS = 20;
export const PALETTE_HUE_WRAP = 360;

export const W_LOOT: Record<string, Partial<Record<keyof DecisionVector, number>>> = {
  common: {
    morality: 0,
    aggression: -0.2,
    curiosity: 0,
    riskTolerance: -0.5,
  },
  rare: {
    morality: 0,
    aggression: 0.1,
    curiosity: 0.3,
    riskTolerance: 0.2,
  },
  legendary: {
    morality: 0.2,
    aggression: 0.3,
    curiosity: 0.4,
    riskTolerance: 0.7,
  },
};

export const W_TONE: Record<string, Partial<Record<keyof DecisionVector, number>>> = {
  tragic: {
    morality: -0.6,
    volatility: 0.4,
  },
  triumphant: {
    morality: 0.5,
    aggression: 0.3,
  },
  mysterious: {
    curiosity: 0.7,
    socialAffinity: -0.3,
  },
  communal: {
    socialAffinity: 0.6,
    morality: 0.2,
  },
};

export const CHOICE_ARCHETYPE_IMPACT: Record<
  string,
  Partial<Pick<DecisionVector, 'morality' | 'aggression' | 'curiosity' | 'riskTolerance' | 'socialAffinity'>>
> = {
  cruel: { morality: -0.6, aggression: 0.2 },
  kind: { morality: 0.6, socialAffinity: 0.2 },
  risky: { riskTolerance: 0.6, aggression: 0.2 },
  cautious: { riskTolerance: -0.6, curiosity: -0.1 },
  social: { socialAffinity: 0.6, curiosity: 0.1 },
  solo: { socialAffinity: -0.6, riskTolerance: 0.1 },
};
