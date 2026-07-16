import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Compass, Flame, MapPin, Shield, Sparkles, Swords } from "lucide-react";
import { postExpeditionAction, startExpedition, type ExpeditionState } from "@/api/gameApi";

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
      </header>
      <section className="parchment-card mt-8 p-5 sm:p-8">
        <div className="grid gap-3">
          {state.region.locations.map((location, index) => (
            <Location
              key={location.id}
              location={location}
              state={state}
              busy={travel.isPending}
              onTravel={() => travel.mutate({ type: "travel", destinationId: location.id })}
              index={index}
            />
          ))}
        </div>
      </section>
      <div className="mt-6 flex justify-center">
        <button onClick={() => navigate({ to: "/" })} className="font-hand italic underline">
          consult the Expedition Party
        </button>
      </div>
    </div>
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
