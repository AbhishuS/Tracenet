import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

function useInView(ref) {
  const [inView, setInView] = useState(false);
  useEffect(() => {
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setInView(true); }, { threshold: 0.1 });
    if (ref.current) obs.observe(ref.current);
    return () => obs.disconnect();
  }, [ref]);
  return inView;
}

function Reveal({ children, delay = 0, style = {} }) {
  const ref    = useRef(null);
  const inView = useInView(ref);
  return (
    <div ref={ref} style={{
      opacity:    inView ? 1 : 0,
      transform:  inView ? 'translateY(0)' : 'translateY(32px)',
      transition: `opacity 0.7s ease ${delay}s, transform 0.7s ease ${delay}s`,
      ...style,
    }}>
      {children}
    </div>
  );
}

function Counter({ target, suffix = '' }) {
  const [n, setN] = useState(0);
  const ref    = useRef(null);
  const inView = useInView(ref);
  useEffect(() => {
    if (!inView) return;
    let v = 0;
    const step = target / 80;
    const t = setInterval(() => {
      v += step;
      if (v >= target) { setN(target); clearInterval(t); }
      else setN(Math.floor(v));
    }, 20);
    return () => clearInterval(t);
  }, [inView, target]);
  return <span ref={ref}>{n.toLocaleString()}{suffix}</span>;
}

// Canvas network graph
function NetworkCanvas() {
  const canvasRef = useRef(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext('2d');
    const W = canvas.width  = 480;
    const H = canvas.height = 420;

    const nodes = [
      { x: 240, y: 80,  label: 'A', fraud: true  },
      { x: 380, y: 200, label: 'B', fraud: true  },
      { x: 320, y: 340, label: 'C', fraud: true  },
      { x: 130, y: 310, label: 'D', fraud: false },
      { x: 90,  y: 180, label: 'E', fraud: false },
      { x: 400, y: 90,  label: 'F', fraud: false },
      { x: 200, y: 230, label: 'G', fraud: false },
    ];

    const edges = [
      { a: 0, b: 1, fraud: true  },
      { a: 1, b: 2, fraud: true  },
      { a: 2, b: 0, fraud: true  },
      { a: 3, b: 4, fraud: false },
      { a: 4, b: 0, fraud: false },
      { a: 5, b: 1, fraud: false },
      { a: 6, b: 3, fraud: false },
      { a: 6, b: 2, fraud: false },
    ];

    let t = 0, id;
    function draw() {
      ctx.clearRect(0, 0, W, H);
      t += 0.018;
      const p = 0.5 + 0.5 * Math.sin(t * 2);

      edges.forEach(e => {
        const A = nodes[e.a], B = nodes[e.b];
        ctx.beginPath();
        ctx.moveTo(A.x, A.y);
        ctx.lineTo(B.x, B.y);
        if (e.fraud) {
          ctx.strokeStyle = `rgba(239,68,68,${0.35 + p * 0.5})`;
          ctx.lineWidth   = 1.5 + p;
          ctx.shadowColor = '#ef4444';
          ctx.shadowBlur  = 8 + p * 12;
        } else {
          ctx.strokeStyle = 'rgba(163,230,53,0.12)';
          ctx.lineWidth   = 1;
          ctx.shadowBlur  = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // arrowhead
        const ang = Math.atan2(B.y - A.y, B.x - A.x);
        const mx  = B.x - 22 * Math.cos(ang);
        const my  = B.y - 22 * Math.sin(ang);
        ctx.beginPath();
        ctx.moveTo(mx, my);
        ctx.lineTo(mx - 7 * Math.cos(ang - 0.4), my - 7 * Math.sin(ang - 0.4));
        ctx.lineTo(mx - 7 * Math.cos(ang + 0.4), my - 7 * Math.sin(ang + 0.4));
        ctx.closePath();
        ctx.fillStyle = e.fraud ? `rgba(239,68,68,${0.4 + p * 0.4})` : 'rgba(163,230,53,0.12)';
        ctx.fill();
      });

      nodes.forEach(node => {
        const c = node.fraud ? '#ef4444' : '#a3e635';
        const r = node.fraud ? 15 + p * 3 : 11;
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 8, 0, Math.PI * 2);
        ctx.fillStyle = node.fraud ? `rgba(239,68,68,${0.04 + p * 0.06})` : 'rgba(163,230,53,0.03)';
        ctx.fill();
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.fraud ? `rgba(239,68,68,${0.12 + p * 0.08})` : 'rgba(163,230,53,0.07)';
        ctx.fill();
        ctx.strokeStyle = c;
        ctx.lineWidth   = node.fraud ? 2 : 1.5;
        ctx.shadowColor = c;
        ctx.shadowBlur  = node.fraud ? 12 + p * 10 : 6;
        ctx.stroke();
        ctx.shadowBlur  = 0;
        ctx.font        = `bold 12px Inter, monospace`;
        ctx.fillStyle   = c;
        ctx.textAlign   = 'center';
        ctx.textBaseline= 'middle';
        ctx.fillText(node.label, node.x, node.y);
      });
      id = requestAnimationFrame(draw);
    }
    draw();
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="float" style={{ position: 'relative' }}>
      <canvas ref={canvasRef} style={{ width: '100%', maxWidth: 480, filter: 'contrast(1.05)' }} />
      <div style={{
        position: 'absolute', bottom: 12, left: '50%', transform: 'translateX(-50%)',
        background: 'rgba(8,8,8,0.85)', border: '1px solid rgba(239,68,68,0.3)',
        borderRadius: 8, padding: '6px 14px', display: 'flex', alignItems: 'center', gap: 8,
        whiteSpace: 'nowrap',
      }}>
        <div className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: '#ef4444' }} />
        <span style={{ color: '#f87171', fontSize: 12, fontWeight: 600 }}>Cycle Detected: A → B → C → A</span>
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate    = useNavigate();
  const [trades, setTrades] = useState(10247);
  useEffect(() => {
    const t = setInterval(() => setTrades(p => p + Math.floor(Math.random() * 3) + 1), 1800);
    return () => clearInterval(t);
  }, []);

  const stats = [
    { v: 10000, s: '+', l: 'Trades Processed' },
    { v: 30,    s: '+', l: 'Fraud Rings Found' },
    { v: 200,   s: '+', l: 'Traders Monitored' },
    { v: 15,    s: 'ms',l: 'Avg Query Time'    },
  ];

  const capabilities = [
    { emoji: '⚡', title: 'Temporal Detection',    desc: 'Flags trades occurring milliseconds apart between the same pair.',  tag: '< 1ms precision' },
    { emoji: '🔁', title: 'Recursive SQL Scanning',desc: 'WITH RECURSIVE CTE traverses trade graphs up to 10 nodes deep.',    tag: '10 nodes deep'   },
    { emoji: '🛡', title: 'Trust Score Engine',    desc: 'Scores degrade dynamically as traders appear in suspicious loops.',  tag: 'Dynamic scoring' },
    { emoji: '👁', title: 'Explainable Alerts',    desc: 'Every flag includes trading path, confidence score, and reason.',   tag: 'Transparent AI'  },
  ];

  const features = [
    { emoji: '⚡', title: 'Lightning Fast',       desc: 'Optimized PostgreSQL indexes on 10,000+ rows' },
    { emoji: '🌐', title: 'Visual Graph',          desc: 'Force-directed D3 fraud network visualization' },
    { emoji: '🔔', title: 'Zero Latency',          desc: 'pg_notify → Socket.io → React in real time'   },
    { emoji: '🔗', title: 'Graph in SQL',          desc: 'Relational DB doing what graph DBs do'         },
    { emoji: '🔎', title: 'CTE Engine',            desc: 'Recursive queries detect all cycle patterns'   },
    { emoji: '📡', title: 'Live Simulation',       desc: 'Python feed injects trades with fraud rings'   },
  ];

  const steps = [
    {
      n: '01', title: 'Data Ingestion',
      desc: 'Trade transactions stream into PostgreSQL — seller, buyer, stock, price, timestamp.',
      code: 'POST /api/trades\n{ seller_id: 42, buyer_id: 17,\n  stock_id: 3, price: 499.99 }',
    },
    {
      n: '02', title: 'Recursive SQL Engine',
      desc: 'A WITH RECURSIVE CTE traverses the trade graph inside the DB, finding closed loops.',
      code: 'WITH RECURSIVE path AS (\n  SELECT seller_id, buyer_id,\n  ARRAY[seller_id] AS visited\n  FROM trade_transaction\n  UNION ALL\n  SELECT t.seller_id, t.buyer_id,\n  visited || t.seller_id\n  FROM trade_transaction t\n  JOIN path p ON p.buyer_id = t.seller_id\n  WHERE NOT t.seller_id = ANY(visited)\n)\nSELECT * FROM path\nWHERE buyer_id = ANY(visited);',
    },
    {
      n: '03', title: 'Real-Time Alert',
      desc: 'DB trigger fires pg_notify on cycle completion. Node.js WebSocket pushes it to React.',
      code: "pg_notify('fraud_detected', {\n  trade_id: 10847,\n  risk_score: 80,\n  cycle: [1, 2, 3, 1],\n  reason: 'Circular loop detected'\n})\n// → Dashboard flashes 🔴",
    },
  ];

  const c = { maxWidth: 1200, margin: '0 auto', padding: '0 32px' };

  return (
    <div style={{ background: '#080808', color: '#fff' }}>

      {/* ── HERO ─────────────────────────────────────────────────────── */}
      <section className="grid-bg glow-center" style={{ minHeight: 'calc(100vh - 60px)', display: 'flex', alignItems: 'center', position: 'relative', overflow: 'hidden' }}>
        <div className="scanline" />
        <div style={{ ...c, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center', padding: '80px 32px' }}>
          <div>
            <div className="tag" style={{ marginBottom: 24 }}>
              <div className="blink" style={{ width: 6, height: 6, borderRadius: '50%', background: '#a3e635' }} />
              System Live — Scanning Market Activity
            </div>
            <h1 style={{ fontSize: 'clamp(3rem, 5.5vw, 5rem)', fontWeight: 900, lineHeight: 1.0, marginBottom: 24, letterSpacing: '-0.03em' }}>
              No Loop<br />
              <span className="neon-glow">Unseen.</span>
            </h1>
            <p style={{ color: '#9ca3af', fontSize: 17, lineHeight: 1.7, maxWidth: 400, marginBottom: 36 }}>
              The ultimate recursive graph engine to detect circular stock trading rings in real-time. Powered by PostgreSQL, Socket.io, and React.
            </p>
            <div style={{ display: 'flex', gap: 14 }}>
              <button className="btn-primary" onClick={() => navigate('/dashboard')}>
                🚀 Launch Dashboard
              </button>
              <button className="btn-outline" onClick={() => navigate('/fraud')}>
                View Fraud Engine
              </button>
            </div>
            <div style={{ display: 'flex', gap: 40, marginTop: 48 }}>
              {[['10K+', 'Trades'], ['4', 'Fraud Rings'], ['200', 'Traders']].map(([v, l]) => (
                <div key={l}>
                  <div className="neon" style={{ fontSize: 24, fontWeight: 800 }}>{v}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>{l}</div>
                </div>
              ))}
            </div>
          </div>
          <NetworkCanvas />
        </div>
      </section>

      {/* ── STATS ────────────────────────────────────────────────────── */}
      <section style={{ borderTop: '1px solid rgba(163,230,53,0.08)', borderBottom: '1px solid rgba(163,230,53,0.08)' }}>
        <div style={c}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)' }}>
            {stats.map((s, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div style={{ padding: '48px 24px', textAlign: 'center', borderRight: i < 3 ? '1px solid rgba(163,230,53,0.08)' : 'none', transition: 'background 0.2s' }}
                  onMouseEnter={e => e.currentTarget.style.background = 'rgba(163,230,53,0.03)'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <div className="neon-glow" style={{ fontSize: 'clamp(2rem,3.5vw,2.8rem)', fontWeight: 900, marginBottom: 8 }}>
                    <Counter target={s.v} suffix={s.s} />
                  </div>
                  <div style={{ color: '#6b7280', fontSize: 13 }}>{s.l}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── MARQUEE ──────────────────────────────────────────────────── */}
      <section style={{ padding: '40px 0', overflow: 'hidden', borderBottom: '1px solid rgba(163,230,53,0.06)' }}>
        <div className="marquee">
          {[...Array(3)].map((_, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: 0 }}>
              {['DETECT', 'SECURE', 'PROTECT', 'PREVENT', 'ANALYZE', 'SURVEIL'].map((w, j) => (
                <React.Fragment key={j}>
                  <span style={{ fontSize: 'clamp(2.5rem,6vw,5rem)', fontWeight: 900, margin: '0 20px', letterSpacing: '-0.02em', color: w === 'DETECT' || w === 'PREVENT' ? '#a3e635' : 'rgba(255,255,255,0.05)', textShadow: w === 'DETECT' || w === 'PREVENT' ? '0 0 30px rgba(163,230,53,0.4)' : 'none' }}>
                    {w}
                  </span>
                  <span style={{ color: 'rgba(163,230,53,0.2)', fontSize: '2rem' }}>✦</span>
                </React.Fragment>
              ))}
            </span>
          ))}
        </div>
      </section>

      {/* ── HOW IT WORKS ─────────────────────────────────────────────── */}
      <section style={{ padding: '100px 0', position: 'relative' }} className="glow-center">
        <div style={c}>
          <Reveal style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ color: '#a3e635', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Architecture</span>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>
              Your path to <span className="neon-glow">market integrity.</span>
            </h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 24 }}>
            {steps.map((s, i) => (
              <Reveal key={i} delay={i * 0.15}>
                <div className="glass card-hover" style={{ padding: 32, height: '100%' }}>
                  <div style={{ fontSize: 52, fontWeight: 900, color: 'rgba(163,230,53,0.1)', lineHeight: 1, marginBottom: 16 }}>{s.n}</div>
                  <h3 style={{ fontSize: 18, fontWeight: 700, marginBottom: 10 }}>{s.title}</h3>
                  <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{s.desc}</p>
                  <div style={{ background: 'rgba(0,0,0,0.5)', border: '1px solid rgba(163,230,53,0.08)', borderRadius: 10, padding: 14 }}>
                    <pre style={{ color: '#a3e635', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'pre-wrap', lineHeight: 1.6 }}>{s.code}</pre>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CAPABILITIES ─────────────────────────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid rgba(163,230,53,0.06)' }}>
        <div style={c}>
          <Reveal style={{ textAlign: 'center', marginBottom: 72 }}>
            <span style={{ color: '#a3e635', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Detection Engine</span>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>
              Choose your <span className="neon-glow">parameters.</span>
            </h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
            {capabilities.map((cap, i) => (
              <Reveal key={i} delay={i * 0.1}>
                <div className="glass card-hover" style={{ padding: 28, height: '100%' }}>
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{cap.emoji}</div>
                  <h3 style={{ fontWeight: 700, fontSize: 16, marginBottom: 10 }}>{cap.title}</h3>
                  <p style={{ color: '#9ca3af', fontSize: 13, lineHeight: 1.6, marginBottom: 16 }}>{cap.desc}</p>
                  <div className="tag" style={{ fontSize: 10 }}>{cap.tag}</div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── LIVE COUNTER ─────────────────────────────────────────────── */}
      <section style={{ padding: '100px 0', textAlign: 'center', borderTop: '1px solid rgba(163,230,53,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 2, background: 'linear-gradient(90deg, transparent, #a3e635, transparent)', boxShadow: '0 0 20px rgba(163,230,53,0.5)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 0, left: '50%', transform: 'translateX(-50%)', width: 600, height: 200, background: 'radial-gradient(ellipse at bottom, rgba(163,230,53,0.06) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={c}>
          <Reveal>
            <div style={{ color: '#4b5563', fontSize: 11, fontFamily: 'monospace', letterSpacing: '0.15em', marginBottom: 16 }}>◉ SYSTEM LIVE</div>
            <div style={{ fontSize: 'clamp(3rem,7vw,5rem)', fontWeight: 900, marginBottom: 16 }}>
              <span className="neon-glow">{trades.toLocaleString()}</span>
              <span style={{ color: 'rgba(255,255,255,0.1)', fontSize: '1.5rem', marginLeft: 16 }}>trades analyzed</span>
            </div>
            <p style={{ color: '#6b7280', fontSize: 16, maxWidth: 480, margin: '0 auto 40px' }}>
              Recursive engine running continuously. Every trade evaluated for circular patterns.
            </p>
            <button className="btn-outline" onClick={() => navigate('/dashboard')}>
              📡 Monitor Live Feed
            </button>
          </Reveal>
        </div>
      </section>

      {/* ── WHY TRACENET ─────────────────────────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid rgba(163,230,53,0.06)' }}>
        <div style={c}>
          <Reveal style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ color: '#a3e635', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>Advantages</span>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 900, letterSpacing: '-0.02em' }}>
              Why <span className="neon-glow">TraceNet?</span>
            </h2>
          </Reveal>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
            {features.map((f, i) => (
              <Reveal key={i} delay={i * 0.07}>
                <div className="glass-dark card-hover" style={{ padding: 24, display: 'flex', gap: 16, alignItems: 'flex-start' }}>
                  <div style={{ fontSize: 22, flexShrink: 0 }}>{f.emoji}</div>
                  <div>
                    <h3 style={{ fontWeight: 700, fontSize: 14, marginBottom: 5 }}>{f.title}</h3>
                    <p style={{ color: '#6b7280', fontSize: 13 }}>{f.desc}</p>
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ── CIRCULAR TRADING ─────────────────────────────────────────── */}
      <section style={{ padding: '100px 0', borderTop: '1px solid rgba(163,230,53,0.06)', textAlign: 'center', position: 'relative' }} className="glow-red-center">
        <div style={c}>
          <Reveal>
            <span style={{ color: '#ef4444', fontSize: 11, fontWeight: 700, letterSpacing: '0.15em', textTransform: 'uppercase', display: 'block', marginBottom: 12 }}>The Threat</span>
            <h2 style={{ fontSize: 'clamp(2rem,4vw,3.2rem)', fontWeight: 900, letterSpacing: '-0.02em', marginBottom: 20 }}>
              What is <span className="red-glow">Circular Trading?</span>
            </h2>
            <p style={{ color: '#9ca3af', fontSize: 16, maxWidth: 560, margin: '0 auto 56px', lineHeight: 1.7 }}>
              A scheme where traders buy and sell among themselves to create artificial volume — manipulating prices without real ownership change.
            </p>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 16, flexWrap: 'wrap' }}>
              {['Trader A', 'Trader B', 'Trader C', 'Trader A'].map((node, i, arr) => (
                <React.Fragment key={i}>
                  <div style={{
                    padding: '10px 20px', borderRadius: 10, fontWeight: 700, fontSize: 14,
                    border: i === arr.length - 1 ? '1px solid rgba(239,68,68,0.5)' : '1px solid rgba(163,230,53,0.3)',
                    color: i === arr.length - 1 ? '#ef4444' : '#a3e635',
                    background: i === arr.length - 1 ? 'rgba(239,68,68,0.08)' : 'rgba(163,230,53,0.05)',
                    boxShadow: i === arr.length - 1 ? '0 0 16px rgba(239,68,68,0.2)' : 'none',
                  }}>
                    {node}
                  </div>
                  {i < arr.length - 1 && (
                    <span style={{ color: i === arr.length - 2 ? '#ef4444' : '#a3e635', fontSize: 20 }}>→</span>
                  )}
                </React.Fragment>
              ))}
            </div>
            <div style={{ color: '#4b5563', fontSize: 12, fontFamily: 'monospace', marginTop: 20 }}>
              Artificial volume loop — no real ownership transfer
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── FOOTER CTA ───────────────────────────────────────────────── */}
      <section style={{ padding: '120px 0', textAlign: 'center', borderTop: '1px solid rgba(163,230,53,0.06)', position: 'relative', overflow: 'hidden' }}>
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', background: 'radial-gradient(ellipse, rgba(163,230,53,0.04) 0%, transparent 70%)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: -100, left: -100, width: 300, height: 300, borderRadius: '50%', border: '1px solid rgba(163,230,53,0.05)', pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: -100, right: -100, width: 400, height: 400, borderRadius: '50%', border: '1px solid rgba(163,230,53,0.04)', pointerEvents: 'none' }} />
        <div style={{ ...c, position: 'relative', zIndex: 1 }}>
          <Reveal>
            <h2 style={{ fontSize: 'clamp(4rem,9vw,7rem)', fontWeight: 900, lineHeight: 1, letterSpacing: '-0.04em', marginBottom: 24 }}>
              Let's<br /><span className="neon-glow">Catch Them.</span>
            </h2>
            <p style={{ color: '#6b7280', fontSize: 17, marginBottom: 40 }}>
              The engine is live. The graph is watching. Every loop leaves a trail.
            </p>
            <button className="btn-primary" onClick={() => navigate('/dashboard')} style={{ fontSize: 17, padding: '16px 40px' }}>
              🚀 Initialize Engine
            </button>
          </Reveal>
        </div>
      </section>

      <footer style={{ padding: '24px 0', borderTop: '1px solid rgba(163,230,53,0.06)', textAlign: 'center' }}>
        <span style={{ color: '#374151', fontSize: 12, fontFamily: 'monospace' }}>
          TraceNet © 2026 — PostgreSQL · Node.js · React · Socket.io
        </span>
      </footer>
    </div>
  );
}