// frontend/src/pages/TraderProfile.jsx

import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { fetchTraderById } from "../services/api";
import { Line } from "react-chartjs-2";
import { motion } from "framer-motion";
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Title, Tooltip, Legend);

export default function TraderProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);

  useEffect(() => { fetchTraderById(id).then(setData); }, [id]);

  if (!data) return <div className="min-h-screen bg-black pt-24 px-6 text-[#00FF66] font-mono animate-pulse">Locating Entity...</div>;

  const { trader, trades, riskLogs, trustHistory } = data;
  const isHighRisk = trader.trust_score < 50;
  const accentColor = isHighRisk ? "#FF0033" : "#00FF66";

  const chartData = {
    labels: trustHistory.map((h) => new Date(h.recorded_at).toLocaleDateString()),
    datasets: [{
      label: "Trust Score",
      data: trustHistory.map((h) => h.trust_score),
      borderColor: accentColor,
      backgroundColor: `${accentColor}20`,
      tension: 0.3, fill: true, pointBackgroundColor: accentColor
    }]
  };

  return (
    <div className="bg-black min-h-screen grid-bg pt-24 pb-12 px-6 text-white">
      <div className="max-w-5xl mx-auto space-y-8">
        
        {/* Header Profile Card */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="glass p-8 flex justify-between items-center border-l-4" style={{ borderLeftColor: accentColor }}>
          <div>
            <h1 className="text-3xl font-bold mb-2">Entity: {trader.trader_name}</h1>
            <p className="text-gray-400 font-mono text-sm">ID: T-{trader.trader_id} | REG: {new Date(trader.registration_date).toLocaleDateString()}</p>
          </div>
          <div className="text-right">
            <p className="text-gray-400 font-mono text-xs mb-1 uppercase tracking-widest">System Trust Score</p>
            <p className="text-5xl font-bold" style={{ color: accentColor, textShadow: `0 0 20px ${accentColor}80` }}>
              {trader.trust_score}
            </p>
          </div>
        </motion.div>

        {/* Trust History Chart */}
        {trustHistory.length > 0 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }} className="glass p-6">
            <h2 className="text-lg font-mono mb-4 text-gray-300">Historical Trust Analytics</h2>
            <div className="h-[300px]">
              <Line data={chartData} options={{ responsive: true, maintainAspectRatio: false, scales: { x: { grid: { color: "#1f2937" }, ticks: { color: "#6b7280" } }, y: { grid: { color: "#1f2937" }, ticks: { color: "#6b7280" } } }, plugins: { legend: { display: false } } }} />
            </div>
          </motion.div>
        )}

        {/* Recent Activity */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="glass p-6">
          <h2 className="text-lg font-mono mb-4 text-gray-300">Transaction Ledger</h2>
          <table className="w-full text-left font-mono text-sm">
            <thead className="text-gray-500 border-b border-white/10">
              <tr><th className="pb-3">ID</th><th className="pb-3">Stock</th><th className="pb-3">Buyer</th><th className="pb-3">Value</th><th className="pb-3">Date</th></tr>
            </thead>
            <tbody>
              {trades.slice(0, 10).map((t) => (
                <tr key={t.trade_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                  <td className="py-3 text-gray-400">#{t.trade_id}</td>
                  <td className="py-3">{t.stock_id}</td>
                  <td className="py-3">T-{t.buyer_id}</td>
                  <td className="py-3 text-[#00FF66]">${t.price}</td>
                  <td className="py-3 text-gray-500">{new Date(t.timestamp).toLocaleDateString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </motion.div>

      </div>
    </div>
  );
}