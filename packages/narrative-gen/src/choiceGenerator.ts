import type { DecisionVector } from '@math-game/core-math';
import { CHOICE_ARCHETYPE_IMPACT } from '@math-game/core-math';
import type { PlotNode } from './plotSkeleton.js';

export interface ChoiceOption {
  id: string;
  archetype: keyof typeof CHOICE_ARCHETYPE_IMPACT;
  impact: Partial<Pick<DecisionVector, 'morality' | 'aggression' | 'curiosity' | 'riskTolerance' | 'socialAffinity'>>;
}

/**
 * Fisher-Yates shuffle using the provided RNG to deterministically select
 * a subset of archetypes without repeats.
 */
function shuffleArray<T>(arr: T[], rng: () => number): T[] {
  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

export function generateChoicesForNode(node: PlotNode, rng: () => number, count = 3): ChoiceOption[] {
  const archetypes = Object.keys(CHOICE_ARCHETYPE_IMPACT) as Array<keyof typeof CHOICE_ARCHETYPE_IMPACT>;
  const shuffled = shuffleArray(archetypes, rng);
  const selected = shuffled.slice(0, Math.min(count, archetypes.length));

  return selected.map((archetype) => ({
    id: `${node.id}:${archetype}`,
    archetype,
    impact: CHOICE_ARCHETYPE_IMPACT[archetype],
  }));
}
