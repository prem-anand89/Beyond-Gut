const scales = require('scales.js');

const SCHEMA_VERSION = 2; // v2 gen; bumped at the trim/refocus (TRIM_PLAN §8)

// Default 0..N option count per scale, resolved via scales.js. Items may set
// `scale` to pick a vocabulary; the per-item max comes from that vocabulary.
const { scaleFor } = __req('scales.js');

// ── SECTIONS — co-design output. ────────────────────────────────────────────
// Shape: { id, label, full, role, axis, color, bg }
//   role 'core'       = validated GI anchor; the ONLY input to the Gut Symptom
//                       Burden Index (GSRS). Nothing else touches the Index.
//   role 'standalone' = scored, banded, separately-labeled axis. NEVER blended
//                       into the Index — surfaced on its own and rolled up into
//                       the Systemic Burden headline at the interpretation layer.
//   axis = the named clinical axis this section maps to (axisProfile()/triage
//          cite findings by axis; the UI groups axes into headline outputs).
const SECTIONS = [
  // Domain 1 (locked): GSRS-derived GI core. 15 items, 0–3 severity, 2-wk recall.
  { id: 'GI',  label: 'GI',  full: 'Gut symptoms (GSRS-based)',          role: 'core',       axis: 'symptom',      color: '#0F6E56', bg: '#E1F5EE' },
  // Connected-axis screening domains, refocused at the trim (TRIM_PLAN §3–§6).
  // Oral/ENT, Hormonal, broad-Metabolic removed (no gut-specific engine pathway);
  // Sleep relocated to drivers; Skin collapsed into IM. All STANDALONE — they no
  // longer dilute the GSRS Index (axis-model redesign).
  { id: 'IM',  label: 'IM',  full: 'Immune, inflammatory & skin',        role: 'standalone', axis: 'inflammatory', color: '#B04A20', bg: '#FAEEE8' },
  { id: 'BG',  label: 'BG',  full: 'Brain-gut & mood',                   role: 'standalone', axis: 'psychosocial', color: '#534AB7', bg: '#EEEDFE' },
  { id: 'NU',  label: 'NU',  full: 'Nutrient & absorption',              role: 'standalone', axis: 'nutrient',     color: '#185FA5', bg: '#E6F1FB' },
  // New Impact axis (§7d) — functional / quality-of-life, modeled on Rome IV's own
  // impact category. Standalone; also drives an independent Tier-2 escalation.
  { id: 'IMP', label: 'IMP', full: 'Functional / quality-of-life impact', role: 'standalone', axis: 'impact',      color: '#6B7280', bg: '#F1F2F4',
    note: "If your symptoms are minimal, it's fine to answer ‘None’ — these questions look at impact on your life separately from how severe symptoms feel." },
  // ── Targeted symptom sections (adaptive reveal) ──────────────────────────────
  // conditional:true → hidden by default, revealed by revealIf/refreshReveals when the
  // GSRS core points that way (or via the manual clinician toggle). All items are
  // optional, so they never enter the Index/mandatory-count/progress. Feed
  // patterns + triage + the clinician Domain breakdown only.
  { id: 'AR', label: 'AR', full: 'Bowel control & evacuation', role: 'standalone', axis: 'pelvic',    color: '#7A4A8C', bg: '#F3ECF7', conditional: true,
    revealIf: { any: [ { type: 'cluster', cluster: 'Constipation', min: 0.4 }, { type: 'item', id: 'gsrs_urgency', min: 2 }, { type: 'flag', flag: 'pelvicRisk' } ] } },
  { id: 'UG', label: 'UG', full: 'Upper-GI / dyspepsia',       role: 'standalone', axis: 'symptom',   color: '#0F6E56', bg: '#E1F5EE', conditional: true,
    revealIf: { any: [ { type: 'cluster', cluster: 'Reflux', min: 0.3 }, { type: 'cluster', cluster: 'Indigestion', min: 0.3 } ] } },
  { id: 'SY', label: 'SY', full: 'Systemic / autonomic',       role: 'standalone', axis: 'autonomic', color: '#117A8B', bg: '#E2F2F4', conditional: true,
    // Reveals on fatigue/brain-fog (original trigger) OR on pain/bloating — the
    // real clinical trigger for gy_cyclical, which lives in this section. Without
    // the pain/bloating arm, a patient with cyclical pain/bloating flares and no
    // fatigue/brain-fog never saw gy_cyclical, so the triage gynOverlap note
    // (which needs gy_cyclical + gsrs_pain) could never fire for that patient —
    // the exact presentation it exists to catch. Widening the SECTION gate
    // (rather than adding an item-level revealIf on gy_cyclical alone) is
    // required: refreshReveals() toggles item-level holders independently of
    // their parent section holder, and an item nested inside a display:none
    // section stays hidden regardless of its own reveal state.
    revealIf: { any: [ { type: 'item', id: 'bg_fatigue', min: 2 }, { type: 'item', id: 'bg_brainfog', min: 2 },
                        { type: 'item', id: 'gsrs_pain', min: 2 }, { type: 'item', id: 'gsrs_bloating', min: 2 } ] } },
];

// ── QUESTIONS — co-design output. ───────────────────────────────────────────
// Shape: { id, section, scale?, cluster?, patientText, patientSub? }
// GI items use the DEFAULT 0–3 severity scale. `cluster` tags the 5 validated
// GSRS syndromes for the per-cluster breakdown shown on results.
const QUESTIONS = [
  // ── Universal symptom duration/chronicity — ungated, always visible ─────────
  // The only prior duration question (rome.onset) lives inside the pain-gated
  // Rome IV card (CARD_REVEAL, ui-patient.js), so a patient with e.g. chronic
  // diarrhoea/constipation and no abdominal pain was never asked how long
  // they'd had symptoms — yet acute-vs-chronic is one of the highest-value
  // triage inputs. driverOnly: excluded from GI section scoring / completeness
  // / the Index (same mechanism as sleep/PSS-4, just rendered through the
  // normal questionRow() pipeline since it lives in QUESTIONS). Feeds
  // triage.durationNote only — never the Index, never a Tier change.
  { id: 'sx_duration', section: 'GI', driverOnly: true, scale: 'DURATION',
    patientText: 'How long have you had these gut symptoms?',
    patientSub: 'Your best estimate — this helps tell a new problem from a longstanding one',
    // Only asked once at least one gut symptom is reported — a patient with no
    // gut symptoms has no duration to give (Option C). The 'Not sure / it
    // varies' scale option covers symptomatic patients who can't place an onset.
    revealIf: { any: [
      { type: 'cluster', cluster: 'Reflux', min: 0.01 },
      { type: 'cluster', cluster: 'Pain', min: 0.01 },
      { type: 'cluster', cluster: 'Indigestion', min: 0.01 },
      { type: 'cluster', cluster: 'Diarrhoea', min: 0.01 },
      { type: 'cluster', cluster: 'Constipation', min: 0.01 },
    ] } },

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

  // ── IM — Immune, inflammatory & skin (DRAFT) ──
  // Digestive-symptom framing (not allergic/vasomotor) so this stays a distinct
  // construct from im_histamine below — both are non-optional IM items and a
  // histamine-type reaction could otherwise score on both for one phenomenon.
  { id: 'im_food_react', section: 'IM', patientText: 'Digestive reactions to certain foods',
    patientSub: 'Bloating, stomach upset, or other digestive symptoms after eating particular foods' },
  { id: 'im_infections', section: 'IM', patientText: 'Frequent infections',
    patientSub: 'Colds, UTIs, or skin infections several times a year' },
  { id: 'im_allergies', section: 'IM', patientText: 'Allergies or hay fever',
    patientSub: 'Runny nose, itchy eyes, sneezing, or other atopy' },
  { id: 'im_joint', section: 'IM', patientText: 'Joint aches or stiffness',
    patientSub: 'Without a clear injury or mechanical cause' },
  { id: 'im_histamine', section: 'IM', patientText: 'Flushing, hives, or headache after fermented foods, wine, or aged cheese',
    patientSub: 'A possible histamine-intolerance signal' },
  // Reveal-on-positive follow-up: capture the specific triggers for the elimination
  // trial the triage already recommends. Free-text, optional, never scored.
  { id: 'im_histamine_foods', section: 'IM', optional: true, freeText: true,
    revealIf: { type: 'item', id: 'im_histamine', min: 2 },
    patientText: 'Which foods or drinks seem to trigger this?' },
  // Gut–skin axis: the one retained skin item (atopic/inflammatory readout), folded
  // into the immune domain (TRIM_PLAN §6.1). Feeds the inflammatory_immune pattern.
  { id: 'sk_skin', section: 'IM', patientText: 'Acne, eczema, or unexplained skin rashes' },
  // Objective inflammatory anchor (§7b) — gives IM a diagnosed-condition anchor the
  // way NU has nu_known_def, so the domain isn't purely symptom-proxy. Optional
  // (only counts when answered); weighted like a lab anchor in inflammatory_immune.
  { id: 'im_known_dx', section: 'IM', optional: true, optionalLabel: 'if diagnosed',
    patientText: 'Diagnosed autoimmune or inflammatory condition',
    patientSub: 'e.g. rheumatoid arthritis, psoriasis, lupus, or thyroid disease' },
  { id: 'im_known_dx_which', section: 'IM', optional: true, freeText: true,
    revealIf: { type: 'item', id: 'im_known_dx', min: 1 },
    patientText: 'Which condition?' },

  // ── BG — Brain-gut & mood (DRAFT) ──
  { id: 'bg_brainfog', section: 'BG', patientText: 'Brain fog or poor concentration',
    patientSub: 'Difficulty thinking clearly, word-finding, mental fatigue' },
  // Affective items are DUAL-ROLE (like Bristol): scored in the BG *screen* of
  // the Index AND folded into the Psychological-load driver. `driverGroup` marks
  // the driver membership; they are NOT driverOnly, so they count toward the
  // Index. They land in a screen (never core), so the GI-dominance cap stops
  // affective symptoms alone from inflating the band. PSS-4 stays driver-only
  // (a modifiable cause, not a symptom). See TRIM_PLAN.
  { id: 'bg_anxiety', section: 'BG', driverGroup: 'psych',
    patientText: 'Anxiety or nervousness',
    patientSub: 'Restlessness, racing thoughts, or unease' },
  { id: 'bg_mood', section: 'BG', driverGroup: 'psych',
    patientText: 'Low mood or loss of interest',
    patientSub: 'Persistent low mood or reduced enjoyment of things' },
  { id: 'bg_fatigue', section: 'BG', patientText: 'Fatigue not relieved by rest',
    patientSub: 'Ongoing tiredness or energy crashes, especially after meals' },
  { id: 'bg_headache', section: 'BG', patientText: 'Headaches or migraines' },

  // ── NU — Nutrient & absorption (DRAFT) ──
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

  // ── IMP — Functional / quality-of-life impact (§7d + §7e) ──
  // Short, modeled on Rome IV's impact category (work/social function + a global
  // rating) so it stays recognizable. DEFAULT 0–3 scale — no new rendering code.
  { id: 'imp_work',   section: 'IMP', patientText: 'Interference with work, study, or daily responsibilities',
    patientSub: 'Over the last 2 weeks, because of your gut symptoms' },
  { id: 'imp_social', section: 'IMP', patientText: 'Interference with social or family activities',
    patientSub: 'Over the last 2 weeks, because of your gut symptoms' },
  { id: 'imp_food',   section: 'IMP', patientText: 'Avoiding or restricting foods because of your symptoms',
    patientSub: 'Cutting out foods or eating less than you would like to' },
  { id: 'imp_global', section: 'IMP', patientText: 'Overall effect on your day-to-day quality of life' },

  // ── AR — Bowel control & evacuation (pelvic floor / anorectal) — adaptive ──
  // All optional: revealed only when the GSRS constipation/urgency picture warrants
  // it. Drive the pelvic_floor pattern → Tier-2 pelvic-floor physiotherapy candidacy.
  // Faecal incontinence split into the subtypes that change management: urge
  // (sphincter weakness — biofeedback / urge strategies), passive / soiling
  // (internal-sphincter or overflow — different approach), and flatus (mildest).
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

// Adaptive reveal — ONE declarative predicate, used for conditional sections,
// gated cards (pain/Rome), and reveal-on-positive follow-up items. Pure + unit-
// testable; the UI computes `clusterNorm` once (via computeScores) and passes it
// in `ctx` so cluster gating never recomputes per element. NEVER used to gate a
// validated GSRS core item or a red flag — only optional context / follow-ups.
//   cond: { type:'item', id, min } | { type:'cluster', cluster, min }
//       | { any:[cond,...] } | { all:[cond,...] }  (falsy cond ⇒ always shown)
function revealMet(cond, ctx) {
  if (!cond) return true;
  if (cond.any) return cond.any.some(c => revealMet(c, ctx));
  if (cond.all) return cond.all.every(c => revealMet(c, ctx));
  const a = (ctx && ctx.answers) || {};
  if (cond.type === 'item') { const v = a[cond.id]; return typeof v === 'number' && v >= cond.min && (cond.max == null || v <= cond.max); }
  if (cond.type === 'cluster') { const cn = (ctx && ctx.clusterNorm) || {}; const v = cn[cond.cluster]; return v != null && v >= cond.min; }
  // Risk-factor flag (e.g. obstetric history → 'pelvicRisk'), supplied by the UI in
  // ctx.flags so a section can reveal on history, not just on symptom answers.
  if (cond.type === 'flag') { const fl = (ctx && ctx.flags) || {}; return !!fl[cond.flag]; }
  return true;
}

// ── Derived index — the ONLY question index in the app. ─────────────────────
const QID = Object.freeze(QUESTIONS.reduce((m, q, i) => { m[q.id] = i; return m; }, {}));

// Per-item max = (scale option count − 1). Per-section max = Σ item maxes.
function itemMax(q) { return scaleFor(q.scale).length - 1; }
const _sectionMax = SECTIONS.reduce((m, s) => {
  m[s.id] = QUESTIONS.filter(q => q.section === s.id && !q.driverOnly).reduce((t, q) => t + itemMax(q), 0);
  return m;
}, {});
function sectionMax(sectionId) { return _sectionMax[sectionId] || 0; }
function questionsOf(sectionId) { return QUESTIONS.filter(q => q.section === sectionId); }

module.exports.SCHEMA_VERSION = SCHEMA_VERSION; module.exports.SECTIONS = SECTIONS; module.exports.QUESTIONS = QUESTIONS;
module.exports.QID = QID; module.exports.itemMax = itemMax; module.exports.sectionMax = sectionMax; module.exports.questionsOf = questionsOf;
module.exports.revealMet = revealMet;
return __e;