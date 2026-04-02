// frontend/src/components/RiskHeatmap.jsx

import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { fetchTraders } from "../services/api";
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  BarElement, Title, Tooltip, Legend
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

export default function RiskHeatmap() {
  const [traders, setTraders] = useState([]);

  useEffect(() => { fetchTraders().then(setTraders); }, []);

  // Bucket traders into risk bands
  const buckets = { "0-20": 0, "21-40": 0, "41-60": 0, "61-80": 0, "81-100": 0 };
  traders.forEach((t) => {
    const s = t.trust_score;
    if      (s <= 20)  buckets["0-20"]++;
    else if (s <= 40)  buckets["21-40"]++;
    else if (s <= 60)  buckets["41-60"]++;
    else if (s <= 80)  buckets["61-80"]++;
    else               buckets["81-100"]++;
  });

  const chartData = {
    labels: Object.keys(buckets).map((b) => `Trust ${b}`),
    datasets: [{
      label: "Number of Traders",
      data: Object.values(buckets),
      backgroundColor: ["#ef4444", "#f97316", "#facc15", "#84cc16", "#22c55e"],
      borderRadius: 6
    }]
  };

  const options = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: {
        display: true,
        text: "Trader Risk Distribution (by Trust Score)",
        color: "#f1f5f9"
      }
    },
    scales: {
      x: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } },
      y: { ticks: { color: "#94a3b8" }, grid: { color: "#1e293b" } }
    }
  };

  return (
    <div style={{ background: "#1e293b", padding: "20px", borderRadius: "12px" }}>
      <Bar data={chartData} options={options} />
    </div>
  );
}