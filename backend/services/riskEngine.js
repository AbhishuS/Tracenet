// backend/services/riskEngine.js

/**
 * Compute fraud confidence score (0–100) with weighted formula
 * confidence = 0.5*cycle + 0.3*freqScore + 0.2*trustScore
 */
function calculateRiskScore({ hasCycle, frequency, trustScore }) {
  const cycleScore     = hasCycle ? 100 : 0;
  const freqScore      = Math.min(frequency * 10, 100);   // cap at 100
  const trustRiskScore = Math.max(0, 100 - trustScore);   // low trust = high risk

  const confidence = Math.round(
    0.5 * cycleScore +
    0.3 * freqScore  +
    0.2 * trustRiskScore
  );

  let label = "LOW";
  if (confidence >= 60) label = "HIGH";
  else if (confidence >= 30) label = "MEDIUM";

  return { confidence, label };
}

function buildExplanation({ hasCycle, cycle, frequency, trustScore }) {
  const parts = [];
  if (hasCycle)         parts.push(`🔴 Cycle detected: ${cycle.join(" → ")}`);
  if (frequency > 5)    parts.push(`⚠️ High frequency: ${frequency} trades in 24h`);
  if (trustScore < 50)  parts.push(`🚨 Low trust score: ${trustScore}`);
  return parts.join(" | ") || "No significant risk factors";
}

module.exports = { calculateRiskScore, buildExplanation };