import { createFileRoute } from "@tanstack/react-router";
import { WorldScene } from "@/components/WorldScene";
import { useDecisionStore } from "@/store/decisionStore";

export const Route = createFileRoute("/world")({
  head: () => ({ meta: [{ title: "AETHER_OS — World" }] }),
  component: WorldRoute,
});

function WorldRoute() {
  const { world, bits, flux } = useDecisionStore();
  return (
    <WorldScene
      grid={world.grid}
      revealed={world.revealed}
      locationName={world.locationName}
      bits={bits}
      flux={flux}
      currentPosition={world.currentPosition}
    />
  );
}
