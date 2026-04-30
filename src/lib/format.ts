import type { TimeRange } from './types';

export function formatTimeTick(v: string, range: TimeRange): string {
  const d = new Date(v);
  if (range === '7d') {
    return `${(d.getMonth() + 1)}/${d.getDate()}`;
  }
  if (range === '6h' || range === '24h') {
    return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}`;
  }
  // 15m, 1h — show HH:MM:SS
  return `${d.getHours().toString().padStart(2, '0')}:${d.getMinutes().toString().padStart(2, '0')}:${d.getSeconds().toString().padStart(2, '0')}`;
}

export function formatTimeTooltip(v: string, range: TimeRange): string {
  const d = new Date(v);
  if (range === '7d') {
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }
  return d.toLocaleTimeString();
}
