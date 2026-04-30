import { useMemo } from 'react';
import { ExecBadge } from './ExecBadge';
import { kpiSQL } from '../lib/sql';
import { useApp } from '../lib/store';
import { useQuery } from '../lib/use-query';
import type { KpiRow } from '../lib/types';

function fmt(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return String(Math.round(n));
}

function fmtMs(ms: number): string {
  if (ms >= 1000) return `${(ms / 1000).toFixed(1)}s`;
  return `${Math.round(ms)}ms`;
}

interface CardProps {
  label: string;
  value: string;
  sub?: string;
  color?: string;
}

function Card({ label, value, sub, color }: CardProps) {
  return (
    <div className="bg-bg-2 border border-line rounded-lg px-4 py-3 flex flex-col gap-1 min-w-0">
      <div className="text-[11px] font-medium text-fg-3 uppercase tracking-wider truncate">
        {label}
      </div>
      <div className={`text-2xl font-semibold font-mono tabular-nums ${color || 'text-fg'}`}>
        {value}
      </div>
      {sub && (
        <div className="text-[11px] font-mono text-fg-3 truncate">{sub}</div>
      )}
    </div>
  );
}

export function KpiCards() {
  const { timeRange, brushRange, customRange } = useApp();
  const sql = useMemo(() => kpiSQL(timeRange, brushRange, customRange), [timeRange, brushRange, customRange]);
  const { data, loading, executedIn, durationMs } = useQuery<KpiRow>(sql);

  const kpi = data[0];

  if (!kpi && !loading) return null;

  const totalRequests = kpi ? Number(kpi.total_requests) : 0;
  const errorRate = kpi ? Number(kpi.error_rate) : 0;
  const p50 = kpi ? Number(kpi.p50_ms) : 0;
  const p99 = kpi ? Number(kpi.p99_ms) : 0;
  const traces = kpi ? Number(kpi.unique_traces) : 0;
  const errors = kpi ? Number(kpi.error_count) : 0;
  const warns = kpi ? Number(kpi.warn_count) : 0;

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-mono text-fg-3">
          {brushRange ? 'Selected window' : 'Summary'}
        </div>
        <ExecBadge target={executedIn} durationMs={durationMs} loading={loading} />
      </div>
      <div className="grid grid-cols-6 gap-3">
        <Card
          label="Requests"
          value={fmt(totalRequests)}
          sub={`${fmt(traces)} traces`}
        />
        <Card
          label="Error rate"
          value={`${errorRate}%`}
          sub={`${fmt(errors)} errors`}
          color={errorRate >= 2 ? 'text-err' : errorRate >= 1 ? 'text-warn' : 'text-ok'}
        />
        <Card
          label="P50 latency"
          value={fmtMs(p50)}
        />
        <Card
          label="P99 latency"
          value={fmtMs(p99)}
          color={p99 >= 2000 ? 'text-err' : p99 >= 1000 ? 'text-warn' : 'text-fg'}
        />
        <Card
          label="Warnings"
          value={fmt(warns)}
          color={warns > 0 ? 'text-warn' : 'text-fg'}
        />
        <Card
          label="Services"
          value={String(kpi ? Number(kpi.unique_services) : 0)}
          sub="active"
        />
      </div>
    </div>
  );
}
