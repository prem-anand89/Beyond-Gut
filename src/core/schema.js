/**
 * schema.js — Questionnaire schema: sections, questions, and metadata
 *
 * Single source of truth for:
 * - SECTIONS: form sections with labels, axes, roles, styling
 * - QUESTIONS: questionnaire items with ids, sections, text, scales
 * - QID / QTOTAL: question index and count
 * - revealMet: pure, declarative reveal logic for adaptive sections
 * - itemMax, sectionMax, questionsOf: derived schema helpers
 *
 * The role field controls scoring behavior:
 * - 'core': validated GI anchor (GSRS); primary driver of Gut Symptom Burden Index
 * - 'standalone': screening domain; scored separately, never blended into Index
 *
 * The axis field groups sections into clinical axes for reporting:
 * - 'symptom', 'inflammatory', 'psychosocial', 'nutrient', 'impact',
 *   'pelvic', 'autonomic'
 *
 * All changes to questions/sections are append-only; ids are globally unique and
 * never reused (supports historical data integrity and versioning).
 */

const { scaleFor } = require('./scales.js');

const SCHEMA_VERSION = 2;

// ── SECTIONS — form section definitions ──────────────────────────────────────
// Shape: { id, label, full, role, axis, color, bg, conditional?, revealIf? }
const SECTIONS = [
  // Domain 1 (locked): GSRS-derived GI core. 15 items, 0–3 severity, 2-wk recall.
  { id: 'GI',  label: 'GI',  full: 'Gut symptoms (GSRS-based)',          role: 'core',       axis: 'symptom',      color: '#0F6E56', bg: '#E1F5EE' },
  // Connected-axis screening domains (standalone — never blended into Index).
  { id: 'IM',  label: 'IM',  full: 'Immune, inflammatory & skin',        role: 'standalone', axis: 'inflammatory', color: '#B04A20', bg: '#FAEEE8' },
  { id: 'BG',  label: 'BG',  full: 'Brain-gut & mood',                   role: 'standalone', axis: 'psychosocial', color: '#534AB7', bg: '#EEEDFE' },
  { id: 'NU',  label: 'NU',  full: 'Nutrient & absorption',              role: 'standalone', axis: 'nutrient',     color: '#185FA5', bg: '#E6F1FB' },
  // Impact axis — functional / quality-of-life, modeled on Rome IV's impact.
  { id: 'IMP', label: 'IMP', full: 'Functional / quality-of-life impact', role: 'standalone', axis: 'impact',      color: '#6B7280', bg: '#F1F2F4' },
  // ── Targeted symptom sections (adaptive reveal) ──────────────────────────────
  { id: 'AR', label: 'AR', full: 'Bowel control & evacuation', role: 'standalone', axis: 'pelvic',    color: '#7A4A8C', bg: '#F3ECF7', conditional: true,
    revealIf: { any: [ { type: 'cluster', cluster: 'Constipation', min: 0.4 }, { type: 'item', id: 'gsrs_urgency', min: 2 }, { type: 'flag', flag: 'pelvicRisk' } ] } },
  { id: 'UG', label: 'UG', full: 'Upper-GI / dyspepsia',       role: 'standalone', axis: 'symptom',   color: '#0F6E56', bg: '#E1F5EE', conditional: true,
    revealIf: { any: [ { type: 'cluster', cluster: 'Reflux', min: 0.3 }, { type: 'cluster', cluster: 'Indigestion', min: 0.3 } ] } },
  { id: 'SY', label: 'SY', full: 'Systemic / autonomic',       role: 'standalone', axis: 'autonomic', color: '#117A8B', bg: '#E2F2F4', conditional: true,
    revealIf: { any: [ { type: 'item', id: 'bg_fatigue', min: 2 }, { type: 'item', id: 'bg_brainfog', min: 2 } ] } },
];

// ── QUESTIONS — questionnaire items ──────────────────────────────────────────
// Shape: { id, section, scale?, cluster?, optional?, freeText?, femaleOnly?,
//           driverOnly?, driverGroup?, revealIf?, patientText, patientSub? }
const QUESTIONS = [
  // ── GI core — Reflux cluster ──
  { id: 'gsrs_heartburn', section: 'GI', cluster: 'Reflux',
    patientText: 'Heartburn', patientSub: 'A burning feeling rising from your stomach or chest' },
  { id: 'gsrs_regurg', section: 'GI', cluster: 'Reflux',
    patientText: 'Acid reflux', patientSub: 'Sour or bitter fluid coming back up into your throat or mouth' },

  // ── GI core — Abdominal pain cluster ──
  { id: 'gsrs_pain', section: 'GI', cluster: 'Pain',
    patientText: 'Abdominal pain', patientSub: 'Aches or pain anywhere in your stomach or abdomen' },
  { id: 'gsrs_hunger', section: 'GI', cluster: 'Pain',
    patientText: 'Hunger pains', patientSub: 'A hollow, gnawing, empty feeling that eases after eating' },
  { id: 'gsrs_nausea', section: 'GI', cluster: 'Pain',
    patientText: 'Nausea', patientSub: 'Feeling sick or queasy, as if you might vomit' },

  // ── GI core — Indigestion cluster ──
  { id: 'gsrs_rumbling', section: 'GI', cluster: 'Indigestion',
    patientText: 'Rumbling or gurgling', patientSub: 'Vibrations or noises in your stomach' },
  { id: 'gsrs_bloating', section: 'GI', cluster: 'Indigestion',
    patientText: 'Bloating', patientSub: 'A swollen, tight, or full feeling in your abdomen' },
  { id: 'gsrs_burping', section: 'GI', cluster: 'Indigestion',
    patientText: 'Burping or belching', patientSub: 'Bringing up air to relieve pressure' },
  { id: 'gsrs_gas', section: 'GI', cluster: 'Indigestion',
    patientText: 'Passing gas / wind', patientSub: 'Needing to pass wind frequently' },

  // ── GI core — Diarrhoea cluster ──
  { id: 'gsrs_diarrhoea', section: 'GI', cluster: 'Diarrhoea',
    patientText: 'Diarrhoea', patientSub: 'Passing stools more often than normal' },
  { id: 'gsrs_loose', section: 'GI', cluster: 'Diarrhoea',
    patientText: 'Loose or watery stools', patientSub: 'Soft, sloppy, or liquid stools' },
  { id: 'gsrs_urgency', section: 'GI', cluster: 'Diarrhoea',
    patientText: 'Urgency', patientSub: 'A sudden, urgent need to pass stool with little warning' },

  // ── GI core — Constipation cluster ──
  { id: 'gsrs_constip', section: 'GI', cluster: 'Constipation',
    patientText: 'Constipation', patientSub: 'Passing stools less often than normal' },
  { id: 'gsrs_hard', section: 'GI', cluster: 'Constipation',
    patientText: 'Hard stools', patientSub: 'Hard stools that are difficult to pass' },
  { id: 'gsrs_incomplete', section: 'GI', cluster: 'Constipation',
    patientText: 'Incomplete emptying', patientSub: "A feeling your bowel isn't completely empty afterward" },

  // ── IM — Immune, inflammatory & skin ──
  { id: 'im_food_react', section: 'IM', patientText: 'Reactions to certain foods',
    patientSub: 'Bloating, rash, headache, or congestion after eating particular foods' },
  { id: 'im_infections', section: 'IM', patientText: 'Frequent infections',
    patientSub: 'Colds, UTIs, or skin infections several times a year' },
  { id: 'im_allergies', section: 'IM', patientText: 'Allergies or hay fever',
    patientSub: 'Runny nose, itchy eyes, sneezing, or other atopy' },
  { id: 'im_joint', section: 'IM', patientText: 'Joint aches or stiffness',
    patientSub: 'Without a clear injury or mechanical cause' },
  { id: 'im_histamine', section: 'IM', patientText: 'Flushing, hives, or headache after fermented foods, wine, or aged cheese',
    patientSub: 'A possible histamine-intolerance signal' },
  { id: 'im_histamine_foods', section: 'IM', optional: true, freeText: true,
    revealIf: { type: 'item', id: 'im_histamine', min: 2 },
    patientText: 'Which foods or drinks seem to trigger this?' },
  { id: 'sk_skin', section: 'IM', patientText: 'Acne, eczema, or unexplained skin rashes' },
  { id: 'im_known_dx', section: 'IM', optional: true, optionalLabel: 'if diagnosed',
    patientText: 'Diagnosed autoimmune or inflammatory condition',
    patientSub: 'e.g. rheumatoid arthritis, psoriasis, lupus, or thyroid disease' },
  { id: 'im_known_dx_which', section: 'IM', optional: true, freeText: true,
    revealIf: { type: 'item', id: 'im_known_dx', min: 1 },
    patientText: 'Which condition?' },

  // ── BG — Brain-gut & mood ──
  { id: 'bg_brainfog', section: 'BG', patientText: 'Brain fog or poor concentration',
    patientSub: 'Difficulty thinking clearly, word-finding, mental fatigue' },
  { id: 'bg_anxiety', section: 'BG', driverGroup: 'psych',
    patientText: 'Anxiety or nervousness',
    patientSub: 'Restlessness, racing thoughts, or unease' },
  { id: 'bg_mood', section: 'BG', driverGroup: 'psych',
    patientText: 'Low mood or loss of interest',
    patientSub: 'Persistent low mood or reduced enjoyment of things' },
  { id: 'bg_fatigue', section: 'BG', patientText: 'Fatigue not relieved by rest',
    patientSub: 'Ongoing tiredness or energy crashes, especially after meals' },
  { id: 'bg_headache', section: 'BG', patientText: 'Headaches or migraines' },

  // ── NU — Nutrient & absorption ──
  { id: 'nu_known_def', section: 'NU', optional: true, optionalLabel: 'if tested',
    patientText: 'Known low B12, iron, vitamin D, or magnesium', patientSub: 'Found on past blood work' },
  { id: 'nu_known_def_which', section: 'NU', optional: true, freeText: true,
    revealIf: { type: 'item', id: 'nu_known_def', min: 1 },
    patientText: 'Which ones? (B12 / iron / vitamin D / magnesium)' },
  { id: 'nu_hair', section: 'NU', patientText: 'Hair thinning or hair loss' },
  { id: 'nu_iron', section: 'NU', patientText: 'Looking pale, breathlessness, or restless legs',
    patientSub: 'Possible iron-deficiency signs' },
  { id: 'nu_mouth', section: 'NU', patientText: 'Cracks at the corners of your mouth, sore tongue, or easy bruising',
    patientSub: 'Possible micronutrient-deficiency signs' },

  // ── IMP — Functional / quality-of-life impact ──
  { id: 'imp_work',   section: 'IMP', patientText: 'Interference with work, study, or daily responsibilities',
    patientSub: 'Over the last 2 weeks, because of your gut symptoms' },
  { id: 'imp_social', section: 'IMP', patientText: 'Interference with social or family activities',
    patientSub: 'Over the last 2 weeks, because of your gut symptoms' },
  { id: 'imp_food',   section: 'IMP', patientText: 'Avoiding or restricting foods because of your symptoms',
    patientSub: 'Cutting out foods or eating less than you would like to' },
  { id: 'imp_global', section: 'IMP', patientText: 'Overall effect on your day-to-day quality of life' },

  // ── AR — Bowel control & evacuation (pelvic floor / anorectal) — adaptive ──
  { id: 'ar_incont_urge',    section: 'AR', optional: true, patientText: 'A sudden, urgent need to pass stool that you cannot control in time',
    patientSub: 'Leakage because you could not reach a toilet quickly enough' },
  { id: 'ar_incont_passive', section: 'AR', optional: true, patientText: 'Leakage or soiling of stool without realising, or without any warning',
    patientSub: 'Finding stool on underwear when you did not feel it happen' },
  { id: 'ar_incont_flatus',  section: 'AR', optional: true, patientText: 'Trouble controlling wind (gas)' },
  { id: 'ar_straining',    section: 'AR', optional: true, patientText: 'Straining to pass stool' },
  { id: 'ar_blockage',     section: 'AR', optional: true, patientText: 'A sensation of blockage at the back passage' },
  { id: 'ar_maneuvers',    section: 'AR', optional: true, patientText: 'Needing to press around or below the back passage to empty',
    patientSub: 'Using a finger or pressing to help pass stool' },

  // ── UG — Upper-GI / dyspepsia — adaptive ──
  { id: 'ug_earlysat', section: 'UG', optional: true, patientText: 'Feeling full very quickly when eating' },
  { id: 'ug_fullness', section: 'UG', optional: true, patientText: 'Uncomfortable fullness after normal-sized meals' },

  // ── SY — Systemic / autonomic — adaptive ──
  { id: 'sy_orthostatic', section: 'SY', optional: true, patientText: 'Light-headed or dizzy when standing up' },
  { id: 'sy_palpitations', section: 'SY', optional: true, patientText: 'Heart racing or palpitations' },
  { id: 'gy_cyclical',     section: 'SY', optional: true, femaleOnly: true,
    patientText: 'Gut symptoms that flare with your menstrual cycle',
    patientSub: 'If you have periods — skip if this does not apply' },
];

// ── REVEAL LOGIC ─────────────────────────────────────────────────────────────
// Pure, declarative adaptive reveal. Never gates validated GSRS core items or
// red flags — only optional context cards / follow-ups / conditional sections.
//
// cond can be:
//   { type: 'item', id, min }     — answer value >= min
//   { type: 'cluster', cluster, min }  — normalized cluster score >= min
//   { type: 'flag', flag }         — ctx.flags[flag] is truthy
//   { any: [...conds] }            — any condition true
//   { all: [...conds] }            — all conditions true
//   null/falsy                     — always shown (no gate)
function revealMet(cond, ctx) {
  if (!cond) return true;
  if (cond.any) return cond.any.some(c => revealMet(c, ctx));
  if (cond.all) return cond.all.every(c => revealMet(c, ctx));
  const a = (ctx && ctx.answers) || {};
  if (cond.type === 'item') { const v = a[cond.id]; return typeof v === 'number' && v >= cond.min; }
  if (cond.type === 'cluster') { const cn = (ctx && ctx.clusterNorm) || {}; const v = cn[cond.cluster]; return v != null && v >= cond.min; }
  if (cond.type === 'flag') { const fl = (ctx && ctx.flags) || {}; return !!fl[cond.flag]; }
  return true;
}

// ── DERIVED INDICES ─────────────────────────────────────────────────────────
// QID: { 'gsrs_pain': 0, 'gsrs_bloating': 1, ... } — global question index
const QID = Object.freeze(QUESTIONS.reduce((m, q, i) => { m[q.id] = i; return m; }, {}));
const QTOTAL = QUESTIONS.length;

// Per-item max = (scale option count − 1). Per-section max = Σ item maxes.
function itemMax(q) {
  return scaleFor(q.scale).length - 1;
}

const _sectionMax = SECTIONS.reduce((m, s) => {
  m[s.id] = QUESTIONS.filter(q => q.section === s.id && !q.driverOnly).reduce((t, q) => t + itemMax(q), 0);
  return m;
}, {});

function sectionMax(sectionId) {
  return _sectionMax[sectionId] || 0;
}

function questionsOf(sectionId) {
  return QUESTIONS.filter(q => q.section === sectionId);
}

// ── EXPORTS ─────────────────────────────────────────────────────────────────

module.exports = {
  SCHEMA_VERSION,
  SECTIONS,
  QUESTIONS,
  QID,
  QTOTAL,
  itemMax,
  sectionMax,
  questionsOf,
  revealMet,
};
