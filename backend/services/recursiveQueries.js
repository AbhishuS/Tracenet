// backend/services/recursiveQueries.js

const pool = require("../config/db");

async function detectFraudCycles() {
  const query = `
    WITH RECURSIVE trade_path AS (
      SELECT
        t.seller_id                      AS origin,
        t.buyer_id                       AS current_node,
        ARRAY[t.seller_id]               AS visited,
        ARRAY[t.trade_id]                AS path_trades,
        1                                AS depth
      FROM trade_transaction t

      UNION ALL

      SELECT
        tp.origin,
        t.buyer_id,
        tp.visited || t.seller_id,
        tp.path_trades || t.trade_id,
        tp.depth + 1
      FROM trade_transaction t
      JOIN trade_path tp ON tp.current_node = t.seller_id
      WHERE NOT t.seller_id = ANY(tp.visited)
        AND tp.depth < 10
    )
    SELECT DISTINCT
      origin,
      visited || current_node  AS full_cycle,
      path_trades,
      depth + 1                AS ring_size
    FROM trade_path
    WHERE current_node = origin
      AND depth >= 2
    LIMIT 200;
  `;
  const result = await pool.query(query);
  return result.rows;
}

module.exports = { detectFraudCycles };