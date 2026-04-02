const pool = require('../config/db');
const { analyzeNewTrade, refreshViews } = require('../services/fraudDetectionService');
const { emitEvent } = require('../services/socket');

async function getTrades(req, res) {
  try {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const limit = Math.min(500, Math.max(1, parseInt(req.query.limit) || 50));
    const offset = (page - 1) * limit;

    const { rows } = await pool.query(
      `
      SELECT
        tt.trade_id,
        tt.stock_id,
        s.symbol,
        tt.seller_id,
        seller.trader_name AS seller_name,
        tt.buyer_id,
        buyer.trader_name AS buyer_name,
        tt.price,
        tt.quantity,
        tt.timestamp,
        rl.risk_score,
        rl.reason,
        rl.detected_at
      FROM trade_transaction tt
      LEFT JOIN stock s ON s.stock_id = tt.stock_id
      LEFT JOIN trader seller ON seller.trader_id = tt.seller_id
      LEFT JOIN trader buyer ON buyer.trader_id = tt.buyer_id
      LEFT JOIN LATERAL (
        SELECT risk_score, reason, detected_at
        FROM risk_log
        WHERE trade_id = tt.trade_id
        ORDER BY detected_at DESC
        LIMIT 1
      ) rl ON true
      ORDER BY tt.timestamp DESC, tt.trade_id DESC
      LIMIT $1 OFFSET $2
      `,
      [limit, offset]
    );

    res.json(rows);
  } catch (error) {
    console.error('getTrades error:', error);
    res.status(500).json({ error: 'Failed to fetch trades' });
  }
}

async function getTradeById(req, res) {
  try {
    const tradeId = Number(req.params.id);

    if (!Number.isFinite(tradeId)) {
      return res.status(400).json({ error: 'Invalid trade id' });
    }

    const { rows } = await pool.query(
      `
      SELECT
        tt.trade_id,
        tt.stock_id,
        s.symbol,
        tt.seller_id,
        seller.trader_name AS seller_name,
        tt.buyer_id,
        buyer.trader_name AS buyer_name,
        tt.price,
        tt.quantity,
        tt.timestamp,
        rl.risk_score,
        rl.reason,
        rl.detected_at
      FROM trade_transaction tt
      LEFT JOIN stock s ON s.stock_id = tt.stock_id
      LEFT JOIN trader seller ON seller.trader_id = tt.seller_id
      LEFT JOIN trader buyer ON buyer.trader_id = tt.buyer_id
      LEFT JOIN LATERAL (
        SELECT risk_score, reason, detected_at
        FROM risk_log
        WHERE trade_id = tt.trade_id
        ORDER BY detected_at DESC
        LIMIT 1
      ) rl ON true
      WHERE tt.trade_id = $1
      LIMIT 1
      `,
      [tradeId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Trade not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('getTradeById error:', error);
    res.status(500).json({ error: 'Failed to fetch trade' });
  }
}

async function createTrade(req, res) {
  const client = await pool.connect();

  try {
    const { seller_id, buyer_id, stock_id, price, quantity } = req.body;

    if (
      !Number.isFinite(Number(seller_id)) ||
      !Number.isFinite(Number(buyer_id)) ||
      !Number.isFinite(Number(stock_id)) ||
      !Number.isFinite(Number(price)) ||
      !Number.isFinite(Number(quantity))
    ) {
      return res.status(400).json({ error: 'Invalid trade payload' });
    }

    if (Number(seller_id) === Number(buyer_id)) {
      return res.status(400).json({ error: 'Seller and buyer cannot be the same' });
    }

    await client.query('BEGIN');

    const insertResult = await client.query(
      `
      INSERT INTO trade_transaction (
        stock_id,
        seller_id,
        buyer_id,
        price,
        quantity,
        timestamp
      )
      VALUES ($1, $2, $3, $4, $5, NOW())
      RETURNING *
      `,
      [
        Number(stock_id),
        Number(seller_id),
        Number(buyer_id),
        Number(price),
        Number(quantity),
      ]
    );

    const trade = insertResult.rows[0];

    await analyzeNewTrade(trade.trade_id, client);
    await refreshViews(client);

    await client.query('COMMIT');

    emitEvent('trade_inserted', trade);

    res.status(201).json(trade);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('createTrade error:', error);
    res.status(500).json({ error: 'Failed to create trade', details: error.message });
  } finally {
    client.release();
  }
}

module.exports = {
  getTrades,
  getTradeById,
  createTrade,
};