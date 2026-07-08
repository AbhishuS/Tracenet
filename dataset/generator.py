# dataset/generator.py  (REPLACE FULLY)

import psycopg2
import random
from datetime import datetime, timedelta
import json

DB_CONFIG = {
    "dbname":   "tracenet",
    "user":     "postgres",
    "password": "lavish01",
    "host":     "localhost",
    "port":     5432
}

conn = psycopg2.connect(**DB_CONFIG)
cur = conn.cursor()

print("🗑️  Clearing existing data...")
cur.execute("TRUNCATE trust_score_history, risk_log, trade_transaction, stock, trader RESTART IDENTITY CASCADE;")
conn.commit()

# ── Insert Traders ────────────────────────────────────────────────────────────
print("👤 Inserting 200 traders...")
trader_ids = []
for i in range(1, 201):
    cur.execute(
        "INSERT INTO trader (trader_name, trust_score) VALUES (%s, %s) RETURNING trader_id",
        (f"Trader_{i:03d}", random.randint(65, 100))
    )
    trader_ids.append(cur.fetchone()[0])
conn.commit()
print(f"   ✅ Trader IDs: {trader_ids[0]} → {trader_ids[-1]}")

# ── Insert Stocks ─────────────────────────────────────────────────────────────
print("📈 Inserting 30 stocks...")
stocks_data = [
    ("AAPL","Apple"),("GOOGL","Alphabet"),("MSFT","Microsoft"),
    ("TSLA","Tesla"),("AMZN","Amazon"),("META","Meta"),
    ("NVDA","Nvidia"),("NFLX","Netflix"),("AMD","AMD"),
    ("INTC","Intel"),("JPM","JPMorgan"),("BAC","BankOfAmerica"),
    ("GS","Goldman"),("MS","MorganStanley"),("V","Visa"),
    ("MA","Mastercard"),("PYPL","Paypal"),("SQ","Block"),
    ("HOOD","Robinhood"),("COIN","Coinbase"),("BRK","Berkshire"),
    ("WMT","Walmart"),("TGT","Target"),("COST","Costco"),
    ("NKE","Nike"),("SBUX","Starbucks"),("MCD","McDonald"),
    ("DIS","Disney"),("T","AT&T"),("VZ","Verizon")
]
stock_ids = []
for sym, company in stocks_data:
    cur.execute(
        "INSERT INTO stock (symbol, company_name) VALUES (%s, %s) RETURNING stock_id",
        (sym, company)
    )
    stock_ids.append(cur.fetchone()[0])
conn.commit()
print(f"   ✅ Stock IDs: {stock_ids[0]} → {stock_ids[-1]}")

# ── Define Fraud Rings using REAL trader_ids ──────────────────────────────────
fraud_rings = [
    trader_ids[0:3],           # 3-node ring
    trader_ids[3:7],           # 4-node ring
    trader_ids[7:12],          # 5-node ring
    trader_ids[12:17],         # another 5-node ring
]

# Save fraud ring IDs to file so live_trader.py reads them
rings_export = {"fraud_rings": fraud_rings, "trader_ids": trader_ids, "stock_ids": stock_ids}
with open("rings_config.json", "w") as f:
    json.dump(rings_export, f)
print(f"   💾 Saved fraud ring config → rings_config.json")
print(f"   🔴 Fraud ring 1: {fraud_rings[0]}")
print(f"   🔴 Fraud ring 2: {fraud_rings[1]}")
print(f"   🔴 Fraud ring 3: {fraud_rings[2]}")

# ── Insert 9,500 Legitimate Trades ───────────────────────────────────────────
print("💹 Inserting 9,500 legitimate trades...")
base_time = datetime.now() - timedelta(days=90)
batch = []
for _ in range(9500):
    seller, buyer = random.sample(trader_ids, 2)
    stock    = random.choice(stock_ids)
    price    = round(random.uniform(10, 4999), 2)
    qty      = random.randint(1, 500)
    ts       = base_time + timedelta(seconds=random.randint(0, 90 * 86400))
    batch.append((stock, seller, buyer, price, qty, ts))

cur.executemany(
    "INSERT INTO trade_transaction (stock_id, seller_id, buyer_id, price, quantity, timestamp) VALUES (%s,%s,%s,%s,%s,%s)",
    batch
)
conn.commit()
print("   ✅ Legitimate trades inserted")

# ── Inject Fraud Ring Trades ──────────────────────────────────────────────────
print("🔴 Injecting fraud ring trades...")
fraud_batch = []
for ring in fraud_rings:
    for _ in range(10):  # repeat each ring 10 times = high frequency signal
        for i in range(len(ring)):
            seller = ring[i]
            buyer  = ring[(i + 1) % len(ring)]
            stock  = random.choice(stock_ids)
            price  = round(random.uniform(100, 600), 2)
            qty    = random.randint(50, 250)
            ts     = base_time + timedelta(seconds=random.randint(0, 86400))
            fraud_batch.append((stock, seller, buyer, price, qty, ts))

cur.executemany(
    "INSERT INTO trade_transaction (stock_id, seller_id, buyer_id, price, quantity, timestamp) VALUES (%s,%s,%s,%s,%s,%s)",
    fraud_batch
)
conn.commit()
print(f"   ✅ {len(fraud_batch)} fraud trades injected across {len(fraud_rings)} rings")

cur.close()
conn.close()
print("\n🎉 Dataset generation complete!")
print(f"   Total traders : 200  (IDs {trader_ids[0]}–{trader_ids[-1]})")
print(f"   Total stocks  : 30   (IDs {stock_ids[0]}–{stock_ids[-1]})")
print(f"   Total trades  : ~{9500 + len(fraud_batch)}")
print(f"   Fraud rings   : {len(fraud_rings)}")
print(f"\n   Run live_trader.py next to start live feed ✅")