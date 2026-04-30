import { useState, useEffect, useRef, useCallback } from 'react';
import { executeQuery, onCacheStateChange, isCacheReady } from './db';
import { useApp } from './store';
import type { ExecutionTarget, ExecutionMode } from './types';

interface UseQueryResult<T> {
  data: T[];
  loading: boolean;
  error: string | null;
  executedIn: ExecutionTarget;
  durationMs: number;
  refetch: () => void;
}

interface UseQueryOptions {
  forceCloud?: boolean;
}

// Determine execution mode at QUERY TIME, not render time.
// This avoids stale closures where effectiveMode was captured as 'local'
// but the cache was invalidated before the query actually fires.
function resolveMode(forceCloud: boolean, execMode: ExecutionMode): ExecutionMode {
  if (forceCloud) return 'cloud';
  if (execMode === 'cloud') return 'cloud';
  // Check cache at the moment the query fires, not at render time
  return isCacheReady() ? 'local' : 'cloud';
}

export function useQuery<T = Record<string, unknown>>(
  sql: string,
  opts: UseQueryOptions = {},
): UseQueryResult<T> {
  const { execMode, networkDelay } = useApp();
  const { forceCloud = false } = opts;
  const [data, setData] = useState<T[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [executedIn, setExecutedIn] = useState<ExecutionTarget>('motherduck');
  const [durationMs, setDurationMs] = useState(0);
  const [cacheVersion, setCacheVersion] = useState(0);
  const sqlRef = useRef(sql);
  sqlRef.current = sql;
  const execModeRef = useRef(execMode);
  execModeRef.current = execMode;

  const seqRef = useRef(0);

  // Re-fetch when cache state changes
  useEffect(() => {
    const unsub = onCacheStateChange(() => {
      setCacheVersion((v) => v + 1);
    });
    return () => { unsub(); };
  }, []);

  const fetch = useCallback(async () => {
    // Resolve mode NOW, at query time — not from a stale render-time closure
    const mode = resolveMode(forceCloud, execModeRef.current);

    const seq = ++seqRef.current;
    setLoading(true);
    setError(null);
    try {
      const result = await executeQuery<T>(sqlRef.current, {
        mode,
        networkDelay,
      });
      if (seq !== seqRef.current) return;
      setData(result.rows);
      setExecutedIn(result.executedIn);
      setDurationMs(result.durationMs);
    } catch (err) {
      if (seq !== seqRef.current) return;
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      if (seq === seqRef.current) setLoading(false);
    }
  }, [execMode, networkDelay, cacheVersion, forceCloud]);

  // Debounce SQL changes (brush dragging) — 50ms
  useEffect(() => {
    sqlRef.current = sql;
    const timer = setTimeout(fetch, 50);
    return () => clearTimeout(timer);
  }, [sql, fetch]);

  return { data, loading, error, executedIn, durationMs, refetch: fetch };
}
