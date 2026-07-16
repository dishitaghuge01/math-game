import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { WorldScene } from "@/components/WorldScene";
import { useDecisionStore } from "@/store/decisionStore";
import { getWorldChunk } from "@/api/gameApi";

export const Route = createFileRoute("/world")({
  head: () => ({ meta: [{ title: "AETHER_OS — World" }] }),
  component: WorldRoute,
});

function WorldRoute() {
  const { world, narrative, bits, flux, setWorld } = useDecisionStore();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const fetchWorld = async () => {
      try {
        const chunkId = narrative.id ?? "default";
        setIsLoading(true);
        const result = await getWorldChunk(chunkId);
        setWorld(result);
      } catch (error) {
        console.error("Failed to load world chunk:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorld();
  }, []);

  // Show loading state if we're fetching and don't have initial data yet
  if (isLoading && world === undefined) {
    return <div style={{ padding: "2rem" }}>Loading...</div>;
  }

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

