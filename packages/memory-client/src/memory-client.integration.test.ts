import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { config } from 'dotenv';

import { SupermemoryClient } from './index';
import type { DecisionMemory, NPCRelationshipMemory, PlotThreadMemory } from './index';

config({ path: resolve(fileURLToPath(new URL('../../../.env', import.meta.url))) });

const apiKey = process.env.SUPERMEMORY_API_KEY;
const baseUrl = process.env.SUPERMEMORY_BASE_URL ?? 'http://localhost:6767';

describe('SupermemoryClient integration', () => {
  if (!apiKey) {
    console.info('Skipping Supermemory integration tests because SUPERMEMORY_API_KEY is not set.');
    return;
  }

  const client = new SupermemoryClient({ apiKey, baseUrl });
  const testUserId = `integration-user-${Date.now()}`;

  afterAll(async () => {
    // No cleanup required for the live service in this phase.
  });

  async function waitForIndexedMemory(query: string, expectedFragment: string) {
    const startedAt = Date.now();
    while (Date.now() - startedAt < 20_000) {
      const matches = await client.search(testUserId, query, 5);
      const indexed = matches.find((snippet) => snippet.content.includes(expectedFragment));
      if (indexed) {
        return indexed;
      }

      await new Promise((resolve) => setTimeout(resolve, 1500));
    }

    throw new Error('memory not indexed within 20s');
  }

  it('round-trips decision, NPC relationship, and plot thread memories', async () => {
    const decisionToken = `decision-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const npcToken = `npc-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    const plotToken = `plot-${Date.now()}-${Math.random().toString(16).slice(2)}`;

    const decisionMemory: DecisionMemory = {
      type: 'decision',
      userId: testUserId,
      sessionId: `session-${decisionToken}`,
      timestamp: new Date().toISOString(),
      choiceId: `choice-${decisionToken}`,
      choiceLabel: `Decision ${decisionToken}`,
      narrativeNodeId: `node-${decisionToken}`,
      vectorSnapshot: {
        morality: -0.1,
        aggression: 0.2,
        curiosity: 0.3,
        riskTolerance: 0.4,
        socialAffinity: 0.5,
        volatility: 0.6,
        allegiance: { faction: 'guild' },
      },
      impact: { outcome: 'branch' },
    };

    const decisionWrite = await client.addMemory(testUserId, decisionMemory);
    const decisionMatch = await waitForIndexedMemory(decisionToken, decisionToken);
    expect(decisionMatch.documentId).toBe(decisionWrite.id);
    expect(decisionMatch.content).toContain(decisionToken);
    expect(decisionMatch.content).toContain('narrative node');

    const npcMemory: NPCRelationshipMemory = {
      type: 'npc_relationship',
      userId: testUserId,
      sessionId: `session-${npcToken}`,
      timestamp: new Date().toISOString(),
      npcId: `npc-${npcToken}`,
      npcName: `Mira ${npcToken}`,
      relationshipScore: 0.75,
      lastInteractionSummary: `Relationship pulse ${npcToken}`,
    };

    const npcWrite = await client.addMemory(testUserId, npcMemory);
    const npcMatch = await waitForIndexedMemory(npcToken, npcToken);
    expect(npcMatch.documentId).toBe(npcWrite.id);
    expect(npcMatch.content).toContain(npcToken);
    expect(npcMatch.content).toContain('relationship');

    const plotMemory: PlotThreadMemory = {
      type: 'plot_thread',
      userId: testUserId,
      sessionId: `session-${plotToken}`,
      timestamp: new Date().toISOString(),
      threadId: `thread-${plotToken}`,
      title: `Thread ${plotToken}`,
      status: 'open',
      summary: `Plot arc ${plotToken}`,
    };

    const plotWrite = await client.addMemory(testUserId, plotMemory);
    const plotMatch = await waitForIndexedMemory(plotToken, plotToken);
    expect(plotMatch.documentId).toBe(plotWrite.id);
    expect(plotMatch.content).toContain(plotToken);
    expect(plotMatch.content).toContain('plot');
  }, 90_000);
});
