const { insertBatchTransaction } = require('./db');
const metrics = require('./metrics');
const alerts = require('./alerts');
const webhooks = require('./webhooks');

class LogBatchQueue {
  constructor(flushIntervalMs = 2000, maxBatchSize = 250) {
    this.queue = [];
    this.recentCache = new Map();
    this.flushIntervalMs = flushIntervalMs;
    this.maxBatchSize = maxBatchSize;
    this.isFlushing = false;
    this.timer = setInterval(() => this.flush(), this.flushIntervalMs);
    this.memoryGuardTimer = setInterval(() => this.checkMemoryPressure(), 5000);
  }

  enqueue(logEntry) {
    const formattedLog = {
      sequence_id: logEntry.sequence_id ?? null,
      service: logEntry.service || 'api-gateway',
      level: (logEntry.level || 'INFO').toUpperCase(),
      message: logEntry.message || '',
      timestamp: logEntry.timestamp || new Date().toISOString()
    };
    this.queue.push(formattedLog);
    metrics.inc('logs_ingested_total');
    const cacheKey = `${Date.now()}-${Math.random()}`;
    this.recentCache.set(cacheKey, formattedLog);
    alerts.evaluate(formattedLog, (rule, log) => {
      if (rule.action === 'webhook') webhooks.dispatchAlert(rule, log);
    });
    if (this.queue.length >= this.maxBatchSize) this.flush();
  }

  flush() {
    if (this.isFlushing || this.queue.length === 0) return;
    this.isFlushing = true;
    const batch = this.queue.splice(0, this.maxBatchSize);
    try {
      insertBatchTransaction(batch);
      metrics.inc('logs_flushed_batches_total');
    } catch (err) {
      metrics.inc('logs_flush_errors_total');
      console.error('[LogQueue] Batch write failed, restoring to front of queue:', err.message);
      this.queue.unshift(...batch);
    } finally {
      this.isFlushing = false;
    }
  }

  checkMemoryPressure() {
    const mem = process.memoryUsage();
    const heapRatio = mem.heapUsed / mem.heapTotal;
    if (heapRatio > 0.8 && this.recentCache.size > 0) {
      const keysToDelete = Math.ceil(this.recentCache.size * 0.5);
      let count = 0;
      for (const key of this.recentCache.keys()) {
        if (count++ >= keysToDelete) break;
        this.recentCache.delete(key);
      }
      console.warn(`[MemoryGuard] Heap at ${(heapRatio * 100).toFixed(1)}%. Evicted ${keysToDelete} cached items.`);
    }
  }

  getStats() {
    const mem = process.memoryUsage();
    return {
      queuedLogsPending: this.queue.length,
      cachedItemsCount: this.recentCache.size,
      heapUsagePercent: Number(((mem.heapUsed / mem.heapTotal) * 100).toFixed(2))
    };
  }
}

module.exports = new LogBatchQueue(2000, 250);