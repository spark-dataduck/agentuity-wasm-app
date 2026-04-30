import { useMemo, useState, useCallback, useRef } from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceArea,
} from 'recharts';
import { ExecBadge } from './ExecBadge';
import { SqlCollapsible } from './SqlCollapsible';
import { volumeSQL } from '../lib/sql';
import { formatTimeTick, formatTimeTooltip } from '../lib/format';
import { useApp } from '../lib/store';
import { useQuery } from '../lib/use-query';
import type { VolumeRow } from '../lib/types';

type BrushMode = 'idle' | 'creating' | 'dragging';

export function PanelVolume() {
  const { timeRange, brushRange, setBrushRange, customRange } = useApp();
  const sql = useMemo(() => volumeSQL(timeRange, customRange), [timeRange, customRange]);
  const { data: raw, loading, executedIn, durationMs } = useQuery<VolumeRow>(sql);

  const [mode, setMode] = useState<BrushMode>('idle');
  const [selStart, setSelStart] = useState<string | null>(null);
  const [selEnd, setSelEnd] = useState<string | null>(null);
  const [hoveringBrush, setHoveringBrush] = useState(false);
  // For drag mode: the offset from where user clicked to brush start
  const dragRef = useRef<{ startIdx: number; brushStartIdx: number; brushEndIdx: number } | null>(null);

  // Pivot: group by minute, spread status_class into columns
  const chartData = useMemo(() => {
    const byMinute = new Map<string, { minute: string; '2xx': number; '4xx': number; '5xx': number }>();
    for (const row of raw) {
      const key = String(row.minute);
      if (!byMinute.has(key)) {
        byMinute.set(key, { minute: key, '2xx': 0, '4xx': 0, '5xx': 0 });
      }
      const entry = byMinute.get(key)!;
      const cls = row.status_class as '2xx' | '4xx' | '5xx';
      entry[cls] = Number(row.request_count);
    }
    return [...byMinute.values()].sort((a, b) => a.minute.localeCompare(b.minute));
  }, [raw]);

  // Index lookup for labels
  const labelToIdx = useMemo(() => {
    const map = new Map<string, number>();
    chartData.forEach((d, i) => map.set(d.minute, i));
    return map;
  }, [chartData]);

  const idxToLabel = useCallback(
    (idx: number) => chartData[Math.max(0, Math.min(idx, chartData.length - 1))]?.minute,
    [chartData],
  );

  const isInsideBrush = useCallback(
    (label: string) => {
      if (!brushRange) return false;
      return label >= brushRange[0] && label <= brushRange[1];
    },
    [brushRange],
  );

  const handleMouseDown = useCallback(
    (e: any) => {
      if (!e?.activeLabel) return;
      const label = e.activeLabel as string;
      const idx = labelToIdx.get(label);
      if (idx === undefined) return;

      if (brushRange && isInsideBrush(label)) {
        // Start dragging the existing selection
        const brushStartIdx = labelToIdx.get(brushRange[0]) ?? 0;
        const brushEndIdx = labelToIdx.get(brushRange[1]) ?? 0;
        dragRef.current = { startIdx: idx, brushStartIdx, brushEndIdx };
        setMode('dragging');
      } else {
        // Start creating a new selection
        setSelStart(label);
        setSelEnd(label);
        setMode('creating');
      }
    },
    [brushRange, isInsideBrush, labelToIdx],
  );

  const handleMouseMove = useCallback(
    (e: any) => {
      if (!e?.activeLabel) return;
      const label = e.activeLabel as string;
      const idx = labelToIdx.get(label);
      if (idx === undefined) return;

      // Track hover over brush region for cursor change
      if (mode === 'idle') {
        setHoveringBrush(brushRange ? isInsideBrush(label) : false);
      }

      if (mode === 'creating') {
        setSelEnd(label);
      } else if (mode === 'dragging' && dragRef.current) {
        const delta = idx - dragRef.current.startIdx;
        const newStartIdx = dragRef.current.brushStartIdx + delta;
        const newEndIdx = dragRef.current.brushEndIdx + delta;
        const width = dragRef.current.brushEndIdx - dragRef.current.brushStartIdx;

        // Clamp to chart bounds
        const clampedStart = Math.max(0, Math.min(newStartIdx, chartData.length - 1 - width));
        const clampedEnd = clampedStart + width;

        const newStart = idxToLabel(clampedStart);
        const newEnd = idxToLabel(clampedEnd);
        if (newStart && newEnd) {
          setBrushRange([newStart, newEnd]);
        }
      }
    },
    [mode, labelToIdx, idxToLabel, chartData.length, setBrushRange],
  );

  const handleMouseUp = useCallback(() => {
    if (mode === 'creating' && selStart && selEnd) {
      const [a, b] = [selStart, selEnd].sort();
      if (a !== b) {
        setBrushRange([a, b]);
      }
    }
    setMode('idle');
    dragRef.current = null;
  }, [mode, selStart, selEnd, setBrushRange]);

  const clearBrush = useCallback(() => {
    setBrushRange(null);
    setSelStart(null);
    setSelEnd(null);
    setMode('idle');
    setHoveringBrush(false);
  }, [setBrushRange]);

  // Determine what to show as the highlighted area
  let refAreaStart: string | undefined;
  let refAreaEnd: string | undefined;
  if (mode === 'creating' && selStart && selEnd) {
    [refAreaStart, refAreaEnd] = [selStart, selEnd].sort();
  } else if (brushRange) {
    [refAreaStart, refAreaEnd] = brushRange;
  }

  return (
    <div className="bg-bg-2 border border-line rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <h3 className="text-[13px] font-medium text-fg-1">
            Request volume over time
          </h3>
          {brushRange && (
            <button
              onClick={clearBrush}
              className="text-[11px] font-mono text-fg-3 hover:text-fg-1 bg-bg-3 border border-line rounded px-2 py-0.5 flex items-center gap-1"
            >
              ✕ Clear selection
            </button>
          )}
        </div>
        <ExecBadge target={executedIn} durationMs={durationMs} loading={loading} />
      </div>

      {brushRange && (
        <div className="mb-2 text-[11px] font-mono text-local flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-local" />
          Drag to select · Grab selection to slide · All panels update from local DuckDB-Wasm
        </div>
      )}

      <div
        className="h-[200px] select-none"
      >
        <style>{`
          .volume-chart { cursor: crosshair; }
          .volume-chart .recharts-reference-area-rect { cursor: grab; }
          .volume-chart.dragging { cursor: grabbing !important; }
          .volume-chart.dragging .recharts-reference-area-rect { cursor: grabbing !important; }
        `}</style>
        <ResponsiveContainer width="100%" height="100%" className={`volume-chart ${mode === 'dragging' ? 'dragging' : ''}`}>
          <AreaChart
            data={chartData}
            margin={{ top: 4, right: 4, bottom: 0, left: -10 }}
            onMouseDown={handleMouseDown}
            onMouseMove={handleMouseMove}
            onMouseUp={handleMouseUp}
            onMouseLeave={handleMouseUp}
          >
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
              tickFormatter={(v: number) => v >= 1000 ? `${(v / 1000).toFixed(1)}k` : String(v)}
            />
            <Tooltip
              contentStyle={{
                background: '#141416',
                border: '1px solid #25252b',
                borderRadius: 6,
                fontSize: 11,
                fontFamily: 'JetBrains Mono',
              }}
              labelFormatter={(v: string) => formatTimeTooltip(v, timeRange)}
              active={mode === 'idle'}
            />
            <Area
              type="monotone"
              dataKey="2xx"
              stackId="1"
              stroke="#4ade80"
              fill="#4ade80"
              fillOpacity={0.3}
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="4xx"
              stackId="1"
              stroke="#f5b942"
              fill="#f5b942"
              fillOpacity={0.3}
              strokeWidth={1}
            />
            <Area
              type="monotone"
              dataKey="5xx"
              stackId="1"
              stroke="#ff5d52"
              fill="#ff5d52"
              fillOpacity={0.4}
              strokeWidth={1}
            />
            {refAreaStart && refAreaEnd && (
              <ReferenceArea
                x1={refAreaStart}
                x2={refAreaEnd}
                fill="#b6f24a"
                fillOpacity={0.15}
                stroke="#b6f24a"
                strokeOpacity={0.5}
                strokeWidth={1}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
      <SqlCollapsible sql={sql} />
    </div>
  );
}
