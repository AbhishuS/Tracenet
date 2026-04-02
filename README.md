# TraceNet

TraceNet is a DBMS-focused stock market surveillance system that detects circular trading patterns, suspicious trading rings, and risky transactions using recursive SQL, graph-style trade modeling, live simulation, and a real-time analytics dashboard.[1][2]

## Overview

The project models stock trades as a directed graph inside a relational database, where each transaction acts as an edge from seller to buyer.[1] Instead of relying on a separate graph database, TraceNet demonstrates how graph traversal, cycle detection, fraud scoring, and explainable analytics can be implemented directly in SQL using `WITH RECURSIVE`, materialized views, and indexed relational tables.[1]

This makes the project useful as both a DBMS mini-project and a practical fraud analytics system, because it combines database design, recursive querying, real-time event handling, and an interactive frontend in one end-to-end pipeline.[1][2]

## Problem Statement

Circular trading is a manipulative market behavior in which a group of traders repeatedly buy and sell shares among themselves to generate artificial volume, create misleading activity, or influence price perception.[1] Regulatory surveillance systems typically use graph analytics or machine learning for this task, while TraceNet shows that the same core detection logic can be built on top of a relational database using recursive SQL path traversal.[1]

## Core Features

- Circular loop detection using recursive SQL path traversal over trader-to-trader trade edges.[1]
- Trading ring identification for multi-trader loops, typically in the 3-10 participant range.[1]
- Explainable fraud output that shows the exact loop path involved in suspicious activity.[1]
- Risk scoring for transactions using cycle detection, repeated trading behavior, abnormal price movement, and trader trust score signals.[1]
- Dynamic trader trust score updates based on suspicious historical behavior.[1][2]
- Risk logging system for suspicious transactions with labels, reasons, timestamps, and related trade metadata.[2]
- Real-time dashboard updates using Socket.IO event streams such as trade insertions, fraud alerts, and risk log notifications.[2]
- Live trade simulator that generates both normal trades and fraud-ring transactions for demonstrations and testing.[2]
- Frontend fraud engine that separates detected loops from the general suspicious transaction risk log.[2]
- Dashboard views for total trades, monitored traders, high-risk traders, fraud rings, recent trades, risk trends, and detected rings.[2]
- Dedupe logic on the frontend to collapse rotationally identical loops into one canonical ring view.[2]

## System Architecture

TraceNet follows a full-stack architecture with a PostgreSQL database, a Node.js/Express backend, a React frontend, and a Python-based live trade generator.[1][2]

| Layer | Purpose | Main Responsibilities |
|---|---|---|
| PostgreSQL | Data storage and analytics engine | Stores traders, stocks, trades, risk logs, trust history, materialized views, and executes recursive SQL fraud detection.[1][2] |
| Node.js + Express | API and detection backend | Accepts transactions, runs fraud analysis, updates trust scores, emits live alerts, and exposes stats/log/cycle endpoints.[2] |
| Socket.IO | Real-time communication | Pushes live trade, fraud, trust, and risk events to the dashboard and fraud engine pages.[2] |
| React frontend | Monitoring UI | Shows fraud loops, suspicious logs, recent trades, risk trend charts, ring summaries, and trader-focused views.[2] |
| Python simulator | Demo data generator | Produces normal trades and controlled fraud-ring trades to trigger circular loop detection in real time.[2] |

## Database Design

The database stores core market entities such as traders, stocks, transactions, and fraud analysis outputs.[1] The main schema described for the project includes Trader, Stock, TradeTransaction, and RiskLog, with each trade representing a directed edge from seller to buyer in the trading network.[1]

Typical entities used in the project include:[1][2]

- `trader` — trader identity, registration data, and trust score.[1][2]
- `stock` — stock identifier, symbol, and company details.[1]
- `trade_transaction` — stock trade events with seller, buyer, price, quantity, and timestamp.[1][2]
- `risk_log` — suspicious transaction records with risk score, reason, and detection timestamp.[1][2]
- `trust_score_history` — trust score evolution for explainable profile changes.[2]
- Materialized views such as `mv_trader_trade_summary` and `mv_trade_risk_summary` for analytical refresh and performance support.[2]

## Fraud Detection Logic

The core detection engine uses `WITH RECURSIVE` SQL to traverse trade chains and discover cycles where the buyer sequence eventually returns to the originating trader.[1][2] This allows the system to reconstruct exact circular loop paths and assign higher risk scores to transactions involved in those cycles.[1][2]

The implemented scoring flow combines multiple signals:[1][2]

- Circular loop detection as the strongest signal.[1][2]
- Repeated trading between the same participants within short windows.[1][2]
- Low seller or buyer trust scores.[1][2]
- Abnormal price deviation from recent average trade price.[1][2]

When suspicious activity is detected, the system records a risk log, updates trust scores, and emits real-time fraud or risk events to the frontend.[2]

## Frontend Features

The frontend is designed as a monitoring dashboard for fraud analytics rather than a generic stock trading UI.[2] It includes separate views for the main dashboard and the fraud engine, helping users distinguish overall market activity from fraud-specific insights.[2]

### Dashboard

The dashboard shows:[2]

- Total trades.[2]
- Fraud rings.[2]
- High-risk traders.[2]
- Monitored traders.[2]
- Recent trade table with merged trade and risk information.[2]
- Risk trend chart drawn on canvas.[2]
- Detected rings side panel.[2]
- Suspicious transaction risk log table.[2]

### Fraud Engine

The fraud page shows:[2]

- Loop groups summary.[2]
- Risk log entry summary.[2]
- Monitored trader count.[2]
- A loop section that shows unique circular loops.[2]
- A dedicated risk log section for suspicious but non-loop or supporting signals.[2]
- Live fraud alert toast notifications when new loops are detected.[2]

## Real-Time Workflow

A live trade can enter the system through the backend transaction API or through the simulator.[2] Once recorded, the backend analyzes the trade, evaluates risk signals, updates trust scores when needed, refreshes materialized views, and emits websocket events that update the UI without requiring a full page reload.[2]

A simplified event flow looks like this:[2]

1. A trade is inserted into `trade_transaction`.[2]
2. The backend analyzes the new trade.[2]
3. Recursive SQL checks whether the trade contributes to a circular loop.[2]
4. Risk score and reasons are generated.[2]
5. Trader trust scores may be reduced and logged to history.[2]
6. A `risk_log`, `fraud_detected`, `fraud_alert`, or trust update event is emitted.[2]
7. Dashboard and Fraud Engine pages refresh live through Socket.IO listeners.[2]

## Tech Stack

| Category | Technologies |
|---|---|
| Database | PostgreSQL, recursive CTEs, materialized views, indexing.[1][2] |
| Backend | Node.js, Express.js, Socket.IO.[2] |
| Frontend | React, React Router, custom dashboard UI, HTML canvas chart rendering.[2] |
| Simulation | Python, `requests`, JSON-based ring configuration.[2] |
| Concepts | Graph modeling in SQL, cycle detection, fraud scoring, trust analytics, real-time monitoring.[1][2] |

## Key Highlights

- Demonstrates graph analytics inside a relational database rather than using a separate graph engine.[1]
- Produces explainable fraud results by showing the exact ring path involved.[1]
- Supports live demonstrations through generated fraud-ring traffic.[2]
- Maintains trader trust history to connect transaction-level fraud with profile-level monitoring.[1][2]
- Separates circular loops from general suspicious logs for cleaner investigation workflows in the frontend.[2]
- Includes frontend deduplication of rotationally identical loops so the same ring is shown once instead of repeated in multiple rotated forms.[2]

## Example Use Cases

TraceNet can be used for:[1]

- Academic DBMS projects focused on recursive SQL and graph traversal.[1]
- Fraud analytics demos for stock market manipulation scenarios.[1]
- Teaching cycle detection and relational graph modeling concepts.[1]
- Building a foundation for more advanced surveillance systems with graph visualization or ML extensions.[1]

## Expected Outcomes

The intended outcome of the project is to detect circular trading patterns in simulated stock market datasets, show the exact loop that caused suspicion, demonstrate recursive SQL as a graph analytics tool, and provide a scalable framework for fraud analytics in a relational database environment.[1]

## Future Improvements

Natural extensions already suggested by the project scope include interactive graph visualization, temporal fraud analysis for rapid repeated trading, historical trust evolution analysis, larger-scale trade simulation, and comparative studies between relational and graph database approaches.[1]

## How to Run

### 1. Start the backend

```bash
cd backend
node server.js
```

### 2. Start the frontend

```bash
cd frontend
npm start
```

### 3. Run the live trade simulator

```bash
cd dataset
python live_trader.py
```

## Suggested Project Structure

```text
TraceNet/
├── backend/
│   ├── config/
│   ├── controllers/
│   ├── services/
│   ├── routes/
│   └── server.js
├── frontend/
│   ├── src/
│   │   ├── pages/
│   │   ├── services/
│   │   └── ...
├── dataset/
│   ├── live_trader.py
│   └── rings_config.json
└── README.md
```

## Why This Project Stands Out

TraceNet is not just a CRUD-based stock market project.[1] It stands out because it combines recursive SQL, graph-style market modeling, fraud scoring, trust analytics, live simulation, websocket-driven updates, and an investigation-oriented dashboard into a single cohesive system.[1][2]

For a DBMS project, it demonstrates advanced use of relational databases beyond standard forms, joins, and transactions by showing that a relational engine can also support graph traversal and explainable fraud analytics at application level.[1]
