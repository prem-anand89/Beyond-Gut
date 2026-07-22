const schema = require('schema.js');
const scoring = require('scoring.js');
const scales = require('scales.js');
const patterns = require('patterns.js');
const romeiv = require('romeiv.js');

const { SCHEMA_VERSION } = __req('schema.js');
const KEY = 'bmgutscreen_v2';

function blankDB() { return { patients: [], meta: { schemaVersion: SCHEMA_VERSION, remindEvery: 5, visitsSinceExport: 0, patientSeq: 0, siteCode: '', lastExportedAt: null } }; }
// Human-facing patient code. Prefixed with a per-clinic SITE CODE so several
// clinics minting automated IDs into one central dataset never collide
// (CLINA-0001 vs CLINB-0001). The internal uid() remains the true merge key.
function sitePrefix(db) {
  const s = ((db && db.meta && db.meta.siteCode) || '').trim().toUpperCase();
  return s || 'BMG';
}
function nextPatientCode(db) {
  db.meta = db.meta || {};
  db.meta.patientSeq = (db.meta.patientSeq || 0) + 1;
  return sitePrefix(db) + '-' + String(db.meta.patientSeq).padStart(4, '0');
}
function loadDB() {
  let raw; try { raw = localStorage.getItem(KEY); } catch { raw = null; }
  if (!raw) return blankDB();
  try { return normalise(JSON.parse(raw)); } catch { return blankDB(); }
}
function saveDB(db) {
  db.meta = db.meta || {}; db.meta.schemaVersion = SCHEMA_VERSION;
  try {
    localStorage.setItem(KEY, JSON.stringify(db));
    return db;
  } catch (e) {
    console.warn('[gutscreen] save failed', e);
    return null; // signal failure to the caller instead of pretending success
  }
}
function uid() { return Date.now().toString(36) + Math.random().toString(36).slice(2, 7); }
// Check browser storage quota and warn if nearly full (>80% used).
// Returns {percentUsed, isWarning, message} or null if API unavailable.
async function checkStorageQuota() {
  if (!navigator.storage?.estimate) return null;
  try {
    const {usage, quota} = await navigator.storage.estimate();
    const pct = quota > 0 ? Math.round((usage / quota) * 100) : 0;
    return {
      percentUsed: pct,
      isWarning: pct > 80,
      usage, quota,
      message: pct > 80 ? `Storage nearly full (${pct}%). Clear browser data or export visits to free space.` : null
    };
  } catch (e) {
    console.warn('[gutscreen] storage quota check failed', e);
    return null;
  }
}
// Find a patient by clinician-assigned reference code (case-insensitive, trimmed).
function patientByRef(db, ref) {
  if (!ref) return null;
  const key = String(ref).trim().toLowerCase();
  return (db.patients || []).find(p => p.ref && String(p.ref).trim().toLowerCase() === key) || null;
}
function normalise(db) {
  if (!db || !Array.isArray(db.patients)) return blankDB();
  const meta = { ...blankDB().meta, ...(db.meta || {}), schemaVersion: SCHEMA_VERSION };
  // Backfill any patients missing a code (legacy records), using the site prefix.
  const prefix = ((meta.siteCode || '').trim().toUpperCase()) || 'BMG';
  let seq = meta.patientSeq || 0;
  for (const p of db.patients) {
    if (!p.code) { seq++; p.code = prefix + '-' + String(seq).padStart(4, '0'); }
  }
  meta.patientSeq = seq;
  return { patients: db.patients, meta };
}
function exportDB(db, deviceLabel) {
  return JSON.stringify({ ...db, meta: { ...(db.meta || {}), schemaVersion: SCHEMA_VERSION, exportedFrom: deviceLabel || 'device', date: Date.now() } }, null, 2);
}
function mergeImport(currentDb, importedRaw) {
  const imported = typeof importedRaw === 'string' ? JSON.parse(importedRaw) : importedRaw;
  const cur = normalise(currentDb), imp = normalise(imported);
  const byId = new Map(cur.patients.map(p => [p.id, p]));
  let addedPatients = 0, addedVisits = 0;
  for (const ip of imp.patients) {
    let t = byId.get(ip.id);
    if (!t) { t = { ...ip, visits: [] }; cur.patients.push(t); byId.set(ip.id, t); addedPatients++; }
    const have = new Set((t.visits || []).map(v => v.id));
    for (const iv of (ip.visits || [])) {
      const vid = iv.id || uid();
      if (have.has(vid)) continue;
      t.visits = t.visits || []; t.visits.push({ ...iv, id: vid }); have.add(vid); addedVisits++;
    }
    (t.visits || []).sort((a, b) => (a.date || 0) - (b.date || 0));
  }
  return { db: cur, added: { patients: addedPatients, visits: addedVisits } };
}
module.exports.blankDB = blankDB; module.exports.loadDB = loadDB; module.exports.saveDB = saveDB; module.exports.uid = uid; module.exports.nextPatientCode = nextPatientCode; module.exports.sitePrefix = sitePrefix; module.exports.patientByRef = patientByRef; module.exports.exportDB = exportDB; module.exports.mergeImport = mergeImport; module.exports.checkStorageQuota = checkStorageQuota;

// ── PILOT / RESEARCH EXPORT ──────────────────────────────────────────────────
// De-identified, schema-driven CSV: one row per visit, one column per item +
// every driver + the derived scores. This is the artifact the TRIM_PLAN method
// runs on (corrected item-total correlations, inter-item redundancy, weight
// tuning). Scores are RECOMPUTED from raw answers/extras here so the export
// always reflects the CURRENT scoring model, never a stale stored value.
//   - No patient name/id is emitted; patients are anonymised to P1, P2, … with a
//     stable per-export index so repeated visits stay linkable for the analysis.
//   - Raw item value per cell: number (0–N), 'na' (not applicable), or '' (blank).
function pilotExportCSV(db) {
  const { SECTIONS, QUESTIONS } = __req('schema.js');
  const { computeScores } = __req('scoring.js');
  const { pss4Score, psychLoadScore, dietBurden, sleepBurden, dysbiosisLens, surgicalFlags, anthropometrics, KNOWN_LABS } = __req('scales.js');
  const { PATTERNS, detectPatterns } = __req('patterns.js');
  const { classifyRomeIV } = __req('romeiv.js');
  const d = normalise(db);

  const cell = (v) => (v == null ? '' : String(v));            // number | 'na' | ''
  const num  = (n) => (n == null ? '' : (Math.round(n * 1000) / 1000)); // normalised 0–1
  const bool = (b, present) => (present ? (b ? 1 : 0) : '');
  const csv  = (s) => {
    let str = String(s);
    // Neutralise spreadsheet formula injection: a leading =, +, -, or @ in a
    // free-text cell (e.g. surgeryOther, medsOther) can execute as a formula
    // when the CSV is opened in Excel/Sheets. Prefix with a literal quote —
    // standard CSV-injection mitigation, does not change the visible value.
    if (/^[=+\-@]/.test(str)) str = "'" + str;
    return /[",\n]/.test(str) ? `"${str.replace(/"/g, '""')}"` : str;
  };

  const CLUSTERS = ['Reflux', 'Pain', 'Indigestion', 'Diarrhoea', 'Constipation'];
  const header = [
    'patient', 'visit', 'date_iso', 'completeness', 'index', 'band',
    ...SECTIONS.map(s => 'norm_' + s.id),
    ...CLUSTERS.map(c => 'cluster_' + c.toLowerCase()),
    ...QUESTIONS.map(q => 'q_' + q.id),
    'ex_pss4_1', 'ex_pss4_2', 'ex_pss4_3', 'ex_pss4_4', 'ex_pss4Score', 'ex_psychLoad',
    'ex_bristol', 'ex_bristolSignal', 'ex_nrsPain', 'ex_painRegion',
    'ex_med_abx', 'ex_med_ppi', 'ex_med_nsaid', 'ex_medsOther',
    'ex_dietFibre', 'ex_dietProcessed', 'ex_dietBurden', 'ex_alcohol', 'ex_activity',
    'ex_sleep_1', 'ex_sleep_2', 'ex_sleep_3', 'ex_sleep_4', 'ex_sleepBurden',
    'ex_abxCourses', 'ex_dys_stoolVar', 'ex_dys_postInfectious', 'ex_dys_gasFoul', 'ex_dys_fibreParadox', 'ex_dys_foodTriggers', 'ex_dysLensCount',
    'ex_surgeryCount', 'ex_surgeryOther',
    'ex_rome_painFreq', 'ex_rome_onset', 'ex_rome_assoc_defecation', 'ex_rome_assoc_freqchange', 'ex_rome_assoc_formchange',
    'ex_romeCriteriaMet', 'ex_romeSubtype',
    ...CLUSTERS.map(c => 'ex_clusterFreq_' + c.toLowerCase()),
    'ex_bowelFreq', 'ex_smoking', 'ex_caffeine', 'ex_hydration', 'ex_treatmentsTried', 'ex_treatmentsTriedOther',
    'ex_heightCm', 'ex_weightKg', 'ex_waistCm',
    // M2 — patient-reported abnormal labs as de-identified yes/no flags (the
    // free-text values in knownLabsDetail are deliberately NOT exported).
    ...KNOWN_LABS.map(L => 'ex_lab_' + L.id),
    ...PATTERNS.map(p => 'pat_' + p.id),
  ];
  const rows = [header];

  d.patients.forEach((p, pi) => {
    (p.visits || []).forEach(v => {
      const a = v.answers || {}, ex = v.extras || {}, meds = ex.meds || null, pss = ex.pss4 || [];
      const live = computeScores(a, { bristol: ex.bristol, clusterFreq: ex.clusterFreq, romePainFreq: ex.rome && ex.rome.painFreq });
      // P2 — export the frozen snapshot's index/severity/norms when the visit has
      // one (so the pilot CSV reflects what the patient saw, not a recomputed
      // value); everything else (bristolSignal, patterns) comes from the live
      // recompute. Pre-snapshot visits fall back entirely to the recompute.
      const snap = v.scoreSnapshot || null;
      const score = snap
        ? Object.assign({}, live, { index: snap.index, severity: snap.severity, secNorm: snap.secNorm, clusterNorm: snap.clusterNorm, completeness: snap.completeness })
        : live;
      const ps = pss4Score(pss);
      const drv = { pss4Score: ps, bgAnxiety: a.bg_anxiety, bgMood: a.bg_mood, dietFibre: ex.dietFibre, dietProcessed: ex.dietProcessed,
                    bristol: ex.bristol, meds, alcohol: ex.alcohol, activity: ex.activity, abxCourses: ex.abxCourses, dys: ex.dys, rome: ex.rome,
                    conditions: ex.conditions, surgeries: ex.surgeries, anthro: anthropometrics(ex, {}) };
      const fired = new Set(detectPatterns(score, drv, a).map(p => p.id));
      const rm = ex.rome || {};
      const romeResult = classifyRomeIV(rm, score.clusterNorm, a.sx_duration, ex.bristol);
      const cf = ex.clusterFreq || {};
      const tried = (ex.treatmentsTried || []);
      rows.push([
        'P' + (pi + 1), cell(v.id), v.date ? new Date(v.date).toISOString().slice(0, 10) : '',
        score.completeness, cell(score.index), cell(score.severity.label),
        ...SECTIONS.map(s => num(score.secNorm[s.id])),
        ...CLUSTERS.map(c => num(score.clusterNorm && score.clusterNorm[c])),
        ...QUESTIONS.map(q => cell(a[q.id])),
        cell(pss[0]), cell(pss[1]), cell(pss[2]), cell(pss[3]), cell(ps), cell(psychLoadScore(drv)),
        cell(ex.bristol), num(score.bristolSignal), cell(ex.nrsPain), cell(ex.painRegion),
        bool(meds && meds.abx, !!meds), bool(meds && meds.ppi, !!meds), bool(meds && meds.nsaid, !!meds), cell(ex.medsOther || ''),
        cell(ex.dietFibre), cell(ex.dietProcessed), num(dietBurden(drv)), cell(ex.alcohol), cell(ex.activity),
        cell((ex.sleep || [])[0]), cell((ex.sleep || [])[1]), cell((ex.sleep || [])[2]), cell((ex.sleep || [])[3]), num(sleepBurden(ex.sleep)),
        cell(ex.abxCourses), cell((ex.dys || {}).stoolVar), cell((ex.dys || {}).postInfectious), cell((ex.dys || {}).gasFoul), cell((ex.dys || {}).fibreParadox), cell(((ex.dys || {}).foodTriggers || []).length), cell(dysbiosisLens(ex).count),
        cell(surgicalFlags(ex).count), cell(ex.surgeryOther || ''),
        cell(rm.painFreq), cell(rm.onset), bool(rm.rm_assoc_defecation, true), bool(rm.rm_assoc_freqchange, true), bool(rm.rm_assoc_formchange, true),
        romeResult.criteriaMet ? 1 : 0, cell(romeResult.subtype),
        ...CLUSTERS.map(c => cell(cf[c])),
        cell(ex.bowelFreq), cell(ex.smoking), cell(ex.caffeine), cell(ex.hydration), cell(tried.join('|')), cell(ex.treatmentsTriedOther || ''),
        cell(ex.heightCm), cell(ex.weightKg), cell(ex.waistCm),
        ...KNOWN_LABS.map(L => (ex.knownLabs || []).includes(L.id) ? 1 : 0),
        ...PATTERNS.map(p => fired.has(p.id) ? 1 : 0),
      ]);
    });
  });
  return rows.map(r => r.map(csv).join(',')).join('\n');
}
module.exports.pilotExportCSV = pilotExportCSV;
return __e;