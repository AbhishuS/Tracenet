import json
import random
import time
from datetime import datetime

import requests

BASE_URL = "http://localhost:5000/api"
CONFIG_FILE = "ringsconfig.json"

NORMAL_TRADE_INTERVAL = 1.2
RING_STEP_INTERVAL = 0.55
PAUSE_BETWEEN_COMPLETED_RINGS = 3.0
NORMAL_BURST_MIN = 2
NORMAL_BURST_MAX = 5
RING_BURST_MIN = 1
RING_BURST_MAX = 2
REQUEST_TIMEOUT = 5


def now_str():
    return datetime.now().strftime("%H:%M:%S")


def safe_json_response(res):
    try:
      if not res.text or not res.text.strip():
          return None
      return res.json()
    except ValueError:
      return None


def load_config():
    try:
        with open(CONFIG_FILE, "r", encoding="utf-8") as f:
            config = json.load(f)

        trader_ids = [int(x) for x in config.get("trader_ids", [])]
        stock_ids = [int(x) for x in config.get("stock_ids", [])]
        fraud_rings = [
            [int(x) for x in ring]
            for ring in config.get("fraud_rings", [])
            if isinstance(ring, list) and len(ring) >= 3
        ]

        if not trader_ids:
            raise ValueError("No trader_ids found in ringsconfig.json")

        if not stock_ids:
            raise ValueError("No stock_ids found in ringsconfig.json")

        if not fraud_rings:
            raise ValueError("No valid fraud_rings found in ringsconfig.json")

        print(f"[{now_str()}] Loaded {CONFIG_FILE}")
        print(f"[{now_str()}] Traders loaded: {len(trader_ids)}")
        print(f"[{now_str()}] Stocks loaded: {len(stock_ids)}")
        print(f"[{now_str()}] Fraud rings configured: {len(fraud_rings)}")

        return {
            "trader_ids": trader_ids,
            "stock_ids": stock_ids,
            "fraud_rings": fraud_rings,
        }

    except FileNotFoundError:
        print(f"[{now_str()}] {CONFIG_FILE} not found, falling back to backend fetch")
        return None
    except Exception as e:
        print(f"[{now_str()}] Config load error: {e}")
        return None


def fetch_ids_from_db():
    try:
        traders_res = requests.get(f"{BASE_URL}/traders", timeout=REQUEST_TIMEOUT)
        traders = safe_json_response(traders_res)

        if traders_res.status_code != 200:
            print(f"[{now_str()}] Backend returned HTTP {traders_res.status_code} for /traders")
            print(traders_res.text[:300])
            raise SystemExit(1)

        if not isinstance(traders, list):
            print(f"[{now_str()}] /traders did not return a JSON array")
            print(str(traders_res.text)[:300])
            raise SystemExit(1)

        trader_ids = [int(t["trader_id"]) for t in traders if "trader_id" in t]
        stock_ids = list(range(1, 31))

        if len(trader_ids) >= 10:
            fraud_rings = [
                trader_ids[0:4],
                trader_ids[4:8],
                trader_ids[2:7],
            ]
        elif len(trader_ids) >= 7:
            fraud_rings = [
                trader_ids[0:4],
                trader_ids[3:7],
            ]
        elif len(trader_ids) >= 5:
            fraud_rings = [
                trader_ids[0:3],
                trader_ids[2:5],
            ]
        else:
            fraud_rings = [trader_ids]

        fraud_rings = [ring for ring in fraud_rings if len(ring) >= 3]

        print(f"[{now_str()}] Fetched traders from backend")
        print(f"[{now_str()}] Traders loaded: {len(trader_ids)}")
        print(f"[{now_str()}] Generated fraud rings: {len(fraud_rings)}")

        return {
            "trader_ids": trader_ids,
            "stock_ids": stock_ids,
            "fraud_rings": fraud_rings,
        }

    except requests.exceptions.ConnectionError:
        print(f"[{now_str()}] Cannot reach backend on port 5000. Is backend/server.js running?")
        raise SystemExit(1)
    except Exception as e:
        print(f"[{now_str()}] Cannot fetch IDs from backend: {e}")
        raise SystemExit(1)


def post_trade(seller_id, buyer_id, stock_id, price, quantity, label="NORMAL", meta=None):
    payload = {
        "seller_id": int(seller_id),
        "buyer_id": int(buyer_id),
        "stock_id": int(stock_id),
        "price": round(float(price), 2),
        "quantity": int(quantity),
    }

    try:
        res = requests.post(f"{BASE_URL}/trades", json=payload, timeout=REQUEST_TIMEOUT)
        trade = safe_json_response(res)

        if res.status_code not in (200, 201):
            print(f"[{now_str()}] HTTP {res.status_code} while posting trade")
            print(f"[{now_str()}] Payload: {payload}")
            print(f"[{now_str()}] Response: {res.text[:300]}")
            return None

        if isinstance(trade, dict) and "trade_id" in trade:
            prefix = "FRAUD" if label == "FRAUD" else "TRADE"
            extra = f" | {meta}" if meta else ""
            print(
                f"[{now_str()}] [{prefix}] "
                f"ID {str(trade['trade_id']).rjust(6)} | "
                f"S {str(seller_id).rjust(3)} -> B {str(buyer_id).rjust(3)} | "
                f"Stock {str(stock_id).rjust(3)} | "
                f"Price {payload['price']:8.2f} | "
                f"Qty {str(quantity).rjust(4)}"
                f"{extra}"
            )
            return trade["trade_id"]

        print(f"[{now_str()}] Invalid non-JSON or malformed response")
        print(f"[{now_str()}] Payload: {payload}")
        print(f"[{now_str()}] Response: {res.text[:300]}")
        return None

    except requests.exceptions.ConnectionError:
        print(f"[{now_str()}] Cannot reach backend on port 5000. Is backend/server.js running?")
        return None
    except Exception as e:
        print(f"[{now_str()}] Error posting trade: {e}")
        return None


def choose_normal_trade_pair(trader_ids, avoid_pairs=None):
    avoid_pairs = avoid_pairs or set()
    shuffled = trader_ids[:]
    random.shuffle(shuffled)

    for i in range(len(shuffled)):
        for j in range(len(shuffled)):
            if i == j:
                continue
            pair = (shuffled[i], shuffled[j])
            if pair not in avoid_pairs:
                return pair

    seller, buyer = random.sample(trader_ids, 2)
    return seller, buyer


def make_ring_state(ring, stock_ids, ring_index):
    base_price = round(random.uniform(180, 280), 2)
    return {
        "ring_index": ring_index,
        "members": ring[:],
        "cursor": 0,
        "stock_id": random.choice(stock_ids),
        "base_price": base_price,
        "active_round": 1,
        "completed_loops": 0,
    }


def reset_ring_state(state, stock_ids):
    state["cursor"] = 0
    state["stock_id"] = random.choice(stock_ids)
    state["base_price"] = round(random.uniform(180, 280), 2)
    state["active_round"] += 1
    state["completed_loops"] += 1


def generate_ring_trade(state):
    ring = state["members"]
    idx = state["cursor"]
    seller = ring[idx]
    buyer = ring[(idx + 1) % len(ring)]

    noise = random.uniform(-3.5, 3.5)
    trend = (idx % 3) * random.uniform(0.8, 2.2)
    price = max(60, state["base_price"] + trend + noise)
    qty = random.randint(90, 220)

    meta = (
        f"ring#{state['ring_index'] + 1} "
        f"loop#{state['active_round']} "
        f"step {idx + 1}/{len(ring)}"
    )

    state["cursor"] = (state["cursor"] + 1) % len(ring)

    just_closed = state["cursor"] == 0

    return {
        "seller_id": seller,
        "buyer_id": buyer,
        "stock_id": state["stock_id"],
        "price": price,
        "quantity": qty,
        "meta": meta,
        "just_closed": just_closed,
    }


def generate_normal_trade(trader_ids, stock_ids, ring_states):
    suspicious_pairs = set()
    suspicious_stocks = set()

    for state in ring_states:
        ring = state["members"]
        suspicious_stocks.add(state["stock_id"])
        for i in range(len(ring)):
            suspicious_pairs.add((ring[i], ring[(i + 1) % len(ring)]))

    seller, buyer = choose_normal_trade_pair(trader_ids, suspicious_pairs)
    stock_pool = [s for s in stock_ids if s not in suspicious_stocks]

    if not stock_pool:
        stock_pool = stock_ids[:]

    stock_id = random.choice(stock_pool)
    price = round(random.uniform(40, 5200), 2)
    quantity = random.randint(1, 500)

    return {
        "seller_id": seller,
        "buyer_id": buyer,
        "stock_id": stock_id,
        "price": price,
        "quantity": quantity,
        "meta": "normal-flow",
    }


def main():
    config = load_config() or fetch_ids_from_db()

    trader_ids = config["trader_ids"]
    stock_ids = config["stock_ids"]
    fraud_rings = [ring for ring in config["fraud_rings"] if len(ring) >= 3]

    if not fraud_rings:
        print(f"[{now_str()}] No valid fraud rings available.")
        raise SystemExit(1)

    ring_states = [
        make_ring_state(ring, stock_ids, idx)
        for idx, ring in enumerate(fraud_rings)
    ]

    total_normal = 0
    total_fraud = 0
    total_loops_closed = 0

    print("=" * 72)
    print("TraceNet Live Circular Trading Simulator")
    print("=" * 72)
    print(f"Normal trades: mixed realistic market activity")
    print(f"Fraud rings: {len(ring_states)} active")
    print("Fraud behavior: same-stock sequential loops, rapid short-interval execution")
    print("Goal: guarantee explainable recursive cycle detection in dashboard and fraud page")
    print("Press Ctrl+C to stop")
    print("=" * 72)

    while True:
        burst_type = random.choices(
            ["NORMAL", "RING"],
            weights=[58, 42],
            k=1,
        )[0]

        if burst_type == "NORMAL":
            burst_count = random.randint(NORMAL_BURST_MIN, NORMAL_BURST_MAX)

            for _ in range(burst_count):
                trade = generate_normal_trade(trader_ids, stock_ids, ring_states)
                trade_id = post_trade(
                    trade["seller_id"],
                    trade["buyer_id"],
                    trade["stock_id"],
                    trade["price"],
                    trade["quantity"],
                    label="NORMAL",
                    meta=trade["meta"],
                )
                if trade_id:
                    total_normal += 1
                time.sleep(NORMAL_TRADE_INTERVAL)

        else:
            state = random.choice(ring_states)
            burst_count = random.randint(RING_BURST_MIN, RING_BURST_MAX)

            for _ in range(burst_count):
                trade = generate_ring_trade(state)
                trade_id = post_trade(
                    trade["seller_id"],
                    trade["buyer_id"],
                    trade["stock_id"],
                    trade["price"],
                    trade["quantity"],
                    label="FRAUD",
                    meta=trade["meta"],
                )
                if trade_id:
                    total_fraud += 1

                if trade["just_closed"]:
                    total_loops_closed += 1
                    ring_path = " -> ".join(str(x) for x in state["members"] + [state["members"][0]])
                    print(
                        f"[{now_str()}] [RING CLOSED] ring#{state['ring_index'] + 1} | "
                        f"path {ring_path} | stock {state['stock_id']} | "
                        f"completed_loops {state['completed_loops'] + 1}"
                    )
                    reset_ring_state(state, stock_ids)
                    time.sleep(PAUSE_BETWEEN_COMPLETED_RINGS)
                else:
                    time.sleep(RING_STEP_INTERVAL)

        if (total_normal + total_fraud) % 20 == 0 and (total_normal + total_fraud) > 0:
            print(
                f"[{now_str()}] SUMMARY | "
                f"normal={total_normal} | fraud={total_fraud} | loops_closed={total_loops_closed}"
            )


if __name__ == "__main__":
    try:
        main()
    except KeyboardInterrupt:
        print(f"\n[{now_str()}] Simulator stopped.")