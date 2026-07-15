import type { PlotNode } from './plotSkeleton.js';
import type { DecisionVector } from '@math-game/core-math';
import type { MemorySnippet } from '@math-game/memory-client';

function formatVector(v: DecisionVector): string {
  const parts: string[] = [];
  const morality = v.morality;
  const moralityLabel = morality <= -0.5 ? 'cruel-leaning' : morality >= 0.5 ? 'kind-leaning' : 'neutral-leaning';
  parts.push(`morality: ${moralityLabel} (${morality.toFixed(2)})`);
  parts.push(`aggression: ${v.aggression.toFixed(2)}`);
  parts.push(`curiosity: ${v.curiosity.toFixed(2)}`);
  parts.push(`riskTolerance: ${v.riskTolerance.toFixed(2)}`);
  const socialLabel = v.socialAffinity <= -0.5 ? 'loner-leaning' : v.socialAffinity >= 0.5 ? 'ally-leaning' : 'neutral-social';
  parts.push(`socialAffinity: ${socialLabel} (${v.socialAffinity.toFixed(2)})`);
  parts.push(`volatility: ${v.volatility.toFixed(2)}`);
  return parts.join(', ');
}

export function buildNarrationPrompt(node: PlotNode, memory: MemorySnippet[], vector: DecisionVector): string {
  const header = `Narration task — node: ${node.symbol}\nTokens: ${node.tokens.join(' ')}\n`;
  const vectorSummary = `Player state summary: ${formatVector(vector)}.`;

  const memorySection = memory && memory.length > 0
    ? `Relevant memory/context:\n${memory.map((m) => `- ${m.content}`).join('\n')}`
    : 'Relevant memory/context: (none)';

  const instruction = [
    'Instructions:',
    '- Produce only prose narration for the tokens listed above (the node).',
    "- Do NOT invent new plot beats, character fates, or outcomes beyond what's encoded in the node's tokens.",
    '- Do NOT contradict the memory snippets above; respect them as authoritative context.',
    '- Write in third-person, present-tense, concise paragraphs (one paragraph per token).',
  ].join('\n');

  return [header, vectorSummary, '', memorySection, '', instruction, '', 'Narration:'].join('\n');
}

export function buildChoiceNarrationPrompt(node: PlotNode, archetype: string, vector: DecisionVector): string {
  const header = `Choice narration task — node: ${node.symbol}, tone: ${archetype}\nNode tokens: ${node.tokens.join(' ')}\n`;
  const vectorSummary = `Player state summary: ${formatVector(vector)}.`;

  const instruction = [
    'Instructions:',
    `Produce only a short label (2-4 words, ALL_CAPS_WITH_UNDERSCORES style matching existing UI choices like TRUST_THE_SIGNAL) and a one-sentence description for a player choice with tone '${archetype}'.`,
    "Do NOT invent plot facts beyond the node's tokens.",
    'Return strictly as JSON: {"label": "...", "description": "..."}.',
  ].join('\n');

  return [header, vectorSummary, '', instruction, '', 'Response:'].join('\n');
}

export default buildNarrationPrompt;
