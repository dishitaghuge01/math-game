import { sigmoid } from '@math-game/core-math';
import { SIGMOID_STEEPNESS } from '@math-game/core-math';
import type { DecisionVector } from '@math-game/core-math';

export interface EnemyStats {
  health: number;
  count: number;
}

export function enemyStatsFor(vector: DecisionVector, baseDifficulty: number): EnemyStats {
  const aggressionBoost = 1 + 0.6 * sigmoid(SIGMOID_STEEPNESS * (vector.aggression - 0.5));
  const health = Math.max(baseDifficulty * aggressionBoost, 1);
  const count = Math.max(Math.round(baseDifficulty * (1 + 0.4 * vector.aggression)), 1);

  return {
    health,
    count,
  };
}
