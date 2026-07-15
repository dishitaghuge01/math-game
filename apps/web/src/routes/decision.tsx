import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { DecisionScene } from "@/components/DecisionScene";
import { useDecisionStore } from "@/store/decisionStore";
import { postDecision, getNarrativeNode } from "@/api/gameApi";

export const Route = createFileRoute("/decision")({
  head: () => ({ meta: [{ title: "AETHER_OS — Decision" }] }),
  component: DecisionRoute,
});

function DecisionRoute() {
  const navigate = useNavigate();
  const { narrative, allegiance, applyVectorDelta, applyAllegianceDelta, setNarrative } =
    useDecisionStore();

  const onChoose = async (choiceId: string) => {
    const choice = narrative.choices.find((c) => c.id === choiceId);
    if (!choice) {
      console.error(`Choice ${choiceId} not found`);
      return;
    }

    // TODO: impact vector is missing from UI choices — this is a gap between UI and server.
    // UI only has id/label/description; server needs Partial<DecisionVector> impact.
    // Currently passing empty impact object as placeholder. This needs to be resolved
    // before Phase 10 is production-ready.
    const impact: Record<string, unknown> = {};

    try {
      const res = await postDecision(choiceId, choice.label, "current_node", impact);
      applyVectorDelta(res.vectorDelta);
      applyAllegianceDelta(res.allegianceDelta);
      const next = await getNarrativeNode(res.nextNodeId);
      setNarrative(next);
      navigate({ to: "/character" });
    } catch (error) {
      console.error("Failed to apply decision:", error);
      throw error;
    }
  };

  return (
    <DecisionScene
      narrative={narrative.narrative}
      choices={narrative.choices}
      onChoose={onChoose}
      allegiancePreview={allegiance}
    />
  );
}
