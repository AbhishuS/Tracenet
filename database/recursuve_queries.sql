-- database/recursive_queries.sql

-- Detect ALL circular trading loops (3 to 10 hops)
WITH RECURSIVE trade_path AS (
  -- Base: every trade is a starting edge
  SELECT
    t.seller_id                      AS origin,
    t.buyer_id                       AS current_node,
    ARRAY[t.seller_id]               AS visited,
    ARRAY[t.trade_id]                AS path_trades,
    1                                AS depth
  FROM trade_transaction t

  UNION ALL

  -- Recurse: follow next trade from current_node
  SELECT
    tp.origin,
    t.buyer_id,
    tp.visited || t.seller_id,
    tp.path_trades || t.trade_id,
    tp.depth + 1
  FROM trade_transaction t
  JOIN trade_path tp ON tp.current_node = t.seller_id
  WHERE
    NOT t.seller_id = ANY(tp.visited)   -- no revisit mid-path
    AND tp.depth < 10                   -- max ring size
)
SELECT
  origin,
  visited || current_node  AS full_cycle,
  path_trades,
  depth + 1                AS ring_size
FROM trade_path
WHERE current_node = origin   -- cycle closes back to origin
  AND depth >= 2;             -- at least 3 nodes (A->B->C->A)