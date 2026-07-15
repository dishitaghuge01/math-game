import type { DecisionVector } from '@math-game/core-math';
import { softmax, dotProduct } from '@math-game/core-math';

export type Symbol = string;

export interface WeightedRule {
  tokens: Symbol[];
  weight: number;
}

export class StoryGrammar {
  productions: Map<Symbol, WeightedRule[]>;

  constructor(productions?: Iterable<[Symbol, WeightedRule[]]>) {
    this.productions = new Map(productions ?? []);
  }

  // Expand picks a weighted rule using rng according to the spec in math-model.md
  expand(symbol: Symbol, rng: () => number): Symbol[] {
    const rules = this.productions.get(symbol) ?? [];
    const total = rules.reduce((s, r) => s + r.weight, 0);
    let roll = rng() * total;
    for (const rule of rules) {
      roll -= rule.weight;
      if (roll <= 0) return rule.tokens.slice();
    }
    return rules.length > 0 ? rules[rules.length - 1].tokens.slice() : [];
  }
}

export function toneWeights(vector: DecisionVector): Record<string, number> {
  const { W_TONE } = require('@math-game/core-math');

  const toneKeys = Object.keys(W_TONE);
  const scores = toneKeys.map((tone) => dotProduct(W_TONE[tone] as Record<string, number>, vector as unknown as Record<string, number>));
  const weights = softmax(scores);
  const result: Record<string, number> = {};
  for (let i = 0; i < toneKeys.length; i += 1) {
    result[toneKeys[i]] = weights[i];
  }
  return result;
}
