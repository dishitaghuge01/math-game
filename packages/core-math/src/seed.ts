import type { DecisionVector } from './decisionVector.js';
import { fnv1a } from './hash.js';

export function deriveSeed(vector: DecisionVector, sessionId: string, namespace: string): number {
  // JSON.stringify on objects can silently vary across construction order, so use a
  // fixed field order for deterministic seeding across equivalent vectors.
  const normalized = serializeVector(vector);
  return fnv1a(`${normalized}${sessionId}${namespace}`);
}

function serializeVector(vector: DecisionVector): string {
  const allegianceEntries = Object.entries(vector.allegiance).sort(([left], [right]) => left.localeCompare(right));
  const allegiance = allegianceEntries.map(([key, value]) => `${key}:${value}`).join(',');

  return [
    `morality:${vector.morality}`,
    `aggression:${vector.aggression}`,
    `curiosity:${vector.curiosity}`,
    `riskTolerance:${vector.riskTolerance}`,
    `socialAffinity:${vector.socialAffinity}`,
    `allegiance:${allegiance}`,
    `volatility:${vector.volatility}`,
  ].join('|');
}
