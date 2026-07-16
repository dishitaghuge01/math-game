import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { DecisionScene } from "@/components/DecisionScene";
import { useDecisionStore } from "@/store/decisionStore";
import { postDecision, getNarrativeNode } from "@/api/gameApi";
import { getOrCreateClientIds } from "@/api/session";

export const Route = createFileRoute("/decision")({
  head: () => ({ meta: [{ title: "AETHER_OS — Decision" }] }),
  component: DecisionRoute,
});

function DecisionRoute() {
  const navigate = useNavigate();
  const { narrative, allegiance, applyVectorDelta, applyAllegianceDelta, setNarrative } =
    useDecisionStore();

  // Initialize narrative with correct sessionId format on mount
  useEffect(() => {
    const initializeNarrative = async () => {
      if (narrative.id === "bootstrap:0") {
        try {
          const { sessionId } = getOrCreateClientIds();
          const initialNodeId = `${sessionId}:0`;
          const next = await getNarrativeNode(initialNodeId);
          setNarrative({ ...next, id: initialNodeId });
        } catch (error) {
          console.error("Failed to initialize narrative:", error);
        }
      }
    };
    initializeNarrative();
  }, []);

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
