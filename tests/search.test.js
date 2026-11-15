const assert = require('assert');
const { searchLogs } = require('../src/search');
const { db } = require('../src/db');

db.prepare('DELETE FROM server_logs WHERE service = ?').run('search-unit-test');
const insert = db.prepare(`
  INSERT INTO server_logs (sequence_id, service, level, message, timestamp)
  VALUES (NULL, 'search-unit-test', ?, ?, ?)
`);
insert.run('ERROR', 'payment timeout gateway', new Date().toISOString());

const hits = searchLogs({ service: 'search-unit-test', q: 'timeout' }, 10, 0);
assert.strictEqual(hits.length, 1);
console.log('search.test.js: PASS');