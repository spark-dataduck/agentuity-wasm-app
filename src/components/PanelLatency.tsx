import { useMemo } from 'react';
import {
  BarChart,
  Bar,
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
import { latencySQL } from '../lib/sql';
import { useApp } from '../lib/store';
import { useQuery } from '../lib/use-query';
import type { LatencyBucket } from '../lib/types';

export function PanelLatency() {
  const { timeRange, brushRange, customRange } = useApp();
  const sql = useMemo(() => latencySQL(timeRange, brushRange, customRange), [timeRange, brushRange, customRange]);
  const { data: raw, loading, executedIn, durationMs } = useQuery<LatencyBucket>(sql);

  const { chartData, services } = useMemo(() => {
    const byBucket: Record<number, Record<string, number>> = {};
    const svcSet = new Set<string>();
    for (const row of raw) {
      const b = Number(row.bucket);
      if (!byBucket[b]) byBucket[b] = { bucket: b };
      byBucket[b][row.service_name] = Number(row.cnt);
      svcSet.add(row.service_name);
    }
    return {
      chartData: Object.values(byBucket).sort(
        (a, b) => (a.bucket as number) - (b.bucket as number),
      ),
      services: [...svcSet].sort(),
    };
  }, [raw]);

  return (
    <div className="bg-bg-2 border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-fg-1">
          Latency distribution
        </h3>
        <ExecBadge target={executedIn} durationMs={durationMs} loading={loading} />
      </div>
      <div className="h-[220px]">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="#25252b"
              vertical={false}
            />
            <XAxis
              dataKey="bucket"
              tick={{ fontSize: 10, fill: '#5f5f68' }}
              tickFormatter={(v: number) => {
                const ms = (v - 1) * 250;
                return ms >= 1000 ? `${(ms / 1000).toFixed(1)}k` : String(ms);
              }}
              stroke="#25252b"
              label={{
                value: 'duration (ms)',
                position: 'insideBottom',
                offset: -2,
                fontSize: 10,
                fill: '#5f5f68',
              }}
            />
            <YAxis
              tick={{ fontSize: 10, fill: '#5f5f68' }}
              stroke="#25252b"
              tickFormatter={(v: number) =>
                v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)
              }
            />
            <Tooltip
              contentStyle={{
                background: '#141416',
                border: '1px solid #25252b',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'JetBrains Mono',
              }}
              labelFormatter={(v: any) => {
                const lo = (Number(v) - 1) * 250;
                const hi = Number(v) * 250;
                return `${lo.toLocaleString()}-${hi.toLocaleString()}ms`;
              }}
              formatter={(value: any, name: any) => [Number(value).toLocaleString(), name]}
            />
            <Legend
              iconSize={8}
              wrapperStyle={{ fontSize: 10, fontFamily: 'JetBrains Mono' }}
            />
            {services.map((svc) => (
              <Bar
                key={svc}
                dataKey={svc}
                stackId="1"
                fill={SERVICE_COLORS[svc] || '#8e8e98'}
                fillOpacity={0.7}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      </div>
      <SqlCollapsible sql={sql} />
    </div>
  );
}
