DROP TABLE IF EXISTS trust_score_history CASCADE;
DROP TABLE IF EXISTS risk_log CASCADE;
DROP TABLE IF EXISTS trade_transaction CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS trader CASCADE;

CREATE TABLE trader (
    trader_id SERIAL PRIMARY KEY,
    trader_name TEXT NOT NULL,
    registration_date DATE DEFAULT CURRENT_DATE,
    trust_score INTEGER DEFAULT 100 CHECK (trust_score >= 0 AND trust_score <= 100)
);

CREATE TABLE stock (
    stock_id SERIAL PRIMARY KEY,
    symbol TEXT NOT NULL UNIQUE,
    company_name TEXT NOT NULL
);

CREATE TABLE trade_transaction (
    trade_id SERIAL PRIMARY KEY,
    stock_id INTEGER NOT NULL REFERENCES stock(stock_id) ON DELETE CASCADE,
    seller_id INTEGER NOT NULL REFERENCES trader(trader_id) ON DELETE CASCADE,
    buyer_id INTEGER NOT NULL REFERENCES trader(trader_id) ON DELETE CASCADE,
    price NUMERIC(12,2) NOT NULL CHECK (price > 0),
    quantity INTEGER NOT NULL CHECK (quantity > 0),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CHECK (seller_id <> buyer_id)
);

CREATE TABLE risk_log (
    risk_id SERIAL PRIMARY KEY,
    trade_id INTEGER NOT NULL REFERENCES trade_transaction(trade_id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    reason TEXT NOT NULL,
    detected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE trust_score_history (
    history_id SERIAL PRIMARY KEY,
    trader_id INTEGER NOT NULL REFERENCES trader(trader_id) ON DELETE CASCADE,
    old_score INTEGER NOT NULL,
    new_score INTEGER NOT NULL,
    reason TEXT NOT NULL,
    changed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);