/**
 * scales.js — Scoring scales, helper calculations, and metadata
 *
 * Provides:
 * - SCALES and scaleFor() — lookup semantic scales (0-3 severity, etc.)
 * - PSS-4 (Perceived Stress Scale) scoring
 * - Bristol Stool Form Scale types and pain/sleep/diet helper functions
 * - Dysbiosis-correlate lens (count of microbiome-altered phenotypes)
 * - Surgical, condition, medication, family, and obstetric history helpers
 * - Anthropometrics (BMI, waist-to-height ratio)
 * - Modifiable factors (drivers like stress, pain, diet, sleep, activity)
 *
 * Pure logic — no DOM dependencies. All exported functions are deterministic
 * and depend only on their arguments.
 */

const SCALES = {
  // generic 0–3 severity fallback (placeholder; real scales added in co-design)
  DEFAULT: ['None', 'Mild', 'Moderate', 'Severe'],
};

function scaleFor(name) {
  return SCALES[name] || SCALES.DEFAULT;
}

// Recall window note (Phase 0.5 §1 mechanism, carried forward). Shown under
// scored symptom sections in the patient view; suppressed where a section opts
// out via `noRecall:true`.
const RECALL_NOTE = 'Answer for how things have been over the past 2 weeks.';

// ── MODIFIABLE-DRIVER INSTRUMENTS ───────────────────────────────────────────
// Shown alongside the result and stored on the visit (extras), but kept OUT of
// the GI Symptom Burden score. Designed to be consumed by the patterns/triage
// engines (e.g. high PSS-4 -> psychobiotic pattern; Bristol -> bowel direction).

// Modified 4-item Perceived Stress Scale (Du et al. 2023). 0–4 anchors; items
// 2 & 3 are positively framed and reverse-scored. Total 0–16.
const PSS4_ITEMS = [
  'In the last month, how often have you felt that you were unable to control the important things in your life?',
  'In the last month, how often have you felt confident about your ability to handle your personal problems?',
  'In the last month, how often have you felt that things were going your way?',
  'In the last month, how often have you felt difficulties were piling up so high that you could not overcome them?',
];
const PSS4_REVERSED = [false, true, true, false];
const PSS4_ANCHORS = ['Never', 'Almost never', 'Sometimes', 'Fairly often', 'Very often']; // 0–4

function pss4Score(arr) {
  if (!arr || arr.some(v => v == null)) return null;
  return arr.reduce((sum, v, i) => sum + (PSS4_REVERSED[i] ? (4 - v) : v), 0);
}

function pss4Band(s) {
  if (s == null) return null;
  return s <= 5 ? { l: 'Low', c: '#0F6E56' } : s <= 9 ? { l: 'Moderate', c: '#BA7517' } : { l: 'High', c: '#A32D2D' };
}

// Bristol Stool Form Scale (Lewis & Heaton 1997), types 1–7.
const BRISTOL_TYPES = [
  { n: 1, label: 'Separate hard lumps',     sub: 'like nuts, hard to pass',          tag: 'Constipated',          col: '#7A4A1E' },
  { n: 2, label: 'Lumpy and sausage-like',  sub: 'sausage-shaped but lumpy',         tag: 'Slightly constipated', col: '#9A6B2E' },
  { n: 3, label: 'Sausage with cracks',     sub: 'sausage with surface cracks',      tag: 'Near normal',          col: '#3B6D11' },
  { n: 4, label: 'Smooth, soft sausage',    sub: 'like a smooth soft snake — ideal', tag: 'Normal / ideal',       col: '#0F6E56' },
  { n: 5, label: 'Soft blobs, clear edges', sub: 'soft blobs that pass easily',      tag: 'Lacking fibre',        col: '#BA7517' },
  { n: 6, label: 'Mushy, ragged edges',     sub: 'fluffy pieces, mushy stool',       tag: 'Mild diarrhoea',       col: '#C2622E' },
  { n: 7, label: 'Watery, no solid pieces', sub: 'entirely liquid',                  tag: 'Diarrhoea',            col: '#A32D2D' },
];

// NRS pain 0–10 + body region (observational; never feeds the Index).
const PAIN_REGIONS = [
  { id: 'low_back', label: 'Low back' }, { id: 'neck', label: 'Neck' },
  { id: 'joints', label: 'Joints' }, { id: 'abdomen', label: 'Abdomen' }, { id: 'other', label: 'Other' },
];

function painBand(s) {
  if (s == null) return null;
  return s === 0 ? { l: 'None', c: '#0F6E56' } : s <= 3 ? { l: 'Mild', c: '#3B6D11' }
    : s <= 6 ? { l: 'Moderate', c: '#BA7517' } : { l: 'Severe', c: '#A32D2D' };
}

// Composite PSYCHOLOGICAL LOAD (co-design): folds the validated PSS-4 together
// with the two affective brain-gut items (anxiety, low mood) that were moved OUT
// of the Index to stop double-counting stress.
function psychLoadScore(ex) {
  const parts = [];
  if (ex.pss4Score != null) parts.push([ex.pss4Score / 16, 0.5]);
  if (ex.bgAnxiety  != null) parts.push([ex.bgAnxiety / 3,  0.25]);
  if (ex.bgMood     != null) parts.push([ex.bgMood / 3,     0.25]);
  if (!parts.length) return null;
  const wsum = parts.reduce((a, [, w]) => a + w, 0);
  return Math.round(parts.reduce((a, [x, w]) => a + x * w, 0) / wsum * 100); // 0–100
}

function loadBand(p) {
  if (p == null) return null;
  return p < 33 ? { l: 'Low', c: '#0F6E56' } : p < 66 ? { l: 'Moderate', c: '#BA7517' } : { l: 'High', c: '#A32D2D' };
}

// New modifiable drivers (co-design). All provisional, all kept OUT of the Index.
// Recent gut disruptors — strongest modifiable microbiome influences.
const DISRUPTORS = [
  { id: 'abx',   label: 'Antibiotics' },
  { id: 'ppi',   label: 'Acid blocker (PPI/H2)' },
  { id: 'nsaid', label: 'Regular NSAID' },
];
const ALCOHOL_LEVELS  = ['None', 'Light', 'Moderate', 'Heavy'];        // 0–3
const ACTIVITY_LEVELS = ['Sedentary', 'Light', 'Moderate', 'Active'];  // 0–3

// Sleep — relocated from a scored screen domain to a modifiable DRIVER.
// Context only: tracked over time, kept OUT of the GI Symptom Burden score.
const SLEEP_ITEMS   = ['Trouble falling asleep', 'Waking during the night', 'Waking unrefreshed', 'Fewer hours than you need'];
const SLEEP_ANCHORS = ['Never', 'Sometimes', 'Often', 'Most nights']; // 0–3

function sleepBurden(arr) {
  const xs = (arr || []).filter(v => typeof v === 'number');
  return xs.length ? xs.reduce((a, b) => a + b, 0) / (xs.length * 3) : null; // 0–1
}

function sleepBand(b) {
  if (b == null) return null;
  return b < 0.34 ? { l: 'Good', c: '#0F6E56' } : b < 0.67 ? { l: 'Fair', c: '#BA7517' } : { l: 'Poor', c: '#A32D2D' };
}

// Diet quality: protective fibre/fermented intake vs harmful ultra-processed/
// sugar intake (each 0–3 frequency). Burden 0–1, higher = worse.
function dietBurden(ex) {
  const f = ex.dietFibre     != null ? (3 - ex.dietFibre) / 3 : null; // low fibre  = worse
  const p = ex.dietProcessed != null ? ex.dietProcessed / 3   : null; // high processed = worse
  const xs = [f, p].filter(x => x != null);
  return xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null;
}

function dietBand(b) {
  if (b == null) return null;
  return b < 0.34 ? { l: 'Good', c: '#0F6E56' } : b < 0.67 ? { l: 'Fair', c: '#BA7517' } : { l: 'Poor', c: '#A32D2D' };
}

// ── DYS-R: dysbiosis-correlate lens ─────────────────────────────────────────
// Items mechanistically enriched for microbiome-altered phenotypes.
const FOOD_TRIGGERS = [
  { id: 'alliums', label: 'Onion / garlic' },
  { id: 'legumes', label: 'Beans / lentils' },
  { id: 'wheat',   label: 'Wheat / bread' },
  { id: 'dairy',   label: 'Dairy' },
  { id: 'polyols', label: "Sugar-free ('-ol') sweeteners" },
];
const ABX_COURSES   = ['0', '1', '2', '3+'];                  // 0–3 (courses /12mo)
const GAS_LEVELS     = ['Not at all', 'Mild', 'Moderate', 'Marked']; // 0–3
const STOOLVAR_LEVELS = ['Never', 'Sometimes', 'Often'];      // 0–2
const POSTINF_OPTS   = ['No', 'Yes', 'Not sure'];             // 0/1/2 (1 = Yes)
const PARADOX_OPTS   = ['No', 'Yes', "Haven't tried"];        // 0/1/2 (1 = Yes)

function dysbiosisLens(extras) {
  const ex = extras || {}, d = ex.dys || {};
  const signals = [];
  if (typeof ex.abxCourses === 'number' && ex.abxCourses >= 1)
    signals.push({ k: 'abx', label: (ABX_COURSES[ex.abxCourses] || ex.abxCourses) + ' antibiotic course(s) in 12mo' });
  if (d.postInfectious === 1) signals.push({ k: 'postinf', label: 'Post-infectious onset' });
  if ((d.foodTriggers || []).length >= 2) signals.push({ k: 'fodmap', label: d.foodTriggers.length + ' fermentable-food triggers' });
  if (typeof d.gasFoul === 'number' && d.gasFoul >= 2) signals.push({ k: 'gas', label: 'Foul / excessive gas' });
  if (d.fibreParadox === 1) signals.push({ k: 'paradox', label: 'Worse with fibre / probiotics' });
  if (typeof d.stoolVar === 'number' && d.stoolVar >= 1) signals.push({ k: 'var', label: 'Day-to-day stool variability' });
  if (surgicalFlags(ex).microbiome) signals.push({ k: 'surg', label: 'Microbiome-altering surgery' });
  return { count: signals.length, signals };
}

// ── SURGICAL & MEDICAL HISTORY ──────────────────────────────────────────────

// Surgical history (asked routinely for visceral / fascial manipulation).
const SURGERIES = [
  { id: 'abdominal',   label: 'Abdominal surgery',            adhesion: true },
  { id: 'pelvic',      label: 'Pelvic surgery / C-section',   adhesion: true },
  { id: 'hernia',      label: 'Hernia repair',                adhesion: true },
  { id: 'bowel',       label: 'Bowel resection',              adhesion: true, microbiome: true },
  { id: 'gallbladder', label: 'Gallbladder removal',          microbiome: true },
  { id: 'appendix',    label: 'Appendix removal',             microbiome: true },
  { id: 'bariatric',   label: 'Weight-loss (bariatric) surgery', microbiome: true },
];

function surgicalFlags(extras) {
  const ids = new Set(((extras || {}).surgeries) || []);
  let adhesion = false, microbiome = false; const list = [];
  SURGERIES.forEach(s => { if (ids.has(s.id)) { list.push(s.label); if (s.adhesion) adhesion = true; if (s.microbiome) microbiome = true; } });
  return { adhesion, microbiome, list, count: list.length };
}

// Known diagnosed/suspected conditions
const KNOWN_CONDITIONS = [
  { id: 'celiac',     label: 'Coeliac disease',                refer: true },
  { id: 'ibd',        label: 'IBD (Crohn\'s or ulcerative colitis)', refer: true },
  { id: 'ibs',        label: 'IBS', clinNote: 'Diagnosed IBS — manage as IBS (gut-directed therapy / dietary); avoid redundant re-screening.' },
  { id: 'gord',       label: 'GORD / reflux disease', clinNote: 'Known GORD — relevant to the reflux / upper-GI read.' },
  { id: 'sibo',       label: 'SIBO', clinNote: 'Known SIBO — relevant to the bloating / fermentation read.' },
  { id: 'divert',     label: 'Diverticular disease' },
  { id: 'gallstones', label: 'Gallstones', clinNote: 'Known gallstones — factor into the upper-GI / biliary read.' },
  { id: 'pancreas',   label: 'Pancreatitis / pancreatic insufficiency', clinNote: 'Known pancreatic disease / EPI — factor into the malabsorption read.' },
  { id: 'liver',      label: 'Liver disease / fatty liver', clinNote: 'Known liver disease — factor into interpretation.' },
  { id: 'hpylori',    label: 'H. pylori', clinNote: 'Known H. pylori — relevant to the upper-GI / dyspepsia read.' },
  { id: 'thyroid',    label: 'Thyroid disorder', clinNote: 'Known thyroid disorder — can drive constipation (under-active) or loose stool (over-active); factor into the bowel-habit read.' },
  { id: 'diabetes',   label: 'Diabetes', clinNote: 'Known diabetes — consider gastroparesis / autonomic neuropathy if early satiety, nausea, or erratic bowel habit.' },
  { id: 'pcos',       label: 'PCOS', clinNote: 'Known PCOS — metabolic / hormonal overlap; relevant to bloating and bowel-habit interpretation.' },
  { id: 'endo',       label: 'Endometriosis' },
  { id: 'lactose',    label: 'Lactose intolerance' },
  { id: 'foodallergy',label: 'Food allergy / intolerance' },
  { id: 'mood',       label: 'Diagnosed anxiety or depression' },
];

function knownConditions(extras) {
  const ids = new Set(((extras || {}).conditions) || []);
  const list = [], referList = [], notes = [];
  KNOWN_CONDITIONS.forEach(c => {
    if (!ids.has(c.id)) return;
    list.push(c.label);
    if (c.refer) referList.push(c.label);
    if (c.clinNote) notes.push(c.clinNote);
  });
  return { list, referList, notes, count: list.length };
}

// Medication CONFOUNDERS — drugs that commonly cause/aggravate GI symptoms
const MED_CONFOUNDERS = [
  { id: 'glp1',    label: 'GLP-1 agonist (e.g. Ozempic)', effect: 'nausea, fullness, constipation, slowed emptying' },
  { id: 'opioid',  label: 'Opioid painkiller',            effect: 'constipation' },
  { id: 'ssri',    label: 'SSRI / SNRI antidepressant',   effect: 'altered motility / nausea' },
  { id: 'metformin', label: 'Metformin',                  effect: 'diarrhoea, cramping' },
  { id: 'laxative', label: 'Regular laxative',            effect: 'loose stool / dependence' },
  { id: 'iron',    label: 'Iron supplement',              effect: 'constipation, dark stool' },
  { id: 'ocp',     label: 'Oral contraceptive / HRT',     effect: 'bloating' },
];

function medConfounders(extras) {
  const ids = new Set(((extras || {}).medsConfounders) || []);
  const list = MED_CONFOUNDERS.filter(m => ids.has(m.id));
  return { list, count: list.length };
}

// Family history — first-degree relative
const FAMILY_HISTORY = [
  { id: 'fh_celiac', label: 'Coeliac disease',
    note: 'Family history of coeliac — consider coeliac serology / a lower testing threshold.',
    invest: 'Coeliac serology (anti-tTG IgA + total IgA)' },
  { id: 'fh_ibd',    label: 'IBD',
    note: 'Family history of IBD — consider faecal calprotectin if inflammatory / diarrhoeal features.',
    invest: 'Faecal calprotectin if inflammatory features' },
  { id: 'fh_cancer', label: 'Bowel cancer', tier: 2, axis: 'history',
    reason: 'Family history of bowel/colorectal cancer — discuss colorectal screening (e.g. colonoscopy) per guidelines',
    note: 'Family history of bowel cancer — discuss colorectal screening per guidelines (esp. first-degree / under 50).',
    invest: 'Colorectal screening / colonoscopy per guidelines' },
];

function familyHistory(extras) {
  const ids = new Set(((extras || {}).familyHistory) || []);
  const sel = FAMILY_HISTORY.filter(f => ids.has(f.id));
  return {
    list: sel.map(f => f.label),
    notes: sel.filter(f => f.note).map(f => f.note),
    invest: sel.filter(f => f.invest).map(f => f.invest),
    tierReasons: sel.filter(f => f.tier).map(f => ({ tier: f.tier, text: f.reason, axis: f.axis || 'history' })),
    count: sel.length,
  };
}

// Obstetric / birth-trauma history — Female-gated in the UI. Context, never scored.
const OBSTETRIC_HISTORY = [
  { id: 'ob_vaginal',      label: 'Vaginal birth(s)' },
  { id: 'ob_instrumental', label: 'Assisted birth (forceps or vacuum / ventouse)' },
  { id: 'ob_tear',         label: 'Significant perineal tear (3rd/4th degree)' },
  { id: 'ob_multiparity',  label: 'Three or more births' },
];

function obstetricHistory(extras) {
  const ids = new Set(((extras || {}).obstetric) || []);
  const sel = OBSTETRIC_HISTORY.filter(o => ids.has(o.id));
  const highRisk = ids.has('ob_instrumental') || ids.has('ob_tear');
  return { list: sel.map(o => o.label), risk: sel.length > 0, highRisk, count: sel.length };
}

// ── ANTHROPOMETRICS ────────────────────────────────────────────────────────
// BMI (kg/m²) and Waist-to-Height ratio (WHtR) from optional height/weight/waist inputs.
// NOTES ONLY: feeds clinician interpretation, never the Index or the triage Tier.
function anthropometrics(extras, session) {
  const ex = extras || {};
  const h = Number(ex.heightCm), w = Number(ex.weightKg), waist = Number(ex.waistCm);
  const hOk = isFinite(h) && h > 0, wOk = isFinite(w) && w > 0, waistOk = isFinite(waist) && waist > 0;
  const ageNum = parseInt((session || {}).age, 10);
  const isMinor = !isNaN(ageNum) && ageNum < 18;

  let bmi = null, bmiBand = null;
  if (hOk && wOk) {
    bmi = Math.round((w / Math.pow(h / 100, 2)) * 10) / 10;
    if (!isMinor) {
      bmiBand = bmi < 18.5 ? 'Underweight'
        : bmi < 25 ? 'Normal'
        : bmi < 30 ? 'Overweight'
        : 'Obese';
    }
  }

  let whtr = null, whtrBand = null;
  if (hOk && waistOk) {
    whtr = Math.round((waist / h) * 100) / 100;
    whtrBand = whtr < 0.4 ? 'Low'
      : whtr < 0.5 ? 'Healthy'
      : whtr < 0.6 ? 'Increased'
      : 'High';
  }

  const notes = [];
  if (bmi != null && !isMinor && bmi < 18.5)
    notes.push(`Low BMI (${bmi}) — factor into the nutrient / malabsorption interpretation.`);
  if (whtr != null && whtr >= 0.5)
    notes.push(`Waist-to-height ratio ${whtr} (≥0.5) — increased central adiposity / cardiometabolic risk; consider lifestyle review.`);

  const caveat = (isMinor && bmi != null)
    ? 'Under 18 — adult BMI categories do not apply; interpret against age/sex percentiles.'
    : null;

  return { bmi, bmiBand, whtr, whtrBand, notes, caveat };
}

// LEGACY — superseded by axisProfile() / headlineOutputs() in scoring.js
const GHI_WEIGHTS = { severity: 0.7, risk: 0.3, riskMax: 6 };

function gutHealthIndex(severityIndex, lensCount) {
  if (severityIndex == null) return null;
  const risk = Math.min(1, (lensCount || 0) / GHI_WEIGHTS.riskMax) * 100;
  return Math.round(GHI_WEIGHTS.severity * severityIndex + GHI_WEIGHTS.risk * risk);
}

// ONE shared driver descriptor used by every surface (results now; report later).
function modifiableFactors(extras) {
  const ex = extras || {};
  const plPct = psychLoadScore(ex);
  const pl = loadBand(plPct);
  const pn = painBand(ex.nrsPain ?? null);
  const bt = ex.bristol != null ? BRISTOL_TYPES.find(t => t.n === ex.bristol) : null;
  const db = dietBand(dietBurden(ex));
  const disrupt = DISRUPTORS.filter(d => ex.meds && ex.meds[d.id]);
  const alc = ex.alcohol  != null ? ALCOHOL_LEVELS[ex.alcohol]   : null;
  const act = ex.activity != null ? ACTIVITY_LEVELS[ex.activity] : null;
  const sBurden = sleepBurden(ex.sleep);
  const sb = sleepBand(sBurden);
  const surg = surgicalFlags(ex);
  return [
    { icon: '🧠', label: 'Psychological load', band: pl ? pl.l : '—',
      score: plPct != null ? `${plPct}/100${ex.pss4Score != null ? ` · PSS-4 ${ex.pss4Score}/16` : ''}` : null,
      color: pl ? pl.c : '#999' },
    { icon: '⚡', label: 'Pain (NRS)', band: pn ? pn.l : '—', score: ex.nrsPain != null ? `${ex.nrsPain}/10` : null, color: pn ? pn.c : '#999' },
    { icon: '💩', bristolN: bt ? bt.n : null, label: 'Bristol stool', band: bt ? `Type ${bt.n}` : '—', score: bt ? bt.tag : null, color: bt ? bt.col : '#999' },
    { icon: '💊', label: 'Recent disruptors', band: disrupt.length ? `${disrupt.length} flagged` : (ex.meds ? 'None' : '—'),
      score: disrupt.length ? disrupt.map(d => d.label).join(', ') : null, color: disrupt.length ? '#A32D2D' : (ex.meds ? '#0F6E56' : '#999') },
    { icon: '🥗', label: 'Diet quality', band: db ? db.l : '—', score: null, color: db ? db.c : '#999' },
    { icon: '🏃', label: 'Lifestyle', band: act || '—', score: alc != null ? `Alcohol: ${alc}` : null, color: act ? '#117A8B' : '#999' },
    { icon: '😴', label: 'Sleep', band: sb ? sb.l : '—', score: sBurden != null ? `${Math.round(sBurden * 100)}/100 disturbance` : null, color: sb ? sb.c : '#999' },
    { icon: '🔪', label: 'Surgical history', band: surg.count ? `${surg.count} noted` : 'None noted',
      score: surg.count ? surg.list.join(', ') : null, color: surg.count ? '#185FA5' : '#999' },
  ];
}

const TRIM_PLAN = {
  applied: [
    { ids: ['bg_anxiety', 'bg_mood'], action: 'dual-role:BG-screen + driver:psych',
      reason: 'Scored in the BG screen (capped, never core) AND folded into the Psychological-load driver. Not double-counting: PSS-4 — the correlated stress measure — is driver-only and never in the Index.' },
    { action: 'trim/refocus (schema v2)',
      reason: 'Removed Oral/ENT, Hormonal, broad-Metabolic domains (no gut-specific engine pathway). Skin collapsed into IM (kept sk_skin). 52 -> 30 scored items. See TRIM_PLAN.md §3–§6.' },
    { ids: ['sl_onset', 'sl_waking', 'sl_unrefreshed', 'sl_short'], action: 'relocate:scored-domain -> driver',
      reason: 'Sleep is a modifier, not a gut symptom — moved to extras.sleep, out of the burden score (§8.3).' },
    { action: 'patterns 12 -> 10',
      reason: 'Cut candida_yeast (speculative). Merged histamine_intolerance into inflammatory_immune. Renamed stress_driven -> gut_brain, wiring in bg_brainfog/bg_fatigue (§5, §6).' },
    { action: 'add:Dys-R dysbiosis-correlate lens',
      reason: 'abxCourses + dys.{stoolVar,postInfectious,gasFoul,fibreParadox,foodTriggers}; reported SEPARATELY from burden, feeds bloating/post_disruptor + Tier 3. Labelled correlate, not diagnosis (§10).' },
  ],
  drivers: ['psych(PSS-4+anxiety+mood)', 'pain(NRS)', 'bristol', 'disruptors(abx/ppi/nsaid)', 'diet(fibre/processed)', 'alcohol', 'activity', 'sleep', 'dys-R(microbiome-correlate lens)'],
};

// ── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  SCALES, scaleFor, RECALL_NOTE,
  PSS4_ITEMS, PSS4_REVERSED, PSS4_ANCHORS, pss4Score, pss4Band,
  psychLoadScore, loadBand,
  DISRUPTORS, ALCOHOL_LEVELS, ACTIVITY_LEVELS, dietBurden, dietBand,
  SLEEP_ITEMS, SLEEP_ANCHORS, sleepBurden, sleepBand,
  FOOD_TRIGGERS, ABX_COURSES, GAS_LEVELS, STOOLVAR_LEVELS,
  POSTINF_OPTS, PARADOX_OPTS, dysbiosisLens,
  SURGERIES, surgicalFlags,
  KNOWN_CONDITIONS, knownConditions,
  MED_CONFOUNDERS, medConfounders,
  FAMILY_HISTORY, familyHistory,
  OBSTETRIC_HISTORY, obstetricHistory,
  anthropometrics,
  gutHealthIndex, GHI_WEIGHTS,
  TRIM_PLAN,
  BRISTOL_TYPES, PAIN_REGIONS, painBand, modifiableFactors,
};
