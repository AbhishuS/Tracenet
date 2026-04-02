// frontend/src/components/GraphView.jsx

import React, { useRef, useCallback } from "react";
import ForceGraph2D from "react-force-graph-2d";

export default function GraphView({ cycles }) {
  const graphRef = useRef();

  const nodesMap = {};
  const linksArr = [];

  cycles.forEach((c, cycleIdx) => {
    c.cycle.forEach((traderId) => {
      if (!nodesMap[traderId]) {
        nodesMap[traderId] = { id: traderId, label: `T-${traderId}`, risk: c.risk_label, confidence: c.confidence };
      }
    });

    for (let i = 0; i < c.cycle.length - 1; i++) {
      const src = c.cycle[i];
      const tgt = c.cycle[i + 1];
      const isClosingEdge = (i === c.cycle.length - 2) && (tgt === c.cycle[0]);
      linksArr.push({ source: src, target: tgt, isClosingEdge, confidence: c.confidence });
    }
  });

  const graphData = { nodes: Object.values(nodesMap), links: linksArr };

  const drawNode = useCallback((node, ctx, globalScale) => {
    const radius = 8;
    const isFraud = node.risk === "HIGH";
    const color = isFraud ? "#FF0033" : "#00FF66";

    if (isFraud) {
      ctx.beginPath();
      ctx.arc(node.x, node.y, radius + 6, 0, 2 * Math.PI);
      ctx.fillStyle = "rgba(255, 0, 51, 0.2)";
      ctx.fill();
    }

    ctx.beginPath();
    ctx.arc(node.x, node.y, radius, 0, 2 * Math.PI);
    ctx.fillStyle = color;
    ctx.fill();
    ctx.strokeStyle = "#000000";
    ctx.lineWidth = 2;
    ctx.stroke();

    const fontSize = Math.max(10 / globalScale, 4);
    ctx.font = `bold ${fontSize}px monospace`;
    ctx.fillStyle = "#ffffff";
    ctx.textAlign = "center";
    ctx.fillText(node.label, node.x, node.y - 14);
  }, []);

  return (
    <div className="w-full h-full rounded-xl overflow-hidden border border-[#00FF66]/20 bg-black">
      <ForceGraph2D
        ref={graphRef}
        graphData={graphData}
        nodeCanvasObject={drawNode}
        nodeCanvasObjectMode={() => "replace"}
        linkColor={(link) => link.confidence >= 60 ? "rgba(255,0,51,0.8)" : "rgba(0,255,102,0.4)"}
        linkWidth={(link) => link.isClosingEdge ? 3 : 1}
        linkDirectionalArrowLength={6}
        linkDirectionalArrowRelPos={1}
        linkDirectionalParticles={(link) => link.isClosingEdge ? 4 : 0}
        linkDirectionalParticleSpeed={0.008}
        linkDirectionalParticleColor={() => "#FF0033"}
        cooldownTicks={100}
        backgroundColor="#000000"
        onEngineStop={() => graphRef.current?.zoomToFit(400, 40)}
      />
    </div>
  );
}