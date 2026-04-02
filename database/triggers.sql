-- database/triggers.sql

CREATE OR REPLACE FUNCTION auto_risk_log()
RETURNS TRIGGER AS $$
DECLARE
  cycle_exists  BOOLEAN;
  computed_risk INT := 0;
  trust_val     INT;
  freq_count    INT;
  payload       JSON;
BEGIN
  -- Check if this new trade completes a direct cycle
  SELECT EXISTS (
    SELECT 1 FROM trade_transaction
    WHERE seller_id = NEW.buyer_id
      AND buyer_id  = NEW.seller_id
  ) INTO cycle_exists;

  -- Get seller trust score
  SELECT trust_score INTO trust_val
  FROM trader WHERE trader_id = NEW.seller_id;

  -- Trading frequency between same pair in last 24h
  SELECT COUNT(*) INTO freq_count
  FROM trade_transaction
  WHERE seller_id = NEW.seller_id
    AND buyer_id  = NEW.buyer_id
    AND timestamp > NOW() - INTERVAL '24 hours';

  -- Compute risk score
  IF cycle_exists   THEN computed_risk := computed_risk + 40; END IF;
  IF freq_count > 5 THEN computed_risk := computed_risk + 20; END IF;
  IF trust_val < 50 THEN computed_risk := computed_risk + 20; END IF;

  -- Only act if suspicious
  IF computed_risk > 0 THEN
    -- Write to risk_log
    INSERT INTO risk_log (trade_id, risk_score, reason, detected_at)
    VALUES (
      NEW.trade_id,
      computed_risk,
      FORMAT(
        'Cycle: %s | Frequency: %s in 24h | Trust Score: %s',
        cycle_exists::TEXT, freq_count, trust_val
      ),
      NOW()
    );

    -- Degrade trader trust score
    UPDATE trader
    SET trust_score = GREATEST(0, trust_score - (computed_risk / 5))
    WHERE trader_id = NEW.seller_id;

    -- Record trust score history for line chart
    INSERT INTO trust_score_history (trader_id, trust_score, recorded_at)
    VALUES (NEW.seller_id, trust_val - (computed_risk / 5), NOW());

    -- 🔔 NOTIFY Node.js listener instantly via pg_notify
    payload := json_build_object(
      'trade_id',   NEW.trade_id,
      'seller_id',  NEW.seller_id,
      'buyer_id',   NEW.buyer_id,
      'risk_score', computed_risk,
      'reason',     FORMAT(
        'Cycle: %s | Frequency: %s in 24h | Trust Score: %s',
        cycle_exists::TEXT, freq_count, trust_val
      ),
      'detected_at', NOW()
    );
    PERFORM pg_notify('fraud_detected', payload::TEXT);
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop and recreate trigger cleanly
DROP TRIGGER IF EXISTS after_trade_insert ON trade_transaction;

CREATE TRIGGER after_trade_insert
AFTER INSERT ON trade_transaction
FOR EACH ROW EXECUTE FUNCTION auto_risk_log();