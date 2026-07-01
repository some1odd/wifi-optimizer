/* ═══════════════════════════════════════════════════════════════════
   Wifi Optimizer – Frontend JS Script
   ═══════════════════════════════════════════════════════════════════ */

// ── DOM Helpers ────────────────────────────────────────────────────
const $  = (sel) => document.querySelector(sel);
const $$ = (sel) => document.querySelectorAll(sel);

// ── State ──────────────────────────────────────────────────────────
let refreshInterval = 2000;   // Default 2 seconds
let refreshTimer    = null;

// ── Navigation ─────────────────────────────────────────────────────
$$('.nav-btn').forEach((btn) => {
  btn.addEventListener('click', () => {
    $$('.nav-btn').forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');

    const page = btn.dataset.page;
    $$('.page').forEach((p) => p.classList.remove('active'));
    $(`#page-${page}`).classList.add('active');
  });
});

// ── Bridge Communication: Fetch stats from Python every 2s ──────────
async function refreshDashboard() {
  try {
    // Call exposed Python function: get_wifi_data()
    const data = await eel.get_wifi_data()();

    // 1. Update SSID header
    $('#wifi-ssid').textContent = data.ssid || 'Scanning...';

    // 2. Update Signal Strength card
    const signalStr = data.signal || '0%';
    const signalVal = parseInt(signalStr, 10) || 0;
    $('#signal-value').textContent = signalStr;
    $('#signal-bar').style.width = `${signalVal}%`;

    // Dynamic signal card boundary color based on strength
    const sigCard = $('#card-signal');
    sigCard.style.borderColor = getSignalColor(signalVal, 0.25);

    // 3. Update Latency card
    const pingStr = data.ping || '0ms';
    const pingVal = parseInt(pingStr, 10) || 0;
    $('#ping-value').textContent = pingStr;
    
    // Map ping: 0ms -> 100% full bar, 200ms -> 0% empty bar
    const pingPct = Math.max(0, Math.min(100, 100 - (pingVal / 2)));
    $('#ping-bar').style.width = `${pingPct}%`;

  } catch (err) {
    console.warn('Eel bridge disconnected or get_wifi_data() failed:', err);
  }
}

function getSignalColor(pct, alpha = 1) {
  if (pct >= 75) return `rgba(0, 230, 118, ${alpha})`;
  if (pct >= 50) return `rgba(0, 229, 255, ${alpha})`;
  if (pct >= 30) return `rgba(255, 171, 64, ${alpha})`;
  return `rgba(255, 82, 82, ${alpha})`;
}

// ── Polling Loop Control ───────────────────────────────────────────
function startAutoRefresh() {
  clearInterval(refreshTimer);
  refreshTimer = setInterval(refreshDashboard, refreshInterval);
}

// ── Optimize Button Click ──────────────────────────────────────────
$('#optimize-btn').addEventListener('click', async () => {
  const btn = $('#optimize-btn');
  btn.classList.add('running');
  btn.querySelector('.optimize-label').textContent = '...';
  btn.querySelector('.optimize-sub').textContent   = 'Optimising';

  try {
    const result = await eel.run_optimize()();
    showToast('Optimization complete ✓');
    addLog(result.actions, 'success');
  } catch (err) {
    showToast('Optimization failed');
    addLog(['Optimization failed — bridge unavailable'], 'error');
  }

  btn.classList.remove('running');
  btn.querySelector('.optimize-label').textContent = 'OPTIMIZE';
  btn.querySelector('.optimize-sub').textContent   = 'Tap to boost';

  // Instant refresh after optimization
  refreshDashboard();
});

// ── Booster Page Actions ───────────────────────────────────────────
$('#btn-flush-dns').addEventListener('click', async () => {
  addLog(['Flushing DNS Cache...'], 'info');
  try {
    const r = await eel.run_optimize()();
    addLog([r.actions[0]], 'success');
    showToast('DNS cache flushed ✓');
  } catch {
    addLog(['DNS flush failed'], 'error');
  }
});

$('#btn-renew-ip').addEventListener('click', async () => {
  addLog(['Renewing IP address...'], 'info');
  try {
    const r = await eel.run_optimize()();
    addLog([r.actions[1]], 'success');
    showToast('IP renewed ✓');
  } catch {
    addLog(['IP renew failed'], 'error');
  }
});

$('#btn-full-optimize').addEventListener('click', async () => {
  addLog(['Starting full system optimization...'], 'info');
  try {
    const r = await eel.run_optimize()();
    addLog(r.actions, 'success');
    showToast('Full optimization complete ✓');
  } catch {
    addLog(['Full optimization failed'], 'error');
  }
  refreshDashboard();
});

// ── Detector Page Scanning ─────────────────────────────────────────
$('#btn-scan').addEventListener('click', async () => {
  const list = $('#network-list');
  list.innerHTML = '<div class="scan-placeholder">Scanning for access points...</div>';

  try {
    const networks = await eel.scan_networks()();
    if (!networks || !networks.length) {
      list.innerHTML = '<div class="scan-placeholder">No Wi-Fi networks found.</div>';
      return;
    }

    // Sort by signal strength descending
    networks.sort((a, b) => b.signal - a.signal);
    list.innerHTML = '';

    networks.forEach((net, i) => {
      const cls = sigClass(net.signal);
      const barColor = signalGradient(net.signal);

      const el = document.createElement('div');
      el.className = `network-item glass`;
      el.style.animationDelay = `${i * 0.05}s`;
      el.innerHTML = `
        <div class="net-signal-icon ${cls}">${net.signal}%</div>
        <div class="net-info">
          <div class="net-ssid">${escHtml(net.ssid)}</div>
          <div class="net-meta">Ch ${net.channel} · ${net.auth}</div>
        </div>
        <div class="net-bar-wrap">
          <div class="net-bar-track">
            <div class="net-bar-fill" style="width:${net.signal}%;background:${barColor};"></div>
          </div>
        </div>
      `;
      list.appendChild(el);
    });
  } catch (err) {
    list.innerHTML = '<div class="scan-placeholder">Scanning error — check hardware.</div>';
  }
});

function sigClass(pct) {
  if (pct >= 75) return 'net-sig-great';
  if (pct >= 50) return 'net-sig-good';
  if (pct >= 30) return 'net-sig-ok';
  return 'net-sig-bad';
}

function signalGradient(pct) {
  if (pct >= 75) return 'linear-gradient(90deg, #00e676, #69f0ae)';
  if (pct >= 50) return 'linear-gradient(90deg, #00e5ff, #18ffff)';
  if (pct >= 30) return 'linear-gradient(90deg, #ffab40, #ffd740)';
  return 'linear-gradient(90deg, #ff5252, #ff8a80)';
}

// ── Settings Handler ───────────────────────────────────────────────
$('#setting-auto-refresh').addEventListener('change', (e) => {
  refreshInterval = parseInt(e.target.value, 10) * 1000;
  startAutoRefresh();
});

// ── Dark/Light Mode Switcher ───────────────────────────────────────
const themeToggle = $('#theme-toggle-checkbox');
const themeText = $('.theme-label-text');

themeToggle.addEventListener('change', () => {
  if (themeToggle.checked) {
    document.body.classList.add('light-mode');
    themeText.textContent = 'Light Mode';
  } else {
    document.body.classList.remove('light-mode');
    themeText.textContent = 'Dark Mode';
  }
});

// ── UI Helpers ─────────────────────────────────────────────────────
function showToast(msg) {
  const t = document.createElement('div');
  t.className = 'status-toast';
  t.textContent = msg;
  document.body.appendChild(t);
  setTimeout(() => t.remove(), 3000);
}

function addLog(lines, cls = '') {
  const list = $('#log-list');
  const empty = list.querySelector('.log-empty');
  if (empty) empty.remove();

  lines.forEach((line) => {
    const li = document.createElement('li');
    li.textContent = `[${timestamp()}]  ${line}`;
    if (cls) li.classList.add(`log-${cls}`);
    list.prepend(li);
  });

  while (list.children.length > 50) {
    list.lastChild.remove();
  }
}

function timestamp() {
  const d = new Date();
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
}

function escHtml(s) {
  const d = document.createElement('div');
  d.textContent = s;
  return d.innerHTML;
}

// ── Ambient background particles canvas ──────────────────────────────
let canvas, ctx;
let dots = [];
const PARTICLE_COUNT = 60;

function initParticles() {
  canvas = $('#particles-canvas');
  ctx    = canvas.getContext('2d');

  resize();
  window.addEventListener('resize', resize);

  dots = Array.from({ length: PARTICLE_COUNT }, () => ({
    x:  Math.random() * canvas.width,
    y:  Math.random() * canvas.height,
    r:  Math.random() * 1.5 + 0.4,
    vx: (Math.random() - 0.5) * 0.2,
    vy: (Math.random() - 0.5) * 0.2,
    a:  Math.random() * 0.35 + 0.08,
  }));

  draw();
}

function resize() {
  canvas.width  = window.innerWidth;
  canvas.height = window.innerHeight;
}

function draw() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const isLight = document.body.classList.contains('light-mode');
  const particleColor = isLight ? 'rgba(124, 77, 255,' : 'rgba(0, 229, 255,';

  dots.forEach((d) => {
    d.x += d.vx;
    d.y += d.vy;
    if (d.x < 0) d.x = canvas.width;
    if (d.x > canvas.width) d.x = 0;
    if (d.y < 0) d.y = canvas.height;
    if (d.y > canvas.height) d.y = 0;

    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
    ctx.fillStyle = `${particleColor}${d.a})`;
    ctx.fill();
  });

  // Connect close particles with lines
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    for (let j = i + 1; j < PARTICLE_COUNT; j++) {
      const dx = dots[i].x - dots[j].x;
      const dy = dots[i].y - dots[j].y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < 110) {
        ctx.beginPath();
        ctx.moveTo(dots[i].x, dots[i].y);
        ctx.lineTo(dots[j].x, dots[j].y);
        ctx.strokeStyle = `${particleColor}${0.05 * (1 - dist / 110)})`;
        ctx.lineWidth = 0.5;
        ctx.stroke();
      }
    }
  }

  requestAnimationFrame(draw);
}

// ── Boot ────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initParticles();
  refreshDashboard();
  startAutoRefresh();
});
