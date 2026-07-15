import type { DecisionVector } from '@math-game/core-math';
import { mulberry32 } from '@math-game/core-math';
import { StoryGrammar, toneWeights, Symbol } from './grammar.js';

export interface PlotNode {
  id: string;
  symbol: string;
  tokens: string[];
}

// Helper to build a grammar instance with a dynamic NEXT_BEAT population
function buildBaseGrammar(): StoryGrammar {
  const g = new StoryGrammar();
  // Start symbol expands to NEXT_BEAT placeholder
  g.productions.set('STORY_START', [{ tokens: ['NEXT_BEAT'], weight: 1 }]);
  return g;
}

const TONE_TO_RULES: Record<string, string[]> = {
  tragic: ['BETRAYAL', 'CONSEQUENCE'],
  triumphant: ['ALLY_WIN', 'CELEBRATION'],
  mysterious: ['DISCOVERY', 'REVELATION'],
  communal: ['GATHERING', 'ALLIANCE'],
};

export function generatePlotSkeleton(vector: DecisionVector, rng: () => number, beats = 5): PlotNode[] {
  const grammar = buildBaseGrammar();
  const nodes: PlotNode[] = [];

  for (let b = 0; b < beats; b += 1) {
    // recompute NEXT_BEAT weights per expansion
    const weights = toneWeights(vector);
    const nextRules = Object.entries(TONE_TO_RULES).map(([tone, tokens]) => ({ tokens: tokens as Symbol[], weight: weights[tone] ?? 0 }));
    grammar.productions.set('NEXT_BEAT', nextRules);

    const symbols = grammar.expand('NEXT_BEAT', rng);
    for (const sym of symbols) {
      // terminal symbols are those without productions
      if (!grammar.productions.has(sym)) {
        nodes.push({ id: `${b}-${nodes.length}`, symbol: sym, tokens: [sym] });
      }
    }
  }

  return nodes;
}
