DROP MATERIALIZED VIEW IF EXISTS mv_trader_trade_summary;
DROP MATERIALIZED VIEW IF EXISTS mv_trade_risk_summary;

CREATE MATERIALIZED VIEW mv_trader_trade_summary AS
SELECT
    t.trader_id,
    t.trader_name,
    t.trust_score,
    COUNT(tt.trade_id) FILTER (WHERE tt.seller_id = t.trader_id OR tt.buyer_id = t.trader_id) AS total_trades,
    COUNT(tt.trade_id) FILTER (WHERE tt.seller_id = t.trader_id) AS total_sells,
    COUNT(tt.trade_id) FILTER (WHERE tt.buyer_id = t.trader_id) AS total_buys,
    COALESCE(AVG(rl.risk_score), 0)::NUMERIC(10,2) AS avg_risk_score,
    MAX(tt.timestamp) AS last_trade_at
FROM trader t
LEFT JOIN trade_transaction tt
    ON tt.seller_id = t.trader_id OR tt.buyer_id = t.trader_id
LEFT JOIN risk_log rl
    ON rl.trade_id = tt.trade_id
GROUP BY t.trader_id, t.trader_name, t.trust_score;

CREATE MATERIALIZED VIEW mv_trade_risk_summary AS
SELECT
    tt.trade_id,
    tt.stock_id,
    s.symbol,
    s.company_name,
    tt.seller_id,
    seller.trader_name AS seller_name,
    tt.buyer_id,
    buyer.trader_name AS buyer_name,
    tt.price,
    tt.quantity,
    tt.timestamp,
    COALESCE(MAX(rl.risk_score), 0) AS risk_score,
    MAX(rl.reason) AS reason,
    MAX(rl.detected_at) AS detected_at
FROM trade_transaction tt
JOIN stock s ON s.stock_id = tt.stock_id
JOIN trader seller ON seller.trader_id = tt.seller_id
JOIN trader buyer ON buyer.trader_id = tt.buyer_id
LEFT JOIN risk_log rl ON rl.trade_id = tt.trade_id
GROUP BY
    tt.trade_id, tt.stock_id, s.symbol, s.company_name,
    tt.seller_id, seller.trader_name,
    tt.buyer_id, buyer.trader_name,
    tt.price, tt.quantity, tt.timestamp;

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trader_trade_summary_pk
ON mv_trader_trade_summary(trader_id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_trade_risk_summary_pk
ON mv_trade_risk_summary(trade_id);