export interface DecisionMemory {
  type: 'decision';
  userId: string;
  sessionId: string;
  timestamp: string;
  choiceId: string;
  choiceLabel: string;
  narrativeNodeId: string;
  vectorSnapshot: {
    morality: number;
    aggression: number;
    curiosity: number;
    riskTolerance: number;
    socialAffinity: number;
    volatility: number;
    allegiance: Record<string, unknown>;
  };
  impact: Record<string, unknown>;
}

export interface NPCRelationshipMemory {
  type: 'npc_relationship';
  userId: string;
  sessionId: string;
  timestamp: string;
  npcId: string;
  npcName: string;
  relationshipScore: number;
  lastInteractionSummary: string;
}

export interface PlotThreadMemory {
  type: 'plot_thread';
  userId: string;
  sessionId: string;
  timestamp: string;
  threadId: string;
  title: string;
  status: 'open' | 'resolved' | 'abandoned';
  summary: string;
}

export type GameMemory = DecisionMemory | NPCRelationshipMemory | PlotThreadMemory;

export interface MemorySnippet {
  content: string;
  score: number;
  documentId: string;
  metadata: Record<string, string | number | boolean>;
  createdAt: string;
}
