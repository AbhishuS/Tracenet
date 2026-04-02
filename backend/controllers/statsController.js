const pool = require('../config/db');

async function getStats(req, res) {
  try {
    const [
      tradeCountRes,
      traderCountRes,
      riskCountRes,
      groupedCycleCountRes,
      highRiskTraderRes,
      highConfidenceCycleRes,
      recentRiskRes,
      avgTrustRes,
    ] = await Promise.all([
      pool.query(`
        SELECT COUNT(*)::INT AS total_trades
        FROM trade_transaction
      `),

      pool.query(`
        SELECT COUNT(*)::INT AS total_traders
        FROM trader
      `),

      pool.query(`
        SELECT COUNT(*)::INT AS total_risk_logs
        FROM risk_log
      `),

      pool.query(`
        WITH RECURSIVE cycle_scan AS (
          SELECT
            t.trade_id,
            t.stock_id,
            t.seller_id,
            t.buyer_id,
            ARRAY[t.seller_id, t.buyer_id]::INT[] AS cycle,
            1 AS depth,
            t.timestamp AS first_ts,
            t.timestamp AS last_ts
          FROM trade_transaction t
          WHERE t.timestamp >= NOW() - INTERVAL '8 hours'

          UNION ALL

          SELECT
            n.trade_id,
            cs.stock_id,
            n.seller_id,
            n.buyer_id,
            cs.cycle || n.buyer_id,
            cs.depth + 1,
            cs.first_ts,
            n.timestamp AS last_ts
          FROM cycle_scan cs
          JOIN trade_transaction n
            ON n.stock_id = cs.stock_id
           AND n.seller_id = cs.buyer_id
           AND n.timestamp >= cs.last_ts - INTERVAL '2 minutes'
           AND n.timestamp <= cs.last_ts + INTERVAL '12 minutes'
          WHERE cs.depth < 8
            AND (
              n.buyer_id = cs.cycle[1]
              OR NOT n.buyer_id = ANY(cs.cycle)
            )
        ),
        closed_cycles AS (
          SELECT
            stock_id,
            cycle,
            depth,
            EXTRACT(EPOCH FROM (last_ts - first_ts)) / 60.0 AS duration_minutes,
            cycle[1:array_length(cycle, 1)-1] AS culprits_only
          FROM cycle_scan
          WHERE buyer_id = cycle[1]
            AND depth >= 3
        ),
        grouped_rings AS (
          SELECT DISTINCT
            stock_id,
            (
              SELECT string_agg(x::text, '-' ORDER BY x)
              FROM unnest(culprits_only) AS x
            ) AS culprit_signature
          FROM closed_cycles
        )
        SELECT COUNT(*)::INT AS fraud_rings_detected
        FROM grouped_rings
      `),

      pool.query(`
        SELECT COUNT(*)::INT AS high_risk_traders
        FROM trader
        WHERE trust_score < 40
      `),

      pool.query(`
        WITH RECURSIVE cycle_scan AS (
          SELECT
            t.trade_id,
            t.stock_id,
            t.seller_id,
            t.buyer_id,
            ARRAY[t.seller_id, t.buyer_id]::INT[] AS cycle,
            1 AS depth,
            t.timestamp AS first_ts,
            t.timestamp AS last_ts
          FROM trade_transaction t
          WHERE t.timestamp >= NOW() - INTERVAL '8 hours'

          UNION ALL

          SELECT
            n.trade_id,
            cs.stock_id,
            n.seller_id,
            n.buyer_id,
            cs.cycle || n.buyer_id,
            cs.depth + 1,
            cs.first_ts,
            n.timestamp AS last_ts
          FROM cycle_scan cs
          JOIN trade_transaction n
            ON n.stock_id = cs.stock_id
           AND n.seller_id = cs.buyer_id
           AND n.timestamp >= cs.last_ts - INTERVAL '2 minutes'
           AND n.timestamp <= cs.last_ts + INTERVAL '12 minutes'
          WHERE cs.depth < 8
            AND (
              n.buyer_id = cs.cycle[1]
              OR NOT n.buyer_id = ANY(cs.cycle)
            )
        ),
        scored_cycles AS (
          SELECT
            stock_id,
            cycle,
            depth,
            EXTRACT(EPOCH FROM (last_ts - first_ts)) / 60.0 AS duration_minutes,
            LEAST(
              100,
              ROUND(
                100 * (
                  0.45 * LEAST(1.0, depth / 5.0) +
                  0.30 * GREATEST(0.0, 1.0 - ((EXTRACT(EPOCH FROM (last_ts - first_ts)) / 60.0) / 30.0)) +
                  0.25 * LEAST(1.0, array_length(cycle, 1) / 6.0)
                )
              )
            )::INT AS confidence
          FROM cycle_scan
          WHERE buyer_id = cycle[1]
            AND depth >= 3
        )
        SELECT COUNT(*)::INT AS high_confidence_rings
        FROM scored_cycles
        WHERE confidence >= 70
      `),

      pool.query(`
        SELECT COUNT(*)::INT AS recent_risk_events
        FROM risk_log
        WHERE detected_at >= NOW() - INTERVAL '15 minutes'
      `),

      pool.query(`
        SELECT ROUND(AVG(trust_score)::numeric, 2) AS avg_trust_score
        FROM trader
      `),
    ]);

    const totalTrades = Number(tradeCountRes.rows[0]?.total_trades ?? 0);
    const totalTraders = Number(traderCountRes.rows[0]?.total_traders ?? 0);
    const totalRiskLogs = Number(riskCountRes.rows[0]?.total_risk_logs ?? 0);
    const fraudRingsDetected = Number(groupedCycleCountRes.rows[0]?.fraud_rings_detected ?? 0);
    const highRiskTraders = Number(highRiskTraderRes.rows[0]?.high_risk_traders ?? 0);
    const highConfidenceRings = Number(highConfidenceCycleRes.rows[0]?.high_confidence_rings ?? 0);
    const recentRiskEvents = Number(recentRiskRes.rows[0]?.recent_risk_events ?? 0);
    const avgTrustScore = Number(avgTrustRes.rows[0]?.avg_trust_score ?? 0);

    res.json({
      total_trades: totalTrades,
      total_traders: totalTraders,
      total_risk_logs: totalRiskLogs,
      fraud_rings_detected: fraudRingsDetected,
      high_risk_traders: highRiskTraders,
      monitored_traders: totalTraders,
      high_confidence_rings: highConfidenceRings,
      recent_risk_events: recentRiskEvents,
      avg_trust_score: avgTrustScore,
    });
  } catch (error) {
    console.error('getStats error:', error);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
}

module.exports = { getStats };