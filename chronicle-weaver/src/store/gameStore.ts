import { create } from "zustand";
import type { DecisionVector, NarrativeNode } from "@/api/gameApi";

const DEFAULT_VECTOR: DecisionVector = {
  morality: 0,
  aggression: 0,
  curiosity: 0.5,
  riskTolerance: 0.5,
  socialAffinity: 0,
  allegiance: {},
};

interface JournalEntry {
  nodeId: string;
  choiceLabel: string;
  deltaMagnitude: number;
  at: number;
}

interface GameState {
  vector: DecisionVector;
  palette: string[];
  currentNodeId: string | null;
  currentNarrative: NarrativeNode | null;
  journal: JournalEntry[];
  isDeciding: boolean;

  setNarrative: (nodeId: string, node: NarrativeNode) => void;
  setVector: (v: DecisionVector) => void;
  setPalette: (p: string[]) => void;
  recordDecision: (nodeId: string, choiceLabel: string, delta: Partial<DecisionVector>) => void;
  setDeciding: (v: boolean) => void;
  volatility: () => number;
}

export const useGameStore = create<GameState>((set, get) => ({
  vector: DEFAULT_VECTOR,
  palette: ["hsl(38, 45%, 55%)", "hsl(15, 60%, 45%)", "hsl(200, 30%, 40%)"],
  currentNodeId: null,
  currentNarrative: null,
  journal: [],
  isDeciding: false,

  setNarrative: (nodeId, node) => set({ currentNodeId: nodeId, currentNarrative: node }),
  setVector: (v) => set({ vector: v }),
  setPalette: (p) => set({ palette: p.length === 3 ? p : get().palette }),
  recordDecision: (nodeId, choiceLabel, delta) => {
    let mag = 0;
    for (const val of Object.values(delta)) {
      if (typeof val === "number") mag += Math.abs(val);
    }
    set((s) => ({
      journal: [
        { nodeId, choiceLabel, deltaMagnitude: mag, at: Date.now() } as JournalEntry,
        ...s.journal,
      ].slice(0, 20),
    }));
  },
  setDeciding: (v) => set({ isDeciding: v }),
  volatility: () => {
    const recent = get().journal.slice(0, 5);
    if (recent.length === 0) return 0;
    const avg = recent.reduce((a, e) => a + e.deltaMagnitude, 0) / recent.length;
    return Math.min(1, avg / 2);
  },
}));
