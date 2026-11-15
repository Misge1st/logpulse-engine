const Redis = require('ioredis');
const metrics = require('./metrics');

const redis = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: process.env.REDIS_PORT || 6379,
  connectTimeout: 5000,
  maxRetriesPerRequest: 2,
  enableAutoPipelining: true,
  lazyConnect: true
});

let redisConnected = false;
const fallbackStore = new Map();

redis.connect().then(() => {
  redisConnected = true;
  console.log('[Redis] Connected with managed connection pool.');
}).catch(() => {
  console.warn('[Redis] Local Redis not detected — using in-memory TTL fallback.');
});

redis.on('error', () => {
  redisConnected = false;
});

function rateLimiter(limit = 100, windowSeconds = 60) {
  return async (req, res, next) => {
    const clientIp = req.ip || req.headers['x-forwarded-for'] || '127.0.0.1';
    const key = `ratelimit:${clientIp}`;
    try {
      if (redisConnected) {
        const requests = await redis.incr(key);
        if (requests === 1) await redis.expire(key, windowSeconds);
        if (requests > limit) {
          metrics.inc('rate_limit_hits_total');
          return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
        }
      } else {
        const now = Date.now();
        const record = fallbackStore.get(key) || { count: 0, resetAt: now + windowSeconds * 1000 };
        if (now > record.resetAt) {
          record.count = 0;
          record.resetAt = now + windowSeconds * 1000;
        }
        record.count += 1;
        fallbackStore.set(key, record);
        if (record.count > limit) {
          metrics.inc('rate_limit_hits_total');
          return res.status(429).json({ error: 'Rate limit exceeded. Try again shortly.' });
        }
      }
      next();
    } catch (_err) {
      next();
    }
  };
}

async function getCachedData(key) {
  if (!redisConnected) return null;
  const raw = await redis.get(key);
  return raw ? JSON.parse(raw) : null;
}

async function setCachedData(key, value, ttlSeconds = 120) {
  if (!redisConnected) return;
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

process.on('SIGINT', async () => {
  if (redisConnected) await redis.quit();
  process.exit(0);
});

module.exports = { rateLimiter, getCachedData, setCachedData };