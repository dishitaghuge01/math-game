import Phaser from "phaser";
import { useEffect, useRef } from "react";
import { OverworldScene } from "./OverworldScene";
import { VIEW_HEIGHT, VIEW_WIDTH } from "./constants";
import type { ExpeditionGameProps } from "./types";

/**
 * Vertical-slice Phaser surface: walk, collide, interact with a reachable
 * landmark, then hand the Encounter outcome back to the authoritative API.
 */
export function ExpeditionGame({ expedition, onAction }: ExpeditionGameProps) {
  const host = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<OverworldScene | null>(null);
  const callback = useRef(onAction);
  callback.current = onAction;

  useEffect(() => {
    if (!host.current) return;
    const scene = new OverworldScene(expedition, (action) => callback.current(action));
    sceneRef.current = scene;
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent: host.current,
      width: VIEW_WIDTH,
      height: VIEW_HEIGHT,
      backgroundColor: "#181c2c",
      pixelArt: true,
      physics: { default: "arcade", arcade: { debug: false } },
      scene,
      scale: { mode: Phaser.Scale.FIT, autoCenter: Phaser.Scale.CENTER_BOTH },
    });
    return () => {
      sceneRef.current = null;
      game.destroy(true);
    };
  }, [expedition.expeditionId]);

  useEffect(() => {
    sceneRef.current?.applyExpeditionState(expedition);
  }, [expedition]);

  return <div ref={host} className="w-full overflow-hidden rounded-sm border-4 border-[color:var(--color-ink)] shadow-xl" aria-label="Playable Expedition map" />;
}
