const fs = require('fs');
const path = require('path');
const zlib = require('zlib');

const outDir = path.join(__dirname, '../data/samples');
fs.mkdirSync(outDir, { recursive: true });

const services = ['api-gateway', 'checkout', 'inventory', 'auth', 'search-indexer'];
const levels = ['INFO', 'INFO', 'INFO', 'WARN', 'ERROR'];

function line(i, month) {
  const service = services[i % services.length];
  const level = levels[i % levels.length];
  const ts = new Date(Date.UTC(2025, month - 1, 1, 0, 0, i % 86400)).toISOString();
  return JSON.stringify({
    sequence_id: i,
    service,
    level,
    message: `[${service}] synthetic event ${i} trace=${Math.random().toString(36).slice(2)} payload=${'x'.repeat(160)}`,
    timestamp: ts,
    host: `worker-${i % 40}`,
    region: i % 2 === 0 ? 'us-east-1' : 'eu-west-1'
  });
}

const SHARD_LINES = 52000;
const SHARDS = [
  { name: 'archive-2025-06.ndjson.gz', month: 6 },
  { name: 'archive-2025-07.ndjson.gz', month: 7 },
  { name: 'archive-2025-08.ndjson.gz', month: 8 },
  { name: 'archive-2025-09.ndjson.gz', month: 9 }
];

for (const shard of SHARDS) {
  const target = path.join(outDir, shard.name);
  const gz = zlib.createGzip({ level: 6 });
  const stream = fs.createWriteStream(target);
  gz.pipe(stream);
  for (let i = 1; i <= SHARD_LINES; i++) gz.write(line(i * shard.month, shard.month) + '\n');
  gz.end();
  console.log('Wrote', target);
}

fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      format: 'ndjson+gzip',
      shards: SHARDS.map((s) => s.name),
      linesPerShard: SHARD_LINES
    },
    null,
    2
  )
);
console.log('Sample corpus ready.');