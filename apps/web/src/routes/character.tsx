import { createFileRoute } from "@tanstack/react-router";
import { CharacterSheetScene } from "@/components/CharacterSheetScene";
import { useDecisionStore } from "@/store/decisionStore";

export const Route = createFileRoute("/character")({
  head: () => ({ meta: [{ title: "AETHER_OS — Character" }] }),
  component: CharacterRoute,
});

function CharacterRoute() {
  const { vector, volatility, allegiance } = useDecisionStore();
  return <CharacterSheetScene vector={vector} volatility={volatility} allegiance={allegiance} />;
}
