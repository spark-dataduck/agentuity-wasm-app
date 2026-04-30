// Mock data for static UI rendering before DuckDB-Wasm is connected

function seededRng(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const rng = seededRng(42);

export function mockVolumeData() {
  const now = Date.now();
  const points: { minute: string; '2xx': number; '4xx': number; '5xx': number }[] = [];
  for (let i = 95; i >= 0; i--) {
    const t = new Date(now - i * 15 * 60_000);
    const base = 850 + Math.sin((i / 96) * Math.PI * 3) * 200 + rng() * 90;
    // Error spike around bucket 70-76 (simulates ~24h ago agent-runtime spike)
    const spikeNear = i >= 70 && i <= 76;
    const err5 = Math.round(base * (0.009 + (spikeNear ? 0.08 : 0)) + rng() * 3);
    const err4 = Math.round(base * 0.025 + rng() * 5);
    const ok2 = Math.round(base - err5 - err4);
    points.push({
      minute: t.toISOString(),
      '2xx': ok2,
      '4xx': err4,
      '5xx': err5,
    });
  }
  return points;
}

export const SERVICES = [
  { name: 'cache', color: '#34d399' },
  { name: 'postgres-shim', color: '#94a3b8' },
  { name: 'queue-broker', color: '#fbbf24' },
  { name: 'api-gateway', color: '#22d3ee' },
  { name: 'billing-meter', color: '#fb923c' },
  { name: 'auth-service', color: '#a78bfa' },
  { name: 'webhook-dispatcher', color: '#f472b6' },
  { name: 'embedding-worker', color: '#c084fc' },
  { name: 'ocr-worker', color: '#ff5d52' },
  { name: 'agent-runtime', color: '#b6f24a' },
  { name: 'llm-proxy', color: '#3aa0ff' },
  { name: 'vector-db', color: '#f5b942' },
] as const;

export const SERVICE_COLORS: Record<string, string> = Object.fromEntries(
  SERVICES.map((s) => [s.name, s.color]),
);

export function mockServicesData() {
  return [
    { service_name: 'agent-runtime', total: 48210, error_pct: 4.21, p99_ms: 1238 },
    { service_name: 'vector-db', total: 31045, error_pct: 1.02, p99_ms: 3121 },
    { service_name: 'llm-proxy', total: 22180, error_pct: 0.88, p99_ms: 2840 },
    { service_name: 'ocr-worker', total: 8420, error_pct: 0.74, p99_ms: 1580 },
    { service_name: 'embedding-worker', total: 15230, error_pct: 0.52, p99_ms: 920 },
    { service_name: 'webhook-dispatcher', total: 9870, error_pct: 0.41, p99_ms: 680 },
    { service_name: 'api-gateway', total: 95430, error_pct: 0.31, p99_ms: 420 },
    { service_name: 'auth-service', total: 62100, error_pct: 0.22, p99_ms: 310 },
    { service_name: 'billing-meter', total: 18900, error_pct: 0.15, p99_ms: 180 },
    { service_name: 'queue-broker', total: 25600, error_pct: 0.12, p99_ms: 240 },
    { service_name: 'postgres-shim', total: 34200, error_pct: 0.08, p99_ms: 160 },
    { service_name: 'cache', total: 71800, error_pct: 0.03, p99_ms: 88 },
  ];
}

export function mockLatencyData() {
  const buckets = Array.from({ length: 20 }, (_, i) => i + 1);
  const services = ['agent-runtime', 'vector-db', 'llm-proxy', 'api-gateway', 'cache'];
  const data: { service_name: string; bucket: number; cnt: number }[] = [];
  for (const svc of services) {
    const peak = svc === 'cache' ? 3 : svc === 'api-gateway' ? 5 : svc === 'vector-db' ? 12 : 8;
    for (const b of buckets) {
      const dist = Math.exp(-0.5 * ((b - peak) / 3) ** 2);
      data.push({ service_name: svc, bucket: b, cnt: Math.round(dist * 5000 + rng() * 200) });
    }
  }
  return data;
}

const LOG_MESSAGES = {
  INFO: [
    'request completed in 142ms',
    'agent.invoke succeeded session=sess_a3f921',
    'embedding.generate batch_size=32 model=text-3-small',
    'cache hit user=usr_0e4a key=session:state',
    'tool call dispatched name=web_search',
    'vector.search k=8 collection=docs filtered=true',
    'stream chunk forwarded bytes=1284',
    'billing.meter increment units=1 sku=tokens.in',
  ],
  WARN: [
    'retry scheduled attempt=2 backoff=120ms reason=upstream_timeout',
    'slow query detected duration=842ms threshold=500ms',
    'circuit breaker half-open service=llm-proxy',
    'embedding cache miss rate elevated 31% over last 5m',
  ],
  ERROR: [
    'timeout waiting for upstream after 3000ms host=llm-proxy:8443',
    'vector.search failed: connection refused at 10.0.4.21:6333',
    'agent.invoke crashed: KeyError \'tool_calls\' at line 142',
    'rate limit exceeded: 429 for tenant=demo_tenant_acme sku=embeddings',
  ],
  DEBUG: [
    'trace.span.start operation=db.query',
    'fetched 1 row in 2ms',
  ],
};

export function mockLogsData() {
  const now = Date.now();
  const rows: {
    timestamp: string;
    service_name: string;
    severity: string;
    status_code: number;
    message: string;
    trace_id: string;
  }[] = [];
  for (let i = 0; i < 100; i++) {
    const ago = Math.floor(rng() * 3600_000 * (rng() < 0.6 ? 0.3 : 1));
    const t = new Date(now - ago);
    const r = rng();
    const sev = r < 0.78 ? 'INFO' : r < 0.92 ? 'WARN' : r < 0.98 ? 'ERROR' : 'DEBUG';
    const svc = SERVICES[Math.floor(rng() * SERVICES.length)].name;
    const msgs = LOG_MESSAGES[sev as keyof typeof LOG_MESSAGES];
    const msg = msgs[Math.floor(rng() * msgs.length)];
    const status = sev === 'ERROR' ? [500, 503, 429][Math.floor(rng() * 3)] : 200;
    const trace = Array.from({ length: 16 }, () =>
      Math.floor(rng() * 16).toString(16),
    ).join('');
    rows.push({
      timestamp: t.toISOString(),
      service_name: svc,
      severity: sev,
      status_code: status,
      message: msg,
      trace_id: trace,
    });
  }
  return rows.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
}

export function mockTraceData(traceId: string) {
  return {
    traceId,
    totalMs: 1247,
    spanCount: 11,
    spans: [
      { span_id: 'a1', parent_span_id: null, service_name: 'api-gateway', operation_name: 'POST /v1/agents/invoke', timestamp: '2026-04-29T14:23:00.000Z', duration_ms: 1247, severity: 'INFO', status_code: 200 },
      { span_id: 'a2', parent_span_id: 'a1', service_name: 'auth-service', operation_name: 'auth.verify', timestamp: '2026-04-29T14:23:00.004Z', duration_ms: 18, severity: 'INFO', status_code: 200 },
      { span_id: 'a3', parent_span_id: 'a1', service_name: 'auth-service', operation_name: 'tenant.scope_resolve', timestamp: '2026-04-29T14:23:00.022Z', duration_ms: 8, severity: 'INFO', status_code: 200 },
      { span_id: 'a4', parent_span_id: 'a1', service_name: 'agent-runtime', operation_name: 'agent.invoke', timestamp: '2026-04-29T14:23:00.032Z', duration_ms: 1208, severity: 'ERROR', status_code: 500 },
      { span_id: 'a5', parent_span_id: 'a4', service_name: 'cache', operation_name: 'memory.fetch_session', timestamp: '2026-04-29T14:23:00.038Z', duration_ms: 12, severity: 'INFO', status_code: 200 },
      { span_id: 'a6', parent_span_id: 'a4', service_name: 'llm-proxy', operation_name: 'llm.completion', timestamp: '2026-04-29T14:23:00.056Z', duration_ms: 412, severity: 'INFO', status_code: 200 },
      { span_id: 'a7', parent_span_id: 'a4', service_name: 'agent-runtime', operation_name: 'tool.dispatch web_search', timestamp: '2026-04-29T14:23:00.478Z', duration_ms: 720, severity: 'ERROR', status_code: 500 },
      { span_id: 'a8', parent_span_id: 'a7', service_name: 'vector-db', operation_name: 'vector.search', timestamp: '2026-04-29T14:23:00.492Z', duration_ms: 684, severity: 'WARN', status_code: 200 },
      { span_id: 'a9', parent_span_id: 'a8', service_name: 'embedding-worker', operation_name: 'embedding.generate', timestamp: '2026-04-29T14:23:00.498Z', duration_ms: 124, severity: 'INFO', status_code: 200 },
      { span_id: 'a10', parent_span_id: 'a8', service_name: 'vector-db', operation_name: 'qdrant.query k=8', timestamp: '2026-04-29T14:23:00.624Z', duration_ms: 548, severity: 'WARN', status_code: 200 },
      { span_id: 'a11', parent_span_id: 'a1', service_name: 'billing-meter', operation_name: 'billing.meter', timestamp: '2026-04-29T14:23:01.206Z', duration_ms: 4, severity: 'INFO', status_code: 200 },
    ],
  };
}
