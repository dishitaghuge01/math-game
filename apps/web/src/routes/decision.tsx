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

  const onChoose = async (id: string) => {
    const res = await postDecision(id);
    applyVectorDelta(res.vectorDelta);
    applyAllegianceDelta(res.allegianceDelta);
    const next = await getNarrativeNode(res.nextNodeId);
    setNarrative(next);
    navigate({ to: "/character" });
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
