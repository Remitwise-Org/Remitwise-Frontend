Database Pooling and Timeouts

Overview
- This project uses Prisma as the database client. To avoid exhausting connections and long request hangs, configure connection pooling and timeouts via environment variables and minimal client-side helpers.

Pool Size Guidance
- Local dev (SQLite): pooling not applicable; defaults are fine.
- Node server (single instance, Postgres): set a moderate pool.
  - Example: min 1, max 10 connections.
  - In connection string (Postgres): connection_limit=10
- Serverless (Vercel + Neon/Supabase/Planetscale): keep pool very small.
  - Example: min 1, max 3 connections.
  - In connection string: connection_limit=1-3

Timeouts
- Connection timeout: fail fast when DB host is unreachable.
  - Postgres example: connect_timeout=5 (seconds)
- Pool acquire timeout: fail if pool cannot provide a connection in time.
  - Example: pool_timeout=5000 (milliseconds)
- Query timeout: application-level timeout to prevent long-hanging queries.
  - Implemented via withQueryTimeout helper in lib/prisma.ts (default 5000ms).

Configuration
- Set DATABASE_URL and pool/timeout params in your environment.
  - Postgres example (Node server):
    postgresql://user:pass@host:5432/db?connection_limit=10&pool_timeout=5000&connect_timeout=5
  - Postgres example (Serverless):
    postgresql://user:pass@host:5432/db?connection_limit=3&pool_timeout=5000&connect_timeout=5
- Optional app-level query timeout:
  - PRISMA_QUERY_TIMEOUT_MS=5000

Implementation Notes
- Prisma client singleton is defined in lib/prisma.ts. All modules import from there to avoid multiple pools.
- Health check endpoints run a fast query (SELECT 1) wrapped in a 5s timeout to reflect DB availability quickly.
- For Next.js serverless on Vercel:
  - Prefer a serverless-friendly DB (Neon serverless or pooled connection string).
  - Keep connection_limit low (1-3).
  - Consider enabling function warm-up or scheduled pings to keep Prisma engine warm.

Health Check
- /api/health and /api/v1/health perform:
  - Database probe: SELECT 1 with 5s timeout via withQueryTimeout.
  - If DB is unreachable or times out, the endpoint returns 503 and logs the error.

Where to Edit
- lib/prisma.ts: Prisma client initialization and withQueryTimeout helper.
- app/api/health/route.ts and app/api/v1/health/route.ts: fast-fail DB query.

Troubleshooting
- ECONNREFUSED or timeout: verify host, port, and connect_timeout.
- Pool timeout errors: increase connection_limit slightly or reduce concurrent load.
- Serverless spikes: keep function cold starts low; use pooled connection URLs.
