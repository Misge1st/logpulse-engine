const assert = require('assert');
const alerts = require('../src/alerts');

const id = alerts.addRule({
  service: 'billing',
  level: 'ERROR',
  messageIncludes: 'card declined',
  action: 'webhook'
});

const fired = alerts.evaluate({
  service: 'billing',
  level: 'ERROR',
  message: 'card declined for user 22'
});

assert.strictEqual(fired.some((r) => r.id === id), true);
assert.ok(alerts.removeRule(id));
console.log('alerts.test.js: PASS');