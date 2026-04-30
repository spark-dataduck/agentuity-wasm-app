import { MDConnection } from '@motherduck/wasm-client';
import type { ExecutionMode, QueryResult, TimeRange } from './types';

let connection: MDConnection | null = null;
let initPromise: Promise<void> | null = null;
let localCacheReady = false;
let cachedRange: string | null = null;

// Fixed reference timestamp from the dataset's max timestamp.
// This makes the app idempotent — "last 24h" always means the last 24h
// of the dataset, not relative to the viewer's wall clock.
let datasetNow: string | null = null;

export function getDatasetNow(): string {
  if (datasetNow) return `'${datasetNow}'::TIMESTAMP`;
  return 'now()';
}

// Listeners for cache state changes
type CacheListener = (state: 'none' | 'caching' | 'cached', range: TimeRange | null) => void;
const cacheListeners = new Set<CacheListener>();
export function onCacheStateChange(fn: CacheListener): () => void {
  cacheListeners.add(fn);
  return () => { cacheListeners.delete(fn); };
}
function notifyCacheState(state: 'none' | 'caching' | 'cached', range: TimeRange | null) {
  cacheListeners.forEach((fn) => fn(state, range));
}

const INTERVAL_MAP: Record<string, string> = {
  '15m': '15 MINUTE',
  '1h': '1 HOUR',
  '6h': '6 HOUR',
  '24h': '24 HOUR',
  '7d': '7 DAY',
};

export async function initDB(): Promise<void> {
  if (connection) return;
  if (initPromise) return initPromise;

  initPromise = (async () => {
    const token = import.meta.env.VITE_MOTHERDUCK_TOKEN;
    if (!token) {
      throw new Error(
        'VITE_MOTHERDUCK_TOKEN is not set. Add it to your .env file.',
      );
    }

    connection = MDConnection.create({ mdToken: token });
    await connection.isInitialized();

    try {
      await connection.evaluateQuery("ATTACH IF NOT EXISTS 'md:demo_tenant'");
    } catch {
      // Already attached
    }

    // Discover the dataset's max timestamp so all queries use it as "now".
    // This makes the demo work identically regardless of when it's run.
    const tsResult = await connection.evaluateQuery(
      "SELECT MAX(timestamp)::VARCHAR AS max_ts FROM demo_tenant.main.otel_events"
    );
    if (tsResult.type === 'materialized' && tsResult.data) {
      const row = tsResult.data.toRows()[0] as { max_ts: string } | undefined;
      if (row?.max_ts) {
        datasetNow = String(row.max_ts);
        console.log(`%c[init] Dataset reference time: ${datasetNow}`, 'color: #8e8e98');
      }
    }
  })();

  return initPromise;
}

/**
 * Materialize a specific time range into the local table.
 * Runs through the query queue so it starts AFTER any pending panel queries.
 */
async function materializeRange(
  range: TimeRange,
  tableName: string,
  customRange?: [string, string] | null,
): Promise<number> {
  let filterSQL: string;
  if (range === 'custom' && customRange) {
    filterSQL = `WHERE timestamp BETWEEN '${customRange[0]}' AND '${customRange[1]}'`;
  } else {
    const interval = INTERVAL_MAP[range] || '24 HOUR';
    filterSQL = `WHERE timestamp >= ${getDatasetNow()} - INTERVAL '${interval}'`;
  }
  return enqueue(async () => {
    const start = performance.now();
    await connection!.evaluateQuery(`DROP TABLE IF EXISTS ${tableName}`);
    await connection!.evaluateQuery(`
      CREATE TEMP TABLE ${tableName} AS
      SELECT timestamp, service_name, severity, status_code, duration_ms, trace_id
      FROM demo_tenant.main.otel_events
      ${filterSQL}
      ORDER BY timestamp
    `);
    return performance.now() - start;
  });
}

/**
 * Materialize the requested time range into local_otel.
 * Each time range switch re-materializes — no background prefetch
 * since a single MDConnection serializes all queries, and a 30s
 * prefetch would block interactive brush queries.
 */
export async function materializeLocal(range: TimeRange, customRange?: [string, string] | null): Promise<void> {
  // Invalidate cache SYNCHRONOUSLY before any await.
  // This ensures panel queries (which fire on 50ms debounce) see
  // isCacheReady()=false and fall back to cloud immediately.
  const cacheKey = range === 'custom' ? `custom:${customRange?.[0]}:${customRange?.[1]}` : range;
  if (localCacheReady && cachedRange === cacheKey) {
    notifyCacheState('cached', range);
    return;
  }

  localCacheReady = false;
  notifyCacheState('caching', null);

  await initDB();
  if (!connection) throw new Error('DB not initialized');

  // Yield to let panel cloud queries enqueue first.
  await new Promise((r) => setTimeout(r, 100));

  const durationMs = await materializeRange(range, 'local_otel', customRange);
  localCacheReady = true;
  cachedRange = cacheKey;
  notifyCacheState('cached', range);

  console.log(
    `%c[cache] %c☁️ materialized %c${Math.round(durationMs)}ms %clocal_otel (${range})`,
    'color: #8e8e98',
    'color: #3aa0ff',
    'color: #f5b942',
    'color: #b6f24a',
  );
}

export function isCacheReady(): boolean {
  return localCacheReady;
}

// Signal when first query returns data after a load/time-range change.
// Resettable — resets when materialization starts, fires when first query returns rows.
let queryReady = false;
type ReadyListener = (ready: boolean) => void;
const readyListeners = new Set<ReadyListener>();
export function onQueryReady(fn: ReadyListener): () => void {
  readyListeners.add(fn);
  fn(queryReady); // send current state immediately
  return () => { readyListeners.delete(fn); };
}
function setQueryReady(ready: boolean) {
  if (queryReady === ready) return;
  queryReady = ready;
  readyListeners.forEach((fn) => fn(ready));
}

export function getCachedRange(): string | null {
  return cachedRange;
}

function convertRows<T>(rawRows: Record<string, unknown>[]): T[] {
  return rawRows.map((row) => {
    const converted: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      if (typeof value === 'bigint') {
        converted[key] = Number(value);
      } else if (value && typeof value === 'object' && 'valueOf' in value) {
        converted[key] = String(value);
      } else {
        converted[key] = value;
      }
    }
    return converted as T;
  });
}

// --- Query queue: serialize queries but report only execution time, not wait ---
let queryQueue: Promise<void> = Promise.resolve();

function enqueue<T>(fn: () => Promise<T>): Promise<T> {
  const result = queryQueue.then(fn, fn); // run even if previous failed
  queryQueue = result.then(() => {}, () => {}); // swallow for chain
  return result;
}

export async function executeQuery<T = Record<string, unknown>>(
  sql: string,
  opts: { mode?: ExecutionMode; networkDelay?: number } = {},
): Promise<QueryResult<T>> {
  await initDB();
  if (!connection) throw new Error('DB not initialized');

  const { mode = 'auto', networkDelay = 0 } = opts;

  const useLocal =
    mode === 'local' ||
    (mode === 'auto' && localCacheReady);
  const useCloud = mode === 'cloud' || !localCacheReady;

  let effectiveSQL = sql;
  if (useLocal && localCacheReady) {
    effectiveSQL = sql.replace(
      /demo_tenant\.main\.otel_events/g,
      'local_otel',
    );
  }

  // Enqueue so we measure only actual execution, not queue wait
  return enqueue(async () => {
    if (useCloud && networkDelay > 0) {
      await new Promise((resolve) => setTimeout(resolve, networkDelay));
    }

    const start = performance.now();
    const result = await connection!.evaluateQuery(effectiveSQL);
    const durationMs = performance.now() - start;

    let rows: T[] = [];
    if (result.type === 'materialized' && result.data) {
      rows = convertRows<T>(result.data.toRows() as Record<string, unknown>[]);
    }

    const executedIn = useLocal && localCacheReady ? 'browser' : 'motherduck';

    if (rows.length > 0) setQueryReady(true);

    console.log(
      `%c[query] %c${executedIn === 'browser' ? '⚡ local' : '☁️ cloud'} %c${Math.round(durationMs)}ms %c${rows.length} rows`,
      'color: #8e8e98',
      executedIn === 'browser' ? 'color: #b6f24a' : 'color: #3aa0ff',
      'color: #f5b942',
      'color: #8e8e98',
    );
    console.log(`%c${effectiveSQL}`, 'color: #5f5f68');

    return { rows, executedIn, durationMs };
  });
}
