import { createContext, useContext } from 'react';
import type { ExecutionMode, TimeRange, Severity } from './types';

export interface AppState {
  timeRange: TimeRange;
  setTimeRange: (r: TimeRange) => void;
  execMode: ExecutionMode;
  setExecMode: (m: ExecutionMode) => void;
  networkDelay: number;
  setNetworkDelay: (d: number) => void;
  serviceFilter: string | null;
  setServiceFilter: (s: string | null) => void;
  severityFilter: Severity;
  setSeverityFilter: (s: Severity) => void;
  searchTerm: string;
  setSearchTerm: (t: string) => void;
  selectedTraceId: string | null;
  setSelectedTraceId: (id: string | null) => void;
  cacheState: 'none' | 'caching' | 'cached';
  cachedTimeRange: TimeRange | null;
  // Custom date range [start, end] as ISO strings
  customRange: [string, string] | null;
  setCustomRange: (range: [string, string] | null) => void;
  // Crossfilter brush: [startTimestamp, endTimestamp] from volume chart
  brushRange: [string, string] | null;
  setBrushRange: (range: [string, string] | null) => void;
}

export const AppContext = createContext<AppState>(null!);
export const useApp = () => useContext(AppContext);
