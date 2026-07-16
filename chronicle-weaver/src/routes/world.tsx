import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { fetchRpgGame, postRpgAction, type RpgGameState } from "@/api/gameApi";
import { useGameStore } from "@/store/gameStore";
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronUp,
  Crosshair,
  Heart,
  Shield,
  Sparkles,
} from "lucide-react";

export const Route = createFileRoute("/world")({ component: WorldPage });

const terrain = ["mist", "moor", "forest", "crag"];
const terrainClass = ["bg-[#b8b08c]", "bg-[#879757]", "bg-[#416e48]", "bg-[#4b5264]"];

type Direction = "north" | "south" | "east" | "west";

function WorldPage() {
  const queryClient = useQueryClient();
  const palette = useGameStore((s) => s.palette);
  const gameQuery = useQuery({ queryKey: ["rpg-game"], queryFn: fetchRpgGame });
  const action = useMutation({
    mutationFn: postRpgAction,
    onSuccess: (game) => queryClient.setQueryData(["rpg-game"], game),
  });

  if (gameQuery.isLoading || !gameQuery.data)
    return (
      <div className="min-h-[60vh] grid place-items-center font-hand italic">
        Drawing the wilds…
      </div>
    );
  if (gameQuery.isError)
    return (
      <div className="min-h-[60vh] grid place-items-center font-hand italic">
        The road cannot be found. Start the game server and try again.
      </div>
    );

  const game = gameQuery.data;
  const move = (direction: Direction) => action.mutate({ type: "move", direction });
  const combat = (choice: "attack" | "defend" | "use-potion") =>
    action.mutate({ type: "combat", action: choice });

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 py-7">
      <header className="flex flex-wrap justify-between items-end gap-3 mb-5">
        <div>
          <p className="font-hand italic text-sm text-[color:var(--color-ink-soft)]">
            — playable vertical slice —
          </p>
          <h1 className="font-display text-3xl sm:text-4xl">The Fogbound Moor</h1>
        </div>
        <div className="flex gap-3 font-heading text-xs uppercase tracking-widest">
          <span className="parchment-card px-3 py-2">✦ {game.experience} XP</span>
          <span className="parchment-card px-3 py-2 text-[color:var(--color-gold-deep)]">
            ◉ {game.gold} gold
          </span>
        </div>
      </header>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <section className="parchment-card p-3 sm:p-5">
          <Map game={game} onMove={move} disabled={action.isPending} />
          <div className="mt-5 grid grid-cols-[1fr_auto_1fr] items-center gap-1 max-w-[200px] mx-auto">
            <span />
            <MoveButton
              label="Travel north"
              onClick={() => move("north")}
              disabled={action.isPending}
              icon={<ChevronUp />}
            />
            <span />
            <MoveButton
              label="Travel west"
              onClick={() => move("west")}
              disabled={action.isPending}
              icon={<ChevronLeft />}
            />
            <MoveButton
              label="Travel south"
              onClick={() => move("south")}
              disabled={action.isPending}
              icon={<ChevronDown />}
            />
            <MoveButton
              label="Travel east"
              onClick={() => move("east")}
              disabled={action.isPending}
              icon={<ChevronRight />}
            />
          </div>
          <p className="text-center mt-4 font-hand italic text-sm text-[color:var(--color-ink-soft)]">
            Move one tile at a time. Fog lifts around your path.
          </p>
        </section>

        <aside className="space-y-5">
          <PlayerCard game={game} palette={palette} />
          {game.combat?.status === "active" ? (
            <CombatCard game={game} onAction={combat} busy={action.isPending} />
          ) : (
            <LogCard lines={game.log} />
          )}
          {game.combat?.status === "victory" && (
            <LogCard lines={["The path is clear. Continue exploring.", ...game.log]} />
          )}
          {game.combat?.status === "defeat" && (
            <button
              className="w-full parchment-card p-5 font-heading uppercase tracking-widest text-sm"
              onClick={() => action.mutate({ type: "reset" })}
            >
              Begin anew
            </button>
          )}
        </aside>
      </div>
    </div>
  );
}

function Map({
  game,
  onMove,
  disabled,
}: {
  game: RpgGameState;
  onMove: (direction: Direction) => void;
  disabled: boolean;
}) {
  return (
    <div
      className="grid gap-px rounded-sm overflow-hidden border-2 border-[color:var(--color-ink)]/50 bg-[color:var(--color-ink)]/50 aspect-square"
      style={{ gridTemplateColumns: `repeat(${game.grid[0].length}, minmax(0, 1fr))` }}
    >
      {game.grid.flatMap((row, r) =>
        row.map((tile, c) => {
          const revealed = game.revealed[r][c];
          const here = game.position.row === r && game.position.col === c;
          const direction =
            r === game.position.row - 1 && c === game.position.col
              ? "north"
              : r === game.position.row + 1 && c === game.position.col
                ? "south"
                : r === game.position.row && c === game.position.col - 1
                  ? "west"
                  : r === game.position.row && c === game.position.col + 1
                    ? "east"
                    : null;
          return (
            <button
              key={`${r}-${c}`}
              disabled={!direction || disabled || game.combat?.status === "active"}
              onClick={() => direction && onMove(direction)}
              aria-label={
                here ? "Current position" : revealed ? `Travel to ${terrain[tile]}` : "Unexplored"
              }
              className={`relative min-w-0 aspect-square ${revealed ? terrainClass[tile] : "bg-[#202329]"} ${direction ? "hover:brightness-125 cursor-pointer" : "cursor-default"}`}
            >
              {revealed && (
                <span
                  className="absolute inset-0 opacity-25"
                  style={{
                    backgroundImage:
                      "repeating-linear-gradient(45deg, transparent 0 5px, rgba(25,30,20,.22) 5px 6px)",
                  }}
                />
              )}
              {here && (
                <span className="absolute inset-0 grid place-items-center">
                  <Shield
                    className="w-3/5 h-3/5 text-[#f5df91] drop-shadow-[0_2px_1px_rgba(0,0,0,.8)]"
                    fill="currentColor"
                  />
                </span>
              )}
            </button>
          );
        }),
      )}
    </div>
  );
}

function PlayerCard({ game, palette }: { game: RpgGameState; palette: string[] }) {
  const player = game.combat?.player ?? { name: "Wayfarer", health: 20, maxHealth: 20, attack: 6 };
  return (
    <div className="parchment-card p-5">
      <div className="flex items-center gap-3">
        <div
          className="w-11 h-11 grid place-items-center rounded-full ink-border"
          style={{ background: `linear-gradient(135deg, ${palette.join(",")})` }}
        >
          <Shield className="text-white" />
        </div>
        <div>
          <h2 className="font-display text-xl">Wayfarer</h2>
          <p className="font-hand italic text-sm">Moor scout · attack {player.attack}</p>
        </div>
      </div>
      <Health label="Vitality" current={player.health} max={player.maxHealth} />
    </div>
  );
}

function CombatCard({
  game,
  onAction,
  busy,
}: {
  game: RpgGameState;
  onAction: (action: "attack" | "defend" | "use-potion") => void;
  busy: boolean;
}) {
  const combat = game.combat!;
  return (
    <div className="parchment-card p-5 border-2 border-[color:var(--color-blood)]/50">
      <div className="flex items-center gap-2 mb-3 text-[color:var(--color-blood)]">
        <Crosshair className="w-4 h-4" />
        <h2 className="font-heading text-sm uppercase tracking-widest">Encounter</h2>
      </div>
      <h3 className="font-display text-2xl">{combat.enemy.name}</h3>
      <Health label="Enemy vitality" current={combat.enemy.health} max={combat.enemy.maxHealth} />
      <div className="grid grid-cols-3 gap-2 mt-5">
        {(
          [
            ["attack", "Strike"],
            ["defend", "Guard"],
            ["use-potion", `Potion (${combat.potions})`],
          ] as const
        ).map(([action, label]) => (
          <button
            key={action}
            disabled={busy || (action === "use-potion" && combat.potions === 0)}
            onClick={() => onAction(action)}
            className="py-3 px-1 bg-[color:var(--color-ink)] text-[color:var(--color-parchment)] font-heading text-[10px] uppercase tracking-wider hover:bg-[color:var(--color-ember)] disabled:opacity-50"
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}

function Health({ label, current, max }: { label: string; current: number; max: number }) {
  return (
    <div className="mt-4">
      <div className="flex justify-between font-hand italic text-xs">
        <span>{label}</span>
        <span>
          {current}/{max}
        </span>
      </div>
      <div className="h-2 mt-1 bg-[color:var(--color-ink)]/15">
        <div
          className="h-full bg-[color:var(--color-blood)]"
          style={{ width: `${(current / max) * 100}%` }}
        />
      </div>
    </div>
  );
}
function LogCard({ lines }: { lines: string[] }) {
  return (
    <div className="parchment-card p-5">
      <div className="flex gap-2 items-center mb-3">
        <Sparkles className="w-4 h-4 text-[color:var(--color-gold-deep)]" />
        <h2 className="font-heading text-sm uppercase tracking-widest">Travel log</h2>
      </div>
      <ol className="space-y-2 font-hand italic text-sm text-[color:var(--color-ink-soft)]">
        {lines
          .slice()
          .reverse()
          .map((line, i) => (
            <li key={`${line}-${i}`}>{line}</li>
          ))}
      </ol>
    </div>
  );
}
function MoveButton({
  label,
  onClick,
  disabled,
  icon,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  icon: React.ReactNode;
}) {
  return (
    <button
      aria-label={label}
      onClick={onClick}
      disabled={disabled}
      className="w-12 h-10 grid place-items-center parchment-card hover:text-[color:var(--color-ember)] disabled:opacity-40"
    >
      {icon}
    </button>
  );
}
