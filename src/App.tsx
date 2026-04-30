import { useState, useEffect } from 'react';
import { AppContext } from './lib/store';
import type { ExecutionMode, TimeRange, Severity } from './lib/types';
import { DBProvider, useDB } from './components/DBProvider';
import { Header } from './components/Header';
import { PanelVolume } from './components/PanelVolume';
import { PanelServices } from './components/PanelServices';
import { PanelLatency } from './components/PanelLatency';
import { PanelErrorTimeline } from './components/PanelErrorTimeline';
import { PanelP99Timeline } from './components/PanelP99Timeline';
import { KpiCards } from './components/KpiCards';
import { PanelLogs } from './components/PanelLogs';
import { TraceFlyout } from './components/TraceFlyout';
import { onCacheStateChange, onQueryReady } from './lib/db';

function Dashboard() {
  const { cacheState } = useDB();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const unsub = onQueryReady((r) => setReady(r));
    return () => { unsub(); };
  }, []);

  return (
    <AppContext.Consumer>
      {(ctx) => (
        <div className="h-full flex flex-col bg-bg">
          <Header />

          {/* Status bar — single line */}
          {(() => {
            if (cacheState === 'caching') return null;
            if (ctx.execMode === 'cloud') return (
              <div className="bg-cloud-soft border-b border-cloud/20 px-4 py-1.5 text-[11px] font-mono text-cloud flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-cloud" />
                Queries running against MotherDuck (cloud)
              </div>
            );
            if (cacheState === 'cached' && ctx.execMode === 'local') return (
              <div className="bg-local-soft border-b border-local/20 px-4 py-1.5 text-[11px] font-mono text-local flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-local" />
                Queries running in DuckDB-Wasm (browser)
              </div>
            );
            return null;
          })()}

          {/* Dashboard grid */}
          <main className="flex-1 overflow-auto p-4 space-y-4 relative">
            {!ready && (
              <div className="absolute inset-0 z-40 bg-bg flex items-center justify-center">
                <div className="flex flex-col items-center gap-4">
                  <svg className="w-10 h-10 text-cloud animate-spin" viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2.5" strokeDasharray="50" strokeDashoffset="15" strokeLinecap="round" />
                  </svg>
                  <div className="text-fg-1 text-lg font-medium">Loading...</div>
                </div>
              </div>
            )}
            <KpiCards />
            <PanelVolume />
            <div className="grid grid-cols-2 gap-4">
              <PanelServices />
              <PanelLatency />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <PanelErrorTimeline />
              <PanelP99Timeline />
            </div>
            <PanelLogs />
          </main>

          <TraceFlyout />
        </div>
      )}
    </AppContext.Consumer>
  );
}

export default function App() {
  const [timeRange, setTimeRange] = useState<TimeRange>('15m');
  const [execMode, setExecMode] = useState<ExecutionMode>('local');
  const [networkDelay, setNetworkDelay] = useState(0);
  const [serviceFilter, setServiceFilter] = useState<string | null>(null);
  const [severityFilter, setSeverityFilter] = useState<Severity>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedTraceId, setSelectedTraceId] = useState<string | null>(null);
  const [brushRange, setBrushRange] = useState<[string, string] | null>(null);
  const [customRange, setCustomRange] = useState<[string, string] | null>(null);
  const [cacheState, setCacheState] = useState<'none' | 'caching' | 'cached'>('none');
  const [cachedTimeRange, setCachedTimeRange] = useState<TimeRange | null>(null);

  // Auto-switch to local mode when cache becomes ready
  useEffect(() => {
    const unsub = onCacheStateChange((state, range) => {
      setCacheState(state);
      setCachedTimeRange(range);
      if (state === 'cached') {
        setExecMode('local');
      }
    });
    return () => { unsub(); };
  }, []);

  // When time range changes, clear brush
  useEffect(() => {
    setBrushRange(null);
  }, [timeRange]);

  return (
    <AppContext.Provider
      value={{
        timeRange,
        setTimeRange,
        execMode,
        setExecMode,
        networkDelay,
        setNetworkDelay,
        serviceFilter,
        setServiceFilter,
        severityFilter,
        setSeverityFilter,
        searchTerm,
        setSearchTerm,
        selectedTraceId,
        setSelectedTraceId,
        cacheState,
        cachedTimeRange,
        customRange,
        setCustomRange,
        brushRange,
        setBrushRange,
      }}
    >
      <DBProvider timeRange={timeRange} customRange={customRange}>
        <Dashboard />
      </DBProvider>
    </AppContext.Provider>
  );
}
