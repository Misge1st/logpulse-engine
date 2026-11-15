const fs = require('fs');
const path = require('path');
const readline = require('readline');

const samplesDir = path.join(__dirname, '../data/samples');
const limit = Number(process.env.REPLAY_LIMIT || 200);
const target = process.env.LOGPULSE_URL || 'http://localhost:3000';
const apiKey = process.env.LOGPULSE_API_KEY || 'dev-key-change-me';

async function replayFile(filePath) {
  const rl = readline.createInterface({ input: fs.createReadStream(filePath), crlfDelay: Infinity });
  let count = 0;
  for await (const row of rl) {
    if (!row.trim()) continue;
    const evt = JSON.parse(row);
    const res = await fetch(`${target}/api/logs`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-API-Key': apiKey },
      body: JSON.stringify({
        sequence_id: evt.sequence_id,
        service: evt.service,
        level: evt.level,
        message: evt.message
      })
    });
    if (!res.ok) {
      console.error('Failed row', count, await res.text());
      break;
    }
    count += 1;
    if (count >= limit) break;
  }
  return count;
}

async function main() {
  const manifest = JSON.parse(fs.readFileSync(path.join(samplesDir, 'manifest.json'), 'utf8'));
  const firstShard = manifest.shards.find((n) => n.endsWith('.ndjson'));
  if (!firstShard) throw new Error('No ndjson shard in manifest');
  const sent = await replayFile(path.join(samplesDir, firstShard));
  console.log(`Replayed ${sent} events from ${firstShard}`);
}

main().catch((err) => {
  console.error(err.message);
  process.exit(1);
});