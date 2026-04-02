const pool = require('../config/db');

async function getTraders(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        trader_id,
        trader_name,
        registration_date,
        trust_score
      FROM trader
      ORDER BY trader_id ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error('getTraders error:', error);
    res.status(500).json({ error: 'Failed to fetch traders' });
  }
}

async function getTraderById(req, res) {
  try {
    const traderId = Number(req.params.id);

    if (!Number.isFinite(traderId)) {
      return res.status(400).json({ error: 'Invalid trader id' });
    }

    const { rows } = await pool.query(
      `
      SELECT
        trader_id,
        trader_name,
        registration_date,
        trust_score
      FROM trader
      WHERE trader_id = $1
      LIMIT 1
      `,
      [traderId]
    );

    if (!rows.length) {
      return res.status(404).json({ error: 'Trader not found' });
    }

    res.json(rows[0]);
  } catch (error) {
    console.error('getTraderById error:', error);
    res.status(500).json({ error: 'Failed to fetch trader' });
  }
}

module.exports = {
  getTraders,
  getTraderById,
};