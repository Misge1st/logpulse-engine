const logQueue = require('../src/logQueue');
const { db } = require('../src/db');

console.log('--- Starting 1,000-Log Queue Order & Data Integrity Test ---');

// Clear previous test records
db.prepare("DELETE FROM server_logs WHERE service = 'queue-validation-test'").run();

const TOTAL_LOGS = 1000;

// Send 1,000 logs rapidly in exact sequence
for (let i = 1; i <= TOTAL_LOGS; i++) {
  logQueue.enqueue({
    sequence_id: i,
    service: 'queue-validation-test',
    level: i % 10 === 0 ? 'ERROR' : 'INFO',
    message: `Validation log payload #${i}`
  });
}

// Force flush remaining batches and verify
setTimeout(() => {
  while (logQueue.getStats().queuedLogsPending > 0) {
    logQueue.flush();
  }

  const savedLogs = db
    .prepare("SELECT sequence_id FROM server_logs WHERE service = 'queue-validation-test' ORDER BY id ASC")
    .all();

  let isOrderExact = true;
  for (let i = 0; i < savedLogs.length; i++) {
    if (savedLogs[i].sequence_id !== i + 1) {
      isOrderExact = false;
      break;
    }
  }

  console.log(`Total Sent: ${TOTAL_LOGS}`);
  console.log(`Total Saved in DB: ${savedLogs.length}`);
  console.log(`Sequence Preserved Exactly (1..1000): ${isOrderExact ? 'PASS' : 'FAIL'}`);

  process.exit(savedLogs.length === TOTAL_LOGS && isOrderExact ? 0 : 1);
}, 2500);
