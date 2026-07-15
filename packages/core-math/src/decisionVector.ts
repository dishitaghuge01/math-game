import { ALPHA_SMOOTHING, BETA_VOLATILITY } from './constants.js';

export interface DecisionVector {
  morality: number;
  aggression: number;
  curiosity: number;
  riskTolerance: number;
  socialAffinity: number;
  allegiance: Record<string, number>;
  volatility: number;
}

export function createInitialVector(): DecisionVector {
  return {
    morality: 0,
    aggression: 0.3,
    curiosity: 0.5,
    riskTolerance: 0.4,
    socialAffinity: 0,
    allegiance: {},
    volatility: 0,
  };
}

export function updateVector(prev: DecisionVector, impact: Partial<DecisionVector>): DecisionVector {
  const scalarFields = ['morality', 'aggression', 'curiosity', 'riskTolerance', 'socialAffinity'] as const;
  const next: DecisionVector = {
    morality: prev.morality,
    aggression: prev.aggression,
    curiosity: prev.curiosity,
    riskTolerance: prev.riskTolerance,
    socialAffinity: prev.socialAffinity,
    allegiance: {},
    volatility: prev.volatility,
  };

  for (const field of scalarFields) {
    if (Object.prototype.hasOwnProperty.call(impact, field)) {
      const impactValue = impact[field] as number;
      const previousValue = prev[field];
      next[field] = clampForField(field, ALPHA_SMOOTHING * impactValue + (1 - ALPHA_SMOOTHING) * previousValue);
    } else {
      next[field] = prev[field];
    }
  }

  const nextAllegiance: Record<string, number> = { ...prev.allegiance };
  for (const [factionId, impactValue] of Object.entries(impact.allegiance ?? {})) {
    const previousValue = prev.allegiance[factionId] ?? 0;
    nextAllegiance[factionId] = clampForField('allegiance', ALPHA_SMOOTHING * impactValue + (1 - ALPHA_SMOOTHING) * previousValue);
  }
  next.allegiance = nextAllegiance;

  const presentScalarFields = scalarFields.filter((field) => Object.prototype.hasOwnProperty.call(impact, field));
  const meanAbsDiff = presentScalarFields.length === 0
    ? 0
    : presentScalarFields.reduce((sum, field) => sum + Math.abs((impact[field] as number) - prev[field]), 0) / presentScalarFields.length;

  next.volatility = clampForField('volatility', BETA_VOLATILITY * meanAbsDiff + (1 - BETA_VOLATILITY) * prev.volatility);

  return next;
}

function clampForField(field: keyof DecisionVector | 'allegiance', value: number): number {
  switch (field) {
    case 'morality':
    case 'socialAffinity':
      return clamp(value, -1, 1);
    case 'aggression':
    case 'curiosity':
    case 'riskTolerance':
    case 'volatility':
      return clamp(value, 0, 1);
    case 'allegiance':
      return clamp(value, -1, 1);
    default:
      return clamp(value, -1, 1);
  }
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
