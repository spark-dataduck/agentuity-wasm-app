import { useState } from 'react';
import { useApp } from '../lib/store';
import type { ExecutionMode, TimeRange } from '../lib/types';
import { getDatasetNow } from '../lib/db';

const TIME_RANGES: { label: string; value: TimeRange }[] = [
  { label: '15m', value: '15m' },
  { label: '1h', value: '1h' },
  { label: '6h', value: '6h' },
  { label: '24h', value: '24h' },
];

const EXEC_MODES: { label: string; value: ExecutionMode; icon: string }[] = [
  { label: 'Cloud', value: 'cloud', icon: '\u2601\uFE0F' },
  { label: 'Local', value: 'local', icon: '\u26A1' },
];

export function Header() {
  const { timeRange, setTimeRange, execMode, setExecMode, cacheState, customRange, setCustomRange } = useApp();
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  const handleCustomApply = () => {
    if (startDate && endDate) {
      setCustomRange([startDate, endDate]);
      setTimeRange('custom');
      setShowDatePicker(false);
    }
  };

  return (
    <header className="flex items-center justify-between px-4 py-2.5 border-b border-line bg-bg-1 shrink-0">
      {/* Left: brand + tenant */}
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2">
          <svg width="24" height="18" viewBox="0 0 172 127" className="text-[#FF9538]">
            <g transform="translate(1.996 46.485)">
              <path d="M 3.304 41.298 C 3.304 41.298 51.004 75.398 53.904 77.098 C 56.704 78.798 60.804 79.198 64.404 77.798 C 68.004 76.398 70.704 73.198 71.504 69.998 C 72.404 66.798 83.304 9.198 83.304 9.198 C 83.404 8.398 83.704 6.098 82.504 3.898 C 80.804 0.898 77.004 -0.702 73.604 0.298 C 70.904 1.098 69.504 3.098 69.104 3.798 C 68.504 4.898 67.404 6.698 65.404 8.298 C 63.904 9.498 62.404 10.198 61.704 10.498 C 55.604 12.998 48.804 10.898 44.904 5.898 C 42.504 2.798 38.204 1.598 34.404 3.098 C 30.604 4.598 28.404 8.498 28.704 12.398 C 29.404 18.598 25.904 24.798 19.704 27.298 C 16.404 28.598 12.904 28.598 9.804 27.598 C 9.104 27.398 6.604 26.798 4.104 28.198 C 1.004 29.798 -0.596 33.598 0.204 36.998 C 0.804 39.298 2.604 40.798 3.304 41.298 Z" fill="currentColor"/>
            </g>
            <g transform="translate(84.456 1.549)">
              <path d="M 0.344 11.534 C 0.344 11.534 17.344 67.734 18.544 70.734 C 19.744 73.834 22.744 76.634 26.444 77.734 C 30.144 78.834 34.244 77.934 36.844 75.934 C 39.444 73.934 83.344 35.034 83.344 35.034 C 83.944 34.534 85.544 32.834 85.944 30.334 C 86.444 26.934 84.344 23.334 81.144 22.034 C 78.544 21.034 76.144 21.734 75.444 22.034 C 74.344 22.534 72.344 23.234 69.844 23.334 C 67.844 23.434 66.344 23.034 65.544 22.834 C 59.244 21.034 55.044 15.234 55.044 8.934 C 54.944 5.034 52.344 1.434 48.444 0.334 C 44.444 -0.766 40.344 0.934 38.244 4.234 C 34.944 9.634 28.444 12.334 22.044 10.534 C 18.644 9.534 15.844 7.434 14.044 4.734 C 13.544 4.134 11.944 2.134 9.144 1.634 C 5.744 1.034 2.044 3.034 0.644 6.134 C -0.456 8.534 0.144 10.734 0.344 11.534 Z" fill="currentColor"/>
            </g>
          </svg>
          <span className="text-sm font-semibold text-fg">Agentuity</span>
        </div>
        <div className="h-4 w-px bg-line" />
        <div className="flex items-center gap-1.5 text-[12px] text-fg-2">
          <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-fg-3">
            <path d="M12 7H4V9h8V7z" fill="currentColor"/>
            <path d="M2 4a2 2 0 012-2h8a2 2 0 012 2v8a2 2 0 01-2 2H4a2 2 0 01-2-2V4zm2-.5a.5.5 0 00-.5.5v8a.5.5 0 00.5.5h8a.5.5 0 00.5-.5V4a.5.5 0 00-.5-.5H4z" fill="currentColor" fillRule="evenodd"/>
          </svg>
          <span className="font-mono">demo_tenant_acme</span>
        </div>
      </div>

      {/* Right: execution mode + time range */}
      <div className="flex items-center gap-3">
        {/* Execution mode toggle */}
        <div className="flex items-center gap-1 bg-bg-2 rounded-md p-0.5 border border-line">
          {EXEC_MODES.map((em) => {
            const isActive = execMode === em.value;
            const isLocal = em.value === 'local';
            const isCloud = em.value === 'cloud';
            const disabled = isLocal && cacheState !== 'cached';
            return (
              <button
                key={em.value}
                onClick={() => !disabled && setExecMode(em.value)}
                disabled={disabled}
                className={`px-2.5 py-1 rounded text-[12px] font-medium transition-all flex items-center gap-1.5 ${
                  isActive
                    ? isLocal
                      ? 'bg-local/15 text-local shadow-sm'
                      : 'bg-cloud/15 text-cloud shadow-sm'
                    : disabled
                      ? 'text-fg-4 cursor-not-allowed'
                      : 'text-fg-3 hover:text-fg-2'
                }`}
              >
                <span className="text-[11px]">{em.icon}</span>
                {em.label}
                {isCloud && isActive && (
                  <span className="text-[10px] text-cloud/60 font-mono">MotherDuck</span>
                )}
                {isLocal && isActive && (
                  <span className="text-[10px] text-local/60 font-mono">DuckDB-Wasm</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Time range picker */}
        <div className="flex items-center gap-1 bg-bg-2 rounded-md p-0.5 border border-line relative">
          {TIME_RANGES.map((tr) => (
            <button
              key={tr.value}
              onClick={() => { setTimeRange(tr.value); setShowDatePicker(false); }}
              className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors ${
                timeRange === tr.value
                  ? 'bg-bg-3 text-fg shadow-sm'
                  : 'text-fg-3 hover:text-fg-2'
              }`}
            >
              {tr.label}
            </button>
          ))}
          <button
            onClick={() => setShowDatePicker(!showDatePicker)}
            className={`px-2.5 py-1 rounded text-[12px] font-medium transition-colors flex items-center gap-1 ${
              timeRange === 'custom'
                ? 'bg-bg-3 text-fg shadow-sm'
                : 'text-fg-3 hover:text-fg-2'
            }`}
          >
            <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="shrink-0">
              <path d="M4 1v2M12 1v2M1 6h14M2 3h12a1 1 0 011 1v10a1 1 0 01-1 1H2a1 1 0 01-1-1V4a1 1 0 011-1z" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            {timeRange === 'custom' && customRange
              ? `${new Date(customRange[0]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })} - ${new Date(customRange[1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}`
              : 'Custom'
            }
          </button>

          {/* Date picker dropdown */}
          {showDatePicker && (
            <div className="absolute right-0 top-full mt-2 bg-bg-2 border border-line rounded-lg p-3 shadow-xl z-50 w-[280px]">
              <div className="space-y-3">
                {/* Quick presets */}
                <div>
                  <label className="text-[11px] text-fg-3 font-mono block mb-1.5">Quick select</label>
                  <div className="flex gap-1.5">
                    {[
                      { label: '2d', days: 2 },
                      { label: '3d', days: 3 },
                      { label: '5d', days: 5 },
                      { label: '7d', days: 7 },
                    ].map((preset) => {
                      // Use dataset reference time for idempotency
                      const refRaw = getDatasetNow();
                      const refTs = refRaw.includes('::TIMESTAMP')
                        ? refRaw.replace("'", '').replace("'::TIMESTAMP", '')
                        : new Date().toISOString();
                      const end = new Date(refTs);
                      const start = new Date(end.getTime() - preset.days * 86400_000);
                      return (
                        <button
                          key={preset.label}
                          onClick={() => {
                            setCustomRange([start.toISOString(), end.toISOString()]);
                            setTimeRange('custom');
                            setShowDatePicker(false);
                          }}
                          className="flex-1 px-2 py-1.5 rounded text-[12px] font-medium font-mono text-fg-3 hover:text-fg-1 bg-bg-3 border border-line hover:border-line-2 transition-colors"
                        >
                          {preset.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="border-t border-line pt-2">
                  <label className="text-[11px] text-fg-3 font-mono block mb-1.5">Custom range</label>
                </div>
                <div>
                  <label className="text-[11px] text-fg-4 font-mono block mb-1">Start</label>
                  <input
                    type="datetime-local"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full bg-bg-3 border border-line rounded px-2 py-1.5 text-[12px] text-fg-1 font-mono outline-none focus:border-line-2"
                  />
                </div>
                <div>
                  <label className="text-[11px] text-fg-3 font-mono block mb-1">End</label>
                  <input
                    type="datetime-local"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full bg-bg-3 border border-line rounded px-2 py-1.5 text-[12px] text-fg-1 font-mono outline-none focus:border-line-2"
                  />
                </div>
                <div className="flex gap-2 pt-1">
                  <button
                    onClick={handleCustomApply}
                    disabled={!startDate || !endDate}
                    className="flex-1 bg-cloud text-brand-fg px-3 py-1.5 rounded text-[12px] font-medium disabled:opacity-40"
                  >
                    Apply
                  </button>
                  <button
                    onClick={() => setShowDatePicker(false)}
                    className="px-3 py-1.5 rounded text-[12px] font-medium text-fg-3 hover:text-fg-2 border border-line"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
