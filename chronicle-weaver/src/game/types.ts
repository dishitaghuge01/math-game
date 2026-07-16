import type { ExpeditionState } from "@/api/gameApi";

export type ExpeditionAction =
  | { type: "travel"; destinationId: string }
  | { type: "combat"; action: "basic" | "guard" | "signature" | "item"; dodgeHits?: number }
  | { type: "discovery"; choice: "search" | "press-on" }
  | { type: "social"; choice: "share" | "command" }
  | { type: "retreat" };

export type ExpeditionGameProps = {
  expedition: ExpeditionState;
  onAction: (action: ExpeditionAction) => void;
};
