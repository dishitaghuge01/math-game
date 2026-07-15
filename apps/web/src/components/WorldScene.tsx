import { Sidebar } from "./Sidebar";

interface Props {
  grid: number[][];
  revealed: boolean[][];
  locationName: string;
  bits: number;
  flux: number;
  currentPosition: { row: number; col: number };
}

export function WorldScene({ grid, revealed, locationName, bits, flux, currentPosition }: Props) {
  const N = grid[0]?.length ?? 0;
  return (
    <div
      style={{
        height: "100vh",
        background: "#0a0a0a",
        color: "#c0c0c0",
        display: "flex",
        flexDirection: "column",
      }}
    >
      {/* HUD */}
      <div
        style={{
          height: 64,
          background: "#0a0a0a",
          borderBottom: "1px solid #2e2e2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
        className="font-mono text-[13px]"
      >
        <span style={{ color: "#ffffff", letterSpacing: 2 }}>AETHER_OS</span>
        <div style={{ display: "flex", gap: 24 }}>
          <span>BITS: <span style={{ color: "#ffffff" }}>{bits}</span></span>
          <span>FLUX: <span style={{ color: "#ffffff" }}>{flux}</span></span>
        </div>
      </div>

      {/* Location row */}
      <div
        style={{
          height: 40,
          borderBottom: "1px solid #2e2e2e",
          paddingLeft: 16,
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
        }}
        className="font-mono"
      >
        <div style={{ fontSize: 9, color: "#c0c0c0", letterSpacing: 1 }}>CURRENT_LOC</div>
        <div style={{ fontSize: 13, color: "#ffffff", letterSpacing: 1 }}>{locationName}</div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        <Sidebar active="WORLD" />
        {/* Map canvas */}
        <div
          style={{
            flex: 1,
            background: "#0a0a0a",
            overflow: "hidden",
            display: "grid",
            gridTemplateColumns: `repeat(${N}, 1fr)`,
            gridTemplateRows: `repeat(${N}, 1fr)`,
            gap: "1px",
            backgroundColor: "#000000",
          }}
        >
          {grid.map((row, r) =>
            row.map((_, c) => {
              const isCurrent = currentPosition.row === r && currentPosition.col === c;
              const fill = revealed[r]?.[c] ? "#2e2e2e" : "#1a1a1a";
              return (
                <div
                  key={`${r}-${c}`}
                  style={{
                    backgroundColor: fill,
                    border: isCurrent ? "2px solid #ffffff" : undefined,
                    boxSizing: "border-box",
                  }}
                />
              );
            }),
          )}
        </div>
      </div>
    </div>
  );
}
