// frontend/src/pages/StockRegistry.jsx

import React, { useEffect, useState } from "react";

export default function StockRegistry() {
  const [stocks, setStocks] = useState([]);

  useEffect(() => {
    fetch("http://localhost:5000/api/stocks")
      .then((r) => r.json())
      .then(setStocks);
  }, []);

  return (
    <div style={{ padding: "24px", background: "#0f172a", minHeight: "100vh", color: "#f1f5f9" }}>
      <h1>📈 Stock Registry</h1>
      <p style={{ color: "#64748b", marginBottom: "20px" }}>{stocks.length} stocks in system</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px,1fr))", gap: "12px" }}>
        {stocks.map((s) => (
          <div key={s.stock_id} style={{ background: "#1e293b", padding: "16px", borderRadius: "10px" }}>
            <h2 style={{ margin: 0, color: "#38bdf8" }}>{s.symbol}</h2>
            <p style={{ margin: "4px 0 0", color: "#94a3b8", fontSize: "0.85rem" }}>{s.company_name}</p>
          </div>
        ))}
      </div>
    </div>
  );
}