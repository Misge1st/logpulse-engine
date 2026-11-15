const Database = require('better-sqlite3');
const path = require('path');

const db = new Database(path.join(__dirname, '../logs.db'));

db.pragma('journal_mode = WAL');
db.pragma('synchronous = NORMAL');

db.exec(`
  CREATE TABLE IF NOT EXISTS server_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    sequence_id INTEGER,
    service TEXT NOT NULL,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    timestamp TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS products (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    price REAL NOT NULL,
    stock INTEGER NOT NULL
  );

  CREATE INDEX IF NOT EXISTS idx_logs_service ON server_logs(service);
  CREATE INDEX IF NOT EXISTS idx_logs_level ON server_logs(level);
  CREATE INDEX IF NOT EXISTS idx_logs_timestamp ON server_logs(timestamp);
`);

const seedProduct = db.prepare(`
  INSERT OR IGNORE INTO products (id, name, price, stock) VALUES (?, ?, ?, ?)
`);
seedProduct.run('prod_101', 'Mechanical Keyboard Pro', 149.99, 45);
seedProduct.run('prod_102', '4K UltraWide Monitor', 499.0, 12);
seedProduct.run('prod_103', 'USB-C Dock Gen3', 89.5, 120);

const insertLogStmt = db.prepare(`
  INSERT INTO server_logs (sequence_id, service, level, message, timestamp)
  VALUES (@sequence_id, @service, @level, @message, @timestamp)
`);

const insertBatchTransaction = db.transaction((logs) => {
  for (const log of logs) insertLogStmt.run(log);
});

module.exports = {
  db,
  insertBatchTransaction,
  getRecentLogs: (limit = 100) =>
    db.prepare('SELECT * FROM server_logs ORDER BY id DESC LIMIT ?').all(limit),
  getErrorLogs: (limit = 50) =>
    db.prepare("SELECT * FROM server_logs WHERE level = 'ERROR' ORDER BY id DESC LIMIT ?").all(limit),
  getProductById: (id) => db.prepare('SELECT * FROM products WHERE id = ?').get(id),
  exportNdjson: (limit = 5000) =>
    db.prepare('SELECT * FROM server_logs ORDER BY id DESC LIMIT ?').all(limit)
};