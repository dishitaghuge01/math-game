import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  bootstrapNodeId,
  fetchNarrative,
  fetchPalette,
  postDecision,
  type NarrativeChoice,
} from "@/api/gameApi";
import { useGameStore } from "@/store/gameStore";
import { Feather, Loader2, Sparkles } from "lucide-react";

export const Route = createFileRoute("/decision")({
  component: DecisionPage,
});

function DecisionPage() {
  const navigate = useNavigate();
  const qc = useQueryClient();
  const currentNodeId = useGameStore((s) => s.currentNodeId);
  const currentNarrative = useGameStore((s) => s.currentNarrative);
  const setNarrative = useGameStore((s) => s.setNarrative);
  const setVector = useGameStore((s) => s.setVector);
  const setPalette = useGameStore((s) => s.setPalette);
  const recordDecision = useGameStore((s) => s.recordDecision);
  const isDeciding = useGameStore((s) => s.isDeciding);
  const setDeciding = useGameStore((s) => s.setDeciding);
  const vector = useGameStore((s) => s.vector);

  const activeNodeId = currentNodeId ?? bootstrapNodeId();

  const narrativeQuery = useQuery({
    queryKey: ["narrative", activeNodeId],
    queryFn: () => fetchNarrative(activeNodeId),
    enabled: !currentNarrative || currentNodeId === null,
  });

  useEffect(() => {
    if (narrativeQuery.data && currentNodeId !== activeNodeId) {
      setNarrative(activeNodeId, narrativeQuery.data);
    }
  }, [narrativeQuery.data, activeNodeId, currentNodeId, setNarrative]);

  const decideMutation = useMutation({
    mutationFn: async (choice: NarrativeChoice) => {
      const res = await postDecision({
        choiceId: choice.id,
        choiceLabel: choice.label,
        narrativeNodeId: activeNodeId,
      });
      const next = await fetchNarrative(res.nextNodeId);
      // refresh palette (fire-and-forget for UX, but await so we settle together)
      const paletteRes = await fetchPalette().catch(() => null);
      return { res, next, palette: paletteRes?.palette ?? null, choice };
    },
    onMutate: () => setDeciding(true),
    onSettled: () => setDeciding(false),
    onSuccess: ({ res, next, palette, choice }) => {
      setVector(res.vector);
      if (palette) setPalette(palette);
      recordDecision(activeNodeId, choice.label, res.vectorDelta);
      setNarrative(res.nextNodeId, next);
    },
    onError: async (err: Error & { status?: number }) => {
      if (err.status === 400) {
        // stale choice — refetch current node
        await qc.invalidateQueries({ queryKey: ["narrative", activeNodeId] });
        const fresh = await fetchNarrative(activeNodeId);
        setNarrative(activeNodeId, fresh);
      }
    },
  });

  if (narrativeQuery.isLoading && !currentNarrative) {
    return <LoadingScroll message="Unfurling the parchment…" />;
  }

  if (narrativeQuery.isError && !currentNarrative) {
    return (
      <ErrorScroll
        message="The bard's voice is lost to the wind."
        detail={(narrativeQuery.error as Error).message}
        onRetry={() => narrativeQuery.refetch()}
      />
    );
  }

  const node = currentNarrative ?? narrativeQuery.data;
  if (!node) return null;

  return (
    <div className="max-w-4xl mx-auto px-6 py-10">
      <div className="text-center mb-6">
        <div className="inline-flex items-center gap-2 font-hand italic text-sm text-[color:var(--color-ink-soft)]">
          <Feather className="w-4 h-4" />
          <span>Chapter — Node {truncateId(activeNodeId)}</span>
        </div>
      </div>

      <article className="parchment-card px-8 sm:px-14 py-10 sm:py-14 relative">
        <ChapterOrnament />
        <p className="drop-cap font-body text-lg leading-relaxed text-[color:var(--color-ink)] whitespace-pre-wrap">
          {node.narrative}
        </p>
        <div className="mt-10 border-t border-[color:var(--color-ink)]/25 pt-8">
          <h2 className="text-center text-xs font-heading tracking-[0.3em] uppercase text-[color:var(--color-ink-soft)] mb-6">
            ⚔ Thy Path ⚔
          </h2>
          <div className="grid gap-4 sm:grid-cols-3">
            {node.choices.map((c, i) => (
              <ChoiceCard
                key={c.id}
                choice={c}
                index={i}
                disabled={isDeciding || decideMutation.isPending}
                onPick={() => decideMutation.mutate(c)}
              />
            ))}
          </div>
          {decideMutation.isPending && (
            <div className="mt-6 flex items-center justify-center gap-2 text-sm font-hand italic text-[color:var(--color-ink-soft)]">
              <Loader2 className="w-4 h-4 animate-spin" />
              The Dungeon Master rolls the dice…
            </div>
          )}
        </div>
      </article>

      <div className="mt-6 flex items-center justify-between text-xs font-hand italic text-[color:var(--color-ink-soft)]">
        <span>
          Alignment drifts: {formatAxis("morality", vector.morality)} ·{" "}
          {formatAxis("boldness", vector.riskTolerance)}
        </span>
        <button
          className="underline hover:text-[color:var(--color-ember)]"
          onClick={() => navigate({ to: "/character" })}
        >
          consult thy sheet →
        </button>
      </div>
    </div>
  );
}

function ChoiceCard({
  choice,
  index,
  disabled,
  onPick,
}: {
  choice: NarrativeChoice;
  index: number;
  disabled: boolean;
  onPick: () => void;
}) {
  const runes = ["ᛉ", "ᚱ", "ᚦ"];
  return (
    <button
      disabled={disabled}
      onClick={onPick}
      className="group text-left w-full min-w-0 parchment-card p-5 hover:-translate-y-1 hover:shadow-[0_25px_45px_-15px_rgba(40,25,10,0.5)] transition-all disabled:opacity-60 disabled:cursor-wait"
    >
      <div className="flex items-start gap-3">
        <span className="font-display text-3xl text-[color:var(--color-ember)] leading-none shrink-0">
          {runes[index] ?? "✦"}
        </span>
        <div className="flex-1 min-w-0">
          <div className="font-heading text-base uppercase tracking-wider text-[color:var(--color-ink)] mb-1 group-hover:text-[color:var(--color-ember)] transition-colors break-words">
            {choice.label}
          </div>
          <p className="font-body text-sm italic text-[color:var(--color-ink-soft)] leading-snug break-words">
            {choice.description}
          </p>
        </div>
      </div>
    </button>
  );
}

function ChapterOrnament() {
  return (
    <div className="flex items-center justify-center gap-3 mb-6 text-[color:var(--color-gold-deep)]">
      <span className="h-px w-16 bg-current" />
      <Sparkles className="w-4 h-4" />
      <span className="h-px w-16 bg-current" />
    </div>
  );
}

function LoadingScroll({ message }: { message: string }) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="parchment-card p-12 text-center">
        <Loader2 className="w-8 h-8 mx-auto mb-4 animate-spin text-[color:var(--color-ember)]" />
        <p className="font-hand italic text-lg">{message}</p>
      </div>
    </div>
  );
}

function ErrorScroll({
  message,
  detail,
  onRetry,
}: {
  message: string;
  detail?: string;
  onRetry?: () => void;
}) {
  return (
    <div className="min-h-[60vh] flex items-center justify-center px-6">
      <div className="parchment-card p-10 max-w-md text-center">
        <h2 className="font-display text-2xl mb-3">A Tear in the Tale</h2>
        <p className="font-body italic mb-2">{message}</p>
        {detail && (
          <p className="font-hand text-xs text-[color:var(--color-ink-soft)] mb-4">{detail}</p>
        )}
        {onRetry && (
          <button
            onClick={onRetry}
            className="mt-2 px-4 py-2 bg-[color:var(--color-ember)] text-[color:var(--color-parchment)] font-heading uppercase tracking-wider text-xs"
          >
            Try Again
          </button>
        )}
      </div>
    </div>
  );
}

function truncateId(id: string) {
  return id.length > 20 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;
}

function formatAxis(name: string, val: number) {
  const arrow = val > 0.05 ? "↑" : val < -0.05 ? "↓" : "·";
  return `${name} ${arrow}${Math.abs(val).toFixed(2)}`;
}
