/* =============================================
   ECOVISION — POLLUTION DETECTION SYSTEM
   JavaScript: Live Simulation, Charts, Alerts
   ============================================= */

'use strict';

// ─────────────────────────────────────────────
// STATE
// ─────────────────────────────────────────────
const state = {
  noise: 42,
  air:   78,
  waste: 87,
  water: 5.6,
  alerts: [],
  samples: 0,
  chartHistory: {
    noise: Array(20).fill(42),
    air:   Array(20).fill(78),
    waste: Array(20).fill(87),
    water: Array(20).fill(5.6),
  },
  isSimulating: false,
};

// ─────────────────────────────────────────────
// THRESHOLDS
// ─────────────────────────────────────────────
const thresholds = {
  noise: { safe: 55, moderate: 85, unit: 'dB',  max: 150 },
  air:   { safe: 50, moderate: 100, unit: 'AQI', max: 300 },
  waste: { safe: 50, moderate: 80,  unit: '%',   max: 100 },
  water: { safeMin: 6.5, safeMax: 8.5, unit: 'pH', max: 14 },
};

function getStatus(type, value) {
  if (type === 'water') {
    const t = thresholds.water;
    if (value >= t.safeMin && value <= t.safeMax) return 'safe';
    if (value < 6.0 || value > 9.0)               return 'danger';
    return 'moderate';
  }
  const t = thresholds[type];
  if (value <= t.safe)     return 'safe';
  if (value <= t.moderate) return 'moderate';
  return 'danger';
}

function getRisk(status) {
  return { safe: 'Low', moderate: 'Medium', danger: 'High', warning: 'Medium' }[status] || '—';
}

function getRiskColor(risk) {
  return { Low: 'var(--accent)', Medium: 'var(--noise)', High: 'var(--waste)' }[risk] || 'var(--muted)';
}

// ─────────────────────────────────────────────
// DOM HELPERS
// ─────────────────────────────────────────────
const $ = (id) => document.getElementById(id);

function setMeter(id, pct) {
  const el = $(id);
  if (el) el.style.width = Math.min(100, Math.max(0, pct)) + '%';
}

function setStatusBadge(id, status) {
  const el = $(id);
  if (!el) return;
  el.className = 'status-badge ' + status;
  el.textContent = status.toUpperCase();
}

// ─────────────────────────────────────────────
// UPDATE DASHBOARD
// ─────────────────────────────────────────────
function updateDashboard() {
  const { noise, air, waste, water } = state;

  /* ----- NOISE ----- */
  const noiseSt = getStatus('noise', noise);
  const noiseRisk = getRisk(noiseSt);
  $('noiseVal').textContent   = noise.toFixed(0) + ' dB';
  $('noisePeak').textContent  = Math.max(...state.chartHistory.noise).toFixed(0) + ' dB';
  $('noiseRisk').textContent  = noiseRisk;
  $('noiseRisk').style.color  = getRiskColor(noiseRisk);
  setMeter('noiseMeter', (noise / 150) * 100);
  setStatusBadge('noiseStatus', noiseSt);

  /* ----- AIR ----- */
  const airSt  = getStatus('air', air);
  const airRisk = getRisk(airSt);
  $('airVal').textContent  = air.toFixed(0) + ' AQI';
  $('airPM').textContent   = (air * 0.18).toFixed(1) + ' µg/m³';
  $('airRisk').textContent = airRisk;
  $('airRisk').style.color = getRiskColor(airRisk);
  setMeter('airMeter', (air / 300) * 100);
  setStatusBadge('airStatus', airSt);

  /* ----- WASTE ----- */
  const wasteSt   = getStatus('waste', waste);
  const wasteRisk = getRisk(wasteSt);
  $('wasteVal').textContent     = waste.toFixed(0) + '%';
  $('wasteMethane').textContent = (waste * 0.42).toFixed(1) + ' ppm';
  $('wasteRisk').textContent    = wasteRisk;
  $('wasteRisk').style.color    = getRiskColor(wasteRisk);
  setMeter('wasteMeter', waste);
  setStatusBadge('wasteStatus', wasteSt);

  /* ----- WATER ----- */
  const waterSt   = getStatus('water', water);
  const waterRisk = getRisk(waterSt);
  $('waterVal').textContent     = water.toFixed(1) + ' pH';
  $('waterTurb').textContent    = (Math.abs(water - 7) * 18).toFixed(1) + ' NTU';
  $('waterRisk').textContent    = waterRisk;
  $('waterRisk').style.color    = getRiskColor(waterRisk);
  setMeter('waterMeter', (water / 14) * 100);
  setStatusBadge('waterStatus', waterSt);

  /* ----- SUMMARY ----- */
  const statuses = [noiseSt, airSt, wasteSt, waterSt];
  const activeAlerts = statuses.filter(s => s === 'danger').length;
  const safeZones    = statuses.filter(s => s === 'safe').length;
  $('totalAlerts').textContent = activeAlerts;
  $('safeCount').textContent   = safeZones;
  $('samplesCount').textContent = state.samples;
  $('alertBadge').textContent  = state.alerts.length;

  /* ----- Auto-log danger alerts ----- */
  checkAndAlert('Noise Pollution',   noiseSt,  noise,  'dB');
  checkAndAlert('Air Quality',        airSt,    air,    'AQI');
  checkAndAlert('Dump Waste Level',   wasteSt,  waste,  '%');
  checkAndAlert('Water pH Level',     waterSt,  water,  'pH');

  /* ----- Draw charts ----- */
  drawChart('noiseChart', state.chartHistory.noise, 'var(--noise)', 0, 150);
  drawChart('airChart',   state.chartHistory.air,   'var(--air)',   0, 300);
  drawChart('wasteChart', state.chartHistory.waste, 'var(--waste)', 0, 100);
  drawChart('waterChart', state.chartHistory.water, 'var(--water)', 0, 14);
}

// ─────────────────────────────────────────────
// ALERT SYSTEM
// ─────────────────────────────────────────────
const alerted = new Set();

function checkAndAlert(name, status, value, unit) {
  const key = name + '-' + status;
  if (status === 'danger' && !alerted.has(key)) {
    alerted.add(key);
    logAlert(name, status, value, unit);
  }
  if (status !== 'danger') alerted.delete(name + '-danger');
}

function logAlert(name, status, value, unit) {
  const now = new Date();
  const timeStr = now.toLocaleTimeString();
  const alert = { name, status, value, unit, time: timeStr };
  state.alerts.unshift(alert);
  renderAlerts();
}

function renderAlerts() {
  const list = $('alertList');
  if (state.alerts.length === 0) {
    list.innerHTML = '<p class="empty-alerts">No alerts yet. Pollution detected events will appear here.</p>';
    return;
  }
  list.innerHTML = state.alerts.map(a => `
    <div class="alert-item">
      <div class="alert-dot ${a.status}"></div>
      <div class="alert-content">
        <div class="alert-title">${a.name} — ${a.status.toUpperCase()}</div>
        <div class="alert-meta">Reading: ${typeof a.value === 'number' ? a.value.toFixed(1) : a.value} ${a.unit}</div>
      </div>
      <div class="alert-time">${a.time}</div>
    </div>
  `).join('');
}

// ─────────────────────────────────────────────
// MINI SPARKLINE CHARTS
// ─────────────────────────────────────────────
function drawChart(canvasId, data, color, min, max) {
  const canvas = $(canvasId);
  if (!canvas) return;
  const ctx  = canvas.getContext('2d');
  const W    = canvas.width;
  const H    = canvas.height;
  const pad  = 6;

  ctx.clearRect(0, 0, W, H);

  // Background grid
  ctx.strokeStyle = 'rgba(255,255,255,0.04)';
  ctx.lineWidth = 1;
  for (let i = 0; i <= 3; i++) {
    const y = pad + ((H - pad * 2) / 3) * i;
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }

  const xStep = (W - pad * 2) / (data.length - 1);

  const toY = v => H - pad - ((v - min) / (max - min)) * (H - pad * 2);

  // Fill
  ctx.beginPath();
  ctx.moveTo(pad, toY(data[0]));
  data.forEach((v, i) => { ctx.lineTo(pad + i * xStep, toY(v)); });
  ctx.lineTo(pad + (data.length - 1) * xStep, H);
  ctx.lineTo(pad, H);
  ctx.closePath();
  const grad = ctx.createLinearGradient(0, 0, 0, H);
  grad.addColorStop(0,   color.replace('var(', '').replace(')', '') === color ? color + '55' : 'rgba(45,242,137,0.25)');
  grad.addColorStop(1,   'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fill();

  // Line
  ctx.beginPath();
  ctx.moveTo(pad, toY(data[0]));
  data.forEach((v, i) => { ctx.lineTo(pad + i * xStep, toY(v)); });
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.5;
  ctx.lineJoin = 'round';
  ctx.stroke();

  // Dot at latest
  const lastX = pad + (data.length - 1) * xStep;
  const lastY = toY(data[data.length - 1]);
  ctx.beginPath();
  ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
  ctx.fillStyle = color;
  ctx.fill();
}

// ─────────────────────────────────────────────
// LIVE SIMULATION (random drift when not manual)
// ─────────────────────────────────────────────
function drift(current, min, max, volatility = 2) {
  const change = (Math.random() - 0.48) * volatility;
  return Math.min(max, Math.max(min, current + change));
}

function tickLive() {
  if (state.isSimulating) return;

  state.noise = drift(state.noise, 30, 110, 3);
  state.air   = drift(state.air,   20, 180, 5);
  state.waste = drift(state.waste, 70, 100, 1);
  state.water = drift(state.water, 4.5, 9.5, 0.1);
  state.samples++;

  pushHistory();
  updateDashboard();
}

function pushHistory() {
  state.chartHistory.noise.push(state.noise);
  state.chartHistory.air.push(state.air);
  state.chartHistory.waste.push(state.waste);
  state.chartHistory.water.push(state.water);

  ['noise','air','waste','water'].forEach(k => {
    if (state.chartHistory[k].length > 30) state.chartHistory[k].shift();
  });
}

// ─────────────────────────────────────────────
// TABS
// ─────────────────────────────────────────────
document.querySelectorAll('.nav-tag').forEach(tag => {
  tag.addEventListener('click', () => {
    document.querySelectorAll('.nav-tag').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    tag.classList.add('active');
    const tabId = 'tab-' + tag.dataset.tab;
    const tab = $(tabId);
    if (tab) tab.classList.add('active');
  });
});

// ─────────────────────────────────────────────
// SIMULATE TAB — SLIDERS
// ─────────────────────────────────────────────
function initSliders() {
  const sliders = [
    { id: 'simNoise', valId: 'simNoiseVal', unit: ' dB',  key: 'noise' },
    { id: 'simAir',   valId: 'simAirVal',   unit: ' AQI', key: 'air' },
    { id: 'simWaste', valId: 'simWasteVal', unit: '%',    key: 'waste' },
    { id: 'simWater', valId: 'simWaterVal', unit: ' pH',  key: 'water' },
  ];

  sliders.forEach(({ id, valId, unit }) => {
    const slider = $(id);
    const valEl  = $(valId);
    if (!slider) return;

    slider.addEventListener('input', () => {
      const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
      slider.style.setProperty('--val', pct + '%');
      valEl.textContent = parseFloat(slider.value).toFixed(slider.step === '0.1' ? 1 : 0) + unit;
    });

    // Init fill
    const pct = ((slider.value - slider.min) / (slider.max - slider.min)) * 100;
    slider.style.setProperty('--val', pct + '%');
  });
}

$('applySimBtn').addEventListener('click', () => {
  state.isSimulating = true;
  state.noise = parseFloat($('simNoise').value);
  state.air   = parseFloat($('simAir').value);
  state.waste = parseFloat($('simWaste').value);
  state.water = parseFloat($('simWater').value);
  state.samples++;

  pushHistory();
  updateDashboard();

  // Visual feedback
  $('applySimBtn').textContent = '✅ Applied!';
  setTimeout(() => { $('applySimBtn').textContent = '⚡ Apply Simulation'; }, 2000);
});

$('resetSimBtn').addEventListener('click', () => {
  state.isSimulating = false;
  $('simNoise').value = 42;
  $('simAir').value   = 78;
  $('simWaste').value = 87;
  $('simWater').value = 5.6;

  ['simNoise','simAir','simWaste','simWater'].forEach(id => {
    const el = $(id);
    const pct = ((el.value - el.min) / (el.max - el.min)) * 100;
    el.style.setProperty('--val', pct + '%');
  });

  $('simNoiseVal').textContent = '42 dB';
  $('simAirVal').textContent   = '78 AQI';
  $('simWasteVal').textContent = '87%';
  $('simWaterVal').textContent = '5.6 pH';

  $('resetSimBtn').textContent = '✅ Reset!';
  setTimeout(() => { $('resetSimBtn').textContent = '↩ Reset to Live'; }, 2000);
});

// ─────────────────────────────────────────────
// ALERTS TAB — CLEAR
// ─────────────────────────────────────────────
$('clearAlertsBtn').addEventListener('click', () => {
  state.alerts = [];
  alerted.clear();
  renderAlerts();
  $('alertBadge').textContent = 0;
});

// ─────────────────────────────────────────────
// CLOCK
// ─────────────────────────────────────────────
function updateClock() {
  $('clockDisplay').textContent = new Date().toLocaleTimeString();
}
setInterval(updateClock, 1000);
updateClock();

// ─────────────────────────────────────────────
// INIT
// ─────────────────────────────────────────────
function init() {
  initSliders();
  pushHistory();
  updateDashboard();

  // Live tick every 2.5 seconds
  setInterval(tickLive, 2500);
}

init();
