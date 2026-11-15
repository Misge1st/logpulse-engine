const rules = [];

function addRule(rule) {
  const id = rule.id || `rule_${Date.now()}`;
  rules.push({
    id,
    service: rule.service || null,
    level: rule.level ? String(rule.level).toUpperCase() : null,
    messageIncludes: rule.messageIncludes || null,
    action: rule.action || 'log'
  });
  return id;
}

function listRules() {
  return [...rules];
}

function removeRule(id) {
  const idx = rules.findIndex((r) => r.id === id);
  if (idx === -1) return false;
  rules.splice(idx, 1);
  return true;
}

function matchesRule(rule, log) {
  if (rule.service && rule.service !== log.service) return false;
  if (rule.level && rule.level !== log.level) return false;
  if (rule.messageIncludes && !String(log.message).includes(rule.messageIncludes)) return false;
  return true;
}

function evaluate(log, onFire) {
  const fired = [];
  for (const rule of rules) {
    if (matchesRule(rule, log)) {
      fired.push(rule);
      if (onFire) onFire(rule, log);
    }
  }
  return fired;
}

addRule({
  id: 'default-error-spike',
  level: 'ERROR',
  messageIncludes: 'timeout',
  action: 'webhook'
});

module.exports = { addRule, listRules, removeRule, evaluate };