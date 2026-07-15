import { AllegianceGlyph } from "./AllegianceGlyph";

export interface DecisionChoice {
  id: string;
  label: string;
  description: string;
}

interface Props {
  narrative: string;
  choices: DecisionChoice[];
  onChoose: (id: string) => void;
  allegiancePreview: Record<string, number>;
}

export function DecisionScene({ narrative, choices, onChoose, allegiancePreview }: Props) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0a0a", color: "#c0c0c0" }}>
      {/* Top bar */}
      <div
        style={{
          height: 48,
          borderBottom: "1px solid #2e2e2e",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 16px",
        }}
        className="font-mono text-[13px]"
      >
        <span style={{ color: "#ffffff", letterSpacing: 1 }}>AETHER_OS</span>
        <AllegianceGlyph allegiance={allegiancePreview} />
      </div>

      {/* Narrative */}
      <div style={{ display: "flex", justifyContent: "center", padding: "24px 16px" }}>
        <p
          className="font-display"
          style={{
            fontStyle: "italic",
            maxWidth: 600,
            textAlign: "center",
            fontSize: 22,
            lineHeight: 1.5,
            color: "#c0c0c0",
          }}
        >
          {narrative}
        </p>
      </div>

      {/* Choices */}
      <div
        style={{
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          gap: 16,
          padding: "16px",
        }}
      >
        {choices.map((c) => (
          <button
            key={c.id}
            onClick={() => onChoose(c.id)}
            className="font-mono choice-card"
            style={{
              width: 200,
              background: "#1a1a1a",
              border: "1px solid #2e2e2e",
              padding: 24,
              textAlign: "left",
              color: "#c0c0c0",
              cursor: "pointer",
              transition: "border-color 120ms",
            }}
          >
            <div
              aria-hidden
              style={{
                width: 16,
                height: 16,
                border: "1px solid #c0c0c0",
                marginBottom: 12,
              }}
            />
            <div style={{ color: "#ffffff", fontWeight: 700, fontSize: 13, marginBottom: 8 }}>
              {c.label}
            </div>
            <div style={{ color: "#c0c0c0", opacity: 0.7, fontSize: 12, lineHeight: 1.4 }}>
              {c.description}
            </div>
          </button>
        ))}
      </div>
      <style>{`.choice-card:hover { border-color: #ffffff !important; }`}</style>
    </div>
  );
}
