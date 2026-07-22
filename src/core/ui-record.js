const trend = require('trend.js');
const scales = require('scales.js');
const util = require('util.js');
const storage = require('storage.js');

const { buildTrend } = __req('trend.js');
const { dysbiosisLens, modifiableFactors } = __req('scales.js');
const { el, esc, fmtDate, toast, dialogConfirm, dialogForm, patientForm } = __req('util.js');
const Store = __req('storage.js');

let ctx;                                   // { goQuestionnaire(ref, followup) }
let view = { mode: 'list', patientId: null };
let q = '';                                // search query

function init(appCtx) { ctx = appCtx; }
function show() { render(); }              // called when the tab is opened
function patientLabel(p) { return (p.name && String(p.name).trim()) || (p.ref && String(p.ref).trim()) || p.code || 'Anonymous'; }
function patientMeta(p) {
  const bits = [];
  if (p.code) bits.push(esc(p.code));
  if (p.age) bits.push('Age ' + esc(String(p.age)));
  if (p.gender) bits.push(esc(p.gender));
  if (p.ref) bits.push('Ref: ' + esc(p.ref));
  return bits.join(' · ');
}

function render() {
  const root = document.getElementById('mode-record');
  if (!root) return;
  root.innerHTML = '';
  const db = Store.loadDB();
  if (view.mode === 'detail') return renderDetail(root, db);
  renderList(root, db);
}

function renderList(root, db) {
  const bar = el('div', { class: 'row', style: 'gap:8px;flex-wrap:wrap;margin-bottom:14px;align-items:center' });
  const search = el('input', { class: 'db-search', type: 'text', placeholder: 'Search by reference…', value: q });
  search.oninput = () => { q = search.value; paint(db); };
  bar.appendChild(search);
  bar.appendChild(el('button', { class: 'btn btn-g', type: 'button', onclick: newPatient }, '+ New patient'));
  bar.appendChild(el('button', { class: 'btn btn-gh', type: 'button', onclick: () => ctx.goQuestionnaire() }, 'Anonymous screen'));
  bar.appendChild(el('button', { class: 'btn btn-gh', type: 'button', onclick: exportBackup }, 'Export backup'));
  const imp = el('button', { class: 'btn btn-gh', type: 'button', onclick: () => fileInput.click() }, 'Import / merge');
  const fileInput = el('input', { type: 'file', accept: 'application/json,.json', style: 'display:none' });
  fileInput.onchange = () => importMerge(fileInput.files[0]);
  bar.appendChild(imp); bar.appendChild(fileInput);
  bar.appendChild(el('button', { class: 'btn btn-gh', type: 'button', title: 'Per-clinic prefix for automated patient IDs — set a unique code at each clinic to avoid ID overlap when pooling data', onclick: setSiteCode }, `Site: ${esc(Store.sitePrefix(db))}`));
  root.appendChild(bar);

  root.appendChild(el('div', { class: 'db-grid', id: 'dbGrid' }));
  paint(db);
}

// Set this clinic's site code (prefix for automated patient IDs). Set once per
// device; existing patient codes are NOT renumbered, only new ones use it.
async function setSiteCode() {
  const db = Store.loadDB();
  const cur = (db.meta && db.meta.siteCode) || '';
  const r = await dialogForm('Clinic / site code', [
    { key: 'site', label: 'Short code for THIS clinic (e.g. CLINA) — keep it unique per site', value: cur, placeholder: 'BMG' },
  ], { okLabel: 'Save' });
  if (!r) return;
  db.meta = db.meta || {};
  db.meta.siteCode = (r.site || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
  Store.saveDB(db);
  toast(`Site code set to ${Store.sitePrefix(db)} — new patient IDs will use this prefix.`);
  render();
}

// Capture a new patient's details, then start their (baseline) questionnaire.
async function newPatient() {
  const r = await patientForm({}, { title: 'New patient', okLabel: 'Start screening →' });
  if (!r) return;
  ctx.goQuestionnaire(r, false);
}

function paint(db) {
  const grid = document.getElementById('dbGrid');
  if (!grid) return;
  grid.innerHTML = '';
  const needle = q.trim().toLowerCase();
  const list = (db.patients || []).filter(p => !needle ||
    patientLabel(p).toLowerCase().includes(needle) ||
    (p.code && p.code.toLowerCase().includes(needle)) ||
    (p.ref && String(p.ref).toLowerCase().includes(needle)));
  if (!list.length) {
    grid.appendChild(el('div', { class: 'db-empty', style: 'grid-column:1/-1' },
      (db.patients || []).length ? 'No patients match that search.' : '🌱<br>No saved responses yet.<br><span class="muted">Complete a questionnaire and Save to build a record.</span>'));
    return;
  }
  list.forEach(p => {
    const t = buildTrend(p.visits || []);
    const latest = t.latest;
    const delta = latest && latest.delta;
    const deltaHtml = delta
      ? `<span class="${delta.dir === 'improved' ? 'delta-down' : delta.dir === 'worsened' ? 'delta-up' : 'delta-flat'}" style="font-weight:700;font-size:12px">${delta.dir === 'improved' ? '▼' : delta.dir === 'worsened' ? '▲' : '='} ${Math.abs(delta.delta)}</span>`
      : 'Severity';
    const card = el('div', { class: 'pt-card' });
    card.appendChild(el('button', { class: 'pt-del', type: 'button', title: 'Delete', onclick: e => { e.stopPropagation(); deletePatient(p); } }, '✕'));
    card.appendChild(el('div', { class: 'pt-top' },
      `<div class="pt-av">${esc(patientLabel(p).slice(0, 1).toUpperCase())}</div>
       <div><div class="pt-name">${esc(patientLabel(p))}</div>
       <div class="pt-meta">${patientMeta(p) || ((p.visits || []).length + ' visit' + ((p.visits || []).length === 1 ? '' : 's'))}</div></div>`));
    card.appendChild(el('div', { class: 'pt-stats' },
      `<div class="pt-stat"><div class="v">${latest && latest.index != null ? latest.index + '%' : '—'}</div><div class="l">Latest index</div></div>
       <div class="pt-stat"><div class="v" style="font-size:12px">${latest && latest.band != null ? esc(latest.band) : '—'}</div><div class="l">${deltaHtml}</div></div>`));
    card.onclick = () => { view = { mode: 'detail', patientId: p.id }; render(); };
    grid.appendChild(card);
  });
}

function renderDetail(root, db) {
  const p = (db.patients || []).find(x => x.id === view.patientId);
  if (!p) { view = { mode: 'list', patientId: null }; return render(); }

  const head = el('div', { class: 'row', style: 'align-items:center;gap:10px;flex-wrap:wrap;margin-bottom:14px' });
  head.appendChild(el('button', { class: 'back-btn', type: 'button', onclick: () => { view = { mode: 'list', patientId: null }; render(); } }, '← All records'));
  const meta = patientMeta(p);
  head.appendChild(el('div', { style: 'flex:1' },
    `<h2 style="margin:0">${esc(patientLabel(p))}</h2>${meta ? `<div class="muted" style="font-size:12px">${meta}</div>` : ''}`));
  const identity = { name: p.name, age: p.age, gender: p.gender, ref: p.ref };
  head.appendChild(el('button', { class: 'btn btn-gh', type: 'button', onclick: () => editPatient(p) }, '✎ Edit'));
  head.appendChild(el('button', { class: 'btn btn-o', type: 'button', onclick: () => ctx.goQuestionnaire(identity, true) }, '+ New follow-up'));
  root.appendChild(head);

  const visits = (p.visits || []).slice().sort((a, b) => (a.date || 0) - (b.date || 0));
  if (!visits.length) { root.appendChild(el('div', { class: 'db-empty' }, 'No visits for this record.')); return; }

  root.appendChild(progressionCard(visits));

  const t = buildTrend(visits);
  // newest first
  t.points.slice().reverse().forEach((pt, i) => {
    const realIdx = t.points.length - i;
    const sevCls = bandCls(pt.band);
    const lens = dysbiosisLens((visits.find(v => v.id === pt.id) || {}).extras || {});
    const card = el('div', { class: `visit-card${i === 0 ? ' latest' : ''}` });
    card.appendChild(el('div', { class: 'visit-num' }, String(realIdx)));
    card.appendChild(el('div', { class: 'visit-info' },
      `<div class="visit-date">${esc(fmtDate(pt.date))}${pt.followup ? ' <span class="opt-tag">follow-up</span>' : ' <span class="opt-tag">baseline</span>'}</div>
       <div class="visit-sub">${pt.completeness}% complete${lens.count ? ' · ' + lens.count + ' microbiome signal' + (lens.count === 1 ? '' : 's') : ''}</div>`));
    card.appendChild(el('div', { class: 'visit-score' }, `<div class="v">${pt.index != null ? pt.index + '%' : '—'}</div><div class="l">index</div>`));
    card.appendChild(el('span', { class: 'pill ' + sevCls }, pt.band != null ? esc(pt.band) : 'Not completed'));
    if (pt.delta) card.appendChild(el('div', { style: `font-weight:700;color:${pt.delta.color}` }, esc(pt.delta.label)));
    const vrec = visits.find(v => v.id === pt.id);
    const identity = { name: p.name, age: p.age, gender: p.gender, ref: p.ref };
    const acts = el('div', { class: 'row', style: 'gap:6px;flex-wrap:wrap' });
    acts.appendChild(el('button', { class: 'btn btn-o', type: 'button', title: 'Load answers + show results',
      onclick: () => ctx.openVisit(identity, vrec, true) }, '📊 View results'));
    acts.appendChild(el('button', { class: 'btn btn-gh', type: 'button', title: 'Load answers into the questionnaire to review or edit',
      onclick: () => ctx.openVisit(identity, vrec, false) }, '📋 Load'));
    acts.appendChild(el('button', { class: 'btn btn-gh', type: 'button', style: 'color:var(--re)', onclick: () => deleteVisit(p, vrec) }, 'Delete'));
    card.appendChild(acts);
    root.appendChild(card);
  });
}

// Index-over-visits sparkline + first→latest delta (lower index = improvement).
function progressionCard(visits) {
  const t = buildTrend(visits);
  const pts = t.points;
  const card = el('div', { class: 'card' });
  card.appendChild(el('h2', {}, 'Progression'));
  card.appendChild(el('div', { class: 'q-sub' }, 'GI Symptom Burden across visits (lower is better).'));
  if (pts.length >= 2) {
    const first = pts[0].index, last = pts[pts.length - 1].index, d = last - first;
    const dir = d < 0 ? 'improved' : d > 0 ? 'worsened' : 'stable';
    card.appendChild(el('div', { class: 'row', style: 'gap:10px;margin:6px 0' },
      `<span class="pill" style="background:${d < 0 ? '#0F6E56' : d > 0 ? '#A32D2D' : '#999'};color:#fff">${dir === 'stable' ? 'No net change' : (d < 0 ? '▼' : '▲') + ' ' + Math.abs(d) + ' pts'}</span>
       <span style="font-size:13px;color:var(--inks)">${first}% → ${last}% across ${pts.length} visits</span>`));
  }
  // SVG sparkline
  const W = 600, H = 120, pad = 24, n = pts.length;
  const x = (i) => pad + (n === 1 ? (W - 2 * pad) / 2 : i * (W - 2 * pad) / (n - 1));
  const y = (v) => H - pad - (v / 100) * (H - 2 * pad);
  const line = pts.map((p, i) => `${x(i).toFixed(1)},${y(p.index).toFixed(1)}`).join(' ');
  const dots = pts.map((p, i) => `<circle cx="${x(i).toFixed(1)}" cy="${y(p.index).toFixed(1)}" r="3.5" fill="#0F6E56"/><text x="${x(i).toFixed(1)}" y="${(y(p.index) - 8).toFixed(1)}" font-size="10" fill="#444" text-anchor="middle">${p.index}</text>`).join('');
  card.appendChild(el('div', { style: 'overflow-x:auto' },
    `<svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:320px;height:auto">
       <line x1="${pad}" y1="${H - pad}" x2="${W - pad}" y2="${H - pad}" stroke="#E1E5EB"/>
       ${n >= 2 ? `<polyline points="${line}" fill="none" stroke="#0F6E56" stroke-width="2"/>` : ''}
       ${dots}
     </svg>`));
  return card;
}

function bandCls(label) {
  if (label == null) return 'sev-unknown'; // core GI section not completed — not a Minimal band
  return label === 'Severe' ? 'sev-sev' : label === 'Significant' ? 'sev-sig' : label === 'Mild–Moderate' ? 'sev-mod' : 'sev-min';
}

async function deleteVisit(p, v) {
  if (!v) return;
  if (!(await dialogConfirm(`Delete the visit from ${fmtDate(v.date)}? This cannot be undone.`, { title: 'Delete visit', okLabel: 'Delete', danger: true }))) return;
  const db = Store.loadDB();
  const pat = db.patients.find(x => x.id === p.id);
  if (pat) pat.visits = (pat.visits || []).filter(x => x.id !== v.id);
  if (pat && !pat.visits.length) db.patients = db.patients.filter(x => x.id !== p.id), view = { mode: 'list', patientId: null };
  Store.saveDB(db); toast('Visit deleted'); render();
}

async function deletePatient(p) {
  if (!(await dialogConfirm(`Delete record "${patientLabel(p)}" and all its visits? This cannot be undone.`, { title: 'Delete record', okLabel: 'Delete', danger: true }))) return;
  const db = Store.loadDB();
  db.patients = (db.patients || []).filter(x => x.id !== p.id);
  Store.saveDB(db); toast('Record deleted'); render();
}

// Edit a stored patient's identity in place (name/age/gender/ref). Pregnancy is
// a per-visit applicability flag, not a stored patient attribute, so it's omitted.
async function editPatient(p) {
  const r = await patientForm({ name: p.name, age: p.age, gender: p.gender, ref: p.ref },
    { title: 'Edit patient details', okLabel: 'Save' });
  if (!r) return;
  const db = Store.loadDB();
  const tgt = (db.patients || []).find(x => x.id === p.id);
  if (!tgt) return;
  tgt.name = r.name; tgt.age = r.age; tgt.gender = r.gender; tgt.ref = r.ref || tgt.ref;
  Store.saveDB(db); toast('Details updated'); render();
}

function exportBackup() {
  const json = Store.exportDB(Store.loadDB(), 'gut-screen');
  const blob = new Blob([json], { type: 'application/json' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `gut-screen-backup-${new Date().toISOString().slice(0, 10)}.json`;
  document.body.appendChild(a); a.click(); a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  toast('Backup exported');
}

function importMerge(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    let res;
    try { res = Store.mergeImport(Store.loadDB(), reader.result); }
    catch (e) { toast('Import failed — not a valid backup file'); return; }
    Store.saveDB(res.db);
    toast(`Merged: +${res.added.patients} record(s), +${res.added.visits} visit(s)`);
    render();
  };
  reader.readAsText(file);
}

module.exports.init = init; module.exports.show = show;
return __e;