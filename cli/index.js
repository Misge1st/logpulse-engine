#!/usr/bin/env node
const http = require('http');
const https = require('https');
const { URL } = require('url');

const base = process.env.LOGPULSE_URL || 'http://localhost:3000';
const apiKey = process.env.LOGPULSE_API_KEY || 'dev-key-change-me';

function request(method, path, body) {
  const url = new URL(path, base);
  const lib = url.protocol === 'https:' ? https : http;
  const payload = body ? JSON.stringify(body) : null;
  return new Promise((resolve, reject) => {
    const req = lib.request(
      url,
      {
        method,
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': apiKey,
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {})
        }
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => (data += chunk));
        res.on('end', () => resolve({ status: res.statusCode, body: data }));
      }
    );
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === 'help') {
    console.log('Usage: logpulse <ingest|health|search> [args]');
    process.exit(0);
  }
  if (cmd === 'health') {
    console.log((await request('GET', '/health')).body);
    return;
  }
  if (cmd === 'ingest') {
    const res = await request('POST', '/api/logs', {
      service: 'cli',
      level: 'INFO',
      message: rest.join(' ') || 'cli smoke test'
    });
    console.log(res.status, res.body);
    return;
  }
  if (cmd === 'search') {
    const q = rest[0] || '';
    console.log((await request('GET', `/api/logs/search?q=${encodeURIComponent(q)}&limit=20`)).body);
    return;
  }
  console.error(`Unknown command: ${cmd}`);
  process.exit(1);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});