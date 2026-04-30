import { useMemo, useState, useCallback } from 'react';
import { ExecBadge } from './ExecBadge';
import { SqlCollapsible } from './SqlCollapsible';
import { SERVICE_COLORS, SERVICES } from '../lib/mock-data';
import { logsSQL } from '../lib/sql';
import { useApp } from '../lib/store';
import { useQuery } from '../lib/use-query';
import type { LogRow } from '../lib/types';

const SEVERITY_STYLES: Record<string, string> = {
  ERROR: 'text-err bg-err/10',
  WARN: 'text-warn bg-warn/10',
  INFO: 'text-info bg-info/10',
  DEBUG: 'text-fg-3 bg-fg-4/20',
};

export function PanelLogs() {
  const {
    timeRange,
    severityFilter,
    setSeverityFilter,
    serviceFilter,
    setServiceFilter,
    searchTerm,
    setSearchTerm,
    setSelectedTraceId,
  } = useApp();

  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [debouncedSearch, setDebouncedSearch] = useState(searchTerm);
  const debounceRef = useState<ReturnType<typeof setTimeout> | null>(null);

  const handleSearchChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const val = e.target.value;
      setLocalSearch(val);
      if (debounceRef[0]) clearTimeout(debounceRef[0]);
      debounceRef[0] = setTimeout(() => {
        setDebouncedSearch(val);
        setSearchTerm(val);
      }, 200);
    },
    [setSearchTerm, debounceRef],
  );

  const { brushRange, customRange } = useApp();
  const sql = useMemo(
    () => logsSQL(timeRange, severityFilter, serviceFilter, debouncedSearch || null, brushRange, customRange),
    [timeRange, severityFilter, serviceFilter, debouncedSearch, brushRange, customRange],
  );

  const { data, loading, executedIn, durationMs } = useQuery<LogRow>(sql, { forceCloud: true });

  const serviceNames = SERVICES.map((s) => s.name).sort();

  return (
    <div className="bg-bg-2 border border-line rounded-lg p-4 flex flex-col">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-[13px] font-medium text-fg-1">Log search</h3>
        <ExecBadge target={executedIn} durationMs={durationMs} loading={loading} />
      </div>

      {/* Filters */}
      <div className="flex items-center gap-2 mb-3">
        <select
          value={severityFilter || ''}
          onChange={(e) =>
            setSeverityFilter(
              (e.target.value as 'INFO' | 'WARN' | 'ERROR' | 'DEBUG') || null,
            )
          }
          className="bg-bg-3 border border-line rounded px-2 py-1 text-[12px] text-fg-2 font-mono"
        >
          <option value="">All severities</option>
          <option value="ERROR">ERROR</option>
          <option value="WARN">WARN</option>
          <option value="INFO">INFO</option>
          <option value="DEBUG">DEBUG</option>
        </select>
        <select
          value={serviceFilter || ''}
          onChange={(e) => setServiceFilter(e.target.value || null)}
          className="bg-bg-3 border border-line rounded px-2 py-1 text-[12px] text-fg-2 font-mono"
        >
          <option value="">All services</option>
          {serviceNames.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <input
          type="text"
          placeholder="Search messages..."
          value={localSearch}
          onChange={handleSearchChange}
          className="flex-1 bg-bg-3 border border-line rounded px-2 py-1 text-[12px] text-fg-1 font-mono placeholder:text-fg-4 outline-none focus:border-line-2"
        />
      </div>

      {/* Log table */}
      <div className="overflow-auto flex-1 min-h-0 max-h-[280px]">
        <table className="w-full text-[11px] font-mono">
          <thead className="sticky top-0 bg-bg-2">
            <tr className="text-fg-3 text-left border-b border-line">
              <th className="pb-1.5 pr-3 font-medium w-[140px]">time</th>
              <th className="pb-1.5 pr-3 font-medium w-[130px]">service</th>
              <th className="pb-1.5 pr-3 font-medium w-[55px]">sev</th>
              <th className="pb-1.5 pr-3 font-medium">message</th>
              <th className="pb-1.5 font-medium w-[70px]">trace</th>
            </tr>
          </thead>
          <tbody>
            {data.map((row, i) => (
              <tr
                key={i}
                className="border-b border-line/30 hover:bg-bg-hover cursor-pointer"
                onClick={() => setSelectedTraceId(row.trace_id)}
              >
                <td className="py-1 pr-3 text-fg-3 whitespace-nowrap">
                  {new Date(String(row.timestamp)).toLocaleTimeString('en-US', {
                    hour12: false,
                  })}
                </td>
                <td className="py-1 pr-3">
                  <span className="flex items-center gap-1.5">
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{
                        backgroundColor:
                          SERVICE_COLORS[row.service_name] || '#8e8e98',
                      }}
                    />
                    <span className="text-fg-2">{row.service_name}</span>
                  </span>
                </td>
                <td className="py-1 pr-3">
                  <span
                    className={`px-1.5 py-0.5 rounded text-[10px] font-medium ${SEVERITY_STYLES[row.severity] || 'text-fg-3'}`}
                  >
                    {row.severity}
                  </span>
                </td>
                <td className="py-1 pr-3 text-fg-2 truncate max-w-[300px]">
                  {row.message}
                </td>
                <td className="py-1 text-fg-3 hover:text-cloud">
                  {row.trace_id.slice(0, 8)}...
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
