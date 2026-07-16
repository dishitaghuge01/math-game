import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { Sparkles, Sword, WandSparkles, HeartHandshake } from "lucide-react";
import { startExpedition, type ExpeditionState } from "@/api/gameApi";

export const Route = createFileRoute("/")({ component: ExpeditionStartPage });

const roleIcon = { fighter: Sword, mage: WandSparkles, support: HeartHandshake };

function ExpeditionStartPage() {
  const navigate = useNavigate();
  const expedition = useMutation({ mutationFn: startExpedition });

  return (
    <div className="max-w-5xl mx-auto px-6 py-14">
      <header className="text-center max-w-2xl mx-auto">
        <p className="font-hand italic text-[color:var(--color-ink-soft)]">
          a procedural expedition
        </p>
        <h1 className="font-display text-4xl sm:text-6xl mt-2">The Wayfarer&apos;s Codex</h1>
        <p className="font-body italic text-lg mt-5">
          Your decisions will write the road, shape your companions, and call a world from the fog.
        </p>
      </header>
      {!expedition.data ? (
        <button
          onClick={() => expedition.mutate()}
          disabled={expedition.isPending}
          className="block mx-auto mt-10 px-7 py-4 parchment-card font-heading uppercase tracking-widest text-sm hover:text-[color:var(--color-ember)] disabled:opacity-60"
        >
          {expedition.isPending ? "Gathering the party…" : "Begin an Expedition"}
        </button>
      ) : (
        <ExpeditionPreview
          expedition={expedition.data}
          onEnter={() => navigate({ to: "/world" })}
        />
      )}
      {expedition.isError && (
        <p className="text-center mt-5 font-hand italic text-[color:var(--color-blood)]">
          The road could not be drawn. Is the game server running?
        </p>
      )}
    </div>
  );
}

function ExpeditionPreview({
  expedition,
  onEnter,
}: {
  expedition: ExpeditionState;
  onEnter: () => void;
}) {
  return (
    <section className="mt-10">
      <div className="text-center font-hand italic text-sm text-[color:var(--color-ink-soft)]">
        World seed · {expedition.worldSeed}
      </div>
      <div className="grid md:grid-cols-3 gap-5 mt-5">
        {expedition.party.map((member) => {
          const Icon = roleIcon[member.role];
          return (
            <article key={member.role} className="parchment-card p-6 text-center">
              <div className="w-14 h-14 mx-auto rounded-full grid place-items-center wax-seal">
                <Icon className="w-6 h-6 text-white" />
              </div>
              <p className="font-heading uppercase tracking-widest text-xs mt-4">{member.role}</p>
              <h2 className="font-display text-2xl mt-1">{member.name}</h2>
              <p className="font-hand italic text-sm mt-2">{member.motive}</p>
            </article>
          );
        })}
      </div>
      <div className="parchment-card mt-6 p-5">
        <div className="flex items-center justify-center gap-2">
          <Sparkles className="w-4 h-4" />
          <h2 className="font-heading uppercase tracking-widest text-xs">Expedition Traits</h2>
        </div>
        <div className="grid grid-cols-5 gap-2 mt-4 text-center">
          {Object.entries(expedition.traits).map(([trait, value]) => (
            <div key={trait}>
              <p className="font-heading text-[10px] uppercase tracking-wide">{trait}</p>
              <p className="font-hand italic text-xs text-[color:var(--color-ink-soft)]">
                {value.tier}
              </p>
            </div>
          ))}
        </div>
      </div>
      <button
        onClick={onEnter}
        className="block mx-auto mt-7 px-7 py-4 bg-[color:var(--color-ink)] text-[color:var(--color-parchment)] font-heading uppercase tracking-widest text-sm hover:bg-[color:var(--color-ember)]"
      >
        Enter the Moor
      </button>
    </section>
  );
}
