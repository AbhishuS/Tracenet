// frontend/src/components/FraudExplanationPanel.jsx

import React, { useState } from "react";

export default function FraudExplanationPanel({ cycles }) {
  const [selected, setSelected] = useState(0);

  if (!cycles || cycles.length === 0) return <p>No fraud cycles to explain.</p>;

  const c = cycles[selected];

  const factors = [
    {
      active: true,
      weight: "50%",
      label:  "Circular Trading Cycle Detected",
      detail: `Path: ${c.cycle.map((id) => `T-${id}`).join(" → ")}`,
      color:  "#ef4444"
    },
    {
      active: c.confidence >= 30,
      weight: "30%",
      label:  "High Trading Frequency",
      detail: "Same pair traded repeatedly within 24 hours",
      color:  "#f97316"
    },
    {
      active: c.trust_score < 50,
      weight: "20%",
      label:  "Low Trust Score",
      detail: `Origin trader T-${c.origin} has trust score: ${c.trust_score}`,
      color:  "#facc15"
    }
  ];

  return (
    <div>
      {/* Cycle selector */}
      <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginBottom: "16px" }}>
        {cycles.slice(0, 10).map((cyc, i) => (
          <button
            key={i}
            onClick={() => setSelected(i)}
            style={{
              padding: "6px 12px",
              borderRadius: "6px",
              border: "none",
              cursor: "pointer",
              background: selected === i ? "#ef4444" : "#1e293b",
              color: "#f1f5f9",
              fontWeight: selected === i ? "bold" : "normal"
            }}
          >
            Ring #{i + 1} ({cyc.ring_size}-node)
          </button>
        ))}
      </div>

      {/* Explanation card */}
      <div style={{ background: "#1e293b", borderRadius: "12px", padding: "20px", borderLeft: `4px solid ${c.confidence >= 60 ? "#ef4444" : "#f97316"}` }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
          <h3 style={{ margin: 0 }}>
            🔴 Fraud Ring #{selected + 1} — {c.ring_size}-Node Cycle
          </h3>
          <span style={{
            background: c.confidence >= 60 ? "#ef4444" : c.confidence >= 30 ? "#f97316" : "#22c55e",
            padding: "4px 12px", borderRadius: "20px", fontWeight: "bold", fontSize: "0.9rem"
          }}>
            Confidence: {c.confidence}%
          </span>
        </div>

        {/* Cycle path visual */}
        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexWrap: "wrap", marginBottom: "20px", padding: "12px", background: "#0f172a", borderRadius: "8px" }}>
          {c.cycle.map((traderId, i) => (
            <React.Fragment key={i}>
              <span style={{ background: "#ef4444", color: "#fff", padding: "4px 10px", borderRadius: "6px", fontWeight: "bold" }}>
                T-{traderId}
              </span>
              {i < c.cycle.length - 1 && <span style={{ color: "#94a3b8" }}>→</span>}
            </React.Fragment>
          ))}
        </div>

        {/* Risk factor breakdown */}
        <h4 style={{ marginBottom: "12px", color: "#94a3b8" }}>Why is this suspicious?</h4>
        {factors.map((f, i) => (
          <div key={i} style={{
            display: "flex", alignItems: "flex-start", gap: "12px",
            marginBottom: "10px", opacity: f.active ? 1 : 0.4
          }}>
            <span style={{ fontSize: "1.2rem" }}>{f.active ? "🔴" : "⚪"}</span>
            <div style={{ flex: 1 }}>
              <div style={{ display: "flex", justifyContent: "space-between" }}>
                <strong style={{ color: f.active ? f.color : "#64748b" }}>{f.label}</strong>
                <span style={{ color: "#64748b", fontSize: "0.8rem" }}>weight: {f.weight}</span>
              </div>
              <p style={{ margin: "2px 0 0", fontSize: "0.85rem", color: "#94a3b8" }}>{f.detail}</p>
            </div>
          </div>
        ))}

        {/* Involved trade IDs */}
        <div style={{ marginTop: "16px", padding: "10px", background: "#0f172a", borderRadius: "8px" }}>
          <span style={{ color: "#64748b", fontSize: "0.8rem" }}>
            Trade IDs involved: {c.trades?.join(", ") || "N/A"}
          </span>
        </div>
      </div>
    </div>
  );
}