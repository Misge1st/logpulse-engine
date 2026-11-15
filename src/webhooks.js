const http = require('http');
const https = require('https');
const { URL } = require('url');
const metrics = require('./metrics');

const targets = (process.env.LOGPULSE_WEBHOOKS || '')
  .split(',')
  .map((u) => u.trim())
  .filter(Boolean);

const MAX_RETRIES = 3;

function postJson(urlString, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlString);
    const body = JSON.stringify(payload);
    const lib = url.protocol === 'https:' ? https : http;
    const req = lib.request(
      url,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'User-Agent': 'LogPulse-Engine/2.0'
        },
        timeout: 5000
      },
      (res) => {
        res.resume();
        if (res.statusCode >= 200 && res.statusCode < 300) resolve();
        else reject(new Error(`HTTP ${res.statusCode}`));
      }
    );
    req.on('error', reject);
    req.on('timeout', () => {
      req.destroy();
      reject(new Error('timeout'));
    });
    req.write(body);
    req.end();
  });
}

async function deliverWithRetry(url, payload, attempt = 1) {
  metrics.inc('webhook_deliveries_total');
  try {
    await postJson(url, payload);
  } catch (err) {
    if (attempt < MAX_RETRIES) {
      const backoffMs = attempt * attempt * 500;
      await new Promise((r) => setTimeout(r, backoffMs));
      return deliverWithRetry(url, payload, attempt + 1);
    }
    metrics.inc('webhook_failures_total');
    console.warn(`[Webhook] Failed after ${MAX_RETRIES} attempts to ${url}: ${err.message}`);
  }
}

function dispatchAlert(rule, log) {
  if (!targets.length) return;
  const envelope = {
    source: 'logpulse-engine',
    ruleId: rule.id,
    log,
    emittedAt: new Date().toISOString()
  };
  for (const url of targets) {
    deliverWithRetry(url, envelope).catch(() => {});
  }
}

module.exports = { dispatchAlert, targets };