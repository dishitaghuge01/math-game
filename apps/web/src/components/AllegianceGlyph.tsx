export function AllegianceGlyph({ allegiance }: { allegiance: Record<string, number> }) {
  const keys = Object.keys(allegiance);
  const n = Math.max(keys.length, 3);
  const size = 32;
  const cx = size / 2;
  const cy = size / 2;
  const r = 14;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke="#2e2e2e" />
      {keys.map((k, i) => {
        const a = (i / n) * Math.PI * 2 - Math.PI / 2;
        const v = Math.max(0.2, Math.min(1, (allegiance[k] + 1) / 2));
        const x = cx + Math.cos(a) * r * v;
        const y = cy + Math.sin(a) * r * v;
        return <line key={k} x1={cx} y1={cy} x2={x} y2={y} stroke="#ffffff" strokeWidth={1} />;
      })}
      <circle cx={cx} cy={cy} r={1.5} fill="#ffffff" />
    </svg>
  );
}
