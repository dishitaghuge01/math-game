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

    try {
      const res = await postDecision(choiceId, choice.label, narrative.id);
      applyVectorDelta(res.vectorDelta);
      applyAllegianceDelta(res.allegianceDelta);
      const next = await getNarrativeNode(res.nextNodeId);
      setNarrative({ ...next, id: res.nextNodeId });
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
