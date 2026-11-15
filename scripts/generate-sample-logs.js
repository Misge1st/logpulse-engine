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
    message: `[${service}] synthetic event ${i} trace=${Math.random().toString(36).slice(2)} payload=${'x'.repeat(420)}`,
    timestamp: ts,
    host: `worker-${i % 40}`,
    region: i % 2 === 0 ? 'us-east-1' : 'eu-west-1'
  });
}

const SHARD_LINES = 23600;
const SHARDS = [
  { name: 'archive-2025-06.ndjson', month: 6 },
  { name: 'archive-2025-07.ndjson', month: 7 },
  { name: 'archive-2025-08.ndjson', month: 8 },
  { name: 'archive-2025-09.ndjson', month: 9 }
];

for (const shard of SHARDS) {
  const target = path.join(outDir, shard.name);
  const stream = fs.createWriteStream(target);
  for (let i = 1; i <= SHARD_LINES; i++) stream.write(line(i * shard.month, shard.month) + '\n');
  stream.end();
  console.log('Wrote', target);
}

const gzName = 'archive-2025-12-summary.ndjson.gz';
const summaryTarget = path.join(outDir, gzName);
const gz = zlib.createGzip({ level: 6 });
const summaryStream = fs.createWriteStream(summaryTarget);
gz.pipe(summaryStream);
for (let i = 1; i <= 12000; i++) gz.write(line(i, 12) + '\n');
gz.end();
console.log('Wrote', summaryTarget);

fs.writeFileSync(
  path.join(outDir, 'manifest.json'),
  JSON.stringify(
    {
      format: 'ndjson',
      shards: [...SHARDS.map((s) => s.name), gzName],
      linesPerShard: SHARD_LINES
    },
    null,
    2
  )
);
console.log('Sample corpus ready.');