import { useState, useEffect, createContext, useContext, type ReactNode } from 'react';
import { initDB, materializeLocal, onCacheStateChange } from '../lib/db';
import type { TimeRange } from '../lib/types';

interface DBState {
  ready: boolean;
  error: string | null;
  cacheState: 'none' | 'caching' | 'cached';
  cachedTimeRange: TimeRange | null;
}

const DBContext = createContext<DBState>({ ready: false, error: null, cacheState: 'none', cachedTimeRange: null });
export const useDB = () => useContext(DBContext);

export function DBProvider({ children, timeRange, customRange }: { children: ReactNode; timeRange: TimeRange; customRange?: [string, string] | null }) {
  const [state, setState] = useState<DBState>({ ready: false, error: null, cacheState: 'none', cachedTimeRange: null });

  // Listen for cache state changes
  useEffect(() => {
    return onCacheStateChange((cacheState, cachedTimeRange) => {
      setState((prev) => ({ ...prev, cacheState, cachedTimeRange }));
    });
  }, []);

  // Initialize DB connection
  useEffect(() => {
    initDB()
      .then(() => setState((prev) => ({ ...prev, ready: true, error: null })))
      .catch((err) =>
        setState((prev) => ({ ...prev, ready: false, error: err instanceof Error ? err.message : String(err) })),
      );
  }, []);

  // Materialize local cache when DB is ready or time range changes
  useEffect(() => {
    if (!state.ready) return;
    materializeLocal(timeRange, customRange);
  }, [state.ready, timeRange, customRange?.[0], customRange?.[1]]);

  if (state.error) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <div className="text-center space-y-3">
          <div className="text-err text-sm font-mono">Connection Error</div>
          <div className="text-fg-3 text-xs font-mono max-w-md">{state.error}</div>
          <div className="text-fg-4 text-xs">
            Check VITE_MOTHERDUCK_TOKEN in your .env file
          </div>
        </div>
      </div>
    );
  }

  if (!state.ready) {
    return (
      <div className="h-full flex items-center justify-center bg-bg">
        <div className="text-center space-y-4">
          <svg className="w-8 h-8 mx-auto text-cloud animate-spin" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15" strokeLinecap="round" />
          </svg>
          <div className="text-fg-1 text-sm">Loading...</div>
          <div className="text-fg-4 text-xs font-mono">
            Connecting to MotherDuck
          </div>
        </div>
      </div>
    );
  }

  return (
    <DBContext.Provider value={state}>
      {children}
    </DBContext.Provider>
  );
}
