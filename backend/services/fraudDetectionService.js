const pool = require('../config/db');
const { emitEvent } = require('./socket');

async function refreshViews(client) {
  try {
    await client.query('REFRESH MATERIALIZED VIEW mv_trader_trade_summary');
  } catch (err) {}

  try {
    await client.query('REFRESH MATERIALIZED VIEW mv_trade_risk_summary');
  } catch (err) {}
}

async function getTraderTrust(client, traderId) {
  const { rows } = await client.query(
    'SELECT trust_score FROM trader WHERE trader_id = $1',
    [traderId]
  );
  return Number(rows[0]?.trust_score ?? 100);
}

async function updateTraderTrust(client, traderId, penalty, reason) {
  const oldScore = await getTraderTrust(client, traderId);
  const newScore = Math.max(0, oldScore - penalty);

  await client.query(
    'UPDATE trader SET trust_score = $1 WHERE trader_id = $2',
    [newScore, traderId]
  );

  try {
    await client.query(
      `INSERT INTO trust_score_history (trader_id, old_score, new_score, reason)
       VALUES ($1, $2, $3, $4)`,
      [traderId, oldScore, newScore, reason]
    );
  } catch (err) {}

  emitEvent('trust_score_updated', {
    trader_id: traderId,
    old_score: oldScore,
    new_score: newScore,
    reason,
  });
}

async function detectCycleForTrade(client, tradeId) {
  const sql = `
    WITH RECURSIVE trade_chain AS (
      SELECT
        t.trade_id AS root_trade_id,
        t.trade_id,
        t.stock_id,
        t.seller_id,
        t.buyer_id,
        ARRAY[t.seller_id, t.buyer_id]::INT[] AS trader_path,
        ARRAY[t.trade_id]::INT[] AS trade_path,
        1 AS depth,
        t.timestamp AS last_ts
      FROM trade_transaction t
      WHERE t.trade_id = $1

      UNION ALL

      SELECT
        tc.root_trade_id,
        nxt.trade_id,
        nxt.stock_id,
        nxt.seller_id,
        nxt.buyer_id,
        tc.trader_path || nxt.buyer_id,
        tc.trade_path || nxt.trade_id,
        tc.depth + 1,
        nxt.timestamp
      FROM trade_chain tc
      JOIN trade_transaction nxt
        ON nxt.stock_id = tc.stock_id
       AND nxt.seller_id = tc.buyer_id
       AND nxt.timestamp >= tc.last_ts - INTERVAL '10 minutes'
       AND nxt.timestamp <= tc.last_ts + INTERVAL '30 minutes'
      WHERE tc.depth < 8
        AND (
          nxt.buyer_id = tc.trader_path[1]
          OR NOT nxt.buyer_id = ANY(tc.trader_path)
        )
    )
    SELECT
      root_trade_id,
      stock_id,
      trader_path,
      trade_path,
      depth
    FROM trade_chain
    WHERE buyer_id = trader_path[1]
      AND depth >= 3
    ORDER BY depth DESC
    LIMIT 1;
  `;

  const { rows } = await client.query(sql, [tradeId]);
  return rows[0] || null;
}

async function getRepeatedPairCount(client, stockId, sellerId, buyerId) {
  const { rows } = await client.query(
    `
    SELECT COUNT(*)::INT AS cnt
    FROM trade_transaction
    WHERE stock_id = $1
      AND (
        (seller_id = $2 AND buyer_id = $3) OR
        (seller_id = $3 AND buyer_id = $2)
      )
      AND timestamp >= NOW() - INTERVAL '30 minutes'
    `,
    [stockId, sellerId, buyerId]
  );

  return Number(rows[0]?.cnt ?? 0);
}

async function getAbnormalPriceScore(client, stockId, price, tradeId) {
  const { rows } = await client.query(
    `
    SELECT AVG(price)::NUMERIC(12,2) AS avg_price
    FROM trade_transaction
    WHERE stock_id = $1
      AND trade_id <> $2
      AND timestamp >= NOW() - INTERVAL '60 minutes'
    `,
    [stockId, tradeId]
  );

  const avg = Number(rows[0]?.avg_price ?? 0);
  const current = Number(price ?? 0);

  if (!avg || !current) {
    return { score: 0, reason: null, deviation: 0 };
  }

  const deviation = Math.abs(((current - avg) / avg) * 100);

  if (deviation >= 35) {
    return {
      score: 34,
      deviation,
      reason: `Abnormal price movement detected (${deviation.toFixed(1)}% from recent average)`,
    };
  }

  if (deviation >= 20) {
    return {
      score: 22,
      deviation,
      reason: `Moderate abnormal price deviation detected (${deviation.toFixed(1)}% from recent average)`,
    };
  }

  if (deviation >= 12) {
    return {
      score: 12,
      deviation,
      reason: `Mild abnormal price deviation detected (${deviation.toFixed(1)}% from recent average)`,
    };
  }

  return { score: 0, reason: null, deviation };
}

async function insertRiskLog(client, tradeId, riskScore, reason) {
  const { rows } = await client.query(
    `
    INSERT INTO risk_log (trade_id, risk_score, reason)
    VALUES ($1, $2, $3)
    RETURNING *
    `,
    [tradeId, riskScore, reason]
  );

  emitEvent('risk_log', rows[0]);
  return rows[0];
}

async function scoreTrade(client, trade) {
  const reasons = [];
  let riskScore = 0;

  const cycle = await detectCycleForTrade(client, trade.trade_id);
  const repeatedPairCount = await getRepeatedPairCount(
    client,
    trade.stock_id,
    trade.seller_id,
    trade.buyer_id
  );
  const sellerTrust = await getTraderTrust(client, trade.seller_id);
  const buyerTrust = await getTraderTrust(client, trade.buyer_id);
  const abnormalPrice = await getAbnormalPriceScore(
    client,
    trade.stock_id,
    trade.price,
    trade.trade_id
  );

  if (cycle) {
    const cycleComponent = Math.min(48, 24 + cycle.depth * 6);
    riskScore += cycleComponent;
    reasons.push(
      `Circular trading loop detected: ${cycle.trader_path.join(' -> ')} | trades ${cycle.trade_path.join(' -> ')}`
    );
  }

  if (repeatedPairCount >= 6) {
    riskScore += 18;
    reasons.push(`Strong repeated trading pattern detected (${repeatedPairCount} linked trades in 30 minutes)`);
  } else if (repeatedPairCount >= 4) {
    riskScore += 10;
    reasons.push(`Repeated trading pattern detected (${repeatedPairCount} linked trades in 30 minutes)`);
  } else if (repeatedPairCount >= 2) {
    riskScore += 4;
    reasons.push(`Mild repeated trading activity detected (${repeatedPairCount} linked trades in 30 minutes)`);
  }

  if (sellerTrust < 30) {
    riskScore += 18;
    reasons.push(`Seller has very low trust score (${sellerTrust})`);
  } else if (sellerTrust < 50) {
    riskScore += 10;
    reasons.push(`Seller has low trust score (${sellerTrust})`);
  } else if (sellerTrust < 70) {
    riskScore += 4;
    reasons.push(`Seller trust is weakening (${sellerTrust})`);
  }

  if (buyerTrust < 30) {
    riskScore += 18;
    reasons.push(`Buyer has very low trust score (${buyerTrust})`);
  } else if (buyerTrust < 50) {
    riskScore += 10;
    reasons.push(`Buyer has low trust score (${buyerTrust})`);
  } else if (buyerTrust < 70) {
    riskScore += 4;
    reasons.push(`Buyer trust is weakening (${buyerTrust})`);
  }

  if (abnormalPrice.score > 0) {
    riskScore += abnormalPrice.score;
    reasons.push(abnormalPrice.reason);
  }

  riskScore = Math.min(100, Math.round(riskScore));

  if (cycle) {
    const cycleReason = reasons.join(' | ');

    const loopPenalty = riskScore >= 75 ? 10 : riskScore >= 50 ? 7 : 5;
    await updateTraderTrust(client, trade.seller_id, loopPenalty, `Trade #${trade.trade_id}: ${cycleReason}`);
    await updateTraderTrust(client, trade.buyer_id, loopPenalty, `Trade #${trade.trade_id}: ${cycleReason}`);

    emitEvent('fraud_detected', {
      trade_id: trade.trade_id,
      risk_score: riskScore,
      reason: cycleReason,
      cycle_path: cycle.trader_path,
      trade_path: cycle.trade_path,
      depth: cycle.depth,
    });

    emitEvent('fraud_alert', {
      trade_id: trade.trade_id,
      risk_score: riskScore,
      reason: cycleReason,
      cycle_path: cycle.trader_path,
      trade_path: cycle.trade_path,
      depth: cycle.depth,
    });
  }

  const nonLoopReasons = reasons.filter(
    (r) => !r.startsWith('Circular trading loop detected:')
  );

  const shouldWriteRiskLog =
    abnormalPrice.score > 0 ||
    repeatedPairCount >= 2 ||
    sellerTrust < 70 ||
    buyerTrust < 70;

  if (shouldWriteRiskLog) {
    const riskReason = nonLoopReasons.length
      ? nonLoopReasons.join(' | ')
      : 'General suspicious trading signal detected';

    const nonLoopScore = Math.max(
      abnormalPrice.score,
      riskScore - (cycle ? Math.min(48, 24 + cycle.depth * 6) : 0),
      8
    );

    await insertRiskLog(client, trade.trade_id, Math.min(100, Math.round(nonLoopScore)), riskReason);

    const penalty =
      nonLoopScore >= 50 ? 6 :
      nonLoopScore >= 30 ? 4 : 2;

    await updateTraderTrust(client, trade.seller_id, penalty, `Trade #${trade.trade_id}: ${riskReason}`);
    await updateTraderTrust(client, trade.buyer_id, penalty, `Trade #${trade.trade_id}: ${riskReason}`);
  }

  return { riskScore, reasons, cycle };
}

async function analyzeNewTrade(tradeId, existingClient = null) {
  const client = existingClient || await pool.connect();
  const ownClient = !existingClient;

  try {
    const { rows } = await client.query(
      'SELECT * FROM trade_transaction WHERE trade_id = $1',
      [tradeId]
    );

    if (!rows.length) return null;

    const trade = rows[0];
    const result = await scoreTrade(client, trade);
    await refreshViews(client);
    return result;
  } finally {
    if (ownClient) client.release();
  }
}

module.exports = {
  analyzeNewTrade,
  refreshViews,
};