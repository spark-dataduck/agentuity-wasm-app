import { useMemo } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { ExecBadge } from './ExecBadge';
import { SqlCollapsible } from './SqlCollapsible';
import { SERVICE_COLORS } from '../lib/mock-data';
import { errorRateTimeSQL } from '../lib/sql';
import { useApp } from '../lib/store';
import { useQuery } from '../lib/use-query';
import type { ErrorRateTimeRow } from '../lib/types';
import { formatTimeTick, formatTimeTooltip } from '../lib/format';

// Top services to plot (avoid chart clutter)
const TOP_SERVICES = [
  'agent-runtime',
  'ocr-worker',
  'llm-proxy',
  'vector-db',
  'embedding-worker',
  'webhook-dispatcher',
];

export function PanelErrorTimeline() {
  const { timeRange, brushRange, customRange } = useApp();
  const sql = useMemo(() => errorRateTimeSQL(timeRange, brushRange, customRange), [timeRange, brushRange, customRange]);
  const { data: raw, loading, executedIn, durationMs } = useQuery<ErrorRateTimeRow>(sql);

  const chartData = useMemo(() => {
    const byMinute = new Map<string, Record<string, number>>();
    for (const row of raw) {
      if (!TOP_SERVICES.includes(row.service_name)) continue;
      const key = String(row.minute);
      if (!byMinute.has(key)) byMinute.set(key, { minute: 0 } as any);
      const entry = byMinute.get(key)!;
      entry.minute = key as any;
      entry[row.service_name] = Number(row.error_pct);
    }
    return [...byMinute.values()].sort((a, b) =>
      String(a.minute).localeCompare(String(b.minute)),
    );
  }, [raw]);

  return (
    <div className="bg-bg-2 border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-fg-1">
          Error rate over time
        </h3>
        <ExecBadge target={executedIn} durationMs={durationMs} loading={loading} />
      </div>
      <div className="h-[200px]">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 4, right: 4, bottom: 0, left: -10 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="#25252b" vertical={false} />
            <XAxis
              dataKey="minute"
              tick={{ fontSize: 10, fill: '#5f5f68' }}
              tickFormatter={(v: string) => formatTimeTick(v, timeRange)}
              stroke="#25252b"
              interval="preserveStartEnd"
              minTickGap={40}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#5f5f68' }}
              stroke="#25252b"
              tickFormatter={(v: number) => `${v}%`}
              domain={[0, 'auto']}
            />
            <Tooltip
              contentStyle={{
                background: '#141416',
                border: '1px solid #25252b',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'JetBrains Mono',
              }}
              labelFormatter={(v: any) => formatTimeTooltip(String(v), timeRange)}
              formatter={(value: any, name: any) => [`${value}%`, name]}
            />
            <Legend
              iconSize={8}
              iconType="plainline"
              wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            {TOP_SERVICES.map((svc) => (
              <Line
                key={svc}
                type="monotone"
                dataKey={svc}
                stroke={SERVICE_COLORS[svc] || '#8e8e98'}
                strokeWidth={1.5}
                dot={false}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
      <SqlCollapsible sql={sql} />
    </div>
  );
}
