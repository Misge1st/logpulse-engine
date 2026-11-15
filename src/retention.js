const { db } = require('./db');

const DEFAULT_DAYS = Number(process.env.LOGPULSE_RETENTION_DAYS || 30);

function purgeOlderThan(days = DEFAULT_DAYS) {
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const result = db.prepare('DELETE FROM server_logs WHERE timestamp < ?').run(cutoff);
  return { deleted: result.changes, cutoff };
}

function startRetentionJob(intervalMs = 3600000) {
  const timer = setInterval(() => {
    const stats = purgeOlderThan();
    if (stats.deleted > 0) {
      console.log(`[Retention] Removed ${stats.deleted} logs older than ${stats.cutoff}`);
    }
  }, intervalMs);
  if (timer.unref) timer.unref();
  return timer;
}

module.exports = { purgeOlderThan, startRetentionJob };