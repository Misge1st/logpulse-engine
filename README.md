# LogPulse Engine

Real-time log ingestion with **batched SQLite commits**, **Redis rate limiting**, **alert rules**, **webhooks**, and a lightweight operations dashboard.

## Highlights

- 2-second / 250-event transactional queue (`src/logQueue.js`) with FIFO guarantees (see `npm run test:queue`).
- Prometheus metrics at `/metrics` and live dashboard at `/`.
- Read-through Redis cache for demo product queries.
- NDJSON export + large replay corpora under `data/samples/` (see `npm run replay:samples`).
- Batch ingest (`POST /api/logs/batch`) and syslog adapter (`POST /api/logs/syslog`).
- OpenAPI spec (`docs/openapi.yaml`) and Grafana starter dashboard (`grafana/`).

## Quick start

```bash
npm install
docker compose up -d redis   # optional
export LOGPULSE_API_KEYS=dev-key-change-me
npm start
```

## Docs

- [Architecture](docs/architecture.md)
- [API reference](docs/api.md)
- [Runbook](docs/runbook.md)

MIT — see [LICENSE](LICENSE).