// frontend/src/components/HeroGraph.jsx

import React, { useEffect, useRef } from "react";

export default function HeroGraph() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx    = canvas.getContext("2d");
    canvas.width  = 500;
    canvas.height = 500;

    const nodes = [
      { x: 250, y: 100, label: "A", fraud: true  },
      { x: 400, y: 280, label: "B", fraud: true  },
      { x: 320, y: 430, label: "C", fraud: true  },
      { x: 150, y: 380, label: "D", fraud: false },
      { x: 100, y: 220, label: "E", fraud: false },
      { x: 380, y: 150, label: "F", fraud: false },
    ];

    const edges = [
      { from: 0, to: 1, fraud: true  }, // A→B (fraud ring)
      { from: 1, to: 2, fraud: true  }, // B→C
      { from: 2, to: 0, fraud: true  }, // C→A (closes loop)
      { from: 3, to: 4, fraud: false },
      { from: 4, to: 0, fraud: false },
      { from: 5, to: 1, fraud: false },
      { from: 3, to: 2, fraud: false },
    ];

    let t = 0;
    let animId;

    function draw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      t += 0.02;

      // Draw edges
      edges.forEach((e) => {
        const from = nodes[e.from];
        const to   = nodes[e.to];

        ctx.beginPath();
        ctx.moveTo(from.x, from.y);
        ctx.lineTo(to.x, to.y);

        if (e.fraud) {
          const pulse = 0.5 + 0.5 * Math.sin(t * 2);
          ctx.strokeStyle = `rgba(255, 0, 51, ${0.4 + pulse * 0.5})`;
          ctx.lineWidth   = 2 + pulse;
          ctx.shadowColor = "#FF0033";
          ctx.shadowBlur  = 10 + pulse * 10;
        } else {
          ctx.strokeStyle = "rgba(0, 255, 102, 0.15)";
          ctx.lineWidth   = 1;
          ctx.shadowBlur  = 0;
        }
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Arrow
        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const ax    = to.x - 20 * Math.cos(angle);
        const ay    = to.y - 20 * Math.sin(angle);
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.lineTo(ax - 8 * Math.cos(angle - 0.4), ay - 8 * Math.sin(angle - 0.4));
        ctx.lineTo(ax - 8 * Math.cos(angle + 0.4), ay - 8 * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fillStyle = e.fraud ? `rgba(255,0,51,${0.5 + 0.5 * Math.sin(t * 2)})` : "rgba(0,255,102,0.15)";
        ctx.fill();
      });

      // Draw nodes
      nodes.forEach((node) => {
        const pulse = 0.5 + 0.5 * Math.sin(t * 1.5);
        const r     = node.fraud ? 16 + pulse * 3 : 12;
        const color = node.fraud ? "#FF0033" : "#00FF66";

        // Glow ring
        ctx.beginPath();
        ctx.arc(node.x, node.y, r + 6, 0, Math.PI * 2);
        ctx.fillStyle = node.fraud
          ? `rgba(255,0,51,${0.05 + pulse * 0.1})`
          : "rgba(0,255,102,0.04)";
        ctx.fill();

        // Node circle
        ctx.beginPath();
        ctx.arc(node.x, node.y, r, 0, Math.PI * 2);
        ctx.fillStyle = node.fraud
          ? `rgba(255,0,51,${0.15 + pulse * 0.1})`
          : "rgba(0,255,102,0.08)";
        ctx.fill();
        ctx.strokeStyle = color;
        ctx.lineWidth   = 1.5;
        ctx.shadowColor = color;
        ctx.shadowBlur  = node.fraud ? 15 + pulse * 10 : 8;
        ctx.stroke();
        ctx.shadowBlur = 0;

        // Label
        ctx.font      = "bold 13px monospace";
        ctx.fillStyle = color;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText(node.label, node.x, node.y);
      });

      animId = requestAnimationFrame(draw);
    }

    draw();
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <div className="relative flex items-center justify-center animate-float">
      <div className="absolute inset-0 radial-glow-crimson opacity-60 pointer-events-none rounded-full" />
      <canvas
        ref={canvasRef}
        className="w-full max-w-[500px] opacity-90"
        style={{ filter: "contrast(1.05)" }}
      />
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 glass px-3 py-1.5 rounded-full text-xs">
        <span className="w-1.5 h-1.5 rounded-full bg-[#FF0033] animate-pulse" />
        <span className="text-[#FF0033]">Fraud Loop Detected: A → B → C → A</span>
      </div>
    </div>
  );
}