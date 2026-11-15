const express = require('express');
const path = require('path');
const logQueue = require('./logQueue');
const { getRecentLogs, getErrorLogs, getProductById, exportNdjson } = require('./db');
const { rateLimiter, getCachedData, setCachedData } = require('./rateLimiter');
const { requireApiKey } = require('./auth');
const { searchLogs, countByLevel } = require('./search');
const alerts = require('./alerts');
const { startRetentionJob } = require('./retention');
const metrics = require('./metrics');

const app = express();
app.use(express.json({ limit: '2mb' }));
app.use(express.static(path.join(__dirname, '../public')));
app.use(rateLimiter(100, 60));

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', version: '2.0.0', queue: logQueue.getStats() });
});

app.get('/metrics', (_req, res) => {
  res.set('Content-Type', 'text/plain; version=0.0.4');
  res.send(metrics.renderPrometheus());
});

app.post('/api/logs', requireApiKey, (req, res) => {
  const { sequence_id, service, level, message } = req.body;
  if (!message) return res.status(400).json({ error: 'Log message is required' });
  logQueue.enqueue({ sequence_id, service, level, message });
  res.status(202).json({ status: 'queued', queueStats: logQueue.getStats() });
});

app.get('/api/logs', (req, res) => {
  const onlyErrors = req.query.level === 'ERROR';
  const logs = onlyErrors ? getErrorLogs(100) : getRecentLogs(100);
  res.json({ stats: logQueue.getStats(), count: logs.length, logs });
});

app.get('/api/logs/search', (req, res) => {
  const logs = searchLogs(
    {
      service: req.query.service,
      level: req.query.level,
      q: req.query.q,
      since: req.query.since,
      until: req.query.until
    },
    Number(req.query.limit || 100),
    Number(req.query.offset || 0)
  );
  res.json({ count: logs.length, logs });
});

app.get('/api/logs/stats', (req, res) => {
  res.json({ byLevel: countByLevel(req.query.since) });
});

app.get('/api/logs/export.ndjson', requireApiKey, (req, res) => {
  const rows = exportNdjson(Number(req.query.limit || 1000));
  res.set('Content-Type', 'application/x-ndjson');
  for (const row of rows) res.write(JSON.stringify(row) + '\n');
  res.end();
});

app.get('/api/alerts/rules', (_req, res) => res.json(alerts.listRules()));

app.post('/api/alerts/rules', requireApiKey, (req, res) => {
  const id = alerts.addRule(req.body || {});
  res.status(201).json({ id });
});

app.delete('/api/alerts/rules/:id', requireApiKey, (req, res) => {
  if (!alerts.removeRule(req.params.id)) {
    return res.status(404).json({ error: 'Rule not found' });
  }
  res.status(204).end();
});

app.get('/api/products/:id', async (req, res) => {
  const productId = req.params.id;
  const cacheKey = `product:${productId}`;
  const cachedProduct = await getCachedData(cacheKey);
  if (cachedProduct) return res.json({ source: 'redis-cache', data: cachedProduct });
  const product = getProductById(productId);
  if (!product) return res.status(404).json({ error: 'Product not found' });
  await setCachedData(cacheKey, product, 120);
  res.json({ source: 'primary-database', data: product });
});

startRetentionJob();

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`LogPulse Engine running on http://localhost:${PORT}`);
});