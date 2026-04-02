import React, { useEffect, useMemo, useState } from 'react';
import { BrowserRouter, Routes, Route, NavLink, useNavigate, useLocation } from 'react-router-dom';
import { io } from 'socket.io-client';
import LandingPage from './pages/LandingPage';
import DashboardPage from './pages/DashboardPage';
import FraudPage from './pages/FraudPage';
import TradersPage from './pages/TradersPage';
import TransactionsPage from './pages/TransactionsPage';

const SOCKET_URL = 'http://localhost:5000';

function Toast({ alert, onClose }) {
  useEffect(() => {
    if (!alert) return;
    const t = setTimeout(onClose, 6000);
    return () => clearTimeout(t);
  }, [alert, onClose]);

  if (!alert) return null;

  return (
    <div className="toast toast-danger fraud-pulse">
      <div style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
        <span style={{ fontSize: 18 }}>🔴</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 800, marginBottom: 4, color: '#fff' }}>Circular Trade Alert</div>
          <div style={{ color: '#ff9e9e', fontSize: 13, lineHeight: 1.5 }}>
            {alert.reason || 'Suspicious circular trading pattern detected.'}
          </div>
          <div style={{ color: '#8f7777', fontSize: 11, marginTop: 6 }}>
            Trade #{alert.trade_id || '—'} • Risk {alert.risk_score || alert.confidence || '—'}
          </div>
        </div>
        <button onClick={onClose} style={{ color: '#8f7777', fontSize: 18, background: 'transparent', border: 'none', cursor: 'pointer' }}>
          ×
        </button>
      </div>
    </div>
  );
}

function Navbar({ liveAlert }) {
  const navigate = useNavigate();
  const location = useLocation();

  const links = [
    { to: '/dashboard', label: 'Dashboard' },
    { to: '/fraud', label: 'Fraud Engine' },
    { to: '/traders', label: 'Traders' },
    { to: '/transactions', label: 'Transactions' },
  ];

  return (
    <nav
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 50,
        height: 64,
        display: 'flex',
        alignItems: 'center',
        padding: '0 28px',
        background: 'rgba(5,5,5,0.9)',
        backdropFilter: 'blur(18px)',
        borderBottom: '1px solid rgba(184,255,79,0.08)',
      }}
    >
      <div
        onClick={() => navigate('/dashboard')}
        style={{ display: 'flex', alignItems: 'center', gap: 12, cursor: 'pointer', marginRight: 24 }}
      >
        <div
          style={{
            width: 30,
            height: 30,
            borderRadius: '50%',
            border: '2px solid #b8ff4f',
            display: 'grid',
            placeItems: 'center',
            boxShadow: liveAlert ? '0 0 20px rgba(255,85,85,0.35)' : '0 0 16px rgba(184,255,79,0.18)',
          }}
        >
          <div className={liveAlert ? 'live-dot-red blink' : 'live-dot blink'} style={{ width: 8, height: 8 }} />
        </div>
        <div style={{ fontWeight: 900, fontSize: 17 }}>
          Trace<span className="neon">Net</span>
        </div>
      </div>

      <div style={{ display: 'flex', gap: 6, flex: 1 }}>
        {links.map((link) => (
          <NavLink key={link.to} to={link.to}>
            {({ isActive }) => (
              <button className={`btn-ghost ${isActive ? 'active' : ''}`}>
                {link.label}
              </button>
            )}
          </NavLink>
        ))}
      </div>

      {liveAlert && (
        <div
          className="fraud-pulse"
          style={{
            marginRight: 14,
            padding: '8px 12px',
            borderRadius: 999,
            background: 'rgba(255,85,85,0.08)',
            border: '1px solid rgba(255,85,85,0.2)',
            color: '#ff8d8d',
            fontSize: 12,
            fontWeight: 800,
          }}
        >
          LIVE FRAUD ALERT
        </div>
      )}

      <button className="btn-primary" onClick={() => navigate('/dashboard')}>
        Launch Dashboard
      </button>
    </nav>
  );
}

function AppShell() {
  const [toast, setToast] = useState(null);
  const [liveAlert, setLiveAlert] = useState(false);

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });

    const handleAlert = (payload) => {
      const alert = Array.isArray(payload) ? payload[0] : payload;
      setToast(alert);
      setLiveAlert(true);
      setTimeout(() => setLiveAlert(false), 5000);
    };

    socket.on('fraud_alert', handleAlert);
    socket.on('fraud_detected', handleAlert);
    socket.on('risk_log', handleAlert);

    return () => socket.disconnect();
  }, []);

  const appRoutes = useMemo(
    () => (
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard" element={<DashboardPage />} />
        <Route path="/fraud" element={<FraudPage />} />
        <Route path="/traders" element={<TradersPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
      </Routes>
    ),
    []
  );

  return (
    <>
      <Navbar liveAlert={liveAlert} />
      <Toast alert={toast} onClose={() => setToast(null)} />
      <div style={{ paddingTop: 64 }}>{appRoutes}</div>
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppShell />
    </BrowserRouter>
  );
}