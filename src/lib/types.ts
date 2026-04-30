export type ExecutionTarget = 'browser' | 'motherduck';
export type ExecutionMode = 'auto' | 'cloud' | 'local';
export type TimeRange = '15m' | '1h' | '6h' | '24h' | '7d' | 'custom';
export type Severity = 'INFO' | 'WARN' | 'DEBUG' | 'ERROR' | null;

export interface QueryResult<T = Record<string, unknown>> {
  rows: T[];
  executedIn: ExecutionTarget;
  durationMs: number;
}

export interface KpiRow {
  total_requests: number;
  error_rate: number;
  p50_ms: number;
  p99_ms: number;
  unique_traces: number;
  unique_services: number;
  error_count: number;
  warn_count: number;
}

export interface VolumeRow {
  minute: string;
  status_class: '2xx' | '4xx' | '5xx';
  request_count: number;
}

export interface ServiceRow {
  service_name: string;
  total: number;
  error_pct: number;
  p99_ms: number;
}

export interface LatencyBucket {
  service_name: string;
  bucket: number;
  cnt: number;
}

export interface ErrorRateTimeRow {
  minute: string;
  service_name: string;
  error_pct: number;
}

export interface P99TimeRow {
  minute: string;
  service_name: string;
  p99_ms: number;
}

export interface LogRow {
  timestamp: string;
  service_name: string;
  severity: string;
  status_code: number;
  message: string;
  trace_id: string;
}

export interface SpanRow {
  span_id: string;
  parent_span_id: string | null;
  service_name: string;
  operation_name: string;
  severity: string;
  status_code: number;
  timestamp: string;
  duration_ms: number;
}
