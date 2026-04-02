// frontend/src/components/TraderCard.jsx

import React from "react";
import { useNavigate } from "react-router-dom";

export default function TraderCard({ trader }) {
  const navigate = useNavigate();

  const riskColor =
    trader.trust_score < 40  ? "#ef4444" :
    trader.trust_score < 70  ? "#f97316" : "#22c55e";

  const riskLabel =
    trader.trust_score < 40  ? "HIGH RISK" :
    trader.trust_score < 70  ? "MEDIUM RISK" : "LOW RISK";

  return (
    <div
      onClick={() => navigate(`/trader/${trader.trader_id}`)}
      style={{ cursor: "pointer", border: `1px solid ${riskColor}`, padding: "16px", borderRadius: "10px" }}
    >
      <h3>{trader.trader_name}</h3>
      <p>Trust Score: <strong style={{ color: riskColor }}>{trader.trust_score}</strong></p>
      <span style={{ background: riskColor, color: "#fff", padding: "2px 8px", borderRadius: "4px", fontSize: "0.75rem" }}>
        {riskLabel}
      </span>
    </div>
  );
}