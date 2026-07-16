import { createFileRoute } from "@tanstack/react-router";
import { useGameStore } from "@/store/gameStore";
import { ScrollText, Swords } from "lucide-react";

export const Route = createFileRoute("/character")({
  component: CharacterPage,
});

interface AxisDef {
  key: keyof Pick<
    import("@/api/gameApi").DecisionVector,
    "morality" | "aggression" | "curiosity" | "riskTolerance" | "socialAffinity"
  >;
  label: string;
  low: string;
  high: string;
  bipolar: boolean;
}

const AXES: AxisDef[] = [
  { key: "morality", label: "Alignment", low: "Cruel", high: "Kind", bipolar: true },
  { key: "aggression", label: "Ferocity", low: "Passive", high: "Violent", bipolar: false },
  { key: "curiosity", label: "Inquisition", low: "Guarded", high: "Curious", bipolar: false },
  { key: "riskTolerance", label: "Boldness", low: "Cautious", high: "Reckless", bipolar: false },
  { key: "socialAffinity", label: "Kinship", low: "Loner", high: "Companion", bipolar: true },
];

function CharacterPage() {
  const vector = useGameStore((s) => s.vector);
  const palette = useGameStore((s) => s.palette);
  const journal = useGameStore((s) => s.journal);
  const volatility = useGameStore((s) => s.volatility)();

  const emblem = {
    background: `conic-gradient(from 210deg, ${palette[0]}, ${palette[1]}, ${palette[2]}, ${palette[0]})`,
  };
  const bannerStyle = {
    background: `linear-gradient(90deg, ${palette[0]}, ${palette[1]} 50%, ${palette[2]})`,
  };

  const allegiance = Object.entries(vector.allegiance);

  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <div className="parchment-card p-8 md:p-12 relative overflow-hidden">
        <div className="absolute inset-x-0 top-0 h-2 torchlight" style={bannerStyle} />

        <div className="flex flex-col md:flex-row gap-8 items-start">
          <div className="flex flex-col items-center">
            <div className="relative">
              <div
                className="w-40 h-40 rounded-full ink-border torchlight"
                style={emblem}
                aria-hidden
              />
              <div className="absolute inset-3 rounded-full flex items-center justify-center"
                style={{ background: "oklch(0.2 0.03 40)" }}>
                <Swords className="w-14 h-14 text-[color:var(--color-gold)]" />
              </div>
            </div>
            <div className="mt-3 text-center">
              <div className="font-hand italic text-xs text-[color:var(--color-ink-soft)]">heraldry</div>
              <div className="font-display text-sm tracking-widest">of the Wayfarer</div>
            </div>
          </div>

          <div className="flex-1">
            <div className="font-hand italic text-sm text-[color:var(--color-ink-soft)]">— Character Sheet —</div>
            <h1 className="font-display text-4xl md:text-5xl">Ye, the Wanderer</h1>
            <p className="font-body italic mt-2 text-[color:var(--color-ink-soft)] max-w-xl">
              Every choice is a chisel. This is the shape you have carved so far.
            </p>

            <div className="mt-6 grid gap-4">
              {AXES.map((axis) => (
                <AxisRow key={axis.key} axis={axis} value={vector[axis.key]} />
              ))}
            </div>

            <div className="mt-6">
              <div className="flex justify-between text-xs font-heading uppercase tracking-widest mb-1">
                <span>Steady</span>
                <span>Volatility</span>
                <span>Tempest</span>
              </div>
              <UnipolarBar value={volatility} />
            </div>
          </div>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 mt-8">
        <div className="parchment-card p-6">
          <h2 className="font-display text-xl mb-4">Guild Standings</h2>
          {allegiance.length === 0 ? (
            <p className="font-hand italic text-sm text-[color:var(--color-ink-soft)]">
              No banner yet flies in thy name.
            </p>
          ) : (
            <ul className="space-y-3">
              {allegiance.map(([faction, score]) => (
                <li key={faction}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-heading uppercase tracking-wider">{faction}</span>
                    <span className="font-hand italic text-[color:var(--color-ink-soft)]">
                      {score > 0.3 ? "trusted" : score > 0 ? "known" : score > -0.3 ? "wary" : "reviled"}
                    </span>
                  </div>
                  <BipolarBar value={score} />
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="parchment-card p-6">
          <div className="flex items-center gap-2 mb-4">
            <ScrollText className="w-4 h-4" />
            <h2 className="font-display text-xl">Recent Deeds</h2>
          </div>
          {journal.length === 0 ? (
            <p className="font-hand italic text-sm text-[color:var(--color-ink-soft)]">
              The ledger is blank. Go, and make history.
            </p>
          ) : (
            <ol className="space-y-2">
              {journal.slice(0, 6).map((entry, i) => (
                <li key={`${entry.at}-${i}`} className="flex gap-3 text-sm">
                  <span className="font-display text-[color:var(--color-ember)]">{i + 1}.</span>
                  <div className="flex-1">
                    <div className="font-body">{entry.choiceLabel}</div>
                    <div className="font-hand italic text-xs text-[color:var(--color-ink-soft)]">
                      shift · {entry.deltaMagnitude.toFixed(3)}
                    </div>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </div>
      </div>
    </div>
  );
}

function AxisRow({ axis, value }: { axis: AxisDef; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs font-heading uppercase tracking-widest mb-1">
        <span>{axis.low}</span>
        <span>{axis.label}</span>
        <span>{axis.high}</span>
      </div>
      {axis.bipolar ? <BipolarBar value={value} /> : <UnipolarBar value={value} />}
    </div>
  );
}

function BipolarBar({ value }: { value: number }) {
  const clamped = Math.max(-1, Math.min(1, value));
  const pct = ((clamped + 1) / 2) * 100;
  return (
    <div
      className="relative h-2 ink-border"
      style={{ background: "linear-gradient(90deg, var(--color-gold-deep), var(--color-ember))" }}
    >
      <div className="absolute inset-y-0 left-1/2 w-px bg-[color:var(--color-ink)]/40" />
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-4 wax-seal"
        style={{ left: `calc(${pct}% - 5px)` }}
      />
    </div>
  );
}

function UnipolarBar({ value }: { value: number }) {
  const clamped = Math.max(0, Math.min(1, value));
  const pct = clamped * 100;
  return (
    <div
      className="relative h-2 ink-border"
      style={{ background: "linear-gradient(90deg, var(--color-gold-deep), var(--color-ember))" }}
    >
      <div
        className="absolute top-1/2 -translate-y-1/2 w-2.5 h-4 wax-seal"
        style={{ left: `calc(${pct}% - 5px)` }}
      />
    </div>
  );
}

