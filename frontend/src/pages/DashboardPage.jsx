import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { useNavigate } from 'react-router-dom';
import {
  api,
  normalizeArrayPayload,
  normalizeTrades,
  normalizeCycles,
  badgeClass,
} from '../services/api';

const SOCKET_URL = 'http://localhost:5000';

function rotateToSmallest(arr) {
  if (!Array.isArray(arr) || !arr.length) return [];
  const values = arr.map((x) => String(x));
  let best = values;

  for (let i = 1; i < values.length; i += 1) {
    const rotated = [...values.slice(i), ...values.slice(0, i)];
    if (rotated.join('|') < best.join('|')) best = rotated;
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

function ProperRiskChart({ logs }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.offsetWidth || 520;
    const height = 260;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, width, height);

    const padL = 52;
    const padR = 20;
    const padT = 20;
    const padB = 44;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    const data = [...(logs || [])]
      .slice(0, 20)
      .reverse()
      .map((log, idx) => ({
        x: idx + 1,
        y: Number(log?.risk_score || 0),
      }));

    ctx.fillStyle = '#f5fff5';
    ctx.font = '12px Inter';
    ctx.fillText('Risk Score', 10, 16);
    ctx.fillText('Trade Event Sequence', width / 2 - 52, height - 10);

    ctx.strokeStyle = 'rgba(255,255,255,0.08)';
    ctx.lineWidth = 1;

    for (let y = 0; y <= 100; y += 20) {
      const py = padT + chartH - (y / 100) * chartH;
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(width - padR, py);
      ctx.stroke();

      ctx.fillStyle = 'rgba(220,255,220,0.60)';
      ctx.fillText(String(y), 20, py + 4);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + chartH);
    ctx.lineTo(width - padR, padT + chartH);
    ctx.stroke();

    if (!data.length) {
      ctx.fillStyle = 'rgba(150,190,150,0.50)';
      ctx.fillText('No risk events yet', padL + 10, padT + chartH / 2);
      return;
    }

    const pts = data.map((d, i) => ({
      px: padL + (i / Math.max(data.length - 1, 1)) * chartW,
      py: padT + chartH - (d.y / 100) * chartH,
      x: d.x,
      y: d.y,
    }));

    ctx.beginPath();
    pts.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.px, p.py);
      else ctx.lineTo(p.px, p.py);
    });
    ctx.strokeStyle = 'rgb(26, 254, 28)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(26,254,28,0.30)';
    ctx.shadowBlur = 14;
    ctx.stroke();
    ctx.shadowBlur = 0;

    pts.forEach((p) => {
      ctx.beginPath();
      ctx.arc(p.px, p.py, 3.8, 0, Math.PI * 2);
      ctx.fillStyle = p.y >= 70 ? '#ff6a6a' : p.y >= 40 ? '#d8ff72' : 'rgb(26, 254, 28)';
      ctx.fill();
    });

    pts.forEach((p, i) => {
      if (i % 2 === 0 || pts.length <= 8) {
        ctx.fillStyle = 'rgba(220,255,220,0.60)';
        ctx.font = '11px Inter';
        ctx.fillText(String(p.x), p.px - 3, padT + chartH + 16);
      }
    });

    ctx.fillStyle = '#ff6a6a';
    ctx.fillRect(width - 160, 16, 12, 3);
    ctx.fillStyle = '#f5fff5';
    ctx.fillText('Risk line 0-100', width - 140, 20);
  }, [logs]);

  return <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />;
}

function StatCard({ label, value, sub, color, pulse }) {
  return (
    <div className={`glass-strong card-hover ${pulse ? 'fraud-pulse' : ''}`} style={{ padding: 22 }}>
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
      <div style={{ fontSize: 42, fontWeight: 900, color, marginBottom: 8 }}>{value}</div>
      <div style={{ color: 'rgba(150,190,150,0.50)', fontSize: 13 }}>{sub}</div>
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [stats, setStats] = useState({});
  const [trades, setTrades] = useState([]);
  const [riskLogs, setRiskLogs] = useState([]);
  const [cycles, setCycles] = useState([]);

  const loadAll = async () => {
    try {
      const [statsRes, tradesRes, riskRes, cycleRes] = await Promise.all([
        api.fetchStats(),
        api.fetchTrades(1, 100),
        api.fetchFraudLogs(),
        api.fetchFraudCycles(),
      ]);

      const logs = normalizeArrayPayload(riskRes);
      const mergedTrades = normalizeTrades(normalizeArrayPayload(tradesRes), logs);
      const rawCycles = normalizeCycles(normalizeArrayPayload(cycleRes));
      const dedupedCycles = dedupeRotationalLoops(rawCycles);

      setStats(statsRes || {});
      setRiskLogs(logs);
      setTrades(mergedTrades);
      setCycles(dedupedCycles);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadAll();

    const id = setInterval(loadAll, 2000);
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    socket.on('fraud_alert', loadAll);
    socket.on('fraud_detected', loadAll);
    socket.on('risk_log', loadAll);
    socket.on('trade_inserted', loadAll);

    return () => {
      clearInterval(id);
      socket.disconnect();
    };
  }, []);

  const computed = useMemo(
    () => ({
      totalTrades: Number(stats.total_trades ?? trades.length ?? 0),
      fraudRings: Number(stats.fraud_rings_detected ?? cycles.length ?? 0),
      highRisk: Number(stats.high_risk_traders ?? 0),
      monitored: Number(stats.monitored_traders ?? stats.total_traders ?? 0),
    }),
    [stats, trades, cycles]
  );

  return (
    <div className="page-wrap grid-bg">
      <div className="page-container">
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            gap: 20,
            alignItems: 'flex-start',
            marginBottom: 28,
          }}
        >
          <div>
            <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0, color: '#f5fff5' }}>
              TraceNet <span className="neon-strong">Dashboard</span>
            </h1>
            <div
              style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                color: 'rgba(220,255,220,0.66)',
              }}
            >
              <span className="live-dot blink" />
              <span>Live monitoring active</span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <button className="btn-outline" onClick={() => navigate('/fraud')}>
              Fraud Engine
            </button>
            <button className="btn-outline" onClick={() => navigate('/traders')}>
              Traders
            </button>
          </div>
        </div>

        <div className="kpi-grid" style={{ marginBottom: 18 }}>
          <StatCard
            label="Total Trades"
            value={computed.totalTrades}
            sub="All recorded trade events"
            color="rgb(83, 233, 83)"
          />
          <StatCard
            label="Fraud Rings"
            value={cycles.length}
            sub="Distinct circular rings detected"
            color="rgb(226, 127, 5)"
            pulse={cycles.length > 0}
          />
          <StatCard
            label="High Risk Traders"
            value={computed.highRisk}
            sub="Trust score below 40"
            color="rgb(243, 46, 46)"
          />
          <StatCard
            label="Monitored Traders"
            value={computed.monitored}
            sub="Tracked in registry"
            color="#f5fff5"
          />
        </div>

        <div className="grid-2" style={{ marginBottom: 20 }}>
          <div className="glass-strong" style={{ overflow: 'hidden' }}>
            <div
              style={{
                padding: '20px 20px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <div style={{ fontSize: 16, fontWeight: 900, color: '#f5fff5' }}>
                Recent Trades
              </div>
              <button className="btn-ghost" onClick={() => navigate('/fraud')}>
                View fraud
              </button>
            </div>

            <div className="scroll-y" style={{ maxHeight: 380 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Trade ID</th>
                    <th>Stock</th>
                    <th>Seller</th>
                    <th>Buyer</th>
                    <th>Price</th>
                    <th>Qty</th>
                    <th>Risk</th>
                  </tr>
                </thead>
                <tbody>
                  {trades.slice(0, 16).map((t) => (
                    <tr key={t.trade_id}>
                      <td>{t.trade_id}</td>
                      <td>{t.symbol || t.stock_id}</td>
                      <td>{t.seller_name || `T${t.seller_id}`}</td>
                      <td>{t.buyer_name || `T${t.buyer_id}`}</td>
                      <td>{Number(t.price || 0).toFixed(2)}</td>
                      <td>{t.quantity}</td>
                      <td>
                        <span className={badgeClass(t.risk_score)}>{t.risk_score || 0}</span>
                      </td>
                    </tr>
                  ))}

                  {!trades.length && (
                    <tr>
                      <td colSpan="7">
                        <div className="empty-state">No trades yet.</div>
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div style={{ display: 'grid', gap: 18 }}>
            <div className="glass-strong" style={{ padding: 20 }}>
              <div style={{ fontSize: 16, fontWeight: 900, marginBottom: 6, color: '#f5fff5' }}>
                Risk Trend
              </div>
              <div style={{ color: 'rgba(220,255,220,0.66)', fontSize: 12, marginBottom: 10 }}>
                Y-axis risk score 0-100, X-axis latest risk events in sequence order
              </div>
              <ProperRiskChart logs={riskLogs} />
            </div>

            <div className="glass-strong" style={{ overflow: 'hidden' }}>
              <div
                style={{
                  padding: '18px 20px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div style={{ fontSize: 16, fontWeight: 900, color: '#f5fff5' }}>
                  Detected Rings
                </div>
                <span className="badge badge-low">{cycles.length}</span>
              </div>

              <div className="scroll-y" style={{ maxHeight: 220 }}>
                {cycles.slice(0, 8).map((cycle, idx) => (
                  <div
                    key={`${cycle.stock_id || cycle.symbol}-${cycle.cycle?.join('-') || idx}`}
                    style={{
                      padding: '12px 20px',
                      borderTop: '1px solid rgba(255,255,255,0.04)',
                    }}
                  >
                    <div style={{ color: 'rgb(26, 254, 28)', fontWeight: 800, fontSize: 13 }}>
                      {Array.isArray(cycle.cycle) && cycle.cycle.length
                        ? cycle.cycle.join(' → ')
                        : 'Cycle detected'}
                    </div>
                    <div style={{ color: 'rgba(220,255,220,0.66)', fontSize: 12, marginTop: 4 }}>
                      Depth {cycle.max_depth ?? cycle.depth ?? '—'} • Confidence {cycle.confidence ?? 0}
                    </div>
                  </div>
                ))}

                {!cycles.length && (
                  <div className="empty-state">No circular rings detected yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="glass-strong" style={{ overflow: 'hidden' }}>
          <div
            style={{
              padding: '18px 20px',
              borderBottom: '1px solid rgba(255,255,255,0.05)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
            }}
          >
            <div>
              <div style={{ fontSize: 18, fontWeight: 900, color: '#f5fff5' }}>
                Suspicious Transaction Risk Log
              </div>
              <div style={{ color: 'rgba(220,255,220,0.66)', fontSize: 13, marginTop: 6 }}>
                Suspicious transaction events from the backend risk log
              </div>
            </div>
            <span className="badge badge-medium">{riskLogs.length}</span>
          </div>

          <div className="scroll-y" style={{ maxHeight: 360 }}>
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
                {riskLogs.slice(0, 20).map((log, idx) => (
                  <tr key={`${log.risk_id || log.trade_id}-${idx}`}>
                    <td>#{log.trade_id}</td>
                    <td>{log.risk_score}</td>
                    <td>
                      <span className={badgeClass(log.risk_score)}>
                        {log.risk_label || 'SUSPICIOUS'}
                      </span>
                    </td>
                    <td style={{ maxWidth: 620 }}>{log.reason}</td>
                    <td>{log.detected_at ? new Date(log.detected_at).toLocaleString() : '—'}</td>
                  </tr>
                ))}

                {!riskLogs.length && (
                  <tr>
                    <td colSpan="5">
                      <div className="empty-state">No suspicious non-loop log entries yet.</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}