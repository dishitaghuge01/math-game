import type { DecisionVector } from './decisionVector.js';

export const ALPHA_SMOOTHING = 0.20;
export const BETA_VOLATILITY = 0.30;
export const SIGMOID_STEEPNESS = 6;

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
