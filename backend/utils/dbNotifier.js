// backend/utils/dbNotifier.js

const { Client } = require("pg");

/**
 * Opens a dedicated long-lived PG connection for LISTEN/NOTIFY.
 * When a new fraud entry is logged by the DB trigger, this notifies
 * the Socket.io server which pushes it to the React dashboard instantly.
 */
async function startDBNotifier(io) {
  const client = new Client({
    user:     process.env.DB_USER     || "postgres",
    host:     process.env.DB_HOST     || "localhost",
    database: process.env.DB_NAME     || "tracenet",
    password: process.env.DB_PASSWORD || "password",
    port:     parseInt(process.env.DB_PORT) || 5432,
  });

  await client.connect();
  console.log("🔔 DB Notifier listening on channel: fraud_detected");

  // Listen for notifications from DB trigger
  await client.query("LISTEN fraud_detected");

  client.on("notification", async (msg) => {
    try {
      const payload = JSON.parse(msg.payload);
      console.log("📡 New fraud event from DB:", payload);

      // Push to ALL connected React clients via Socket.io
      io.emit("fraud_alert", [payload]);

      // Refresh materialized views so dashboard stats stay current
      const { Pool } = require("pg");
      const pool = require("../config/db");
      await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY dashboard_stats");
      await pool.query("REFRESH MATERIALIZED VIEW CONCURRENTLY high_risk_traders");

      console.log("✅ Materialized views refreshed after fraud event");
    } catch (err) {
      console.error("❌ DB Notifier error:", err.message);
    }
  });

  client.on("error", (err) => {
    console.error("❌ DB Notifier client error:", err.message);
  });
}

module.exports = { startDBNotifier };