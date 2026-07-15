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
  const testUserId = 'integration-test-user';

  afterAll(async () => {
    // No cleanup required for the live service in this phase.
  });

  async function fetchStoredDocument(documentId: string): Promise<{ customId?: string; containerTags?: string[]; content?: string }> {
    const response = await fetch(`${baseUrl}/v3/documents/${documentId}`, {
      headers: {
        Authorization: `Bearer ${apiKey}`,
      },
    });

    expect(response.ok).toBe(true);
    return response.json() as Promise<{ customId?: string; containerTags?: string[]; content?: string }>;
  }

  it('writes memories to Supermemory and can search existing indexed content', async () => {
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
    const decisionStored = await fetchStoredDocument(decisionWrite.id);
    expect(decisionStored.customId).toContain(decisionToken);
    expect(decisionStored.containerTags).toContain(`user_${testUserId}`);
    expect(decisionStored.content).toContain(decisionToken);

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
    const npcStored = await fetchStoredDocument(npcWrite.id);
    expect(npcStored.customId).toContain(npcToken);
    expect(npcStored.containerTags).toContain(`user_${testUserId}`);
    expect(npcStored.content).toContain(npcToken);

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
    const plotStored = await fetchStoredDocument(plotWrite.id);
    expect(plotStored.customId).toContain(plotToken);
    expect(plotStored.containerTags).toContain(`user_${testUserId}`);
    expect(plotStored.content).toContain(plotToken);

    const searchResults = await client.search(testUserId, 'NPC Mira', 5);
    expect(searchResults.some((snippet) => snippet.content.includes('NPC Mira'))).toBe(true);
  }, 120_000);
});
