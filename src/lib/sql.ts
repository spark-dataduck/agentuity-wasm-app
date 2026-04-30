import type { TimeRange } from './types';
import { getDatasetNow } from './db';

function intervalFor(range: TimeRange): string {
  const map: Record<string, string> = {
    '15m': '15 MINUTE',
    '1h': '1 HOUR',
    '6h': '6 HOUR',
    '24h': '24 HOUR',
    '7d': '7 DAY',
  };
  return map[range] || '24 HOUR';
}

function bucketFor(range: TimeRange, customRange?: [string, string] | null): string {
  if (range === 'custom' && customRange) {
    const diffMs = new Date(customRange[1]).getTime() - new Date(customRange[0]).getTime();
    const diffHours = diffMs / 3600_000;
    if (diffHours <= 1) return '1 MINUTE';
    if (diffHours <= 6) return '5 MINUTE';
    if (diffHours <= 24) return '15 MINUTE';
    if (diffHours <= 72) return '30 MINUTE';
    return '1 HOUR';
  }
  const map: Record<string, string> = {
    '15m': '15 SECOND',
    '1h': '1 MINUTE',
    '6h': '5 MINUTE',
    '24h': '15 MINUTE',
    '7d': '1 HOUR',
  };
  return map[range] || '15 MINUTE';
}

function brushFilter(brush: [string, string] | null): string {
  if (!brush) return '';
  return `AND timestamp BETWEEN '${brush[0]}' AND '${brush[1]}'`;
}

function timeFilter(range: TimeRange, customRange?: [string, string] | null): string {
  if (range === 'custom' && customRange) {
    return `timestamp BETWEEN '${customRange[0]}' AND '${customRange[1]}'`;
  }
  const ref = getDatasetNow();
  return `timestamp >= ${ref} - INTERVAL '${intervalFor(range)}'`;
}

export function volumeSQL(range: TimeRange, customRange?: [string, string] | null): string {
  return `-- Request volume over time, grouped by status class
SELECT
  time_bucket(INTERVAL '${bucketFor(range, customRange)}', timestamp) AS minute,
  CASE
    WHEN status_code BETWEEN 200 AND 299 THEN '2xx'
    WHEN status_code BETWEEN 400 AND 499 THEN '4xx'
    WHEN status_code >= 500 THEN '5xx'
  END AS status_class,
  COUNT(*) AS request_count
FROM demo_tenant.main.otel_events
WHERE ${timeFilter(range, customRange)}
GROUP BY minute, status_class
ORDER BY minute;`;
}

export function kpiSQL(range: TimeRange, brush: [string, string] | null = null, customRange?: [string, string] | null): string {
  return `-- KPI summary
SELECT
  COUNT(*) AS total_requests,
  ROUND(100.0 * SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_rate,
  ROUND(approx_quantile(duration_ms, 0.50), 0) AS p50_ms,
  ROUND(approx_quantile(duration_ms, 0.99), 0) AS p99_ms,
  COUNT(DISTINCT trace_id) AS unique_traces,
  COUNT(DISTINCT service_name) AS unique_services,
  SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) AS error_count,
  SUM(CASE WHEN severity = 'WARN' THEN 1 ELSE 0 END) AS warn_count
FROM demo_tenant.main.otel_events
WHERE ${timeFilter(range, customRange)} ${brushFilter(brush)};`;
}

export function servicesSQL(range: TimeRange, brush: [string, string] | null = null, customRange?: [string, string] | null): string {
  return `-- Top services by error rate
SELECT
  service_name,
  COUNT(*) AS total,
  ROUND(100.0 * SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_pct,
  ROUND(approx_quantile(duration_ms, 0.99), 0) AS p99_ms
FROM demo_tenant.main.otel_events
WHERE ${timeFilter(range, customRange)} ${brushFilter(brush)}
GROUP BY service_name
ORDER BY error_pct DESC;`;
}

export function latencySQL(range: TimeRange, brush: [string, string] | null = null, customRange?: [string, string] | null): string {
  return `-- Latency histogram by service
SELECT
  service_name,
  LEAST(FLOOR(duration_ms / 250.0)::INTEGER + 1, 20) AS bucket,
  COUNT(*) AS cnt
FROM demo_tenant.main.otel_events
WHERE ${timeFilter(range, customRange)} ${brushFilter(brush)}
GROUP BY service_name, bucket
ORDER BY service_name, bucket;`;
}

export function errorRateTimeSQL(range: TimeRange, brush: [string, string] | null = null, customRange?: [string, string] | null): string {
  return `-- Error rate over time by service
SELECT
  time_bucket(INTERVAL '${bucketFor(range, customRange)}', timestamp) AS minute,
  service_name,
  ROUND(100.0 * SUM(CASE WHEN status_code >= 500 THEN 1 ELSE 0 END) / COUNT(*), 2) AS error_pct
FROM demo_tenant.main.otel_events
WHERE ${timeFilter(range, customRange)} ${brushFilter(brush)}
GROUP BY minute, service_name
HAVING COUNT(*) > 5
ORDER BY minute;`;
}

export function p99TimeSQL(range: TimeRange, brush: [string, string] | null = null, customRange?: [string, string] | null): string {
  return `-- P99 latency over time by service
SELECT
  time_bucket(INTERVAL '${bucketFor(range, customRange)}', timestamp) AS minute,
  service_name,
  ROUND(approx_quantile(duration_ms, 0.99), 0) AS p99_ms
FROM demo_tenant.main.otel_events
WHERE ${timeFilter(range, customRange)} ${brushFilter(brush)}
GROUP BY minute, service_name
ORDER BY minute;`;
}

export function logsSQL(
  range: TimeRange,
  severity: string | null,
  service: string | null,
  searchTerm: string | null,
  brush: [string, string] | null = null,
  customRange?: [string, string] | null,
): string {
  const filters = [
    timeFilter(range, customRange),
    `message IS NOT NULL`,
  ];
  if (brush) filters.push(`timestamp BETWEEN '${brush[0]}' AND '${brush[1]}'`);
  if (severity) filters.push(`severity = '${severity}'`);
  if (service) filters.push(`service_name = '${service}'`);
  if (searchTerm) filters.push(`message ILIKE '%${searchTerm}%'`);

  return `-- Log search with filters
SELECT
  timestamp, service_name, severity, status_code, message, trace_id
FROM demo_tenant.main.otel_events
WHERE ${filters.join('\n  AND ')}
ORDER BY timestamp DESC
LIMIT 100;`;
}

export function traceSQL(traceId: string): string {
  return `-- All spans for trace ${traceId}
SELECT
  span_id, parent_span_id, service_name, operation_name,
  severity, status_code, timestamp, duration_ms
FROM demo_tenant.main.otel_events
WHERE trace_id = '${traceId}'
ORDER BY timestamp;`;
}
