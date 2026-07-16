import db from './db.js';
import { createInitialVector, type DecisionVector } from '@math-game/core-math';

export interface SessionRecord {
  sessionId: string;
  userId: string;
  createdAt: string;
}

export function saveSession(sessionId: string, userId: string): void {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT OR IGNORE INTO sessions (session_id, user_id, created_at)
    VALUES (?, ?, ?)
  `).run(sessionId, userId, createdAt);
}

export function saveVectorSnapshot(sessionId: string, nodeIndex: number, vector: DecisionVector): void {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT INTO vector_history (session_id, node_index, vector_json, created_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, nodeIndex, JSON.stringify(vector), createdAt);
}

export function saveNarration(sessionId: string, nodeIndex: number, narrative: string): void {
  const createdAt = new Date().toISOString();
  db.prepare(`
    INSERT OR REPLACE INTO narration_history (session_id, node_index, narrative, created_at)
    VALUES (?, ?, ?, ?)
  `).run(sessionId, nodeIndex, narrative, createdAt);
}

export function loadPreviousNarration(sessionId: string, nodeIndex: number): string | null {
  const row = db.prepare(`
    SELECT narrative
    FROM narration_history
    WHERE session_id = ? AND node_index = ?
    LIMIT 1
  `).get(sessionId, nodeIndex - 1) as { narrative: string } | undefined;

  if (!row) {
    return null;
  }

  return row.narrative;
}

export function loadVectorAtNodeIndex(sessionId: string, nodeIndex: number): DecisionVector | null {
  const row = db.prepare(`
    SELECT vector_json
    FROM vector_history
    WHERE session_id = ? AND node_index = ?
    ORDER BY id DESC
    LIMIT 1
  `).get(sessionId, nodeIndex) as { vector_json: string } | undefined;

  if (!row) {
    return null;
  }

  return JSON.parse(row.vector_json) as DecisionVector;
}

export function loadLatestVector(sessionId: string): DecisionVector | null {
  const row = db.prepare(`
    SELECT vector_json
    FROM vector_history
    WHERE session_id = ?
    ORDER BY node_index DESC, id DESC
    LIMIT 1
  `).get(sessionId) as { vector_json: string } | undefined;

  if (!row) {
    return null;
  }

  return JSON.parse(row.vector_json) as DecisionVector;
}

export function loadNodeIndex(sessionId: string): number {
  const row = db.prepare(`
    SELECT MAX(node_index) AS max_node_index
    FROM vector_history
    WHERE session_id = ?
  `).get(sessionId) as { max_node_index: number | null } | undefined;

  return row?.max_node_index ?? 0;
}

export function getInitialVectorForSession(sessionId: string, userId: string): { vector: DecisionVector; nodeIndex: number; userId: string; isNewSession: boolean } {
  saveSession(sessionId, userId);

  const persistedVector = loadLatestVector(sessionId);
  const persistedNodeIndex = loadNodeIndex(sessionId);

  if (persistedVector) {
    return { vector: persistedVector, nodeIndex: persistedNodeIndex, userId, isNewSession: false };
  }

  return { vector: createInitialVector(), nodeIndex: 0, userId, isNewSession: true };
}
