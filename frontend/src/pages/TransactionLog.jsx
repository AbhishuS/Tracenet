// frontend/src/pages/TransactionLog.jsx

import React, { useEffect, useState } from "react";
import { fetchTrades, fetchRiskLogs } from "../services/api";
import { motion } from "framer-motion";

export default function TransactionLog() {
  const [trades, setTrades] = useState([]);
  const [riskMap, setRiskMap] = useState({});
  const [page, setPage] = useState(1);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => { fetchTrades(page).then(setTrades); }, [page]);
  useEffect(() => {
    fetchRiskLogs().then((logs) => {
      const map = {}; logs.forEach((l) => { map[l.trade_id] = l; });
      setRiskMap(map);
    });
  }, []);

  const getRiskLabel = (id) => {
    const log = riskMap[id];
    if (!log) return { label: "CLEAN", style: "text-[#00FF66] border-[#00FF66]/30 bg-[#00FF66]/10" };
    if (log.risk_score >= 60) return { label: "HIGH", style: "text-[#FF0033] border-[#FF0033]/50 bg-[#FF0033]/10" };
    return { label: "WARN", style: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10" };
  };

  const filtered = trades.filter((t) => filter === "ALL" || getRiskLabel(t.trade_id).label === filter);

  return (
    <div className="bg-black min-h-screen pt-24 pb-12 px-6 grid-bg">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-bold mb-8">System Ledger</h1>

        <div className="flex gap-4 mb-6">
          {["ALL", "HIGH", "WARN", "CLEAN"].map((f) => (
            <button key={f} onClick={() => setFilter(f)} 
              className={`px-4 py-1.5 rounded text-sm font-mono transition-colors border ${filter === f ? "border-[#00FF66] text-[#00FF66] bg-[#00FF66]/10" : "border-white/10 text-gray-500 hover:text-white"}`}>
              {f}
            </button>
          ))}
        </div>

        <div className="glass overflow-hidden rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-[#00FF66]/20 bg-black/40 text-gray-400 text-xs uppercase font-mono tracking-wider">
                <th className="p-4">Tx ID</th><th className="p-4">Entity A</th><th className="p-4">Entity B</th>
                <th className="p-4">Asset</th><th className="p-4">Value</th><th className="p-4">Status</th>
              </tr>
            </thead>
            <tbody className="font-mono text-sm">
              {filtered.map((t) => {
                const risk = getRiskLabel(t.trade_id);
                return (
                  <motion.tr key={t.trade_id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} 
                    className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-gray-500">#{t.trade_id}</td>
                    <td className="p-4">T-{t.seller_id}</td>
                    <td className="p-4">T-{t.buyer_id}</td>
                    <td className="p-4 text-gray-400">{t.stock_id}</td>
                    <td className="p-4">${t.price}</td>
                    <td className="p-4">
                      <span className={`px-2 py-1 border rounded text-xs ${risk.style}`}>{risk.label}</span>
                    </td>
                  </motion.tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}