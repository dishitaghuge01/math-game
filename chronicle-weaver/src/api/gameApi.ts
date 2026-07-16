import { getOrCreateClientIds, resetClientIds } from "./session";

const BASE_URL = (import.meta.env.VITE_SERVER_URL as string | undefined) ?? "http://localhost:4000";

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

export interface ExpeditionState {
  expeditionId: string;
  worldSeed: number;
  party: Array<{
    role: "fighter" | "mage" | "support";
    name: string;
    motive: string;
    portrait: string;
    health: number;
    maxHealth: number;
    abilities: string[];
    bond: number;
  }>;
  traits: Record<
    "mercy" | "resolve" | "curiosity" | "defiance" | "kinship",
    { tier: string; recentShift: string }
  >;
  majorDecisionResolved: boolean;
  ending: { title: string; summary: string } | null;
  combat: {
    status: "active" | "victory" | "defeat";
    enemy: { name: string; health: number; maxHealth: number };
    activeMemberRole: "fighter" | "mage" | "support";
    log: string[];
  } | null;
  region: {
    name: string;
    currentLocationId: string;
    locations: Array<{
      id: string;
      name: string;
      type: "camp" | "combat" | "discovery" | "social" | "landmark";
      connectedTo: string[];
      revealed: boolean;
    }>;
  };
}

export interface RpgCombat {
  player: { name: string; health: number; maxHealth: number; attack: number };
  enemy: { name: string; health: number; maxHealth: number; attack: number };
  potions: number;
  status: "active" | "victory" | "defeat";
}

export interface RpgGameState {
  grid: number[][];
  revealed: boolean[][];
  position: { row: number; col: number };
  gold: number;
  experience: number;
  combat: RpgCombat | null;
  log: string[];
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
    } catch {
      // The API can return a non-JSON error response.
    }
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
  return request<WorldChunk>(`/generate/world/${encodeURIComponent(chunkId)}?${q.toString()}`);
}

export async function fetchMechanics(baseDifficulty = 1): Promise<MechanicsResponse> {
  const { sessionId } = getOrCreateClientIds();
  const q = new URLSearchParams({ sessionId, baseDifficulty: String(baseDifficulty) });
  return request<MechanicsResponse>(`/generate/mechanics?${q.toString()}`);
}

export async function startExpedition(): Promise<ExpeditionState> {
  const { sessionId } = getOrCreateClientIds();
  return request<ExpeditionState>("/expeditions", {
    method: "POST",
    body: JSON.stringify({ expeditionId: sessionId }),
  });
}

export async function fetchExpeditionCode(): Promise<string> {
  const { sessionId } = getOrCreateClientIds();
  const response = await request<{ code: string }>(`/expeditions/${encodeURIComponent(sessionId)}/code`);
  return response.code;
}

export async function importExpeditionCode(code: string): Promise<ExpeditionState> {
  resetClientIds();
  const { sessionId } = getOrCreateClientIds();
  return request<ExpeditionState>("/expeditions/import", {
    method: "POST",
    body: JSON.stringify({ expeditionId: sessionId, code }),
  });
}

export async function postExpeditionAction(
  action:
    | { type: "travel"; destinationId: string }
    | { type: "combat"; action: "basic" | "guard" | "signature" }
    | { type: "discovery"; choice: "search" | "press-on" }
    | { type: "social"; choice: "share" | "command" }
    | { type: "retreat" },
): Promise<ExpeditionState> {
  const { sessionId } = getOrCreateClientIds();
  return request<ExpeditionState>(`/expeditions/${encodeURIComponent(sessionId)}/actions`, {
    method: "POST",
    body: JSON.stringify(action),
  });
}

export async function fetchRpgGame(): Promise<RpgGameState> {
  const { sessionId } = getOrCreateClientIds();
  return request<RpgGameState>(`/game?${new URLSearchParams({ sessionId }).toString()}`);
}

export async function postRpgAction(action: unknown): Promise<RpgGameState> {
  const { sessionId } = getOrCreateClientIds();
  return request<RpgGameState>("/game/action", {
    method: "POST",
    body: JSON.stringify({ sessionId, action }),
  });
}

export async function fetchPalette(): Promise<PaletteResponse> {
  const { sessionId } = getOrCreateClientIds();
  const q = new URLSearchParams({ sessionId });
  return request<PaletteResponse>(`/generate/palette?${q.toString()}`);
}
