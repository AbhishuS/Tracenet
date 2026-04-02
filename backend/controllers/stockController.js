const pool = require('../config/db');

async function getStocks(req, res) {
  try {
    const { rows } = await pool.query(`
      SELECT
        stock_id,
        symbol,
        company_name
      FROM stock
      ORDER BY symbol ASC
    `);

    res.json(rows);
  } catch (error) {
    console.error('getStocks error', error);
    res.status(500).json({ error: 'Failed to fetch stocks' });
  }
}

module.exports = { getStocks };