// frontend/src/pages/FraudAnalysis.jsx

import React, { useEffect, useState } from "react";
import { fetchFraudCycles, fetchRiskLogs } from "../services/api";
import FraudExplanationPanel from "../components/FraudExplanationPanel";
import GraphView             from "../components/GraphView";
import FraudTable            from "../components/FraudTable";
import { motion } from "framer-motion";

export default function FraudAnalysis() {
  const [cycles, setCycles] = useState([]);
  const [riskLogs, setRiskLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState("explanation");

  useEffect(() => {
    Promise.all([fetchFraudCycles(), fetchRiskLogs()]).then(([c, l]) => {
      setCycles(c.cycles || []);
      setRiskLogs(l);
      setLoading(false);
    });
  }, []);

  if (loading) return <div className="min-h-screen bg-black pt-24 px-6 text-[#00FF66] font-mono animate-pulse">Initializing surveillance modules...</div>;

  const tabs = [
    { key: "explanation", label: "EXPLANATION_MATRIX"  },
    { key: "graph",       label: "NETWORK_TOPOLOGY" },
    { key: "logs",        label: "RAW_RISK_LOGS"     },
  ];

  return (
    <div className="min-h-screen bg-black grid-bg pt-24 pb-12 px-6">
      <div className="max-w-7xl mx-auto">
        
        <header className="mb-8 border-b border-[#00FF66]/20 pb-6">
          <h1 className="text-3xl font-bold text-white mb-2 tracking-tight">Surveillance Analytics</h1>
          <p className="text-[#00FF66] font-mono text-sm opacity-80">
            &gt; {cycles.length} active rings isolated. {riskLogs.length} events logged.
          </p>
        </header>

        {/* Neon Tab Bar */}
        <div className="flex gap-4 mb-8">
          {tabs.map((t) => (
            <button key={t.key} onClick={() => setTab(t.key)} 
              className={`px-4 py-2 font-mono text-xs uppercase tracking-wider rounded border transition-all ${
                tab === t.key 
                  ? "border-[#00FF66] bg-[#00FF66]/10 text-[#00FF66] drop-shadow-neon" 
                  : "border-white/10 text-gray-500 hover:text-white hover:border-white/30"
              }`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* Tab Content wrapped in glassmorphism */}
        <motion.div
          key={tab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass p-6"
        >
          {tab === "explanation" && <FraudExplanationPanel cycles={cycles} />}
          {tab === "graph" && (
            cycles.length > 0 ? (
              <div className="h-[600px]"><GraphView cycles={cycles} /></div>
            ) : <p className="text-gray-500 font-mono text-sm">NO_TOPOLOGY_DATA_FOUND</p>
          )}
          {tab === "logs" && <FraudTable logs={riskLogs} />}
        </motion.div>

      </div>
    </div>
  );
}