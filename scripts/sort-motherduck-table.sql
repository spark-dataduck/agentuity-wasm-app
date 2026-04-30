-- Run this against MotherDuck to recreate otel_events sorted by timestamp.
-- Sorted data enables DuckDB's zone maps to skip row groups during time-range
-- filters, dramatically improving query performance for both cloud and Wasm.
--
-- Usage:
--   export MOTHERDUCK_TOKEN=$(grep PROD_MOTHERDUCK_TOKEN .env | cut -d= -f2)
--   duckdb "md:demo_tenant?motherduck_token=$MOTHERDUCK_TOKEN" < scripts/sort-motherduck-table.sql

-- Create sorted copy
CREATE OR REPLACE TABLE demo_tenant.main.otel_events_sorted AS
SELECT * FROM demo_tenant.main.otel_events
ORDER BY timestamp;

-- Swap: drop old, rename new
DROP TABLE demo_tenant.main.otel_events;
ALTER TABLE demo_tenant.main.otel_events_sorted RENAME TO otel_events;

-- Verify: first and last timestamps should be in order
SELECT 'Row count' AS check, COUNT(*)::VARCHAR AS value FROM demo_tenant.main.otel_events
UNION ALL
SELECT 'Min timestamp', MIN(timestamp)::VARCHAR FROM demo_tenant.main.otel_events
UNION ALL
SELECT 'Max timestamp', MAX(timestamp)::VARCHAR FROM demo_tenant.main.otel_events;
