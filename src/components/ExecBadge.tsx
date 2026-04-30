import type { ExecutionTarget } from '../lib/types';

interface ExecBadgeProps {
  target: ExecutionTarget;
  durationMs: number;
  loading?: boolean;
}

export function ExecBadge({ target, durationMs, loading }: ExecBadgeProps) {
  if (loading) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium bg-bg-3 text-fg-3">
        <span className="w-1.5 h-1.5 rounded-full bg-fg-4 animate-pulse" />
        loading...
      </span>
    );
  }

  const isLocal = target === 'browser';
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[11px] font-mono font-medium transition-all ${
        isLocal
          ? 'bg-local-soft text-local'
          : 'bg-cloud-soft text-cloud'
      }`}
      style={{ animation: 'badge-pulse 0.7s ease-out 1' }}
    >
      <span
        className={`w-1.5 h-1.5 rounded-full ${
          isLocal ? 'bg-local' : 'bg-cloud'
        }`}
      />
      {isLocal ? '\u26A1' : '\u2601\uFE0F'}{' '}
      {isLocal ? 'local' : 'MotherDuck'} · {Math.round(durationMs)}ms
    </span>
  );
}
