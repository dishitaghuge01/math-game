import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Flame, MapPin, Shield, Sparkles, Swords } from "lucide-react";
import { fetchExpeditionCode, importExpeditionCode, postExpeditionAction, startExpedition, type ExpeditionState } from "@/api/gameApi";
import { ExpeditionGame } from "@/game/ExpeditionGame";

export const Route = createFileRoute("/world")({ component: RegionMapPage });

const icon = {
  camp: Flame,
  combat: Swords,
  discovery: Sparkles,
  social: Shield,
  landmark: MapPin,
};

function RegionMapPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const expedition = useQuery({ queryKey: ["expedition"], queryFn: startExpedition });
  const travel = useMutation({
    mutationFn: postExpeditionAction,
    onSuccess: (state) => queryClient.setQueryData(["expedition"], state),
  });
  const exportCode = async () => {
    const code = await fetchExpeditionCode();
    await navigator.clipboard?.writeText(code);
    window.prompt("Your Expedition Code (copied when permitted):", code);
  };
  const importCode = async () => {
    const code = window.prompt("Paste an Expedition Code:");
    if (!code) return;
    queryClient.setQueryData(["expedition"], await importExpeditionCode(code));
  };
  if (expedition.isLoading || !expedition.data)
    return (
      <div className="min-h-[60vh] grid place-items-center font-hand italic">
        Charting the Region…
      </div>
    );
  if (expedition.isError)
    return (
      <div className="min-h-[60vh] grid place-items-center font-hand italic">
        The Region cannot be found.
      </div>
    );
  const state = expedition.data;
  const current = state.region.locations.find(
    (location) => location.id === state.region.currentLocationId,
  )!;
  return (
    <div className="max-w-5xl mx-auto px-6 py-10">
      <header className="text-center">
        <p className="font-hand italic text-[color:var(--color-ink-soft)]">Region I</p>
        <h1 className="font-display text-4xl sm:text-5xl">{state.region.name}</h1>
        <p className="font-hand italic mt-2">The party rests at {current.name}.</p>
        {state.region.rivalAdvanced && <p className="font-hand italic text-[color:var(--color-blood)]">A rival has advanced through the fog while the Party recovered.</p>}
      </header>
      <section className="mt-8">
        <ExpeditionGame expedition={state} onAction={(action) => travel.mutate(action)} />
      </section>
      {state.combat?.status === "active" && (
        <CombatPanel
          state={state}
          busy={travel.isPending}
          onAction={(action) => travel.mutate({ type: "combat", action })}
          onRetreat={() => travel.mutate({ type: "retreat" })}
        />
      )}
      {current.type === "discovery" && (
        <ChoicePanel
          title={current.name}
          prompt={current.name === "The Splintered Observatory" ? "Its broken lens offers a choice between the road you know and the road you need." : "The water reflects a road that does not yet exist."}
          choices={[
            ["search", "Search the depths"],
            ["press-on", "Press into the fog"],
          ]}
          busy={travel.isPending}
          onChoose={(choice) =>
            travel.mutate({ type: "discovery", choice: choice as "search" | "press-on" })
          }
        />
      )}
      {current.type === "social" && (
        <ChoicePanel
          title="Pilgrim Lanterns"
          prompt="The Party disagrees on what the distant lights promise."
          choices={[
            ["share", "Share the burden"],
            ["command", "Command the path"],
          ]}
          busy={travel.isPending}
          onChoose={(choice) =>
            travel.mutate({ type: "social", choice: choice as "share" | "command" })
          }
        />
      )}
      {state.ending && (
        <section className="parchment-card mt-6 p-6 text-center border-2 border-[color:var(--color-gold-deep)]">
          <p className="font-heading uppercase tracking-widest text-xs">Prologue complete</p>
          <h2 className="font-display text-3xl mt-2">{state.ending.title}</h2>
          <p className="font-hand italic mt-3">{state.ending.summary}</p>
        </section>
      )}
      <div className="mt-6 flex justify-center gap-4">
        <button onClick={exportCode} className="font-hand italic underline">export Expedition Code</button>
        <button onClick={importCode} className="font-hand italic underline">import Expedition Code</button>
        <button onClick={() => navigate({ to: "/" })} className="font-hand italic underline">consult the Expedition Party</button>
      </div>
    </div>
  );
}

function CombatPanel({
  state,
  busy,
  onAction,
  onRetreat,
}: {
  state: ExpeditionState;
  busy: boolean;
  onAction: (action: "basic" | "guard" | "signature") => void;
  onRetreat: () => void;
}) {
  const combat = state.combat!;
  return (
    <section className="parchment-card mt-6 p-6 border-2 border-[color:var(--color-blood)]/50 text-center">
      <p className="font-heading uppercase tracking-widest text-xs">Combat Encounter</p>
      <h2 className="font-display text-3xl mt-2">{combat.enemy.name}</h2>
      <p className="font-hand italic">
        Vitality {combat.enemy.health}/{combat.enemy.maxHealth} · {combat.activeMemberRole}&apos;s
        turn
      </p>
      <div className="grid grid-cols-3 gap-2 max-w-md mx-auto mt-5">
        {(
          [
            ["basic", "Strike"],
            ["guard", "Guard"],
            ["signature", "Signature"],
          ] as const
        ).map(([action, label]) => (
          <button
            key={action}
            disabled={busy}
            onClick={() => onAction(action)}
            className="py-3 bg-[color:var(--color-ink)] text-[color:var(--color-parchment)] font-heading text-xs uppercase tracking-wider hover:bg-[color:var(--color-ember)] disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
      <button
        disabled={busy}
        onClick={onRetreat}
        className="mt-4 font-hand italic text-sm underline text-[color:var(--color-blood)]"
      >
        Retreat to Camp
      </button>
      <p className="font-hand italic text-sm mt-4">{combat.log.at(-1)}</p>
    </section>
  );
}

function ChoicePanel({
  title,
  prompt,
  choices,
  busy,
  onChoose,
}: {
  title: string;
  prompt: string;
  choices: string[][];
  busy: boolean;
  onChoose: (choice: string) => void;
}) {
  return (
    <section className="parchment-card mt-6 p-6 text-center">
      <h2 className="font-display text-2xl">{title}</h2>
      <p className="font-hand italic mt-2">{prompt}</p>
      <div className="grid sm:grid-cols-2 gap-3 mt-5">
        {choices.map(([choice, label]) => (
          <button
            key={choice}
            disabled={busy}
            onClick={() => onChoose(choice)}
            className="p-3 bg-[color:var(--color-ink)] text-[color:var(--color-parchment)] font-heading uppercase tracking-wider text-xs hover:bg-[color:var(--color-ember)]"
          >
            {label}
          </button>
        ))}
      </div>
    </section>
  );
}

function Location({
  location,
  state,
  busy,
  onTravel,
  index,
}: {
  location: ExpeditionState["region"]["locations"][number];
  state: ExpeditionState;
  busy: boolean;
  onTravel: () => void;
  index: number;
}) {
  const Icon = icon[location.type];
  const current = location.id === state.region.currentLocationId;
  const reachable =
    state.region.locations
      .find((node) => node.id === state.region.currentLocationId)
      ?.connectedTo.includes(location.id) ?? false;
  const visible = location.revealed;
  return (
    <button
      disabled={!reachable || busy || current}
      onClick={onTravel}
      className={`w-full text-left flex items-center gap-4 p-4 border transition-all ${current ? "bg-[color:var(--color-gold)]/25 border-[color:var(--color-gold-deep)]" : reachable ? "bg-[color:var(--color-parchment-dark)] hover:-translate-y-0.5 border-[color:var(--color-ink)]/35" : "bg-[color:var(--color-ink)]/10 border-transparent opacity-60"}`}
    >
      <div className="w-11 h-11 grid place-items-center rounded-full ink-border relative overflow-hidden">
        <svg viewBox="0 0 44 44" className="absolute inset-0" aria-hidden>
          <rect width="44" height="44" fill={sigilColor(location.type)} />
          <path d={sigilPath(location.type)} fill="rgba(255,244,205,.45)" />
        </svg>
        <Icon className="w-4 h-4 relative z-10 text-white" />
      </div>
      <div className="flex-1">
        <p className="font-heading uppercase tracking-widest text-xs">
          {visible ? location.type : "uncharted"}
        </p>
        <h2 className="font-display text-xl">{visible ? location.name : "Fogbound road"}</h2>
      </div>
      <span className="font-hand italic text-sm">
        {current ? "here" : reachable ? "travel →" : index > 0 ? "beyond" : ""}
      </span>
    </button>
  );
}

function sigilColor(type: ExpeditionState["region"]["locations"][number]["type"]): string {
  return {
    camp: "hsl(28 34% 31%)",
    combat: "hsl(8 40% 31%)",
    discovery: "hsl(190 34% 31%)",
    social: "hsl(145 34% 31%)",
    landmark: "hsl(265 34% 31%)",
  }[type];
}

function sigilPath(type: ExpeditionState["region"]["locations"][number]["type"]): string {
  return type === "combat"
    ? "M4 35 22 5l18 30z"
    : type === "discovery"
      ? "M5 22 22 5l17 17-17 17z"
      : "M7 7h30v30H7z";
}
