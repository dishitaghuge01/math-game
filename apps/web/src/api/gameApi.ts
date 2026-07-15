import type { DecisionVector, Allegiance, WorldChunk, NarrativeNode } from "@/store/decisionStore";

export async function postDecision(choiceId: string): Promise<{
  vectorDelta: Partial<DecisionVector>;
  allegianceDelta: Allegiance;
  nextNodeId: string;
}> {
  return {
    vectorDelta: { morality: choiceId.length % 2 === 0 ? 0.1 : -0.1 },
    allegianceDelta: { CONCLAVE: 0.05, SYNDICATE: -0.03 },
    nextNodeId: "node_" + choiceId,
  };
}

export async function getWorldChunk(_chunkId: string): Promise<WorldChunk> {
  const N = 16;
  const grid = Array.from({ length: N }, () =>
    Array.from({ length: N }, () => Math.floor(Math.random() * 4)),
  );
  const revealed = Array.from({ length: N }, (_, r) =>
    Array.from({ length: N }, (_, c) => Math.abs(r - 8) + Math.abs(c - 8) < 5),
  );
  return {
    grid,
    revealed,
    locationName: "SECTOR_07 / NULL_MARSH",
    currentPosition: { row: 8, col: 8 },
  };
}

export async function getNarrativeNode(_nodeId: string): Promise<NarrativeNode> {
  return {
    narrative:
      "The signal fractures across the lattice. A voice, or the memory of one, asks you to choose. Every path rewrites what you were.",
    choices: [
      { id: "trust", label: "TRUST_THE_SIGNAL", description: "Follow the voice into the deep lattice." },
      { id: "sever", label: "SEVER_LINK", description: "Cut the transmission before it rewrites you." },
      { id: "mirror", label: "MIRROR_IT", description: "Reflect the signal back into itself." },
    ],
  };
}
