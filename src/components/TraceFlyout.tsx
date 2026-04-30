import { useMemo } from 'react';
import { ExecBadge } from './ExecBadge';
import { SqlCollapsible } from './SqlCollapsible';
import { SERVICE_COLORS } from '../lib/mock-data';
import { traceSQL } from '../lib/sql';
import { useApp } from '../lib/store';
import { useQuery } from '../lib/use-query';
import type { SpanRow } from '../lib/types';

const SEVERITY_BAR_COLORS: Record<string, string> = {
  ERROR: '#ff5d52',
  WARN: '#f5b942',
  INFO: 'var(--color-fg-3)',
  DEBUG: 'var(--color-fg-4)',
};

export function TraceFlyout() {
  const { selectedTraceId, setSelectedTraceId } = useApp();

  const sql = useMemo(
    () => (selectedTraceId ? traceSQL(selectedTraceId) : ''),
    [selectedTraceId],
  );

  const { data: spans, loading, executedIn, durationMs } = useQuery<SpanRow>(
    sql || 'SELECT 1 WHERE false',
    { forceCloud: true },
  );

  if (!selectedTraceId) return null;

  const traceStart = spans.length
    ? new Date(String(spans[0].timestamp)).getTime()
    : 0;
  const totalMs = spans.length
    ? Math.max(...spans.map((s) => {
        const start = new Date(String(s.timestamp)).getTime() - traceStart;
        return start + Number(s.duration_ms);
      }))
    : 1;

  return (
    <div
      className="fixed inset-y-0 right-0 w-[520px] bg-bg-1 border-l border-line shadow-2xl z-50 flex flex-col"
      style={{ animation: 'flyout-in 0.18s ease-out' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-line shrink-0">
        <div className="flex items-center gap-3">
          <h3 className="text-[13px] font-medium text-fg">
            Trace{' '}
            <span className="font-mono text-fg-2">
              {selectedTraceId.slice(0, 8)}...
            </span>
          </h3>
          <span className="text-[11px] font-mono text-fg-3">
            {Math.round(totalMs)}ms · {spans.length} spans
          </span>
        </div>
        <div className="flex items-center gap-2">
          <ExecBadge target={executedIn} durationMs={durationMs} loading={loading} />
          <button
            onClick={() => setSelectedTraceId(null)}
            className="text-fg-3 hover:text-fg-1 text-lg leading-none px-1"
          >
            ✕
          </button>
        </div>
      </div>

      {/* Gantt chart */}
      <div className="flex-1 overflow-auto p-4">
        {spans.length === 0 && !loading && (
          <div className="text-center text-fg-3 text-sm py-8">
            No spans found for this trace
          </div>
        )}
        <div className="space-y-0.5">
          {spans.map((span) => {
            const spanStart =
              new Date(String(span.timestamp)).getTime() - traceStart;
            const leftPct = (spanStart / totalMs) * 100;
            const widthPct = Math.max(
              (Number(span.duration_ms) / totalMs) * 100,
              0.5,
            );
            const depth = getDepth(
              span.span_id,
              span.parent_span_id,
              spans,
            );

            return (
              <div
                key={span.span_id}
                className="flex items-center gap-2 py-1 hover:bg-bg-hover rounded px-1 group"
              >
                {/* Service label */}
                <div
                  className="text-[11px] font-mono text-fg-2 truncate shrink-0"
                  style={{
                    width: 140,
                    paddingLeft: depth * 12,
                  }}
                >
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          SERVICE_COLORS[span.service_name] || '#8e8e98',
                      }}
                    />
                    {span.service_name}
                  </span>
                </div>

                {/* Bar */}
                <div className="flex-1 relative h-5">
                  <div className="absolute inset-0 bg-line/20 rounded" />
                  <div
                    className="absolute top-0 h-full rounded"
                    style={{
                      left: `${leftPct}%`,
                      width: `${widthPct}%`,
                      backgroundColor:
                        SEVERITY_BAR_COLORS[span.severity] ||
                        SERVICE_COLORS[span.service_name] ||
                        '#5f5f68',
                      opacity: 0.8,
                      animation:
                        'bar-grow 0.35s cubic-bezier(.2,.8,.2,1) both',
                    }}
                  />
                  <div
                    className="absolute top-0 h-full flex items-center pointer-events-none"
                    style={{ left: `${leftPct + widthPct + 1}%` }}
                  >
                    <span className="text-[10px] font-mono text-fg-3 whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
                      {span.operation_name} · {Math.round(Number(span.duration_ms))}ms
                    </span>
                  </div>
                </div>

                {/* Duration */}
                <div className="text-[10px] font-mono text-fg-3 w-12 text-right shrink-0">
                  {Math.round(Number(span.duration_ms))}ms
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* SQL */}
      <div className="px-4 pb-3 border-t border-line pt-2 shrink-0">
        <SqlCollapsible sql={sql} />
      </div>
    </div>
  );
}

function getDepth(
  _spanId: string,
  parentId: string | null,
  spans: SpanRow[],
): number {
  if (!parentId) return 0;
  const parent = spans.find((s) => s.span_id === parentId);
  if (!parent) return 1;
  return 1 + getDepth(parent.span_id, parent.parent_span_id, spans);
}
