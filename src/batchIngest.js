const MAX_BATCH = 500;

function normalizeBatch(body) {
  if (!body || !Array.isArray(body.logs)) {
    return { ok: false, error: 'Body must be { "logs": [ ... ] }' };
  }
  if (body.logs.length === 0) {
    return { ok: false, error: 'Empty batch' };
  }
  if (body.logs.length > MAX_BATCH) {
    return { ok: false, error: `Batch limit is ${MAX_BATCH} events` };
  }
  return { ok: true, logs: body.logs };
}

module.exports = { normalizeBatch, MAX_BATCH };