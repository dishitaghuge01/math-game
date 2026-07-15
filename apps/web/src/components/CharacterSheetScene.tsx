interface Vector {
  morality: number;
  aggression: number;
  curiosity: number;
  riskTolerance: number;
  socialAffinity: number;
}

interface Props {
  vector: Vector;
  volatility: number;
  allegiance: Record<string, number>;
}

const AXES: { key: keyof Vector; label: string; min: number; max: number }[] = [
  { key: "morality", label: "MORALITY", min: -1, max: 1 },
  { key: "aggression", label: "AGGRESSION", min: 0, max: 1 },
  { key: "curiosity", label: "CURIOSITY", min: 0, max: 1 },
  { key: "riskTolerance", label: "RISK_TOLERANCE", min: 0, max: 1 },
  { key: "socialAffinity", label: "SOCIAL_AFFINITY", min: -1, max: 1 },
];

function RadarChart({ vector }: { vector: Vector }) {
  const size = 320;
  const cx = size / 2;
  const cy = size / 2;
  const r = 110;
  const n = AXES.length;

  const point = (i: number, mag: number) => {
    const a = (i / n) * Math.PI * 2 - Math.PI / 2;
    return [cx + Math.cos(a) * r * mag, cy + Math.sin(a) * r * mag] as const;
  };

  const rings = [0.25, 0.5, 0.75, 1];

  const polygon = AXES.map((ax, i) => {
    const v = vector[ax.key];
    const norm = (v - ax.min) / (ax.max - ax.min); // 0..1
    return point(i, Math.max(0, Math.min(1, norm))).join(",");
  }).join(" ");

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((rr) => (
        <polygon
          key={rr}
          points={AXES.map((_, i) => point(i, rr).join(",")).join(" ")}
          fill="none"
          stroke="#2e2e2e"
          strokeWidth={1}
        />
      ))}
      {AXES.map((_, i) => {
        const [x, y] = point(i, 1);
        return <line key={i} x1={cx} y1={cy} x2={x} y2={y} stroke="#2e2e2e" strokeWidth={1} />;
      })}
      <polygon points={polygon} fill="#ffffff" fillOpacity={0.15} stroke="#ffffff" strokeWidth={1.5} />
      {AXES.map((ax, i) => {
        const [x, y] = point(i, 1.22);
        return (
          <text
            key={ax.key}
            x={x}
            y={y}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#c0c0c0"
            fontSize={10}
            fontFamily="ui-monospace, monospace"
          >
            {ax.label}
          </text>
        );
      })}
    </svg>
  );
}

function Sparkline({ volatility }: { volatility: number }) {
  const points = Array.from({ length: 12 }, (_, index) => {
    const wave = Math.sin((index / 3) * Math.PI + volatility * 2) * 0.5;
    const trend = (volatility - 0.5) * 0.25;
    const value = 0.35 + 0.3 * Math.sin(index * 0.7 + volatility * 3) + wave + trend;
    return Math.max(0.05, Math.min(0.95, value));
  });

  const w = 320;
  const h = 60;
  const step = w / (points.length - 1);
  const path = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${i * step} ${h - p * h}`)
    .join(" ");

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke="#ffffff" strokeWidth={1} />
    </svg>
  );
}

function AllegianceBar({ name, value }: { name: string; value: number }) {
  const pct = Math.max(-1, Math.min(1, value));
  const width = Math.abs(pct) * 50; // half-width percent
  const isPos = pct >= 0;
  return (
    <div style={{ marginBottom: 12 }} className="font-mono">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          fontSize: 11,
          color: "#c0c0c0",
          marginBottom: 4,
        }}
      >
        <span>{name}</span>
        <span style={{ color: "#ffffff" }}>{pct >= 0 ? "+" : ""}{pct.toFixed(2)}</span>
      </div>
      <div style={{ position: "relative", height: 8, background: "#1a1a1a", border: "1px solid #2e2e2e" }}>
        <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "#2e2e2e" }} />
        <div
          style={{
            position: "absolute",
            top: 0,
            bottom: 0,
            left: isPos ? "50%" : `${50 - width}%`,
            width: `${width}%`,
            background: "#ffffff",
          }}
        />
      </div>
    </div>
  );
}

export function CharacterSheetScene({ vector, volatility, allegiance }: Props) {
  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#0a0a0a",
        color: "#c0c0c0",
        padding: 24,
        display: "flex",
        justifyContent: "center",
      }}
    >
      <div style={{ width: "100%", maxWidth: 520 }}>
        <h1
          className="font-display"
          style={{ textAlign: "center", fontSize: 32, letterSpacing: 2, color: "#ffffff", marginBottom: 24 }}
        >
          AETHER_PROFILE
        </h1>

        <div style={{ display: "flex", justifyContent: "center", marginBottom: 24 }}>
          <RadarChart vector={vector} />
        </div>

        <section
          style={{
            background: "#1a1a1a",
            border: "1px solid #2e2e2e",
            padding: 16,
            marginBottom: 24,
          }}
          className="font-mono"
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 8, fontSize: 12 }}>
            <span style={{ color: "#ffffff", letterSpacing: 1 }}>VOLATILITY_CORE</span>
            <span style={{ color: "#ffffff" }}>{Math.round(volatility * 100)}%</span>
          </div>
          <Sparkline volatility={volatility} />
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 10, color: "#c0c0c0", marginTop: 4 }}>
            <span>STABLE</span>
            <span>CRITICAL_THRESHOLD</span>
          </div>
        </section>

        <section>
          <div className="font-mono" style={{ color: "#ffffff", fontSize: 12, letterSpacing: 1, marginBottom: 12 }}>
            FACTION_ALIGNMENT
          </div>
          {Object.entries(allegiance).map(([name, value]) => (
            <AllegianceBar key={name} name={name} value={value} />
          ))}
        </section>
      </div>
    </div>
  );
}
