// In-memory cache over SQLite-backed persistence so restarts can resume sessions.
import { createInitialVector, type DecisionVector } from '@math-game/core-math';
import { getInitialVectorForSession, saveSession, saveVectorSnapshot } from '../persistence/sessionRepository.js';

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

  const persisted = getInitialVectorForSession(sessionId, userId);
  const state: SessionState = {
    vector: persisted.vector,
    nodeIndex: persisted.nodeIndex,
    userId: persisted.userId,
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
  saveSession(sessionId, session.userId);
  saveVectorSnapshot(sessionId, session.nodeIndex, vector);
}

export function incrementNodeIndex(sessionId: string): number {
  const session = sessions.get(sessionId);
  if (!session) {
    throw new Error(`Session ${sessionId} was not found`);
  }

  session.nodeIndex += 1;
  return session.nodeIndex;
}
