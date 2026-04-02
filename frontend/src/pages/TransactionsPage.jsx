import React, { useEffect, useMemo, useState } from 'react';
import { io } from 'socket.io-client';
import { api, normalizeArrayPayload, normalizeTrades, badgeClass } from '../services/api';

const SOCKET_URL = 'http://localhost:5000';

function formatTime(ts) {
  if (!ts) return '—';
  try {
    return new Date(ts).toLocaleString();
  } catch {
    return ts;
  }
}

export default function TransactionsPage() {
  const [trades, setTrades] = useState([]);
  const [riskLogs, setRiskLogs] = useState([]);
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(true);

  const loadAll = async () => {
    try {
      const [tradeRes, logRes] = await Promise.all([
        api.fetchTrades(1, 500),
        api.fetchFraudLogs(),
      ]);

      const logs = normalizeArrayPayload(logRes);
      const mergedTrades = normalizeTrades(normalizeArrayPayload(tradeRes), logs);

      setTrades(mergedTrades);
      setRiskLogs(logs);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAll();
    const id = setInterval(loadAll, 2000);

    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socket.on('trade_inserted', loadAll);
    socket.on('risk_log', loadAll);
    socket.on('fraud_alert', loadAll);

    return () => {
      clearInterval(id);
      socket.disconnect();
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return trades;
    return trades.filter((t) =>
      String(t.trade_id).includes(q) ||
      String(t.symbol || '').toLowerCase().includes(q) ||
      String(t.seller_name || '').toLowerCase().includes(q) ||
      String(t.buyer_name || '').toLowerCase().includes(q)
    );
  }, [trades, query]);

  return (
    <div className="page-wrap grid-bg">
      <div className="page-container">
        <div style={{ marginBottom: 24 }}>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: 0 }}>
            Transactions <span className="neon-strong">View</span>
          </h1>
          <div style={{ color: '#82897c', marginTop: 8, fontSize: 14 }}>
            Full trade list with attached risk information
          </div>
        </div>

        <div className="glass-strong" style={{ padding: 18, marginBottom: 18 }}>
          <input
            className="search-input"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search trade id, stock, seller, or buyer"
          />
        </div>

        <div className="glass-strong" style={{ overflow: 'hidden' }}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Trade ID</th>
                <th>Stock</th>
                <th>Seller</th>
                <th>Buyer</th>
                <th>Price</th>
                <th>Qty</th>
                <th>Risk Score</th>
                <th>Detected</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">Loading transactions...</div>
                  </td>
                </tr>
              ) : filtered.length ? (
                filtered.map((t) => (
                  <tr key={t.trade_id}>
                    <td>#{t.trade_id}</td>
                    <td>{t.symbol || `#${t.stock_id}`}</td>
                    <td>{t.seller_name || `T${t.seller_id}`}</td>
                    <td>{t.buyer_name || `T${t.buyer_id}`}</td>
                    <td>${Number(t.price || 0).toFixed(2)}</td>
                    <td>{t.quantity}</td>
                    <td><span className={badgeClass(t.risk_score)}>{t.risk_score || 0}</span></td>
                    <td>{formatTime(t.timestamp)}</td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="8">
                    <div className="empty-state">No transactions found.</div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <div style={{ marginTop: 20, color: '#7a8475', fontSize: 12 }}>
          Risk logs loaded: {riskLogs.length}
        </div>
      </div>
    </div>
  );
}