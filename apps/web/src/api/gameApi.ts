import { getOrCreateClientIds } from "./session";

const BASE_URL =
  (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:4000";

export interface DecisionVector {
  morality: number;
  aggression: number;
  curiosity: number;
  riskTolerance: number;
  socialAffinity: number;
  allegiance: Record<string, number>;
}

export interface NarrativeChoice {
  id: string;
  label: string;
  description: string;
}

export interface NarrativeNode {
  narrative: string;
  choices: NarrativeChoice[];
}

export interface DecisionResponse {
  vector: DecisionVector;
  vectorDelta: Partial<DecisionVector>;
  allegianceDelta: Record<string, number>;
  nextNodeId: string;
}

export interface WorldChunk {
  grid: number[][];
  revealed: boolean[][];
  locationName: string;
  currentPosition: { row: number; col: number };
}

export interface MechanicsResponse {
  enemyStats: { health: number; count: number };
  lootWeights: Record<string, number>;
}

export interface PaletteResponse {
  palette: string[];
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
  });
  if (!res.ok) {
    let body: unknown = null;
    try {
      body = await res.json();
    } catch {}
    const message =
      body && typeof body === "object" && "error" in body
        ? String((body as { error: unknown }).error)
        : `Request failed: ${res.status}`;
    const err = new Error(message) as Error & { status?: number };
    err.status = res.status;
    throw err;
  }
  return (await res.json()) as T;
}

export function bootstrapNodeId(): string {
  const { sessionId } = getOrCreateClientIds();
  return `${sessionId}:0`;
}

export async function fetchNarrative(nodeId: string): Promise<NarrativeNode> {
  const { sessionId } = getOrCreateClientIds();
  const q = new URLSearchParams({ sessionId });
  return request<NarrativeNode>(
    `/generate/narrative/${encodeURIComponent(nodeId)}?${q.toString()}`,
  );
}

export async function postDecision(args: {
  choiceId: string;
  choiceLabel: string;
  narrativeNodeId: string;
}): Promise<DecisionResponse> {
  const { sessionId, userId } = getOrCreateClientIds();
  return request<DecisionResponse>(`/decision`, {
    method: "POST",
    body: JSON.stringify({ sessionId, userId, ...args }),
  });
}

export async function fetchWorld(chunkId: string): Promise<WorldChunk> {
  const { sessionId } = getOrCreateClientIds();
  const q = new URLSearchParams({ sessionId });
  return request<WorldChunk>(
    `/generate/world/${encodeURIComponent(chunkId)}?${q.toString()}`,
  );
}

export async function fetchMechanics(baseDifficulty = 1): Promise<MechanicsResponse> {
  const { sessionId } = getOrCreateClientIds();
  const q = new URLSearchParams({ sessionId, baseDifficulty: String(baseDifficulty) });
  return request<MechanicsResponse>(`/generate/mechanics?${q.toString()}`);
}

export async function fetchPalette(): Promise<PaletteResponse> {
  const { sessionId } = getOrCreateClientIds();
  const q = new URLSearchParams({ sessionId });
  return request<PaletteResponse>(`/generate/palette?${q.toString()}`);
}
