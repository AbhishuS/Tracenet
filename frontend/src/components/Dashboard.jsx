// frontend/src/components/Dashboard.jsx

import React, { useEffect, useState, useRef } from "react";
import { io } from "socket.io-client";
import { motion, AnimatePresence } from "framer-motion";
import { Activity, ShieldAlert, Zap, Users } from "lucide-react";

import { fetchStats, fetchFraudCycles, fetchRiskLogs, fetchTraders } from "../services/api";
import GraphView from "./GraphView";
import FraudTable from "./FraudTable";
import TraderCard from "./TraderCard";
import RiskHeatmap from "./RiskHeatmap";
import InsertTradeForm from "./InsertTradeForm";

const SOCKET_URL = "http://localhost:5000";

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [cycles, setCycles] = useState([]);
  const [riskLogs, setRiskLogs] = useState([]);
  const [traders, setTraders] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [flashRed, setFlashRed] = useState(false);
  const socketRef = useRef(null);

  useEffect(() => {
    fetchStats().then(setStats);
    fetchFraudCycles().then((d) => setCycles(d.cycles || []));
    fetchRiskLogs().then(setRiskLogs);
    fetchTraders().then(setTraders);

    socketRef.current = io(SOCKET_URL);
    socketRef.current.on("fraud_alert", (newAlerts) => {
      setAlerts((prev) => [...newAlerts, ...prev].slice(0, 10));
      setFlashRed(true);
      setTimeout(() => setFlashRed(false), 1500);
    });

    return () => socketRef.current?.disconnect();
  }, []);

  return (
    <div className="relative min-h-screen grid-bg transition-colors duration-500" style={{ background: flashRed ? "#1a0000" : "transparent" }}>
      {/* Background Glow */}
      <div className={`absolute inset-0 pointer-events-none transition-opacity duration-500 ${flashRed ? "radial-glow-crimson opacity-60" : "radial-glow opacity-20"}`} />

      <div className="relative z-10 max-w-7xl mx-auto px-6 pb-24">
        
        {/* Real-time Alert Banner */}
        <AnimatePresence>
          {alerts.length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
              className="mb-8 border border-[#FF0033]/50 bg-[#FF0033]/10 backdrop-blur-md p-4 rounded-xl flex items-center gap-4 shadow-crimson"
            >
              <div className="w-3 h-3 rounded-full bg-[#FF0033] animate-pulse" />
              <strong className="text-[#FF0033] tracking-widest uppercase text-sm">Live Fraud Detected:</strong>
              <span className="text-white font-mono text-sm">{alerts[0]?.reason}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Overview Stats */}
        {stats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-12">
            {[
              { label: "Total Trades", value: stats.total_trades, icon: <Activity /> },
              { label: "High Risk Trades", value: stats.high_risk_trades, icon: <ShieldAlert />, isAlert: true },
              { label: "High Risk Traders", value: stats.high_risk_traders, icon: <Users />, isAlert: true },
              { label: "Total Fraud Logs", value: stats.total_fraud_logs, icon: <Zap /> },
            ].map((s, i) => (
              <motion.div key={s.label} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }} className="glass p-6">
                <div className="flex justify-between items-start mb-4">
                  <p className="text-gray-400 text-sm uppercase tracking-wider font-semibold">{s.label}</p>
                  <div className={s.isAlert && s.value > 0 ? "text-[#FF0033]" : "text-[#00FF66]"}>{s.icon}</div>
                </div>
                <h2 className={`text-4xl font-bold ${s.isAlert && s.value > 0 ? "crimson-text" : "neon-text"}`}>
                  {s.value.toLocaleString()}
                </h2>
              </motion.div>
            ))}
          </div>
        )}

        {/* Main Grid: Graph & Insert Trade */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-12">
          <div className="lg:col-span-2 glass p-6">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
              <Network className="text-[#00FF66]" /> Surveillance Network
            </h2>
            {cycles.length > 0 ? <GraphView cycles={cycles} /> : <div className="h-[520px] flex items-center justify-center text-gray-500 font-mono text-sm border border-white/5 rounded-xl">SYSTEM IDLE — AWAITING TRADE DATA</div>}
          </div>
          
          <div className="space-y-8">
            <InsertTradeForm onInserted={() => fetchStats().then(setStats)} />
            <div className="glass p-6">
               <h2 className="text-xl font-bold mb-4">Risk Distribution</h2>
               <RiskHeatmap />
            </div>
          </div>
        </div>

        {/* Risk Logs & High Risk Traders */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div className="glass p-6">
            <h2 className="text-xl font-bold mb-6 text-[#FF0033]">⚠️ Live Risk Feed</h2>
            <FraudTable logs={riskLogs.slice(0, 10)} />
          </div>
          <div className="glass p-6">
            <h2 className="text-xl font-bold mb-6">High Risk Entities</h2>
            <div className="grid grid-cols-2 gap-4">
              {traders.filter((t) => t.trust_score < 60).slice(0, 6).map((t) => (
                <TraderCard key={t.trader_id} trader={t} />
              ))}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}