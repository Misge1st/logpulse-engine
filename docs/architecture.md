# Architecture

LogPulse Engine is a single-node ingest pipeline optimized for bursty HTTP log traffic.

## Ingest path

1. Clients `POST /api/logs` with an API key.
2. `LogBatchQueue` buffers events in memory and flushes every **2s** (or 250 events) inside a SQLite transaction (WAL mode).
3. During enqueue, the **alert rule engine** evaluates lightweight predicates and may fan out to webhooks.

## Caching & protection

- **Redis** provides sliding-window rate limits and product read-through cache.
- **Memory guard** evicts 50% of the in-memory dashboard cache when Node heap crosses 80%.

## Operations

- `/metrics` exposes Prometheus counters.
- Retention job purges rows older than `LOGPULSE_RETENTION_DAYS` (default 30).
- `data/samples/*.ndjson.gz` shards are compressed corpora for replay testing.