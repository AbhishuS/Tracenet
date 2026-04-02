CREATE INDEX IF NOT EXISTS idx_trade_transaction_stock_id ON trade_transaction(stock_id);
CREATE INDEX IF NOT EXISTS idx_trade_transaction_seller_id ON trade_transaction(seller_id);
CREATE INDEX IF NOT EXISTS idx_trade_transaction_buyer_id ON trade_transaction(buyer_id);
CREATE INDEX IF NOT EXISTS idx_trade_transaction_timestamp ON trade_transaction(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_risk_log_trade_id ON risk_log(trade_id);
CREATE INDEX IF NOT EXISTS idx_risk_log_score ON risk_log(risk_score DESC);
CREATE INDEX IF NOT EXISTS idx_risk_log_detected_at ON risk_log(detected_at DESC);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_trader_id ON trust_score_history(trader_id);
CREATE INDEX IF NOT EXISTS idx_trust_score_history_changed_at ON trust_score_history(changed_at DESC);