// frontend/src/components/FraudTable.jsx

import React from "react";

export default function FraudTable({ logs }) {
  return (
    <table style={{ width: "100%", borderCollapse: "collapse" }}>
      <thead>
        <tr>
          <th>Trade ID</th>
          <th>Risk Score</th>
          <th>Reason</th>
          <th>Detected At</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.risk_id} style={{ borderBottom: "1px solid #334155" }}>
            <td>{log.trade_id}</td>
            <td>
              <span style={{
                color: log.risk_score >= 60 ? "#ef4444" :
                       log.risk_score >= 30 ? "#f97316" : "#22c55e",
                fontWeight: "bold"
              }}>
                {log.risk_score}
              </span>
            </td>
            <td style={{ fontSize: "0.85rem" }}>{log.reason}</td>
            <td>{new Date(log.detected_at).toLocaleString()}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}