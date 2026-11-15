// Minimal RFC5424-ish parser for demo syslog lines: "<pri>version timestamp host app msg"
function parseSyslogLine(raw) {
  const text = String(raw || '').trim();
  if (!text) return null;

  const priMatch = text.match(/^<(\d+)>/);
  let rest = text;
  let level = 'INFO';
  if (priMatch) {
    const pri = Number(priMatch[1]);
    const sev = pri % 8;
    level = sev <= 3 ? 'ERROR' : sev <= 5 ? 'WARN' : 'INFO';
    rest = text.slice(priMatch[0].length).trim();
  }

  const parts = rest.split(/\s+/);
  const service = parts.length >= 4 ? parts[3] : 'syslog-ingest';
  const message = parts.length >= 5 ? parts.slice(4).join(' ') : rest;

  return {
    service,
    level,
    message,
    timestamp: new Date().toISOString()
  };
}

module.exports = { parseSyslogLine };