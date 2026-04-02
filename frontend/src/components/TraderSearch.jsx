// frontend/src/components/TraderSearch.jsx

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { fetchTraders } from "../services/api";

export default function TraderSearch() {
  const [query,    setQuery]    = useState("");
  const [traders,  setTraders]  = useState([]);
  const [filtered, setFiltered] = useState([]);
  const [open,     setOpen]     = useState(false);
  const navigate = useNavigate();
  const wrapperRef = useRef();

  useEffect(() => {
    fetchTraders().then(setTraders);
  }, []);

  useEffect(() => {
    if (!query.trim()) { setFiltered([]); setOpen(false); return; }

    const q = query.toLowerCase();
    const results = traders.filter((t) =>
      String(t.trader_id).includes(q) ||
      t.trader_name.toLowerCase().includes(q)
    ).slice(0, 8);

    setFiltered(results);
    setOpen(results.length > 0);
  }, [query, traders]);

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const handleSelect = (trader) => {
    setQuery("");
    setOpen(false);
    navigate(`/trader/${trader.trader_id}`);
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && filtered.length > 0) {
      handleSelect(filtered[0]);
    }
  };

  const getRiskColor = (score) => {
    if (score < 40) return "#ef4444";
    if (score < 70) return "#f97316";
    return "#22c55e";
  };

  return (
    <div ref={wrapperRef} style={{ position: "relative", width: "320px" }}>
      <div style={{ position: "relative" }}>
        <span style={{
          position: "absolute", left: "12px", top: "50%",
          transform: "translateY(-50%)", color: "#64748b", fontSize: "1rem"
        }}>🔍</span>
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Search trader by ID or name..."
          style={{
            width: "100%", padding: "10px 12px 10px 36px",
            background: "#1e293b", border: "1px solid #334155",
            borderRadius: "8px", color: "#f1f5f9", fontSize: "0.9rem",
            outline: "none", boxSizing: "border-box"
          }}
        />
        {query && (
          <span
            onClick={() => { setQuery(""); setOpen(false); }}
            style={{
              position: "absolute", right: "12px", top: "50%",
              transform: "translateY(-50%)", color: "#64748b",
              cursor: "pointer", fontSize: "1rem"
            }}
          >✕</span>
        )}
      </div>

      {/* Dropdown results */}
      {open && (
        <div style={{
          position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0,
          background: "#1e293b", border: "1px solid #334155", borderRadius: "8px",
          boxShadow: "0 8px 32px rgba(0,0,0,0.4)", zIndex: 999, overflow: "hidden"
        }}>
          {filtered.map((t) => (
            <div
              key={t.trader_id}
              onClick={() => handleSelect(t)}
              style={{
                padding: "10px 14px", cursor: "pointer", display: "flex",
                justifyContent: "space-between", alignItems: "center",
                borderBottom: "1px solid #0f172a",
                transition: "background 0.15s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#0f172a"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              <div>
                <span style={{ fontWeight: "bold", color: "#f1f5f9" }}>
                  T-{t.trader_id}
                </span>
                <span style={{ color: "#94a3b8", marginLeft: "10px", fontSize: "0.9rem" }}>
                  {t.trader_name}
                </span>
              </div>
              <span style={{
                background: getRiskColor(t.trust_score),
                color: "#000", padding: "2px 8px",
                borderRadius: "10px", fontSize: "0.75rem", fontWeight: "bold"
              }}>
                Trust: {t.trust_score}
              </span>
            </div>
          ))}
          <div style={{ padding: "6px 14px", color: "#64748b", fontSize: "0.75rem" }}>
            Press Enter to open first result · {filtered.length} result(s)
          </div>
        </div>
      )}
    </div>
  );
}