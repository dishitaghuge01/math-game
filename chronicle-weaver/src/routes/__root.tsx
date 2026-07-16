import { Link, Outlet, createRootRouteWithContext } from "@tanstack/react-router";
import type { QueryClient } from "@tanstack/react-query";
import { Compass, Map as MapIcon, Scroll, Shield } from "lucide-react";
import { useGameStore } from "@/store/gameStore";

export const Route = createRootRouteWithContext<{ queryClient: QueryClient }>()({
  component: RootLayout,
  notFoundComponent: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="parchment-card p-10 max-w-md text-center">
        <h1 className="text-4xl mb-3">Ye Wander Off the Map</h1>
        <p className="font-body italic mb-6">This road leads nowhere in the known realms.</p>
        <Link to="/" className="underline text-ember">Return to the tale</Link>
      </div>
    </div>
  ),
});

function NavLink({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="group flex items-center gap-2 px-3 py-2 font-heading uppercase tracking-widest text-xs text-[color:var(--color-ink-soft)] hover:text-[color:var(--color-ember)] transition-colors"
      activeProps={{ className: "text-[color:var(--color-ember)]" }}
    >
      <Icon className="w-4 h-4" />
      <span>{label}</span>
    </Link>
  );
}

function RootLayout() {
  const palette = useGameStore((s) => s.palette);
  const bannerStyle = {
    background: `linear-gradient(135deg, ${palette[0]}, ${palette[1]}, ${palette[2]})`,
  };
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-[color:var(--color-ink)]/30 backdrop-blur-sm sticky top-0 z-40"
        style={{ background: "linear-gradient(180deg, oklch(0.9 0.05 78 / 0.95), oklch(0.86 0.06 75 / 0.9))" }}>
        <div className="max-w-6xl mx-auto flex items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-3 group">
            <div
              className="w-10 h-10 rounded-full ink-border torchlight"
              style={bannerStyle}
              aria-hidden
            />
            <div className="leading-none">
              <div className="font-display text-lg tracking-widest text-[color:var(--color-ink)]">
                The Wayfarer's Codex
              </div>
              <div className="font-hand italic text-xs text-[color:var(--color-ink-soft)]">
                a chronicle unwritten
              </div>
            </div>
          </Link>
          <nav className="flex items-center gap-1">
            <NavLink to="/decision" icon={Scroll} label="The Tale" />
            <NavLink to="/world" icon={MapIcon} label="The Map" />
            <NavLink to="/character" icon={Shield} label="Thyself" />
          </nav>
        </div>
      </header>

      <main className="flex-1">
        <Outlet />
      </main>

      <footer className="border-t border-[color:var(--color-ink)]/20 mt-16">
        <div className="max-w-6xl mx-auto px-6 py-6 flex items-center justify-between text-xs font-hand italic text-[color:var(--color-ink-soft)]">
          <span className="flex items-center gap-2">
            <Compass className="w-3.5 h-3.5" /> penned in ink & candlelight
          </span>
          <span>— may your rolls be ever advantaged —</span>
        </div>
      </footer>
    </div>
  );
}
