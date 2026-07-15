import { dotProduct, softmax } from '@math-game/core-math';
import { W_LOOT } from '@math-game/core-math';
import type { DecisionVector } from '@math-game/core-math';

export function lootWeights(vector: DecisionVector): Record<string, number> {
  const tiers = Object.keys(W_LOOT);
  const scores = tiers.map((tier) => dotProduct(W_LOOT[tier] as Record<string, number>, vector as unknown as Record<string, number>));
  const weights = softmax(scores);

  return tiers.reduce<Record<string, number>>((result, tier, index) => {
    result[tier] = weights[index];
    return result;
  }, {});
}
