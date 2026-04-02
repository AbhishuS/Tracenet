import React, { useEffect, useMemo, useRef, useState } from 'react';
import { io } from 'socket.io-client';
import { api, normalizeArrayPayload, normalizeTrades, badgeClass } from '../services/api';

const SOCKET_URL = 'http://localhost:5000';

function ProperTraderChart({ points }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const width = canvas.offsetWidth || 760;
    const height = 300;
    canvas.width = width * 2;
    canvas.height = height * 2;
    canvas.style.height = `${height}px`;

    const ctx = canvas.getContext('2d');
    ctx.scale(2, 2);
    ctx.clearRect(0, 0, width, height);

    const padL = 54;
    const padR = 20;
    const padT = 24;
    const padB = 48;
    const chartW = width - padL - padR;
    const chartH = height - padT - padB;

    ctx.fillStyle = '#dce3d4';
    ctx.font = '12px Inter';
    ctx.fillText('Score (0-100)', 10, 16);
    ctx.fillText('Trader Trade Sequence', width / 2 - 54, height - 10);

    for (let y = 0; y <= 100; y += 20) {
      const py = padT + chartH - (y / 100) * chartH;
      ctx.strokeStyle = 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.moveTo(padL, py);
      ctx.lineTo(width - padR, py);
      ctx.stroke();

      ctx.fillStyle = '#75806e';
      ctx.fillText(String(y), 20, py + 4);
    }

    ctx.strokeStyle = 'rgba(255,255,255,0.18)';
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + chartH);
    ctx.lineTo(width - padR, padT + chartH);
    ctx.stroke();

    if (!points.length) {
      ctx.fillStyle = '#697362';
      ctx.fillText('No trades for this trader yet', padL + 10, padT + chartH / 2);
      return;
    }

    const maxX = Math.max(points.length - 1, 1);

    const riskPts = points.map((p, i) => ({
      x: padL + (i / maxX) * chartW,
      y: padT + chartH - (Number(p.risk_score || 0) / 100) * chartH,
      label: i + 1,
      val: Number(p.risk_score || 0),
    }));

    const trustPts = points.map((p, i) => ({
      x: padL + (i / maxX) * chartW,
      y: padT + chartH - (Number(p.trust_score || 0) / 100) * chartH,
      label: i + 1,
      val: Number(p.trust_score || 0),
    }));

    const drawSeries = (pts, color) => {
      ctx.beginPath();
      pts.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.strokeStyle = color;
      ctx.lineWidth = 3;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0;

      pts.forEach((p) => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 3.5, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();
      });
    };

    drawSeries(riskPts, '#ff5555');
    drawSeries(trustPts, '#b8ff4f');

    riskPts.forEach((p, i) => {
      if (i % 2 === 0 || riskPts.length <= 8) {
        ctx.fillStyle = '#75806e';
        ctx.font = '11px Inter';
        ctx.fillText(String(p.label), p.x - 3, padT + chartH + 16);
      }
    });

    ctx.fillStyle = '#ff5555';
    ctx.fillRect(width - 180, 18, 14, 3);
    ctx.fillStyle = '#dce3d4';
    ctx.fillText('Risk Score', width - 158, 22);

    ctx.fillStyle = '#b8ff4f';
    ctx.fillRect(width - 180, 38, 14, 3);
    ctx.fillStyle = '#dce3d4';
    ctx.fillText('Trust Score', width - 158, 42);
  }, [points]);

  return <canvas ref={canvasRef} style={{ width: '100%', display: 'block' }} />;
}

export default function TradersPage() {
  const [traders, setTraders] = useState([]);
  const [allTrades, setAllTrades] = useState([]);
  const [riskLogs, setRiskLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [selectedTrader, setSelectedTrader] = useState(null);

  const loadAll = async () => {
    try {
      const [traderRes, tradeRes, logRes] = await Promise.all([
        api.fetchTraders(),
        api.fetchTrades(1, 300),
        api.fetchFraudLogs(),
      ]);

      const logs = normalizeArrayPayload(logRes);
      const mergedTrades = normalizeTrades(normalizeArrayPayload(tradeRes), logs);

      setTraders(normalizeArrayPayload(traderRes));
      setAllTrades(mergedTrades);
      setRiskLogs(logs);
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

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return traders.filter((t) =>
      !q ||
      String(t.trader_id).includes(q) ||
      String(t.trader_name || '').toLowerCase().includes(q)
    );
  }, [traders, query]);

  useEffect(() => {
    const exact = traders.find((t) => String(t.trader_id) === query.trim());
    setSelectedTrader(exact || null);
  }, [query, traders]);

  const detail = useMemo(() => {
    if (!selectedTrader) return null;

    const traderId = Number(selectedTrader.trader_id);
    const trades = allTrades
      .filter((t) => Number(t.seller_id) === traderId || Number(t.buyer_id) === traderId)
      .sort((a, b) => new Date(a.timestamp || 0) - new Date(b.timestamp || 0));

    let rollingTrust = Number(selectedTrader.trust_score ?? 100);

    const points = trades.map((t, idx) => {
      const risk = Number(t.risk_score || 0);
      const trustDrop = risk >= 70 ? 8 : risk >= 40 ? 4 : risk > 0 ? 1 : 0;
      rollingTrust = Math.max(0, Math.min(100, rollingTrust - trustDrop + (risk === 0 ? 1 : 0)));

      return {
        x: idx + 1,
        trade_id: t.trade_id,
        risk_score: risk,
        trust_score: rollingTrust,
        timestamp: t.timestamp,
      };
    });

    const avgRisk = trades.length
      ? Math.round(trades.reduce((s, t) => s + Number(t.risk_score || 0), 0) / trades.length)
      : 0;

    return {
      trades,
      points,
      avgRisk,
      currentTrust: Number(selectedTrader.trust_score ?? 100),
      predictedTrust: points.length
        ? Math.max(0, Math.round(points.slice(-5).reduce((a, b) => a + b.trust_score, 0) / Math.min(points.length, 5) - 2))
        : Number(selectedTrader.trust_score ?? 100),
      totalBuys: trades.filter((t) => Number(t.buyer_id) === traderId).length,
      totalSells: trades.filter((t) => Number(t.seller_id) === traderId).length,
    };
  }, [selectedTrader, allTrades]);

  return (
    <div className="page-wrap grid-bg">
      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
            Trader <span className="neon-strong">Registry</span>
          </h1>
          <div style={{ color: '#82897c', marginTop: 8, fontSize: 16 }}>
            Search trader by ID to view clear trust score, risk score, trade history and trend graph
          </div>
        </div>

        <div className="glass-strong" style={{ padding: 20, marginBottom: 22 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 220px', gap: 14 }}>
            <input
              className="search-input"
              placeholder="Search trader by exact ID, e.g. 14"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <div className="tag" style={{ justifyContent: 'center' }}>{filtered.length} traders</div>
          </div>
        </div>

        <div className="grid-2">
          <div className="glass-strong" style={{ overflow: 'hidden' }}>
            <div style={{ padding: '18px 20px', fontWeight: 900, fontSize: 16 }}>Trader List</div>
            <div className="scroll-y" style={{ maxHeight: 620 }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>ID</th>
                    <th>Name</th>
                    <th>Trust Score</th>
                    <th>Avg Risk</th>
                    <th>Total Trades</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.slice(0, 100).map((trader) => {
                    const traderTrades = allTrades.filter(
                      (t) => Number(t.seller_id) === Number(trader.trader_id) || Number(t.buyer_id) === Number(trader.trader_id)
                    );
                    const avgRisk = traderTrades.length
                      ? Math.round(traderTrades.reduce((s, t) => s + Number(t.risk_score || 0), 0) / traderTrades.length)
                      : 0;

                    return (
                      <tr
                        key={trader.trader_id}
                        onClick={() => {
                          setQuery(String(trader.trader_id));
                          setSelectedTrader(trader);
                        }}
                        style={{ cursor: 'pointer' }}
                      >
                        <td>#{trader.trader_id}</td>
                        <td>{trader.trader_name}</td>
                        <td><span className={badgeClass(trader.trust_score)}>{trader.trust_score ?? 100}</span></td>
                        <td><span className={badgeClass(avgRisk)}>{avgRisk}</span></td>
                        <td>{traderTrades.length}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="glass-strong" style={{ padding: 20 }}>
            {!selectedTrader || !detail ? (
              <div className="empty-state">
                Search a trader by ID to see proper trust and risk analytics.
              </div>
            ) : (
              <>
                <div style={{ marginBottom: 18 }}>
                  <div style={{ fontSize: 26, fontWeight: 900 }}>{selectedTrader.trader_name}</div>
                  <div style={{ color: '#7f8779', marginTop: 6, fontSize: 13 }}>
                    ID #{selectedTrader.trader_id} • Registered {selectedTrader.registration_date || '—'}
                  </div>
                </div>

                <div className="grid-3" style={{ marginBottom: 18 }}>
                  <div className="glass" style={{ padding: 16 }}>
                    <div className="soft" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Current Trust Score</div>
                    <div className="neon-strong" style={{ fontSize: 28, fontWeight: 900, marginTop: 8 }}>
                      {detail.currentTrust}
                    </div>
                  </div>
                  <div className="glass" style={{ padding: 16 }}>
                    <div className="soft" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Average Risk Score</div>
                    <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: detail.avgRisk >= 70 ? '#ff5555' : detail.avgRisk >= 40 ? '#ffb020' : '#b8ff4f' }}>
                      {detail.avgRisk}
                    </div>
                  </div>
                  <div className="glass" style={{ padding: 16 }}>
                    <div className="soft" style={{ fontSize: 12, fontWeight: 800, textTransform: 'uppercase' }}>Predicted Trust Score</div>
                    <div style={{ fontSize: 28, fontWeight: 900, marginTop: 8, color: '#d8ff91' }}>
                      {detail.predictedTrust}
                    </div>
                  </div>
                </div>

                <div className="glass" style={{ padding: 16, marginBottom: 18 }}>
                  <div style={{ fontWeight: 900, marginBottom: 6 }}>Trader Risk and Trust Trend</div>
                  <div style={{ color: '#7b8575', fontSize: 12, marginBottom: 10 }}>
                    Y-axis = score (0-100), X-axis = chronological trade sequence for this trader
                  </div>
                  <ProperTraderChart points={detail.points} />
                </div>

                <div className="glass" style={{ padding: 16, marginBottom: 18 }}>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
                    <div>
                      <div className="soft" style={{ fontSize: 12 }}>Total Trades</div>
                      <div style={{ fontSize: 24, fontWeight: 900 }}>{detail.trades.length}</div>
                    </div>
                    <div>
                      <div className="soft" style={{ fontSize: 12 }}>Total Buys</div>
                      <div style={{ fontSize: 24, fontWeight: 900 }}>{detail.totalBuys}</div>
                    </div>
                    <div>
                      <div className="soft" style={{ fontSize: 12 }}>Total Sells</div>
                      <div style={{ fontSize: 24, fontWeight: 900 }}>{detail.totalSells}</div>
                    </div>
                  </div>
                </div>

                <div className="glass" style={{ overflow: 'hidden' }}>
                  <div style={{ padding: '16px 16px 10px', fontWeight: 900 }}>Trade History</div>
                  <div className="scroll-y" style={{ maxHeight: 260 }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Trade</th>
                          <th>Role</th>
                          <th>Stock</th>
                          <th>Price</th>
                          <th>Qty</th>
                          <th>Risk Score</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detail.trades.slice().reverse().map((t) => (
                          <tr key={t.trade_id}>
                            <td>#{t.trade_id}</td>
                            <td>{Number(t.seller_id) === Number(selectedTrader.trader_id) ? 'Seller' : 'Buyer'}</td>
                            <td>{t.symbol || `#${t.stock_id}`}</td>
                            <td>${Number(t.price || 0).toFixed(2)}</td>
                            <td>{t.quantity}</td>
                            <td><span className={badgeClass(t.risk_score)}>{t.risk_score || 0}</span></td>
                          </tr>
                        ))}
                        {!detail.trades.length && (
                          <tr><td colSpan="6"><div className="empty-state">No trades for this trader yet.</div></td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}