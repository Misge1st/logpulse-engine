const { db } = require('./db');

function searchLogs(filters = {}, limit = 100, offset = 0) {
  const clauses = [];
  const params = {};
  if (filters.service) {
    clauses.push('service = @service');
    params.service = filters.service;
  }
  if (filters.level) {
    clauses.push('level = @level');
    params.level = String(filters.level).toUpperCase();
  }
  if (filters.q) {
    clauses.push('message LIKE @q');
    params.q = `%${filters.q}%`;
  }
  if (filters.since) {
    clauses.push('timestamp >= @since');
    params.since = filters.since;
  }
  if (filters.until) {
    clauses.push('timestamp <= @until');
    params.until = filters.until;
  }
  const where = clauses.length ? `WHERE ${clauses.join(' AND ')}` : '';
  const sql = `SELECT * FROM server_logs ${where} ORDER BY id DESC LIMIT @limit OFFSET @offset`;
  params.limit = limit;
  params.offset = offset;
  return db.prepare(sql).all(params);
}

function countByLevel(sinceIso) {
  const sql = sinceIso
    ? 'SELECT level, COUNT(*) as cnt FROM server_logs WHERE timestamp >= ? GROUP BY level'
    : 'SELECT level, COUNT(*) as cnt FROM server_logs GROUP BY level';
  const rows = sinceIso ? db.prepare(sql).all(sinceIso) : db.prepare(sql).all();
  return rows.reduce((acc, row) => {
    acc[row.level] = row.cnt;
    return acc;
  }, {});
}

module.exports = { searchLogs, countByLevel };