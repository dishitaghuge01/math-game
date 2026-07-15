import type { DecisionVector, Allegiance, WorldChunk, NarrativeNode } from "@/store/decisionStore";
import { getOrCreateClientIds } from "./session";

const getServerUrl = () => import.meta.env.VITE_SERVER_URL ?? "http://localhost:4000";

export async function postDecision(
  choiceId: string,
  choiceLabel: string,
  narrativeNodeId: string,
  impact: Partial<DecisionVector>,
): Promise<{
  vectorDelta: Partial<DecisionVector>;
  allegianceDelta: Allegiance;
  nextNodeId: string;
}> {
  const { sessionId, userId } = getOrCreateClientIds();
  const serverUrl = getServerUrl();

  try {
    const res = await fetch(`${serverUrl}/decision`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        userId,
        choiceId,
        choiceLabel,
        narrativeNodeId,
        impact,
      }),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Decision API error: ${res.status} ${res.statusText} ${text}`);
    }

    return res.json();
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err));
  }
}

export async function getWorldChunk(chunkId: string): Promise<WorldChunk> {
  const { sessionId } = getOrCreateClientIds();
  const serverUrl = getServerUrl();

  try {
    const res = await fetch(
      `${serverUrl}/generate/world/${encodeURIComponent(chunkId)}?sessionId=${encodeURIComponent(sessionId)}`,
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`World API error: ${res.status} ${res.statusText} ${text}`);
    }

    return res.json();
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err));
  }
}

export async function getNarrativeNode(nodeId: string): Promise<NarrativeNode> {
  const { sessionId } = getOrCreateClientIds();
  const serverUrl = getServerUrl();

  try {
    const res = await fetch(
      `${serverUrl}/generate/narrative/${encodeURIComponent(nodeId)}?sessionId=${encodeURIComponent(sessionId)}`,
    );

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Narrative API error: ${res.status} ${res.statusText} ${text}`);
    }

    return res.json();
  } catch (err) {
    if (err instanceof Error) {
      throw err;
    }
    throw new Error(String(err));
  }
}
