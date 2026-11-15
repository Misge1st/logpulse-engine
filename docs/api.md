# HTTP API

Base URL: `http://localhost:3000`

## Authentication

Protected routes require header `X-API-Key` (default dev key: `dev-key-change-me`).

| Method | Path | Description |
|--------|------|-------------|
| GET | `/health` | Liveness + queue stats |
| GET | `/metrics` | Prometheus text exposition |
| POST | `/api/logs` | Enqueue log event |
| GET | `/api/logs/search` | Filter by `service`, `level`, `q`, `since`, `until` |
| GET | `/api/logs/export.ndjson` | Download NDJSON export |
| GET/POST/DELETE | `/api/alerts/rules` | Manage alert rules |