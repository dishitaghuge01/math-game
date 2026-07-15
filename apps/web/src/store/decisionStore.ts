import { create } from "zustand";

export interface DecisionVector {
  morality: number;
  aggression: number;
  curiosity: number;
  riskTolerance: number;
  socialAffinity: number;
}

export type Allegiance = Record<string, number>;

export interface NarrativeChoice {
  id: string;
  label: string;
  description: string;
}

export interface NarrativeNode {
  id: string;
  narrative: string;
  choices: NarrativeChoice[];
}

export interface WorldChunk {
  grid: number[][];
  revealed: boolean[][];
  locationName: string;
  currentPosition: { row: number; col: number };
}

interface DecisionState {
  vector: DecisionVector;
  volatility: number;
  allegiance: Allegiance;
  world: WorldChunk;
  narrative: NarrativeNode;
  bits: number;
  flux: number;
  applyVectorDelta: (d: Partial<DecisionVector>) => void;
  applyAllegianceDelta: (d: Allegiance) => void;
  setWorld: (w: WorldChunk) => void;
  setNarrative: (n: NarrativeNode) => void;
}

const initialWorld: WorldChunk = {
  grid: Array.from({ length: 16 }, () => Array.from({ length: 16 }, () => 0)),
  revealed: Array.from({ length: 16 }, (_, r) =>
    Array.from({ length: 16 }, (_, c) => Math.abs(r - 8) + Math.abs(c - 8) < 5),
  ),
  locationName: "SECTOR_07 / NULL_MARSH",
  currentPosition: { row: 8, col: 8 },
};

export const useDecisionStore = create<DecisionState>((set) => ({
  vector: {
    morality: 0.2,
    aggression: 0.4,
    curiosity: 0.7,
    riskTolerance: 0.55,
    socialAffinity: -0.15,
  },
  volatility: 0.42,
  allegiance: { CONCLAVE: 0.62, SYNDICATE: -0.38, WARDENS: 0.15, NULL_CHURCH: -0.72 },
  world: initialWorld,
  narrative: {
    id: "bootstrap:0",
    narrative:
      "The signal fractures across the lattice. A voice, or the memory of one, asks you to choose. Every path rewrites what you were.",
    choices: [
      { id: "trust", label: "TRUST_THE_SIGNAL", description: "Follow the voice into the deep lattice." },
      { id: "sever", label: "SEVER_LINK", description: "Cut the transmission before it rewrites you." },
      { id: "mirror", label: "MIRROR_IT", description: "Reflect the signal back into itself." },
    ],
  },
  bits: 1284,
  flux: 37,
  applyVectorDelta: (d) =>
    set((s) => ({ vector: { ...s.vector, ...Object.fromEntries(Object.entries(d).map(([k, v]) => [k, (s.vector as any)[k] + (v ?? 0)])) } as DecisionVector })),
  applyAllegianceDelta: (d) =>
    set((s) => {
      const next = { ...s.allegiance };
      for (const [k, v] of Object.entries(d)) next[k] = (next[k] ?? 0) + v;
      return { allegiance: next };
    }),
  setWorld: (w) => set({ world: w }),
  setNarrative: (n) => set({ narrative: n }),
}));
