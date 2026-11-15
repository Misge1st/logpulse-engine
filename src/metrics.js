const counters = {
  logs_ingested_total: 0,
  logs_flushed_batches_total: 0,
  logs_flush_errors_total: 0,
  webhook_deliveries_total: 0,
  webhook_failures_total: 0,
  rate_limit_hits_total: 0
};

function inc(name, by = 1) {
  if (counters[name] !== undefined) counters[name] += by;
}

function renderPrometheus() {
  const lines = [
    '# HELP logpulse_logs_ingested_total Logs accepted into the ingest queue.',
    '# TYPE logpulse_logs_ingested_total counter',
    `logpulse_logs_ingested_total ${counters.logs_ingested_total}`,
    '# HELP logpulse_logs_flushed_batches_total Successful SQLite batch commits.',
    '# TYPE logpulse_logs_flushed_batches_total counter',
    `logpulse_logs_flushed_batches_total ${counters.logs_flushed_batches_total}`,
    '# HELP logpulse_logs_flush_errors_total Failed batch commits.',
    '# TYPE logpulse_logs_flush_errors_total counter',
    `logpulse_logs_flush_errors_total ${counters.logs_flush_errors_total}`,
    '# HELP logpulse_webhook_deliveries_total Outbound webhook posts attempted.',
    '# TYPE logpulse_webhook_deliveries_total counter',
    `logpulse_webhook_deliveries_total ${counters.webhook_deliveries_total}`,
    '# HELP logpulse_webhook_failures_total Webhook posts that failed.',
    '# TYPE logpulse_webhook_failures_total counter',
    `logpulse_webhook_failures_total ${counters.webhook_failures_total}`,
    '# HELP logpulse_rate_limit_hits_total Requests rejected by rate limiter.',
    '# TYPE logpulse_rate_limit_hits_total counter',
    `logpulse_rate_limit_hits_total ${counters.rate_limit_hits_total}`
  ];
  return lines.join('\n') + '\n';
}

module.exports = { inc, renderPrometheus, counters };