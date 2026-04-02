import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import {
  api,
  normalizeArrayPayload,
  normalizeCycles,
  badgeClass,
} from '../services/api';

const SOCKET_URL = 'http://localhost:5000';

function scoreBadgeClass(score) {
  const val = Number(score || 0);
  if (val >= 70) return 'badge badge-high';
  if (val >= 40) return 'badge badge-medium';
  return 'badge badge-low';
}

function formatTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

function rotateToSmallest(arr) {
  if (!Array.isArray(arr) || !arr.length) return [];
  const values = arr.map((x) => String(x));
  let best = values;

  for (let i = 1; i < values.length; i += 1) {
    const rotated = [...values.slice(i), ...values.slice(0, i)];
    if (rotated.join('|') < best.join('|')) {
      best = rotated;
    }
  }

  return best;
}

function dedupeRotationalLoops(items) {
  if (!Array.isArray(items)) return [];

  const seen = new Set();
  const result = [];

  for (const item of items) {
    const cycle = Array.isArray(item?.cycle) ? item.cycle.map(String) : [];
    if (!cycle.length) continue;

    const canonicalCycle = rotateToSmallest(cycle);
    const key = `${item?.stock_id || item?.symbol || ''}__${canonicalCycle.join('->')}`;

    if (seen.has(key)) continue;
    seen.add(key);

    result.push({
      ...item,
      cycle: canonicalCycle,
      trader_ids: canonicalCycle,
    });
  }

  return result.sort((a, b) => {
    const depthDiff = Number(b?.max_depth ?? b?.depth ?? 0) - Number(a?.max_depth ?? a?.depth ?? 0);
    if (depthDiff !== 0) return depthDiff;

    const confDiff = Number(b?.confidence ?? 0) - Number(a?.confidence ?? 0);
    if (confDiff !== 0) return confDiff;

    return String(a?.symbol || a?.stock_id || '').localeCompare(String(b?.symbol || b?.stock_id || ''));
  });
}

function FraudAlertToast({ alert, onClose }) {
  if (!alert) return null;

  const hasCycle = Array.isArray(alert.cycle_path) && alert.cycle_path.length >= 4;

  return (
    <div
      style={{
        position: 'fixed',
        top: 88,
        right: 24,
        width: 360,
        zIndex: 1000,
        background: 'linear-gradient(180deg, rgba(26,33,25,0.96), rgba(5,6,5,0.98))',
        border: '1px solid rgba(26,254,28,0.16)',
        borderRadius: 18,
        padding: 18,
        boxShadow: '0 18px 50px rgba(0,0,0,0.55)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
        <div style={{ display: 'flex', gap: 12 }}>
          <div
            style={{
              width: 14,
              height: 14,
              borderRadius: 999,
              background: 'rgb(26, 254, 28)',
              boxShadow: '0 0 18px rgba(26,254,28,0.48)',
              marginTop: 4,
              flexShrink: 0,
            }}
          />
          <div>
            <div style={{ color: '#f5fff5', fontSize: 16, fontWeight: 900 }}>
              {hasCycle ? 'Circular Loop Detected' : 'Suspicious Activity'}
            </div>
            <div style={{ color: 'rgba(220,255,220,0.66)', fontSize: 14, lineHeight: 1.4, marginTop: 6 }}>
              {hasCycle
                ? `Loop: ${alert.cycle_path.join(' → ')}`
                : alert.reason || 'Suspicious trade activity'}
            </div>
            <div style={{ color: 'rgba(150,190,150,0.50)', fontSize: 12, marginTop: 8 }}>
              Trade #{alert.trade_id} • Score {alert.risk_score}
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          style={{
            background: 'transparent',
            border: 0,
            color: 'rgba(220,255,220,0.66)',
            cursor: 'pointer',
            fontSize: 20,
            lineHeight: 1,
          }}
        >
          ×
        </button>
      </div>
    </div>
  );
}

function StatCard({ label, value, color }) {
  return (
    <div className="glass-strong card-hover" style={{ padding: 22 }}>
      <div
        style={{
          color: 'rgba(220,255,220,0.66)',
          fontSize: 12,
          fontWeight: 800,
          letterSpacing: '0.08em',
          textTransform: 'uppercase',
          marginBottom: 14,
        }}
      >
        {label}
      </div>
      <div style={{ fontSize: 40, fontWeight: 900, color }}>{value}</div>
    </div>
  );
}

export default function FraudPage() {
  const [stats, setStats] = useState({});
  const [fraudCycles, setFraudCycles] = useState([]);
  const [riskLogs, setRiskLogs] = useState([]);
  const [activeTab, setActiveTab] = useState('cycles');
  const [toast, setToast] = useState(null);

  const loadAll = async () => {
    try {
      const [statsRes, cyclesRes, logsRes] = await Promise.all([
        api.fetchStats(),
        api.fetchFraudCycles(),
        api.fetchFraudLogs(),
      ]);

      const rawCycles = normalizeCycles(normalizeArrayPayload(cyclesRes));
      const dedupedCycles = dedupeRotationalLoops(rawCycles);
      const logs = normalizeArrayPayload(logsRes);

      setStats(statsRes || {});
      setFraudCycles(dedupedCycles);
      setRiskLogs(logs);
    } catch (error) {
      console.error('FraudPage load error:', error);
    }
  };

  useEffect(() => {
    loadAll();

    const intervalId = setInterval(loadAll, 2500);
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('fraud_detected', (payload) => {
      loadAll();
      if (payload?.cycle_path?.length >= 4) setToast(payload);
    });

    socket.on('fraud_alert', (payload) => {
      loadAll();
      if (payload?.cycle_path?.length >= 4) setToast(payload);
    });

    socket.on('risk_log', loadAll);
    socket.on('trade_inserted', loadAll);

    return () => {
      clearInterval(intervalId);
      socket.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 5000);
    return () => clearTimeout(t);
  }, [toast]);

  const monitoredCount = useMemo(
    () => stats?.monitored_traders ?? stats?.total_traders ?? 0,
    [stats]
  );

  return (
    <div className="page-wrap grid-bg">
      <FraudAlertToast alert={toast} onClose={() => setToast(null)} />

      <div className="page-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
            alignItems: 'flex-start',
            marginBottom: 18,
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#f5fff5' }}>
              Fraud <span className="neon-strong">Engine</span>
            </h1>
            <div style={{ color: 'rgba(220,255,220,0.66)', marginTop: 10, fontSize: 14 }}>
              Loops shown separately, suspicious transactions shown in risk log
            </div>
          </div>
        </div>

        <div
          className="kpi-grid"
          style={{ marginBottom: 18, gridTemplateColumns: 'repeat(3, 1fr)' }}
        >
          <StatCard label="Loop Groups" value={fraudCycles.length} color="rgb(26, 254, 28)" />
          <StatCard label="Risk Log Entries" value={riskLogs.length} color="rgb(180, 255, 180)" />
          <StatCard label="Monitored Traders" value={monitoredCount} color="#f5fff5" />
        </div>

        <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
          <button
            onClick={() => setActiveTab('cycles')}
            className={activeTab === 'cycles' ? 'btn-primary' : 'btn-outline'}
          >
            Loop Section ({fraudCycles.length})
          </button>

          <button
            onClick={() => setActiveTab('logs')}
            className={activeTab === 'logs' ? 'btn-primary' : 'btn-outline'}
          >
            Risk Log ({riskLogs.length})
          </button>
        </div>

        {activeTab === 'cycles' ? (
          <div className="glass-strong" style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, color: '#f5fff5' }}>
                Detected Circular Loops
              </div>
              <div style={{ color: 'rgba(220,255,220,0.66)', fontSize: 13, marginTop: 6 }}>
                One unique loop is shown once, and involved trader IDs are listed in the last column
              </div>
            </div>

            <div className="scroll-y" style={{ maxHeight: 560 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Stock</th>
                    <th>Loop Path</th>
                    <th>Traders ID</th>
                    <th>Depth</th>
                    <th>Confidence</th>
                  </tr>
                </thead>
                <tbody>
                  {fraudCycles.map((item, idx) => (
                    <tr key={`${item.stock_id || item.symbol}-${item.cycle?.join('-') || idx}`}>
                      <td>{item.symbol || `#${item.stock_id}`}</td>
                      <td style={{ color: 'rgb(26, 254, 28)', fontWeight: 800 }}>
                        {Array.isArray(item.cycle) && item.cycle.length
                          ? item.cycle.join(' → ')
                          : '—'}
                      </td>
                      <td style={{ color: 'rgba(220,255,220,0.66)' }}>
                        {Array.isArray(item.trader_ids) && item.trader_ids.length
                          ? item.trader_ids.join(', ')
                          : '—'}
                      </td>
                      <td>{item.max_depth ?? item.depth ?? '—'}</td>
                      <td>
                        <span className={scoreBadgeClass(item.confidence)}>
                          {item.confidence ?? 0}
                        </span>
                      </td>
                    </tr>
                  ))}

                  {!fraudCycles.length && (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-state">No circular loops detected yet.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <div className="glass-strong" style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: '18px 20px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
              }}
            >
              <div style={{ fontSize: 18, fontWeight: 900, color: '#f5fff5' }}>
                Risk Log
              </div>
              <div style={{ color: 'rgba(220,255,220,0.66)', fontSize: 13, marginTop: 6 }}>
                Suspicious transaction events from the backend risk log
              </div>
            </div>

            <div className="scroll-y" style={{ maxHeight: 560 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trade ID</th>
                    <th>Risk Score</th>
                    <th>Label</th>
                    <th>Reason</th>
                    <th>Detected</th>
                  </tr>
                </thead>
                <tbody>
                  {riskLogs.map((log, idx) => (
                    <tr key={`${log.risk_id || log.trade_id}-${idx}`}>
                      <td>#{log.trade_id}</td>
                      <td>{log.risk_score}</td>
                      <td>
                        <span className={badgeClass(log.risk_score)}>
                          {log.risk_label || 'SUSPICIOUS'}
                        </span>
                      </td>
                      <td style={{ maxWidth: 520 }}>{log.reason}</td>
                      <td>{formatTime(log.detected_at)}</td>
                    </tr>
                  ))}

                  {!riskLogs.length && (
                    <tr>
                      <td colSpan="5">
                        <div className="empty-state">No risk logs yet.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}