import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { fetchMechanics, fetchWorld } from "@/api/gameApi";
import { useGameStore } from "@/store/gameStore";
import { Loader2, MapPin, Skull, Sparkle } from "lucide-react";

export const Route = createFileRoute("/world")({
  component: WorldPage,
});

const TERRAIN_LABELS = ["mist", "moor", "wold", "peak"];

function WorldPage() {
  const currentNodeId = useGameStore((s) => s.currentNodeId);
  const chunkId = currentNodeId ?? "default";

  const worldQuery = useQuery({
    queryKey: ["world", chunkId],
    queryFn: () => fetchWorld(chunkId),
  });
  const mechanicsQuery = useQuery({
    queryKey: ["mechanics", chunkId],
    queryFn: () => fetchMechanics(1),
  });

  if (worldQuery.isLoading) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="parchment-card p-12 text-center">
          <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-[color:var(--color-ember)]" />
          <p className="font-hand italic">The cartographer sketches thy surroundings…</p>
        </div>
      </div>
    );
  }
  if (worldQuery.isError || !worldQuery.data) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="parchment-card p-10 max-w-md text-center">
          <p className="font-body italic">The map is smudged beyond reading.</p>
          <button
            onClick={() => worldQuery.refetch()}
            className="mt-4 px-4 py-2 bg-[color:var(--color-ember)] text-[color:var(--color-parchment)] font-heading uppercase text-xs tracking-wider"
          >
            Redraw
          </button>
        </div>
      </div>
    );
  }

  const world = worldQuery.data;

  return (
    <div className="max-w-6xl mx-auto px-6 py-10">
      <header className="text-center mb-8">
        <div className="font-hand italic text-sm text-[color:var(--color-ink-soft)]">
          — herein lies —
        </div>
        <h1 className="font-display text-4xl md:text-5xl mt-1">{world.locationName || "The Wilds"}</h1>
        <div className="mt-2 inline-flex items-center gap-2 font-heading text-xs tracking-widest uppercase text-[color:var(--color-ink-soft)]">
          <MapPin className="w-3.5 h-3.5" />
          Ye stand at {world.currentPosition.row},{world.currentPosition.col}
        </div>
      </header>

      <div className="grid gap-8 lg:grid-cols-[1fr_320px]">
        <div className="parchment-card p-6">
          <MapGrid world={world} />
          <Legend />
        </div>
        <aside className="space-y-6">
          <EncounterCard mechanics={mechanicsQuery.data} loading={mechanicsQuery.isLoading} />
          <LootCard mechanics={mechanicsQuery.data} loading={mechanicsQuery.isLoading} />
        </aside>
      </div>
    </div>
  );
}

function MapGrid({
  world,
}: {
  world: { grid: number[][]; revealed: boolean[][]; currentPosition: { row: number; col: number } };
}) {
  const terrainColor = (tier: number) => {
    const colors = [
      "oklch(0.78 0.05 82)", // mist / low
      "oklch(0.65 0.09 105)", // moor
      "oklch(0.5 0.09 145)", // wold
      "oklch(0.4 0.05 260)", // peak
    ];
    return colors[Math.max(0, Math.min(3, tier))];
  };
  return (
    <div
      className="grid gap-[2px] ink-border p-2 aspect-square"
      style={{
        gridTemplateColumns: `repeat(${world.grid[0]?.length ?? 16}, minmax(0, 1fr))`,
        background: "oklch(0.2 0.02 40)",
      }}
    >
      {world.grid.map((row, r) =>
        row.map((tier, c) => {
          const revealed = world.revealed[r]?.[c];
          const isHere = world.currentPosition.row === r && world.currentPosition.col === c;
          return (
            <div
              key={`${r}-${c}`}
              title={revealed ? `${TERRAIN_LABELS[tier]} (${r},${c})` : "unknown"}
              className="relative"
              style={{
                background: revealed ? terrainColor(tier) : "oklch(0.15 0.02 40)",
                boxShadow: revealed ? "inset 0 0 4px rgba(40,20,5,0.35)" : "none",
              }}
            >
              {isHere && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-full h-full wax-seal torchlight" />
                </div>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
}

function Legend() {
  return (
    <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-hand italic text-[color:var(--color-ink-soft)]">
      {TERRAIN_LABELS.map((t, i) => (
        <span key={t} className="flex items-center gap-1.5">
          <span
            className="inline-block w-3 h-3 ink-border"
            style={{
              background: ["oklch(0.78 0.05 82)", "oklch(0.65 0.09 105)", "oklch(0.5 0.09 145)", "oklch(0.4 0.05 260)"][i],
            }}
          />
          {t}
        </span>
      ))}
      <span className="flex items-center gap-1.5">
        <span className="inline-block w-3 h-3 rounded-full wax-seal" /> thou
      </span>
    </div>
  );
}

function EncounterCard({
  mechanics,
  loading,
}: {
  mechanics: { enemyStats: { health: number; count: number } } | undefined;
  loading: boolean;
}) {
  return (
    <div className="parchment-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Skull className="w-4 h-4 text-[color:var(--color-blood)]" />
        <h3 className="font-heading uppercase tracking-widest text-sm">Foes Sighted</h3>
      </div>
      {loading || !mechanics ? (
        <p className="font-hand italic text-sm text-[color:var(--color-ink-soft)]">Scouts still returning…</p>
      ) : (
        <div className="space-y-2">
          <Stat label="Enemies" value={String(mechanics.enemyStats.count)} />
          <Stat label="Vitality each" value={String(mechanics.enemyStats.health)} />
        </div>
      )}
    </div>
  );
}

function LootCard({
  mechanics,
  loading,
}: {
  mechanics: { lootWeights: Record<string, number> } | undefined;
  loading: boolean;
}) {
  const rarityColor: Record<string, string> = {
    common: "oklch(0.55 0.03 80)",
    rare: "oklch(0.55 0.14 240)",
    legendary: "oklch(0.7 0.18 60)",
  };
  return (
    <div className="parchment-card p-5">
      <div className="flex items-center gap-2 mb-3">
        <Sparkle className="w-4 h-4 text-[color:var(--color-gold-deep)]" />
        <h3 className="font-heading uppercase tracking-widest text-sm">The Hoard</h3>
      </div>
      {loading || !mechanics ? (
        <p className="font-hand italic text-sm text-[color:var(--color-ink-soft)]">The chests are yet to open…</p>
      ) : (
        <div className="space-y-3">
          {Object.entries(mechanics.lootWeights).map(([rarity, w]) => (
            <div key={rarity}>
              <div className="flex justify-between text-xs font-heading uppercase tracking-wider mb-1">
                <span>{rarity}</span>
                <span>{Math.round(w * 100)}%</span>
              </div>
              <div className="h-2 ink-border bg-[color:var(--color-parchment-dark)] overflow-hidden">
                <div
                  className="h-full torchlight"
                  style={{ width: `${w * 100}%`, background: rarityColor[rarity] ?? "gray" }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between border-b border-[color:var(--color-ink)]/15 pb-1 last:border-0">
      <span className="font-hand italic text-sm text-[color:var(--color-ink-soft)]">{label}</span>
      <span className="font-heading text-sm">{value}</span>
    </div>
  );
}
