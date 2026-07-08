import psycopg2
import random
from datetime import date, timedelta

DB_CONFIG = {
    "host":     "localhost",
    "database": "tracenet",
    "user":     "postgres",
    "password": "lavish01"   # ← change this
}

conn = psycopg2.connect(**DB_CONFIG)
cur  = conn.cursor()

# ── 1. Clear all tables in correct FK order ───────────────────────────────────
print("🧹 Clearing all tables...")
cur.execute("TRUNCATE TABLE risk_log            RESTART IDENTITY CASCADE;")
cur.execute("TRUNCATE TABLE trade_transaction   RESTART IDENTITY CASCADE;")
cur.execute("TRUNCATE TABLE trust_score_history RESTART IDENTITY CASCADE;")
cur.execute("TRUNCATE TABLE trader              RESTART IDENTITY CASCADE;")
cur.execute("TRUNCATE TABLE stock               RESTART IDENTITY CASCADE;")
conn.commit()
print("✅ All tables cleared")

# ── 2. Seed 30 stocks (stock_id AUTO | symbol | company_name) ─────────────────
stocks = [
    ("RELIANCE", "Reliance Industries"),
    ("TCS",      "Tata Consultancy Services"),
    ("INFY",     "Infosys Ltd"),
    ("HDFC",     "HDFC Bank"),
    ("WIPRO",    "Wipro Ltd"),
    ("AAPL",     "Apple Inc"),
    ("GOOGL",    "Alphabet Inc"),
    ("MSFT",     "Microsoft Corp"),
    ("AMZN",     "Amazon Inc"),
    ("TSLA",     "Tesla Inc"),
    ("ICICI",    "ICICI Bank"),
    ("BAJAJ",    "Bajaj Finance"),
    ("HIND",     "Hindustan Unilever"),
    ("NTPC",     "NTPC Ltd"),
    ("COAL",     "Coal India"),
    ("META",     "Meta Platforms"),
    ("NVDA",     "NVIDIA Corp"),
    ("NFLX",     "Netflix Inc"),
    ("UBER",     "Uber Technologies"),
    ("SPOT",     "Spotify Technology"),
    ("ADANI",    "Adani Enterprises"),
    ("MARUTI",   "Maruti Suzuki"),
    ("SUNPH",    "Sun Pharma"),
    ("DRRED",    "Dr. Reddys Labs"),
    ("CIPLA",    "Cipla Ltd"),
    ("AXISB",    "Axis Bank"),
    ("KOTAK",    "Kotak Mahindra Bank"),
    ("LTIM",     "LTIMindtree"),
    ("POWGR",    "Power Grid Corp"),
    ("ONGC",     "ONGC Ltd"),
]

for symbol, name in stocks:
    cur.execute(
        "INSERT INTO stock (symbol, company_name) VALUES (%s, %s)",
        (symbol, name)
    )
conn.commit()
print(f"✅ {len(stocks)} stocks seeded (IDs 1–{len(stocks)})")

# ── 3. Seed 200 traders (trader_id AUTO | trader_name | registration_date | trust_score) ──
today = date.today()

for i in range(1, 201):
    # Spread registration dates randomly over the past year
    reg_date = today - timedelta(days=random.randint(1, 365))
    cur.execute(
        """INSERT INTO trader (trader_name, registration_date, trust_score)
           VALUES (%s, %s, %s)""",
        (f"Trader_{i:03d}", reg_date, 100)
    )
conn.commit()
print("✅ 200 traders seeded (IDs 1–200, trust_score=100)")

# ── 4. Verify all counts ──────────────────────────────────────────────────────
print("\n📊 Verification:")
cur.execute("SELECT COUNT(*) FROM stock;")
print(f"   Stocks        : {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM trader;")
print(f"   Traders       : {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM trade_transaction;")
print(f"   Trades        : {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM risk_log;")
print(f"   Risk Logs     : {cur.fetchone()[0]}")
cur.execute("SELECT COUNT(*) FROM trust_score_history;")
print(f"   Trust History : {cur.fetchone()[0]}")

cur.close()
conn.close()
print("\n🎉 Clean DB ready — run live_trader.py to start live feed!")