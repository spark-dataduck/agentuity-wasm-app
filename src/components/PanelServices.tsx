import { useMemo } from 'react';
import { ExecBadge } from './ExecBadge';
import { SqlCollapsible } from './SqlCollapsible';
import { SERVICE_COLORS } from '../lib/mock-data';
import { servicesSQL } from '../lib/sql';
import { useApp } from '../lib/store';
import { useQuery } from '../lib/use-query';
import type { ServiceRow } from '../lib/types';

export function PanelServices() {
  const { timeRange, serviceFilter, setServiceFilter, brushRange, customRange } = useApp();
  const sql = useMemo(() => servicesSQL(timeRange, brushRange, customRange), [timeRange, brushRange, customRange]);
  const { data, loading, executedIn, durationMs } = useQuery<ServiceRow>(sql);

  return (
    <div className="bg-bg-2 border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-fg-1">
          Top services by error rate
        </h3>
        <ExecBadge target={executedIn} durationMs={durationMs} loading={loading} />
      </div>
      <div className="overflow-auto max-h-[220px]">
        <table className="w-full text-[12px] font-mono">
          <thead>
            <tr className="text-fg-3 text-left border-b border-line">
              <th className="pb-2 font-medium">service</th>
              <th className="pb-2 font-medium text-right">requests</th>
              <th className="pb-2 font-medium text-right">err%</th>
              <th className="pb-2 font-medium text-right">p99</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row) => (
              <tr
                key={row.service_name}
                onClick={() =>
                  setServiceFilter(
                    serviceFilter === row.service_name
                      ? null
                      : row.service_name,
                  )
                }
                className={`border-b border-line/50 cursor-pointer transition-colors ${
                  serviceFilter === row.service_name
                    ? 'bg-bg-hover'
                    : 'hover:bg-bg-hover'
                }`}
              >
                <td className="py-1.5 flex items-center gap-2">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor:
                        SERVICE_COLORS[row.service_name] || '#8e8e98',
                    }}
                  />
                  <span className="text-fg-1">{row.service_name}</span>
                </td>
                <td className="py-1.5 text-right text-fg-2">
                  {Number(row.total).toLocaleString()}
                </td>
                <td
                  className={`py-1.5 text-right font-medium ${
                    Number(row.error_pct) >= 2
                      ? 'text-err'
                      : Number(row.error_pct) >= 0.5
                        ? 'text-warn'
                        : 'text-fg-2'
                  }`}
                >
                  {Number(row.error_pct).toFixed(2)}%
                </td>
                <td className="py-1.5 text-right text-fg-2">
                  {Number(row.p99_ms).toLocaleString()}ms
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <SqlCollapsible sql={sql} />
    </div>
  );
}
