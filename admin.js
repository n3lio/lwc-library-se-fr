'use strict';

// Admin module — registers /admin* HTML routes + /api/admin/* JSON routes.
// V1 auth: single ADMIN_PASSWORD env var, session cookie (HMAC-signed,
// 7 days). Future Phase E will swap this for OAuth Salesforce + whitelist.

const crypto = require('node:crypto');
const path = require('node:path');
const fs = require('node:fs');
const { query, hashIp, getPool } = require('./db');

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || '';
const SESSION_SECRET = process.env.SESSION_SECRET || process.env.IP_HASH_SALT || 'sefr-admin-default';
const SESSION_COOKIE = 'sefr_admin';
const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

function signSession(payload) {
  const data = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  return data + '.' + sig;
}
function verifySession(cookieVal) {
  if (!cookieVal || typeof cookieVal !== 'string') return null;
  const i = cookieVal.indexOf('.');
  if (i < 0) return null;
  const data = cookieVal.slice(0, i);
  const sig = cookieVal.slice(i + 1);
  const expected = crypto.createHmac('sha256', SESSION_SECRET).update(data).digest('base64url');
  if (sig !== expected) return null;
  try {
    const payload = JSON.parse(Buffer.from(data, 'base64url').toString('utf-8'));
    if (!payload || !payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch { return null; }
}
function isAuthed(req) {
  const cookies = (req.headers.cookie || '').split(';').reduce((acc, c) => {
    const [k, v] = c.trim().split('=');
    if (k) acc[k] = decodeURIComponent(v || '');
    return acc;
  }, {});
  return verifySession(cookies[SESSION_COOKIE]);
}
function requireAuth(req, reply) {
  if (!isAuthed(req)) {
    reply.code(401).send({ error: 'unauthorized' });
    return false;
  }
  return true;
}

function escapeHtml(s) {
  if (s == null) return '';
  return String(s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ───────────────────────────────────────────────────────────────────────────
// HTML pages — login + dashboard
// Both shipped from this module so the admin surface lives outside _site/.

function loginPage({ error } = {}) {
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><title>Admin · SE FR Library</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap">
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Inter',sans-serif;background:linear-gradient(135deg,#0a0e2a,#1a1f4a);min-height:100vh;display:flex;align-items:center;justify-content:center;color:#e6e9ff}
.box{background:#fff;color:#0f172a;padding:32px 36px;border-radius:14px;box-shadow:0 24px 60px rgba(0,0,0,0.30);width:380px;max-width:calc(100vw - 32px)}
h1{margin:0 0 6px;font-size:22px}p.sub{margin:0 0 22px;color:#64748b;font-size:13.5px}
label{display:block;font-size:12.5px;color:#475569;margin-bottom:6px;font-weight:500}
input[type=password]{width:100%;padding:10px 12px;border:1px solid #e2e8f0;border-radius:8px;font-size:14px;font-family:inherit;outline:none;transition:border-color 0.15s}
input[type=password]:focus{border-color:#6c63ff;box-shadow:0 0 0 3px rgba(108,99,255,0.15)}
button{width:100%;margin-top:18px;padding:11px;background:linear-gradient(135deg,#6c63ff,#3b82f6);color:#fff;border:none;border-radius:8px;font-size:14px;font-weight:600;cursor:pointer;font-family:inherit}
button:hover{transform:translateY(-1px);box-shadow:0 8px 20px rgba(108,99,255,0.35)}
.err{background:#fef2f2;color:#b91c1c;padding:8px 12px;border-radius:6px;font-size:12.5px;margin-bottom:14px;border:1px solid #fecaca}
</style></head>
<body>
<form class="box" method="POST" action="/api/admin/login">
<h1>🔒 Admin</h1><p class="sub">SE FR Library — pilotage</p>
${error ? `<div class="err">${escapeHtml(error)}</div>` : ''}
<label>Password</label>
<input type="password" name="password" autofocus required>
<button type="submit">Se connecter →</button>
</form>
</body></html>`;
}

function dashboardPage() {
  return `<!doctype html>
<html lang="fr"><head>
<meta charset="utf-8"><title>Admin · SE FR Library</title>
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" type="image/png" href="/assets/favicon.png">
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&display=swap">
<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<style>
*{box-sizing:border-box}body{margin:0;font-family:'Inter',sans-serif;background:#f6f8fb;color:#0f172a}
header{background:linear-gradient(135deg,#0a0e2a,#1a1f4a);color:#e6e9ff;padding:18px 28px;display:flex;justify-content:space-between;align-items:center}
header h1{margin:0;font-size:18px;font-weight:700}
header .actions{display:flex;gap:10px;align-items:center}
header a,header button{font-family:inherit;font-size:13px;padding:7px 14px;border-radius:7px;border:1px solid rgba(255,255,255,0.20);background:rgba(255,255,255,0.05);color:#e6e9ff;text-decoration:none;cursor:pointer;transition:all 0.15s}
header a:hover,header button:hover{background:rgba(255,255,255,0.12)}
main{max-width:1280px;margin:0 auto;padding:28px}
.kpi-row{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin-bottom:24px}
@media(max-width:900px){.kpi-row{grid-template-columns:repeat(2,1fr)}}
.kpi{background:#fff;padding:18px 20px;border-radius:12px;border:1px solid #e2e8f0;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
.kpi-label{font-size:11.5px;color:#64748b;text-transform:uppercase;letter-spacing:0.05em;font-weight:600;margin-bottom:6px}
.kpi-value{font-size:32px;font-weight:800;color:#0f172a;line-height:1;font-variant-numeric:tabular-nums}
.kpi-sub{font-size:12px;color:#94a3b8;margin-top:6px}
.kpi-funnel{font-size:13px;color:#475569;margin-top:8px;display:flex;gap:6px;align-items:center}
.kpi-funnel strong{color:#6c63ff;font-variant-numeric:tabular-nums}
section{background:#fff;border:1px solid #e2e8f0;border-radius:12px;padding:22px;margin-bottom:20px;box-shadow:0 1px 3px rgba(0,0,0,0.04)}
section h2{margin:0 0 16px;font-size:16px;font-weight:700;display:flex;align-items:center;gap:10px}
.unread-badge{display:inline-flex;align-items:center;padding:2px 8px;border-radius:100px;background:#dc2626;color:#fff;font-size:11px;font-weight:700}
table{width:100%;border-collapse:collapse;font-size:13px}
th,td{text-align:left;padding:9px 12px;border-bottom:1px solid #f1f5f9;vertical-align:top}
th{font-weight:600;color:#64748b;font-size:11.5px;text-transform:uppercase;letter-spacing:0.04em;background:#f8fafc}
tbody tr:hover{background:#fafbff}
td code{background:#f1f5f9;padding:2px 6px;border-radius:4px;font-family:'SF Mono',Menlo,monospace;font-size:12px}
.tag{display:inline-block;padding:1px 8px;border-radius:100px;font-size:11px;font-weight:600;text-transform:capitalize}
.tag-success{background:#dcfce7;color:#166534}
.tag-partial{background:#fef3c7;color:#92400e}
.tag-failed{background:#fee2e2;color:#991b1b}
.tag-new{background:#dbeafe;color:#1e40af}
.tag-triaged{background:#fef3c7;color:#92400e}
.tag-resolved{background:#dcfce7;color:#166534}
.tag-pending{background:#dbeafe;color:#1e40af}
.tag-approved{background:#dcfce7;color:#166534}
.tag-rejected{background:#fee2e2;color:#991b1b}
.subtitle{color:#64748b;font-size:12px;margin:0 0 12px}
.empty{padding:30px;text-align:center;color:#94a3b8;font-size:13px}
.actions-cell{display:flex;gap:6px;flex-wrap:wrap}
.btn-mini{font:inherit;font-size:11.5px;padding:4px 10px;border:1px solid #e2e8f0;border-radius:6px;background:#fff;cursor:pointer;color:#475569;transition:all 0.15s;font-weight:500}
.btn-mini:hover{background:#f8fafc;border-color:#cbd5e1}
.btn-mini.primary{background:#6c63ff;color:#fff;border-color:#6c63ff}
.btn-mini.primary:hover{background:#5a52e0;border-color:#5a52e0}
.btn-mini.danger{color:#b91c1c;border-color:#fecaca}
.btn-mini.danger:hover{background:#fef2f2}
details summary{cursor:pointer;color:#6c63ff;font-size:12px;font-weight:500;list-style:none}
details summary::-webkit-details-marker{display:none}
details summary::before{content:'▸ ';transition:transform 0.15s;display:inline-block}
details[open] summary::before{transform:rotate(90deg)}
details pre{background:#0f172a;color:#e2e8f0;padding:12px;border-radius:6px;font-size:11.5px;overflow:auto;margin-top:8px;line-height:1.5}
.failure-list{margin:8px 0 0;padding:0;list-style:none}
.failure-list li{padding:6px 10px;border-left:3px solid #ef4444;background:#fef2f2;margin-bottom:4px;font-size:12px;border-radius:0 4px 4px 0}
.failure-list code{background:none;padding:0;font-weight:600;color:#991b1b}
.tabs{display:flex;gap:0;border-bottom:1px solid #e2e8f0;margin-bottom:14px}
.tab-btn{font:inherit;font-size:13px;padding:9px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#64748b;cursor:pointer;font-weight:500;transition:color 0.15s,border-color 0.15s}
.tab-btn:hover{color:#0f172a}
.tab-btn.active{color:#6c63ff;border-bottom-color:#6c63ff;font-weight:600}
.tab-pane{display:none}
.tab-pane.active{display:block}
.charts{display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-top:14px}
@media(max-width:900px){.charts{grid-template-columns:1fr}}
.chart-wrap{position:relative;height:240px}
.muted{color:#94a3b8}
</style></head>
<body>
<header>
  <h1>🔒 SE FR Library — Admin</h1>
  <div class="actions">
    <a href="/" target="_blank">↗ View site</a>
    <button id="logoutBtn">Logout</button>
  </div>
</header>
<main>

<section>
  <h2>📊 KPIs</h2>
  <div class="kpi-row" id="kpis">
    <div class="kpi"><div class="kpi-label">Visites 24h</div><div class="kpi-value" data-k="v24">—</div><div class="kpi-sub"><span data-k="v7">—</span> sur 7j · <span data-k="v30">—</span> sur 30j</div></div>
    <div class="kpi"><div class="kpi-label">Downloads total</div><div class="kpi-value" data-k="dlT">—</div><div class="kpi-sub"><span data-k="dl7">—</span> sur 7j</div></div>
    <div class="kpi"><div class="kpi-label">Deploys total</div><div class="kpi-value" data-k="dpT">—</div><div class="kpi-sub"><span data-k="dp7">—</span> sur 7j · <span data-k="dpFail">—</span> échecs</div></div>
    <div class="kpi"><div class="kpi-label">Funnel (7j)</div><div class="kpi-funnel"><strong data-k="fnVD">—</strong> Visit→DL · <strong data-k="fnDD">—</strong> DL→Deploy</div><div class="kpi-sub muted">Taux de conversion</div></div>
  </div>
  <div class="charts">
    <div><div class="subtitle">Visites — 30 derniers jours</div><div class="chart-wrap"><canvas id="chartVisits"></canvas></div></div>
    <div><div class="subtitle">Deploys — 30 derniers jours</div><div class="chart-wrap"><canvas id="chartDeploys"></canvas></div></div>
  </div>
</section>

<section>
  <h2>🏆 Top components</h2>
  <table id="topComponents"><thead><tr><th>#</th><th>API name</th><th>Downloads</th><th>Likes</th><th>Deploys</th></tr></thead><tbody><tr><td colspan="5" class="empty">Loading…</td></tr></tbody></table>
</section>

<section>
  <h2>📚 Top recipes</h2>
  <table id="topRecipes"><thead><tr><th>#</th><th>Recipe</th><th>Downloads</th></tr></thead><tbody><tr><td colspan="3" class="empty">Loading…</td></tr></tbody></table>
</section>

<section>
  <h2>👥 Deploys par SE</h2>
  <table id="deploysBySE"><thead><tr><th>SE</th><th>Org host</th><th>Total</th><th>Success</th><th>Partial</th><th>Failed</th><th>Last</th></tr></thead><tbody><tr><td colspan="7" class="empty">Loading…</td></tr></tbody></table>
</section>

<section>
  <h2>🔍 Deploys (détail + erreurs)</h2>
  <div class="tabs">
    <button class="tab-btn active" data-tab="dpAll">All</button>
    <button class="tab-btn" data-tab="dpFailed">Failed only</button>
    <button class="tab-btn" data-tab="dpPartial">Partial only</button>
  </div>
  <div class="tab-pane active" data-tab="dpAll"><table id="deploysAll"><thead><tr><th>When</th><th>SE</th><th>Org</th><th>Status</th><th>Components</th><th>Result</th></tr></thead><tbody><tr><td colspan="6" class="empty">Loading…</td></tr></tbody></table></div>
  <div class="tab-pane" data-tab="dpFailed"><table id="deploysFailed"><thead><tr><th>When</th><th>SE</th><th>Org</th><th>Components</th><th>Failures</th></tr></thead><tbody><tr><td colspan="5" class="empty">Loading…</td></tr></tbody></table></div>
  <div class="tab-pane" data-tab="dpPartial"><table id="deploysPartial"><thead><tr><th>When</th><th>SE</th><th>Org</th><th>Result</th><th>Failures</th></tr></thead><tbody><tr><td colspan="5" class="empty">Loading…</td></tr></tbody></table></div>
</section>

<section>
  <h2>📨 Inbox <span id="inboxBadge"></span></h2>
  <div class="tabs">
    <button class="tab-btn active" data-tab="ibFb">Feedbacks</button>
    <button class="tab-btn" data-tab="ibSb">Submissions</button>
  </div>
  <div class="tab-pane active" data-tab="ibFb"><table id="feedbacks"><thead><tr><th>When</th><th>Kind</th><th>Email</th><th>Message</th><th>Status</th><th></th></tr></thead><tbody><tr><td colspan="6" class="empty">Loading…</td></tr></tbody></table></div>
  <div class="tab-pane" data-tab="ibSb"><table id="submissions"><thead><tr><th>When</th><th>Author</th><th>Component</th><th>File</th><th>Status</th><th></th></tr></thead><tbody><tr><td colspan="6" class="empty">Loading…</td></tr></tbody></table></div>
</section>

</main>
<script>
async function fetchJson(url, opts) {
  const r = await fetch(url, opts);
  if (r.status === 401) { window.location = '/admin/login'; throw new Error('unauth'); }
  if (!r.ok) throw new Error('http ' + r.status);
  return r.json();
}
function fmt(n) { return new Intl.NumberFormat().format(n || 0); }
function pct(a, b) { if (!b) return '—'; return Math.round((a/b)*100) + '%'; }
function dt(s) { return new Date(s).toLocaleString('fr-FR', {dateStyle:'short',timeStyle:'short'}); }
function setText(sel, val) { document.querySelectorAll(sel).forEach(e => e.textContent = val); }

// Tabs
document.addEventListener('click', e => {
  const t = e.target.closest('.tab-btn'); if (!t) return;
  const target = t.dataset.tab;
  const group = t.parentElement;
  group.querySelectorAll('.tab-btn').forEach(b => b.classList.toggle('active', b === t));
  const sec = group.parentElement;
  sec.querySelectorAll('.tab-pane').forEach(p => p.classList.toggle('active', p.dataset.tab === target));
});

document.getElementById('logoutBtn').addEventListener('click', async () => {
  await fetch('/api/admin/logout', { method: 'POST' });
  window.location = '/admin/login';
});

async function loadKpis() {
  const k = await fetchJson('/api/admin/kpis');
  const setKey = (key, v) => document.querySelectorAll('[data-k="' + key + '"]').forEach(e => e.textContent = v);
  setKey('v24', fmt(k.visits24h));
  setKey('v7',  fmt(k.visits7d));
  setKey('v30', fmt(k.visits30d));
  setKey('dlT', fmt(k.downloadsTotal));
  setKey('dl7', fmt(k.downloads7d));
  setKey('dpT', fmt(k.deploysTotal));
  setKey('dp7', fmt(k.deploys7d));
  setKey('dpFail', fmt(k.deployFailures));
  setKey('fnVD', pct(k.downloads7d, k.visits7d));
  setKey('fnDD', pct(k.deploys7d, k.downloads7d));
  // Charts
  const mk = (canvasId, series, color) => {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;
    new Chart(ctx, {
      type:'line',
      data:{ labels: series.map(s => s.day), datasets:[{ data: series.map(s => s.n), borderColor: color, backgroundColor: color + '20', tension: 0.35, fill: true, pointRadius: 2, pointHoverRadius: 4 }] },
      options:{ responsive:true, maintainAspectRatio:false, plugins:{ legend:{display:false} }, scales:{ x:{ ticks:{ font:{size:10}, autoSkip:true, maxTicksLimit: 8 } }, y:{ beginAtZero:true, ticks:{ font:{size:10} } } } }
    });
  };
  mk('chartVisits', k.visitsSeries || [], '#6c63ff');
  mk('chartDeploys', k.deploysSeries || [], '#3b82f6');
}

async function loadTop() {
  const t = await fetchJson('/api/admin/top-components');
  const tbody = document.querySelector('#topComponents tbody');
  if (!t.length) { tbody.innerHTML = '<tr><td colspan="5" class="empty">Pas encore de données.</td></tr>'; return; }
  tbody.innerHTML = t.map((row, i) => '<tr><td>' + (i+1) + '</td><td><code>' + row.apiName + '</code></td><td>' + fmt(row.downloads) + '</td><td>' + fmt(row.likes) + '</td><td>' + fmt(row.deploys) + '</td></tr>').join('');
  const r = await fetchJson('/api/admin/top-recipes');
  const rbody = document.querySelector('#topRecipes tbody');
  if (!r.length) { rbody.innerHTML = '<tr><td colspan="3" class="empty">Pas encore de données.</td></tr>'; return; }
  rbody.innerHTML = r.map((row, i) => '<tr><td>' + (i+1) + '</td><td><code>' + row.recipeId + '</code></td><td>' + fmt(row.downloads) + '</td></tr>').join('');
}

async function loadDeploysBySE() {
  const d = await fetchJson('/api/admin/deploys-by-se');
  const tbody = document.querySelector('#deploysBySE tbody');
  if (!d.length) { tbody.innerHTML = '<tr><td colspan="7" class="empty">Pas encore de déploiements.</td></tr>'; return; }
  tbody.innerHTML = d.map(row => '<tr><td>' + (row.username || '<span class="muted">—</span>') + '</td><td><code>' + (row.host || '—') + '</code></td><td>' + fmt(row.total) + '</td><td>' + fmt(row.success) + '</td><td>' + fmt(row.partial) + '</td><td>' + fmt(row.failed) + '</td><td>' + dt(row.last) + '</td></tr>').join('');
}

function renderFailures(failures) {
  if (!failures || !failures.length) return '<span class="muted">—</span>';
  return '<ul class="failure-list">' + failures.map(f =>
    '<li><code>' + (f.componentName || '?') + '</code> — ' + (f.problem || '?') + '</li>'
  ).join('') + '</ul>';
}

async function loadDeploys() {
  const d = await fetchJson('/api/admin/deploys');
  const renderRow = (r) => '<tr><td>' + dt(r.ts) + '</td><td>' + (r.username || '—') + '</td><td><code>' + (r.host || '—') + '</code></td><td><span class="tag tag-' + r.status + '">' + r.status + '</span></td><td>' + r.components + '</td><td>' + r.numSuccess + '/' + r.numTotal + (r.failures && r.failures.length ? '<details style="margin-top:6px"><summary>' + r.failures.length + ' erreur(s)</summary>' + renderFailures(r.failures) + '</details>' : '') + '</td></tr>';
  const renderRowFailed = (r) => '<tr><td>' + dt(r.ts) + '</td><td>' + (r.username || '—') + '</td><td><code>' + (r.host || '—') + '</code></td><td>' + r.components + '</td><td>' + renderFailures(r.failures) + '</td></tr>';
  document.querySelector('#deploysAll tbody').innerHTML = d.length ? d.map(renderRow).join('') : '<tr><td colspan="6" class="empty">Pas encore de déploiements.</td></tr>';
  const failed = d.filter(r => r.status === 'failed');
  document.querySelector('#deploysFailed tbody').innerHTML = failed.length ? failed.map(renderRowFailed).join('') : '<tr><td colspan="5" class="empty">Aucun échec total. 🎉</td></tr>';
  const partial = d.filter(r => r.status === 'partial');
  document.querySelector('#deploysPartial tbody').innerHTML = partial.length ? partial.map(r => '<tr><td>' + dt(r.ts) + '</td><td>' + (r.username || '—') + '</td><td><code>' + (r.host || '—') + '</code></td><td>' + r.numSuccess + '/' + r.numTotal + '</td><td>' + renderFailures(r.failures) + '</td></tr>').join('') : '<tr><td colspan="5" class="empty">Aucun déploiement partiel.</td></tr>';
}

async function loadInbox() {
  const fb = await fetchJson('/api/admin/feedbacks');
  const sb = await fetchJson('/api/admin/submissions');
  const unread = fb.filter(x => !x.viewedAt && x.status === 'new').length + sb.filter(x => !x.viewedAt && x.status === 'pending').length;
  const badge = document.getElementById('inboxBadge');
  if (unread > 0) { badge.innerHTML = '<span class="unread-badge">' + unread + ' new</span>'; }
  document.querySelector('#feedbacks tbody').innerHTML = fb.length ? fb.map(f =>
    '<tr><td>' + dt(f.ts) + '</td><td><code>' + f.kind + (f.subkind ? ':' + f.subkind : '') + '</code></td><td>' + (f.email || '—') + '</td><td style="max-width:340px"><div style="white-space:pre-wrap;font-size:12.5px">' + (f.message || '').slice(0, 200) + ((f.message || '').length > 200 ? '…' : '') + '</div>' + (f.page ? '<div class="muted" style="font-size:11px;margin-top:3px">on ' + f.page + '</div>' : '') + '</td><td><span class="tag tag-' + f.status + '">' + f.status + '</span></td><td><div class="actions-cell">' + (f.status !== 'resolved' ? '<button class="btn-mini primary" onclick="setFbStatus(' + f.id + ', \\'resolved\\')">Resolved</button>' : '') + (f.status === 'new' ? '<button class="btn-mini" onclick="setFbStatus(' + f.id + ', \\'triaged\\')">Triage</button>' : '') + '</div></td></tr>').join('') : '<tr><td colspan="6" class="empty">No feedbacks yet.</td></tr>';
  document.querySelector('#submissions tbody').innerHTML = sb.length ? sb.map(s =>
    '<tr><td>' + dt(s.ts) + '</td><td>' + (s.authorName || '—') + '<div class="muted" style="font-size:11px">' + (s.authorEmail || '') + '</div></td><td><code>' + (s.componentName || '—') + '</code><div class="muted" style="font-size:11.5px;margin-top:3px">' + (s.description || '').slice(0, 120) + '</div></td><td>' + (s.attachmentFilename ? '<a href="/api/submissions/' + s.id + '/file?token=' + s.fileToken + '" class="btn-mini">' + s.attachmentFilename + '</a>' : '<span class="muted">—</span>') + '</td><td><span class="tag tag-' + s.status + '">' + s.status + '</span></td><td><div class="actions-cell">' + (s.status === 'pending' ? '<button class="btn-mini primary" onclick="setSbStatus(' + s.id + ', \\'approved\\')">Approve</button><button class="btn-mini danger" onclick="setSbStatus(' + s.id + ', \\'rejected\\')">Reject</button>' : '') + '</div></td></tr>').join('') : '<tr><td colspan="6" class="empty">No submissions yet.</td></tr>';
}
async function setFbStatus(id, status) {
  await fetch('/api/admin/feedbacks/' + id + '/status', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status}) });
  loadInbox();
}
async function setSbStatus(id, status) {
  await fetch('/api/admin/submissions/' + id + '/status', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({status}) });
  loadInbox();
}
window.setFbStatus = setFbStatus;
window.setSbStatus = setSbStatus;

(async () => {
  try {
    await Promise.all([loadKpis(), loadTop(), loadDeploysBySE(), loadDeploys(), loadInbox()]);
  } catch (e) { console.error(e); }
})();
</script>
</body></html>`;
}

// ───────────────────────────────────────────────────────────────────────────
// HMAC helper for submission file token (mirrors server.js)

function submissionFileToken(id) {
  return crypto.createHmac('sha256', process.env.SF_CLIENT_SECRET || 'sefr-default')
    .update(`submission:${id}`)
    .digest('hex').slice(0, 32);
}

// ───────────────────────────────────────────────────────────────────────────
// Wire up routes (call this from server.js)

function register(app) {
  // Login page (HTML, public)
  app.get('/admin/login', async (req, reply) => {
    if (isAuthed(req)) return reply.redirect('/admin');
    reply.type('text/html').send(loginPage());
  });

  // Login submit (form-encoded)
  app.post('/api/admin/login', async (req, reply) => {
    if (!ADMIN_PASSWORD) return reply.code(503).type('text/html').send(loginPage({ error: 'ADMIN_PASSWORD not configured on the server' }));
    let pwd;
    if (req.headers['content-type'] && req.headers['content-type'].includes('application/json')) {
      pwd = (req.body && req.body.password) || '';
    } else {
      // form-urlencoded
      pwd = '';
      const raw = typeof req.body === 'string' ? req.body : '';
      if (raw) {
        const m = raw.match(/(?:^|&)password=([^&]*)/);
        if (m) pwd = decodeURIComponent(m[1].replace(/\+/g, ' '));
      } else if (req.body && typeof req.body === 'object') {
        pwd = req.body.password || '';
      }
    }
    if (!pwd || pwd !== ADMIN_PASSWORD) {
      // Slight delay to slow down brute force
      await new Promise(r => setTimeout(r, 600));
      return reply.code(401).type('text/html').send(loginPage({ error: 'Mot de passe invalide' }));
    }
    const cookie = signSession({ exp: Date.now() + SESSION_TTL_MS, ip: hashIp(req.ip) });
    const secure = req.protocol === 'https' ? '; Secure' : '';
    reply
      .header('Set-Cookie', `${SESSION_COOKIE}=${encodeURIComponent(cookie)}; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=${SESSION_TTL_MS / 1000}`)
      .redirect('/admin');
  });

  app.post('/api/admin/logout', async (req, reply) => {
    const secure = req.protocol === 'https' ? '; Secure' : '';
    reply
      .header('Set-Cookie', `${SESSION_COOKIE}=; Path=/; HttpOnly${secure}; SameSite=Lax; Max-Age=0`)
      .send({ ok: true });
  });

  // Dashboard (HTML, gated)
  app.get('/admin', async (req, reply) => {
    if (!isAuthed(req)) return reply.redirect('/admin/login');
    reply.type('text/html').send(dashboardPage());
  });

  // ─── /api/admin/* (all gated) ──────────────────────────────────────────────

  app.get('/api/admin/kpis', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    if (!getPool()) return reply.send({});
    const [v24, v7, v30, dlT, dl7, dpT, dp7, dpFail, vSeries, dSeries] = await Promise.all([
      query(`SELECT COUNT(*)::int AS n FROM visits WHERE ts > NOW() - INTERVAL '24 hours'`),
      query(`SELECT COUNT(*)::int AS n FROM visits WHERE ts > NOW() - INTERVAL '7 days'`),
      query(`SELECT COUNT(*)::int AS n FROM visits WHERE ts > NOW() - INTERVAL '30 days'`),
      query(`SELECT COUNT(*)::int AS n FROM downloads`),
      query(`SELECT COUNT(*)::int AS n FROM downloads WHERE ts > NOW() - INTERVAL '7 days'`),
      query(`SELECT COUNT(*)::int AS n FROM deploys`),
      query(`SELECT COUNT(*)::int AS n FROM deploys WHERE ts > NOW() - INTERVAL '7 days'`),
      query(`SELECT COUNT(*)::int AS n FROM deploys WHERE status IN ('failed','partial')`),
      query(`SELECT TO_CHAR(date_trunc('day', ts), 'MM-DD') AS day, COUNT(*)::int AS n FROM visits WHERE ts > NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 1`),
      query(`SELECT TO_CHAR(date_trunc('day', ts), 'MM-DD') AS day, COUNT(*)::int AS n FROM deploys WHERE ts > NOW() - INTERVAL '30 days' GROUP BY 1 ORDER BY 1`),
    ]);
    reply.send({
      visits24h: v24.rows[0].n,
      visits7d: v7.rows[0].n,
      visits30d: v30.rows[0].n,
      downloadsTotal: dlT.rows[0].n,
      downloads7d: dl7.rows[0].n,
      deploysTotal: dpT.rows[0].n,
      deploys7d: dp7.rows[0].n,
      deployFailures: dpFail.rows[0].n,
      visitsSeries: vSeries.rows,
      deploysSeries: dSeries.rows,
    });
  });

  app.get('/api/admin/top-components', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    if (!getPool()) return reply.send([]);
    const r = await query(`
      WITH dl AS (SELECT component_api_name AS api, COUNT(*)::int AS downloads FROM downloads GROUP BY 1),
           lk AS (SELECT component_api_name AS api, COUNT(*)::int AS likes FROM likes GROUP BY 1),
           dp AS (
             SELECT unnest(string_to_array(components_csv, ',')) AS api, COUNT(*)::int AS deploys
             FROM deploys WHERE status IN ('success','partial') GROUP BY 1
           )
      SELECT COALESCE(dl.api, lk.api, dp.api) AS api,
             COALESCE(dl.downloads, 0) AS downloads,
             COALESCE(lk.likes, 0) AS likes,
             COALESCE(dp.deploys, 0) AS deploys
      FROM dl FULL OUTER JOIN lk USING(api) FULL OUTER JOIN dp USING(api)
      WHERE COALESCE(dl.api, lk.api, dp.api) IS NOT NULL
      ORDER BY downloads DESC, likes DESC LIMIT 15
    `);
    reply.send(r.rows.map(row => ({ apiName: row.api, downloads: row.downloads, likes: row.likes, deploys: row.deploys })));
  });

  app.get('/api/admin/top-recipes', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    if (!getPool()) return reply.send([]);
    const r = await query(`
      SELECT recipe_id, COUNT(*)::int AS n FROM downloads
      WHERE recipe_id IS NOT NULL GROUP BY recipe_id ORDER BY n DESC LIMIT 10
    `);
    reply.send(r.rows.map(row => ({ recipeId: row.recipe_id, downloads: row.n })));
  });

  app.get('/api/admin/deploys-by-se', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    if (!getPool()) return reply.send([]);
    const r = await query(`
      SELECT
        sf_username AS username,
        target_host AS host,
        COUNT(*)::int AS total,
        SUM(CASE WHEN status='success' THEN 1 ELSE 0 END)::int AS success,
        SUM(CASE WHEN status='partial' THEN 1 ELSE 0 END)::int AS partial,
        SUM(CASE WHEN status='failed' THEN 1 ELSE 0 END)::int AS failed,
        MAX(ts) AS last
      FROM deploys
      GROUP BY sf_username, target_host
      ORDER BY MAX(ts) DESC LIMIT 50
    `);
    reply.send(r.rows.map(row => ({
      username: row.username, host: row.host, total: row.total,
      success: row.success, partial: row.partial, failed: row.failed, last: row.last,
    })));
  });

  app.get('/api/admin/deploys', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    if (!getPool()) return reply.send([]);
    const r = await query(`
      SELECT id, ts, components_csv, target_host, sf_username, status, num_total, num_success, failures
      FROM deploys ORDER BY ts DESC LIMIT 100
    `);
    reply.send(r.rows.map(row => ({
      id: row.id, ts: row.ts,
      components: row.components_csv,
      host: row.target_host,
      username: row.sf_username,
      status: row.status,
      numTotal: row.num_total, numSuccess: row.num_success,
      failures: row.failures || [],
    })));
  });

  app.get('/api/admin/feedbacks', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    if (!getPool()) return reply.send([]);
    const r = await query(`
      SELECT id, ts, kind, subkind, status, email, message, page, viewed_at
      FROM feedbacks ORDER BY ts DESC LIMIT 200
    `);
    reply.send(r.rows.map(row => ({
      id: row.id, ts: row.ts, kind: row.kind, subkind: row.subkind,
      status: row.status, email: row.email, message: row.message,
      page: row.page, viewedAt: row.viewed_at,
    })));
  });

  app.post('/api/admin/feedbacks/:id/status', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    const id = parseInt(req.params.id, 10);
    const status = req.body && req.body.status;
    if (!Number.isFinite(id) || !['new', 'triaged', 'resolved'].includes(status)) {
      return reply.code(400).send({ error: 'invalid' });
    }
    await query(
      `UPDATE feedbacks SET status = $1, viewed_at = COALESCE(viewed_at, NOW()), resolved_at = CASE WHEN $1 = 'resolved' THEN NOW() ELSE resolved_at END WHERE id = $2`,
      [status, id]
    );
    reply.send({ ok: true });
  });

  app.get('/api/admin/submissions', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    if (!getPool()) return reply.send([]);
    const r = await query(`
      SELECT id, ts, status, source, author_name, author_email, component_name,
             description, use_case, attachment_filename, attachment_mime,
             validation_status, viewed_at
      FROM submissions ORDER BY ts DESC LIMIT 200
    `);
    reply.send(r.rows.map(row => ({
      id: row.id, ts: row.ts, status: row.status, source: row.source,
      authorName: row.author_name, authorEmail: row.author_email,
      componentName: row.component_name,
      description: row.description, useCase: row.use_case,
      attachmentFilename: row.attachment_filename, attachmentMime: row.attachment_mime,
      validationStatus: row.validation_status,
      viewedAt: row.viewed_at,
      fileToken: row.attachment_filename ? submissionFileToken(row.id) : null,
    })));
  });

  app.post('/api/admin/submissions/:id/status', async (req, reply) => {
    if (!requireAuth(req, reply)) return;
    const id = parseInt(req.params.id, 10);
    const status = req.body && req.body.status;
    if (!Number.isFinite(id) || !['pending', 'under_review', 'approved', 'rejected', 'published'].includes(status)) {
      return reply.code(400).send({ error: 'invalid' });
    }
    await query(
      `UPDATE submissions SET status = $1, viewed_at = COALESCE(viewed_at, NOW()), approved_at = CASE WHEN $1 = 'approved' THEN NOW() ELSE approved_at END WHERE id = $2`,
      [status, id]
    );
    reply.send({ ok: true });
  });
}

module.exports = { register };
