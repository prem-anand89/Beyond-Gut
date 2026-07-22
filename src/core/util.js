const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

function el(tag, attrs = {}, html) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') n.className = v;
    else if (k === 'dataset') Object.assign(n.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') n.addEventListener(k.slice(2), v);
    else if (v != null) n.setAttribute(k, v);
  }
  if (html != null) n.innerHTML = html;
  return n;
}
function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
function fmtDate(ts) {
  if (!ts) return '—';
  try { return new Date(ts).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return '—'; }
}
let toastTimer;
function toast(msg) {
  const t = $('#toast'); if (!t) return;
  t.textContent = msg; t.classList.add('show');
  clearTimeout(toastTimer); toastTimer = setTimeout(() => t.classList.remove('show'), 2600);
}
const overlay = () => $('#overlay');
const dlgBox = () => $('#dlg');
function openDlg(html) { dlgBox().innerHTML = html; overlay().classList.add('show'); }
function closeDlg() { overlay().classList.remove('show'); }
function dialogConfirm(message, { title = '', okLabel = 'OK', danger = false } = {}) {
  return new Promise(resolve => {
    openDlg(`
      ${title ? `<div class="dlg-h">${esc(title)}</div>` : ''}
      <div class="dlg-m">${esc(message)}</div>
      <div class="dlg-acts">
        <button class="btn btn-gh" id="dlgCancel">Cancel</button>
        <button class="btn ${danger ? 'btn-re' : 'btn-g'}" id="dlgOk">${esc(okLabel)}</button>
      </div>`);
    $('#dlgOk').onclick = () => { closeDlg(); resolve(true); };
    $('#dlgCancel').onclick = () => { closeDlg(); resolve(false); };
  });
}
function dialogForm(title, fields, { okLabel = 'Save' } = {}) {
  return new Promise(resolve => {
    openDlg(`
      <div class="dlg-h">${esc(title)}</div>
      <div class="dlg-b">${fields.map(f =>
        `<label style="font-size:11px;font-weight:600;color:var(--inkt)">${esc(f.label)}</label>
         <input data-key="${esc(f.key)}" value="${esc(f.value || '')}" placeholder="${esc(f.placeholder || '')}">`).join('')}
      </div>
      <div class="dlg-acts">
        <button class="btn btn-gh" id="dlgCancel">Cancel</button>
        <button class="btn btn-g" id="dlgOk">${esc(okLabel)}</button>
      </div>`);
    const get = () => { const o = {}; $$('#dlg input[data-key]').forEach(i => { o[i.dataset.key] = i.value.trim(); }); return o; };
    $('#dlgOk').onclick = () => { closeDlg(); resolve(get()); };
    $('#dlgCancel').onclick = () => { closeDlg(); resolve(null); };
  });
}
// Richer patient-details capture (name/age/gender/pregnant/ref). Gender and
// pregnancy are chip selects, so this can't use the text-only dialogForm.
// Resolves to { name, age, gender, pregnant, ref } or null on cancel.
function patientForm(initial = {}, { title = 'Patient details', okLabel = 'Start screening →' } = {}) {
  return new Promise(resolve => {
    const v = {
      name: initial.name || '', age: initial.age || '', gender: initial.gender || '',
      pregnant: initial.pregnant || '', ref: initial.ref || '',
    };
    const lblStyle = 'font-size:11px;font-weight:600;color:var(--inkt)';
    const genderChips = ['Female', 'Male', 'Other'].map(g =>
      `<button class="chip-opt pf-gender${v.gender === g ? ' sel' : ''}" data-g="${esc(g)}" type="button">${esc(g)}</button>`).join('');
    const pregChips = [['Pregnant', 'yes'], ['Not pregnant', 'no']].map(([l, val]) =>
      `<button class="chip-opt pf-preg${v.pregnant === val ? ' sel' : ''}" data-p="${val}" type="button">${esc(l)}</button>`).join('');
    openDlg(`
      <div class="dlg-h">${esc(title)}</div>
      <div class="dlg-b">
        <label style="${lblStyle}">Name</label>
        <input data-key="name" value="${esc(v.name)}" placeholder="Patient name">
        <label style="${lblStyle}">Age</label>
        <input data-key="age" inputmode="numeric" value="${esc(v.age)}" placeholder="Age">
        <label style="${lblStyle}">Gender</label>
        <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px">${genderChips}</div>
        <label style="${lblStyle}">Applicability notes (optional)</label>
        <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:10px">${pregChips}</div>
        <label style="${lblStyle}">Reference / ID (optional)</label>
        <input data-key="ref" value="${esc(v.ref)}" placeholder="e.g. P-1042">
      </div>
      <div class="dlg-acts">
        <button class="btn btn-gh" id="dlgCancel">Cancel</button>
        <button class="btn btn-g" id="dlgOk">${esc(okLabel)}</button>
      </div>`);
    $$('#dlg .pf-gender').forEach(b => b.onclick = () => {
      v.gender = v.gender === b.dataset.g ? '' : b.dataset.g;
      $$('#dlg .pf-gender').forEach(x => x.classList.remove('sel')); if (v.gender) b.classList.add('sel');
    });
    $$('#dlg .pf-preg').forEach(b => b.onclick = () => {
      v.pregnant = v.pregnant === b.dataset.p ? '' : b.dataset.p;
      $$('#dlg .pf-preg').forEach(x => x.classList.remove('sel')); if (v.pregnant) b.classList.add('sel');
    });
    $('#dlgOk').onclick = () => {
      $$('#dlg input[data-key]').forEach(i => { v[i.dataset.key] = i.value.trim(); });
      closeDlg(); resolve(v);
    };
    $('#dlgCancel').onclick = () => { closeDlg(); resolve(null); };
  });
}
__e.$ = $; __e.$$ = $$; module.exports.el = el; module.exports.esc = esc; module.exports.fmtDate = fmtDate; module.exports.toast = toast; module.exports.dialogConfirm = dialogConfirm; module.exports.dialogForm = dialogForm; module.exports.patientForm = patientForm;
return __e;