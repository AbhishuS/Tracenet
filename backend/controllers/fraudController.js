const pool = require('../config/db');

async function getRiskLogs(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        rl.risk_id,
        rl.trade_id,
        rl.risk_score,
        rl.reason,
        rl.detected_at,
        CASE
          WHEN rl.reason ILIKE '%abnormal price%' THEN 'ABNORMAL PRICE'
          WHEN rl.reason ILIKE '%repeated trading%' THEN 'REPEATED PATTERN'
          WHEN rl.reason ILIKE '%trust%' THEN 'TRUST SIGNAL'
          ELSE 'SUSPICIOUS'
        END AS risk_label,
        tt.stock_id,
        s.symbol,
        tt.seller_id,
        seller.trader_name AS seller_name,
        tt.buyer_id,
        buyer.trader_name AS buyer_name
      FROM risk_log rl
      JOIN trade_transaction tt ON tt.trade_id = rl.trade_id
      LEFT JOIN stock s ON s.stock_id = tt.stock_id
      LEFT JOIN trader seller ON seller.trader_id = tt.seller_id
      LEFT JOIN trader buyer ON buyer.trader_id = tt.buyer_id
      WHERE rl.reason NOT ILIKE '%Circular trading loop detected%'
      ORDER BY rl.detected_at DESC, rl.risk_id DESC
      LIMIT 300
    `);

    res.json({ logs: rows });
  } catch (error) {
    console.error('getRiskLogs error:', error);
    res.status(500).json({
      error: 'Failed to fetch risk logs',
      details: error.message,
    });
  }
}

async function getFraudCycles(req, res) {
  try {
    const { rows } = await pool.query(`
      WITH RECURSIVE cycle_scan AS (
        SELECT
          t.trade_id AS root_trade_id,
          t.trade_id,
          t.stock_id,
          t.seller_id,
          t.buyer_id,
          ARRAY[t.seller_id, t.buyer_id]::INT[] AS cycle,
          ARRAY[t.trade_id]::INT[] AS trade_path,
          1 AS depth,
          t.timestamp AS start_ts,
          t.timestamp AS last_ts
        FROM trade_transaction t
        WHERE t.timestamp >= NOW() - INTERVAL '6 hours'

        UNION ALL

        SELECT
          cs.root_trade_id,
          n.trade_id,
          n.stock_id,
          n.seller_id,
          n.buyer_id,
          cs.cycle || n.buyer_id,
          cs.trade_path || n.trade_id,
          cs.depth + 1,
          cs.start_ts,
          n.timestamp AS last_ts
        FROM cycle_scan cs
        JOIN trade_transaction n
          ON n.stock_id = cs.stock_id
         AND n.seller_id = cs.buyer_id
         AND n.timestamp >= cs.last_ts - INTERVAL '10 minutes'
         AND n.timestamp <= cs.last_ts + INTERVAL '30 minutes'
        WHERE cs.depth < 8
          AND (
            n.buyer_id = cs.cycle[1]
            OR NOT n.buyer_id = ANY(cs.cycle)
          )
      ),

      closed_cycles AS (
        SELECT
          cs.root_trade_id,
          cs.stock_id,
          s.symbol,
          cs.cycle,
          cs.trade_path,
          cs.depth,
          cs.start_ts,
          cs.last_ts,
          EXTRACT(EPOCH FROM (cs.last_ts - cs.start_ts)) / 60.0 AS loop_minutes
        FROM cycle_scan cs
        LEFT JOIN stock s ON s.stock_id = cs.stock_id
        WHERE cs.buyer_id = cs.cycle[1]
          AND cs.depth >= 3
      ),

      normalized_cycles AS (
        SELECT
          root_trade_id,
          stock_id,
          symbol,
          cycle,
          trade_path,
          depth,
          start_ts,
          last_ts,
          loop_minutes,
          cycle[1:array_length(cycle, 1)-1] AS culprits
        FROM closed_cycles
      ),

      grouped_rings AS (
        SELECT
          stock_id,
          symbol,
          culprits,
          COUNT(*)::INT AS occurrences,
          MAX(depth)::INT AS max_depth,
          ROUND(MIN(loop_minutes)::numeric, 2) AS fastest_loop_minutes,
          ARRAY_AGG(root_trade_id) AS root_trade_ids,
          ARRAY_AGG(trade_path) AS all_trade_paths,
          ARRAY_AGG(cycle) AS all_cycles,
          MAX(last_ts) AS latest_detected_at
        FROM normalized_cycles
        GROUP BY stock_id, symbol, culprits
      )

      SELECT
        ROW_NUMBER() OVER (
          ORDER BY
            occurrences DESC,
            max_depth DESC,
            fastest_loop_minutes ASC NULLS LAST,
            latest_detected_at DESC
        )::INT AS group_id,
        stock_id,
        symbol,
        culprits,
        all_cycles[1] AS cycle,
        all_trade_paths[1] AS trade_path,
        root_trade_ids,
        all_trade_paths,
        occurrences,
        max_depth,
        fastest_loop_minutes,
        latest_detected_at AS detected_at,
        LEAST(
          100,
          52
          + occurrences * 7
          + max_depth * 4
          + CASE
              WHEN fastest_loop_minutes IS NOT NULL AND fastest_loop_minutes <= 3 THEN 10
              WHEN fastest_loop_minutes IS NOT NULL AND fastest_loop_minutes <= 8 THEN 6
              ELSE 0
            END
        )::INT AS confidence,
        'Grouped fraud ring reconstructed from recursive cycle traversal with exact trade paths' AS explanation
      FROM grouped_rings
      ORDER BY
        occurrences DESC,
        max_depth DESC,
        fastest_loop_minutes ASC NULLS LAST,
        detected_at DESC
      LIMIT 100
    `);

    res.json({ cycles: rows });
  } catch (error) {
    console.error('getFraudCycles error:', error);
    res.status(500).json({
      error: 'Failed to fetch fraud cycles',
      details: error.message,
    });
  }
}

module.exports = {
  getRiskLogs,
  getFraudCycles,
};