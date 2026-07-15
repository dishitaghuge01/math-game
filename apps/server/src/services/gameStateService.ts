import { deriveSeed, mulberry32, type DecisionVector, updateVector } from '@math-game/core-math';
import { generateHeightmap } from '@math-game/world-gen';
import { generatePlotSkeleton, narrateNode, generateChoicesForNode, narrateChoice } from '@math-game/narrative-gen';
import { enemyStatsFor, lootWeights } from '@math-game/mechanics-gen';
import { SupermemoryClient } from '@math-game/memory-client';

import * as sessionStore from './sessionStore';

const HEIGHT_THRESHOLD_LOW = 0.25;
const HEIGHT_THRESHOLD_MEDIUM = 0.5;
const HEIGHT_THRESHOLD_HIGH = 0.75;

const supermemoryClient = new SupermemoryClient({
  apiKey: process.env.SUPERMEMORY_API_KEY ?? '',
  baseUrl: process.env.SUPERMEMORY_BASE_URL,
});

const SCALAR_VECTOR_FIELDS: Array<keyof Pick<DecisionVector, 'morality' | 'aggression' | 'curiosity' | 'riskTolerance' | 'socialAffinity'>> = [
  'morality',
  'aggression',
  'curiosity',
  'riskTolerance',
  'socialAffinity',
];

/**
 * Resolve choice impact server-side by deterministically regenerating the choice list
 * using the session's current vector state. This ensures the client never supplies impact values.
 */
export function resolveChoiceImpact(sessionId: string, narrativeNodeId: string, choiceId: string): Partial<Pick<DecisionVector, 'morality' | 'aggression' | 'curiosity' | 'riskTolerance' | 'socialAffinity'>> {
  const session = sessionStore.getOrCreateSession(sessionId, sessionId);
  let nodeIndex = session.nodeIndex;

  // Parse node index from narrativeNodeId (format: "{sessionId}:{nodeIndex}")
  const match = narrativeNodeId.match(new RegExp(`^${escapeRegExp(sessionId)}:(\\d+)$`));
  if (!match) {
    throw new Error(`Invalid narrativeNodeId format: ${narrativeNodeId}. Expected "{sessionId}:{nodeIndex}".`);
  }
  nodeIndex = Number(match[1]);

  // Regenerate choices deterministically using the CURRENT session vector
  // (before this decision is applied — this is crucial for reproducibility)
  const choicesSeed = deriveSeed(session.vector, sessionId, `narrative:node:${nodeIndex}:choices`);
  const beats = generatePlotSkeleton(session.vector, mulberry32(choicesSeed), nodeIndex + 1);
  const node = beats[beats.length - 1];

  if (!node) {
    throw new Error(`Could not generate plot node at index ${nodeIndex}`);
  }

  const options = generateChoicesForNode(node, mulberry32(choicesSeed), 3);
  const option = options.find((o) => o.id === choiceId);

  if (!option) {
    throw new Error(`Unknown choiceId "${choiceId}" for narrativeNodeId "${narrativeNodeId}". Valid options: ${options.map((o) => o.id).join(', ')}`);
  }

  return option.impact;
}

export async function applyDecision(
  sessionId: string,
  userId: string,
  choiceId: string,
  choiceLabel: string,
  narrativeNodeId: string,
): Promise<{ vector: DecisionVector; vectorDelta: Partial<DecisionVector>; allegianceDelta: Record<string, number>; nextNodeId: string }> {
  // Resolve impact server-side from (seed, node, choiceId)
  const scalarImpact = resolveChoiceImpact(sessionId, narrativeNodeId, choiceId);
  
  // Choices only affect scalar fields; allegiance is never influenced by choices
  const impact: Partial<DecisionVector> = {
    ...scalarImpact,
    allegiance: {},
  };

  const session = sessionStore.getOrCreateSession(sessionId, userId);
  const prevVector = session.vector;
  const nextVector = updateVector(prevVector, impact);
  sessionStore.updateSession(sessionId, nextVector);

  const vectorDelta: Partial<DecisionVector> = {};
  for (const field of SCALAR_VECTOR_FIELDS) {
    if (Object.prototype.hasOwnProperty.call(impact, field)) {
      vectorDelta[field] = nextVector[field] - prevVector[field];
    }
  }

  const allegianceDelta: Record<string, number> = {};
  for (const [factionId, impactValue] of Object.entries(impact.allegiance ?? {})) {
    const prevValue = prevVector.allegiance[factionId] ?? 0;
    const nextValue = nextVector.allegiance[factionId] ?? 0;
    allegianceDelta[factionId] = nextValue - prevValue;
    if (impactValue === undefined) {
      continue;
    }
  }

  void supermemoryClient.addMemory(userId, {
    type: 'decision',
    userId,
    sessionId,
    timestamp: new Date().toISOString(),
    choiceId,
    choiceLabel,
    narrativeNodeId,
    vectorSnapshot: nextVector,
    impact,
  }).catch((error: unknown) => {
    console.error('Failed to persist decision memory', error);
  });

  const nodeIndex = sessionStore.incrementNodeIndex(sessionId);
  const seed = deriveSeed(nextVector, sessionId, `narrative:node:${nodeIndex}`);
  const nextNode = generatePlotSkeleton(nextVector, mulberry32(seed), 1)[0];

  return {
    vector: nextVector,
    vectorDelta,
    allegianceDelta,
    nextNodeId: nextNode?.id ?? `${sessionId}:${nodeIndex}`,
  };
}

export function generateWorldChunk(sessionId: string, chunkId: string): {
  grid: number[][];
  revealed: boolean[][];
  locationName: string;
  currentPosition: { row: number; col: number };
} {
  // TODO: proper userId threading is a Phase 10 concern once auth exists.
  const session = sessionStore.getOrCreateSession(sessionId, sessionId);
  const seed = deriveSeed(session.vector, sessionId, `world:chunk:${chunkId}`);
  const heights = generateHeightmap(seed, 16, 16, {
    width: 16,
    height: 16,
    riskTolerance: session.vector.riskTolerance,
    volatility: session.vector.volatility,
    curiosity: session.vector.curiosity,
  });

  const grid = heights.map((row: number[]) => row.map(quantizeHeight));
  const revealed = Array.from({ length: 16 }, (_, row) => Array.from({ length: 16 }, (_, col) => Math.abs(row - 8) + Math.abs(col - 8) < 5));

  return {
    grid,
    revealed,
    locationName: chunkId,
    currentPosition: { row: 8, col: 8 },
  };
}

export async function generateNarrativeNode(
  sessionId: string,
  nodeId: string,
): Promise<{ narrative: string; choices: Array<{ id: string; label: string; description: string }> }> {
  // TODO: proper userId threading is a Phase 10 concern once auth exists.
  const session = sessionStore.getOrCreateSession(sessionId, sessionId);
  let nodeIndex = session.nodeIndex;

  const match = nodeId.match(new RegExp(`^${escapeRegExp(sessionId)}:(\\d+)$`));
  if (!match) {
    console.warn(`Could not parse node index from ${nodeId}; defaulting to ${session.nodeIndex}`);
  } else {
    nodeIndex = Number(match[1]);
  }

  const seed = deriveSeed(session.vector, sessionId, `narrative:node:${nodeIndex}`);
  const beats = generatePlotSkeleton(session.vector, mulberry32(seed), nodeIndex + 1);
  const node = beats[beats.length - 1];

  const memory = await supermemoryClient.search(sessionId, node?.symbol ?? 'story', 5).catch(() => []);
  const prose = await narrateNode(
    node ?? { id: `${sessionId}:${nodeIndex}`, symbol: 'STORY', tokens: [] },
    memory,
    session.vector,
  );

  // Generate choices deterministically from (node, vector, rng)
  const choicesSeed = deriveSeed(session.vector, sessionId, `narrative:node:${nodeIndex}:choices`);
  const choiceOptions = generateChoicesForNode(
    node ?? { id: `${sessionId}:${nodeIndex}`, symbol: 'STORY', tokens: [] },
    mulberry32(choicesSeed),
    3,
  );

  // Narrate each choice option (flavor text only — archetype is tone hint, not part of response)
  const narratedChoices = await Promise.all(
    choiceOptions.map((option) =>
      narrateChoice(
        node ?? { id: `${sessionId}:${nodeIndex}`, symbol: 'STORY', tokens: [] },
        option.archetype,
        session.vector,
      ),
    ),
  );

  const choices = choiceOptions.map((option, i) => ({
    id: option.id,
    label: narratedChoices[i].label,
    description: narratedChoices[i].description,
  }));

  return {
    narrative: prose,
    choices,
  };
}

export function getMechanicsPayload(sessionId: string, baseDifficulty: number): { enemyStats: { health: number; count: number }; lootWeights: Record<string, number> } {
  const session = sessionStore.getOrCreateSession(sessionId, sessionId);
  return {
    enemyStats: enemyStatsFor(session.vector, baseDifficulty),
    lootWeights: lootWeights(session.vector),
  };
}

function quantizeHeight(value: number): number {
  if (value < HEIGHT_THRESHOLD_LOW) {
    return 0;
  }
  if (value < HEIGHT_THRESHOLD_MEDIUM) {
    return 1;
  }
  if (value < HEIGHT_THRESHOLD_HIGH) {
    return 2;
  }
  return 3;
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
