const rowsEl = document.getElementById('log-rows');
const statsEl = document.getElementById('stats');
const healthEl = document.getElementById('health');

function levelClass(level) {
  return `level-${(level || '').toLowerCase()}`;
}

async function fetchJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status}`);
  return res.json();
}

function renderStats(queueStats, levelStats) {
  statsEl.innerHTML = `
    <div class="card"><span>Pending queue</span><strong>${queueStats.queuedLogsPending}</strong></div>
    <div class="card"><span>Cache items</span><strong>${queueStats.cachedItemsCount}</strong></div>
    <div class="card"><span>Heap</span><strong>${queueStats.heapUsagePercent}%</strong></div>
    <div class="card"><span>Errors (all time)</span><strong>${levelStats.ERROR || 0}</strong></div>`;
}

function renderRows(logs) {
  rowsEl.innerHTML = logs
    .map(
      (log) => `<tr>
        <td>${log.timestamp}</td>
        <td>${log.service}</td>
        <td class="${levelClass(log.level)}">${log.level}</td>
        <td>${log.message}</td>
      </tr>`
    )
    .join('');
}

async function refresh() {
  const q = document.getElementById('filter-q').value;
  const level = document.getElementById('filter-level').value;
  const params = new URLSearchParams({ limit: '50' });
  if (q) params.set('q', q);
  if (level) params.set('level', level);
  const [health, search, stats] = await Promise.all([
    fetchJson('/health'),
    fetchJson(`/api/logs/search?${params}`),
    fetchJson('/api/logs/stats')
  ]);
  healthEl.textContent = `${health.status} • v${health.version}`;
  renderStats(health.queue, stats.byLevel);
  renderRows(search.logs);
}

document.getElementById('refresh').addEventListener('click', refresh);
document.getElementById('filter-q').addEventListener('input', refresh);
document.getElementById('filter-level').addEventListener('change', refresh);
refresh();
setInterval(refresh, 4000);