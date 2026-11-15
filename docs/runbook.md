# Runbook

## Local development

```bash
npm install
docker compose up -d redis   # optional
export LOGPULSE_API_KEYS=dev-key-change-me
npm start
```

Dashboard: open `http://localhost:3000/`.

## Queue integrity check

```bash
npm run test:queue
```

## Common incidents

### Redis unavailable

Symptoms: console warns about in-memory TTL fallback.

Action: start Redis or accept fallback for dev.

### SQLite locked

Symptoms: `[LogQueue] Batch write failed`, rising `queuedLogsPending`.

Action: confirm WAL mode, reduce batch size, check disk latency.

## Escalation

If ingest latency stays above 5s for more than 15 minutes, capture `/metrics`, queue stats from `/health`, and recent `ERROR` logs before restarting the process.

## Release checklist

- `npm run test:unit`
- `npm run test:queue`
- verify `/metrics` increments after synthetic ingest