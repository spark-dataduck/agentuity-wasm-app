# Agentuity OTEL Log Explorer

A per-tenant OpenTelemetry log/trace explorer powered by **MotherDuck** and **DuckDB-Wasm**. This app demonstrates how MotherDuck's dual execution model enables interactive analytics on millions of rows — directly in the browser, with no backend.

## What This Demonstrates

### Hybrid Cloud + Browser Execution

Every query runs through the same SQL. On first load, queries execute in **MotherDuck's cloud** (blue badges). Behind the scenes, the app materializes data into a local **DuckDB-Wasm** instance running in your browser. Once cached, queries switch to local execution (green badges) — and you can feel the difference.

### Crossfilter Brushing at Browser Speed

Drag to select a time window on the volume chart. All panels — KPIs, error rates, latency distributions, timelines — update instantly from the local DuckDB-Wasm cache. Grab the selection and slide it left/right to scan through time. This is sub-100ms query latency on hundreds of thousands of rows, running entirely in your browser tab.

### 1.5-Tier Architecture (No Backend)

There is no app server. The browser connects directly to MotherDuck via `@motherduck/wasm-client`, attaches the `demo_tenant` database, and runs SQL. In production, each customer session would receive a scoped service account token — the browser can only see that tenant's data.

### Per-Tenant Isolation

The dataset is scoped to `tenant_id = 'demo_tenant_acme'`. The MotherDuck service account token restricts access to this single tenant's database. No other tenant's data is visible or queryable from this session.

## The Dataset

- **6.25 million** OTEL log/trace events across **500K traces** and **12 services**
- **7 days** of synthetic observability data
- Stored in `demo_tenant.main.otel_events` on MotherDuck
- **Table is sorted by `timestamp` at load time** — this enables DuckDB's zone maps to skip entire row groups during time-range filters, making both cloud and local queries 2-3x faster

### Accessing the Data

The dataset is available as a MotherDuck share. To attach it to your own account:

```sql
ATTACH 'md:_share/demo_tenant/71c349c8-2332-4ca0-8650-289dc63303dc';
```

### Services

| Service | Typical p50 | Notes |
|---|---|---|
| cache | ~33ms | Fastest |
| api-gateway | ~67ms | Root span ~70% of traces |
| agent-runtime | ~240ms | Has injected error spikes |
| vector-db | ~470ms | Slowest, p99 ~3.1s |
| + 8 more | | auth, billing, embedding, llm-proxy, ocr, postgres-shim, queue-broker, webhook-dispatcher |

### Things to Discover

- **Error spikes on `agent-runtime`** — visible as red peaks in the volume chart. Brush over them to see error rates jump from ~1% to ~9%.
- **`vector-db` long tail** — p99 latency ~50x higher than `cache`. Clearly visible in the P99 timeline and latency histogram.

## Dashboard Panels

| Panel | What It Shows |
|---|---|
| **KPI Cards** | Total requests, error rate, p50/p99 latency, traces, warnings, active services |
| **Request Volume** | Stacked area chart (2xx/4xx/5xx) with crossfilter brush |
| **Top Services** | Table ranked by error rate with p99 latency |
| **Latency Distribution** | Stacked bar histogram by service |
| **Error Rate Timeline** | Line chart of error % over time per service |
| **P99 Latency Timeline** | Line chart of p99 over time per service |
| **Log Search** | Filterable log table with severity, service, and text search |
| **Trace Flyout** | Gantt-style span waterfall (click any log row) |

## Cloud / Local Toggle

The header has a **Cloud** / **Local** toggle:

- **Cloud** (blue) — queries run on MotherDuck's cloud. ~100-200ms per query on the sorted table.
- **Local** (green) — queries run in DuckDB-Wasm in your browser. Brush-filtered queries: **40-60ms**.

On page load, the app starts in cloud mode. Once the local cache is materialized, it automatically switches to local. Click **Cloud** to switch back and feel the difference.

## Running Locally

### Prerequisites

- Node.js 18+
- A MotherDuck account with access to the `demo_tenant` database

### Setup

1. Clone the repository:

```bash
git clone <repo-url>
cd agentuity-wasm-app
```

2. Attach the shared dataset to your MotherDuck account (run once, in the MotherDuck UI or DuckDB CLI):

```sql
ATTACH 'md:_share/demo_tenant/71c349c8-2332-4ca0-8650-289dc63303dc';
```

3. Create a `.env` file with your MotherDuck token:

```
VITE_MOTHERDUCK_TOKEN=your_motherduck_token_here
```

4. Install dependencies and start the dev server:

```bash
npm install
npm run dev
```

5. Open the URL shown in the terminal (usually http://localhost:5173)

### Using Your Own Data

To adapt this for your own dataset:

1. Replace the table references in `src/lib/sql.ts` — change `demo_tenant.main.otel_events` to your table
2. Update the schema in `src/lib/types.ts` to match your columns
3. Sort your table by the most-filtered column (typically `timestamp`) for zone map performance:

```sql
CREATE OR REPLACE TABLE my_db.my_schema.my_table_sorted AS
SELECT * FROM my_db.my_schema.my_table
ORDER BY timestamp;

DROP TABLE my_db.my_schema.my_table;
ALTER TABLE my_db.my_schema.my_table_sorted RENAME TO my_table;
```

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | React + Vite + TypeScript |
| Styling | Tailwind CSS v4 |
| Charts | Recharts |
| Data (cloud) | MotherDuck |
| Data (browser) | DuckDB-Wasm via `@motherduck/wasm-client` |
| Connection | Direct browser to MotherDuck, no backend |

## Architecture

```
Browser
 |-- React + Tailwind UI
 |-- DuckDB-Wasm (via @motherduck/wasm-client)
 |     |-- ATTACH 'md:demo_tenant' (cloud connection)
 |     +-- CREATE TEMP TABLE local_otel (local cache, sorted by timestamp)
 +-- Execution router
       |-- Cloud mode: queries hit demo_tenant.main.otel_events (MotherDuck)
       +-- Local mode: queries hit local_otel (DuckDB-Wasm, zone-mapped)
```

No Node.js backend. No API layer. No database proxy. The browser is the entire application.
