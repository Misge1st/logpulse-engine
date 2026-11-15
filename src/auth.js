const VALID_KEYS = (process.env.LOGPULSE_API_KEYS || 'dev-key-change-me')
  .split(',')
  .map((k) => k.trim())
  .filter(Boolean);

function requireApiKey(req, res, next) {
  if (process.env.LOGPULSE_AUTH_DISABLED === '1') {
    return next();
  }
  const key = req.headers['x-api-key'] || req.query.api_key;
  if (!key || !VALID_KEYS.includes(key)) {
    return res.status(401).json({ error: 'Valid X-API-Key header required' });
  }
  next();
}

module.exports = { requireApiKey, VALID_KEYS };