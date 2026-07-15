// Temporary in-memory session state ONLY — Phase 11 replaces this with Postgres/SQLite.
import { createInitialVector, type DecisionVector } from '@math-game/core-math';

export interface SessionState {
  vector: DecisionVector;
  nodeIndex: number;
  userId: string;
}

const sessions = new Map<string, SessionState>();

export function getOrCreateSession(sessionId: string, userId: string): SessionState {
  const existing = sessions.get(sessionId);
  if (existing) {
    return existing;
  }

  const state: SessionState = {
    vector: createInitialVector(),
    nodeIndex: 0,
    userId,
  };
  sessions.set(sessionId, state);
  return state;
}

export function updateSession(sessionId: string, vector: DecisionVector): void {
  const session = sessions.get(sessionId);
  if (!session) {
    return;
  }

  session.vector = vector;
}

export function incrementNodeIndex(sessionId: string): number {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} was not found`);
  }

  session.nodeIndex += 1;
  return session.nodeIndex;
}
