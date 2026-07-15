import { Link } from "@tanstack/react-router";

const items = [
  { to: "/decision", label: "NARRATIVE" },
  { to: "/world", label: "WORLD", active: true },
  { to: "/character", label: "CHARACTER" },
  { to: "/archive", label: "ARCHIVE" },
] as const;

export function Sidebar({ active }: { active: "NARRATIVE" | "WORLD" | "CHARACTER" | "ARCHIVE" }) {
  return (
    <aside
      style={{ width: 180, background: "#0a0a0a", borderRight: "1px solid #2e2e2e" }}
      className="flex flex-col font-mono text-[13px]"
    >
      {items.map((it) => {
        const isActive = it.label === active;
        return (
          <Link
            key={it.label}
            to={it.to as any}
            style={{
              padding: 16,
              color: isActive ? "#ffffff" : "#c0c0c0",
              background: isActive ? "#1a1a1a" : "transparent",
              borderLeft: isActive ? "2px solid #ffffff" : "2px solid transparent",
              display: "flex",
              alignItems: "center",
              gap: 12,
              textDecoration: "none",
            }}
          >
            <span
              aria-hidden
              style={{
                width: 10,
                height: 10,
                border: "1px solid #c0c0c0",
                display: "inline-block",
              }}
            />
            {it.label}
          </Link>
        );
      })}
    </aside>
  );
}
