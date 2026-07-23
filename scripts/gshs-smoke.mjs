// Lightweight CI smoke test for the single-file GSHS app.
// Extracts the inlined <script> from index.html, verifies it parses, then loads
// the DOM-free engine modules (schema/scales/scoring/patterns/triage/romeiv) and
// asserts the core multi-axis behaviour. No external dependencies.
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const html = readFileSync(join(root, 'index.html'), 'utf8');

const m = html.match(/<script>([\s\S]*)<\/script>/);
if (!m) { console.error('FAIL: no <script> block found in index.html'); process.exit(1); }

// Strip the browser bootstrap (it touches document/window); keep module defs.
const code = m[1].replace(/__req\(\s*['"]app\.js['"]\s*\)\s*;?\s*\/\/\s*boot/, '');

let req;
try {
  // The script body is a sequence of top-level statements (no DOM access until a
  // module fn is invoked). Capture __req via an appended export.
  req = new Function(code + '\n;return __req;')();
} catch (e) {
  console.error('FAIL: script did not parse / load:', e && e.message);
  process.exit(1);
}

const schema = req('schema.js');
const scales = req('scales.js');
const scoring = req('scoring.js');
const patterns = req('patterns.js');
const triage = req('triage.js').triage;
const rome = req('romeiv.js');
const storage = req('storage.js');
const trend = req('trend.js');

let failed = 0;
const ok = (cond, label) => { console.log(`${cond ? 'ok  ' : 'FAIL'} - ${label}`); if (!cond) failed++; };

const GI_IDS = ['gsrs_heartburn','gsrs_regurg','gsrs_pain','gsrs_hunger','gsrs_nausea','gsrs_rumbling','gsrs_bloating','gsrs_burping','gsrs_gas','gsrs_diarrhoea','gsrs_loose','gsrs_urgency','gsrs_constip','gsrs_hard','gsrs_incomplete'];

function run(gi, sys = {}, extra = {}, romeIn = {}) {
  const a = {};
  GI_IDS.forEach(id => (a[id] = gi));
  Object.assign(a, sys);
  const score = scoring.computeScores(a, {});
  const ex = Object.assign({ pss4Score: null, dys: {} }, extra, { rome: romeIn });
  const dys = scales.dysbiosisLens(ex);
  const prof = scoring.axisProfile(score, ex, dys);
  const heads = scoring.headlineOutputs(score, ex, dys);
  const pat = patterns.detectPatterns(score, ex, a);
  const rr = rome.classifyRomeIV(ex.rome, score.clusterNorm);
  // Mirror computeAll(): triage reads the correlate-only split, not the merged lens.
  const correlateLoad = { count: heads.primary.correlate.value, score: heads.primary.correlate.weightedScore, tier: heads.primary.correlate.tier, signals: (heads.primary.correlate.signals || []).map(l => ({ label: l })) };
  const conditions = scales.knownConditions(ex);
  const famhx = scales.familyHistory(ex);
  const obstetric = scales.obstetricHistory(ex);
  const gynOverlap = (typeof a.gy_cyclical === 'number' && a.gy_cyclical >= 2) && (typeof a.gsrs_pain === 'number' && a.gsrs_pain >= 2);
  const anthro = scales.anthropometrics(ex, {});
  const labs = scales.knownLabs(ex);
  const fired = req('redflags.js').firedRedFlags(extra.redflags || {});
  const tri = triage(score, pat, fired, correlateLoad, {
    impactBand: prof.impact.band, romeResult: rr, adhesionSurgery: false,
    knownConditions: conditions, conditionNotes: conditions.notes, labResults: labs,
    family: famhx, gynOverlap, obstetric, anthro,
  });
  return { score, prof, heads, pat, rr, tri, correlateLoad, obstetric, anthro };
}
const reasons = (tri) => [tri.reasons, ...tri.alsoConsider.map(x => x.reasons)].flat();

// 1. De-blend: GI=0 with systemic high → Gut Symptom Burden Minimal, systemic rises.
// 0–4 scale (D0): "maxed" is now 4, not 3, so the inflammatory/impact axes reach 100.
const r1 = run(0, { im_food_react: 4, im_infections: 4, im_allergies: 4, im_joint: 4, im_histamine: 4, sk_skin: 4, nu_hair: 4, nu_iron: 4, nu_mouth: 4, imp_work: 4, imp_social: 4, imp_food: 4, imp_global: 4 });
ok(r1.heads.primary.symptom.value === 0 && r1.heads.primary.symptom.band === 'Minimal', 'GI=0 keeps Gut Symptom Burden Minimal (de-blended)');
ok(r1.heads.secondary.inflammatory.value === 100 && r1.heads.secondary.impact.value === 100, 'systemic axes rise independently');

// 2. Option A headline shape.
ok(JSON.stringify(r1.heads.primaryList.map(o => o.key)) === JSON.stringify(['gut_symptom_burden','nutrient_malabsorption_risk','disruption_load','dysbiosis_correlate_load']), 'four primary outputs (Option A)');
ok(JSON.stringify(r1.heads.secondaryList.map(o => o.key)) === JSON.stringify(['inflammatory_burden','psychosocial_load','functional_impact']), 'three secondary axes');

// 3. GI high → Severe.
ok(run(3).heads.primary.symptom.band === 'Severe', 'GI high → Severe');

// 4. Orphan patterns reach a tier.
const r4 = run(2, { im_food_react: 3, im_histamine: 3, sk_skin: 3, im_infections: 3, im_allergies: 3, im_joint: 3 }, { pss4Score: 16 });
const r4r = reasons(r4.tri).map(r => r.text);
ok(r4r.some(t => /gut-brain/i.test(t)), 'gut_brain wired into triage');
ok(r4r.some(t => /inflammator/i.test(t)), 'inflammatory_immune wired into triage');

// 5. Nutrient tightening: single proxy no fire; lab-confirmed fires.
ok(!run(2, { nu_hair: 3 }).pat.some(p => p.id === 'nutrient_malabsorption'), 'single nutrient proxy does not fire');
ok(run(2, { nu_known_def: 1 }).pat.some(p => p.id === 'nutrient_malabsorption'), 'lab-confirmed deficiency fires');

// 6. Impact escalation independent of symptom severity.
const r6 = run(1, { imp_work: 3, imp_social: 3, imp_food: 3, imp_global: 3 });
ok(r6.tri.level === 2 && reasons(r6.tri).some(r => r.axis === 'impact'), 'high Impact escalates to Tier 2');

// 7. Rome IV / pattern subtype agree off the shared source (clean constipation).
const a7 = { gsrs_constip: 3, gsrs_hard: 3, gsrs_incomplete: 3 };
const score7 = scoring.computeScores(a7, {});
const rr7 = rome.classifyRomeIV({ painFreq: 3, onset: 3, rm_assoc_defecation: true, rm_assoc_freqchange: true }, score7.clusterNorm);
const pat7 = patterns.detectPatterns(score7, { dys: {} }, a7);
ok(rr7.subtype === 'IBS-C' && pat7.some(p => p.id === 'constipation_dominant'), 'Rome IV subtype agrees with bowel pattern');

// 8. Site-code prefix for cross-clinic patient IDs.
const dbDefault = storage.blankDB();
ok(storage.nextPatientCode(dbDefault).startsWith('BMG-'), 'default patient code prefix is BMG');
const dbSite = storage.blankDB(); dbSite.meta.siteCode = 'clina';
ok(storage.nextPatientCode(dbSite).startsWith('CLINA-'), 'site code prefixes patient IDs (upper-cased)');

// 9. PSS-4 reverse-scoring metadata present (drives the colour fix).
ok(Array.isArray(scales.PSS4_REVERSED) && scales.PSS4_REVERSED.length === 4 && scales.PSS4_REVERSED[1] === true && scales.PSS4_REVERSED[2] === true, 'PSS-4 reverse-scored items flagged (2 & 3)');

// 10. Triage reads the correlate split, not the merged lens: exposure-only
// history (antibiotics + microbiome surgery, no inferred correlates) must NOT
// produce a "dysbiosis-correlate signals" triage reason.
const rExp = run(2, {}, { meds: { abx: true }, abxCourses: 2, surgeries: ['gallbladder'], dys: {} });
ok(rExp.heads.primary.disruption.value >= 2, 'exposure history raises Disruption Load');
ok(rExp.correlateLoad.count === 0, 'no inferred correlates → Dysbiosis Correlate Load = 0');
ok(!reasons(rExp.tri).some(r => /dysbiosis-correlate/i.test(r.text)), 'exposure-only does NOT trigger a dysbiosis-correlate triage reason');

// 10b. E3 — weighted Dys-R stratification.
const dl0 = scales.dysbiosisLens({});
ok(dl0.score === 0 && dl0.tier === 'Low', 'E3: empty lens → score 0, tier Low');
// Two Minor signals (0.5 + 0.5 = 1.0) stay Low; a single Major (2.0) reaches Moderate.
const dlMinor = scales.dysbiosisLens({ dys: { stoolVar: 2, gasFoul: 2 } });
ok(dlMinor.score === 1.0 && dlMinor.tier === 'Low', 'E3: two Minor signals (1.0) stay Low — flat count would have over-called 2 signals');
const dlMajor = scales.dysbiosisLens({ dys: { postInfectious: 1 } });
ok(dlMajor.score === 2.0 && dlMajor.tier === 'Moderate', 'E3: one Major signal (post-infectious, 2.0) → Moderate on a single signal');
// Two Majors (post-infectious + fibre paradox = 4.0) → High.
const dlHigh = scales.dysbiosisLens({ dys: { postInfectious: 1, fibreParadox: 1 } });
ok(dlHigh.score === 4.0 && dlHigh.tier === 'High', 'E3: two Major signals (4.0) → High');
ok(scales.dysbiosisLens({ dys: { postInfectious: 1 } }).signals.find(s => s.k === 'postinf').w === 2.0,
  'E3: signals retain their weight for display/audit');
// Weighted tier drives Tier-3 routing (Moderate/High), replacing the flat ≥2 count.
const rDysHi = run(2, { gsrs_bloating: 2 }, { dys: { postInfectious: 1, fibreParadox: 1 } });
ok(reasons(rDysHi.tri).some(r => /High dysbiosis-correlate load|weighted Dys-R/i.test(r.text)),
  'E3: High weighted tier surfaces a Tier-3 microbiome-support reason with the weighted read');
// A single Minor correlate (0.5, Low) must NOT trigger the Tier-3 dysbiosis reason,
// where the old flat rule (≥2 signals) also wouldn't — but now Low is explicit.
const rDysLo = run(2, {}, { dys: { gasFoul: 2 } });
ok(!reasons(rDysLo.tri).some(r => /dysbiosis-correlate load/i.test(r.text)),
  'E3: a single Low-tier correlate does not trigger the Tier-3 dysbiosis reason');

// 11. diarrhoea_dominant now uses the shared bowelSubtype (agrees with Rome IV).
const rD = run(0, { gsrs_diarrhoea: 3, gsrs_loose: 3, gsrs_urgency: 3 }, {}, { painFreq: 3, onset: 3, rm_assoc_defecation: true, rm_assoc_freqchange: true });
ok(rD.rr.subtype === 'IBS-D' && rD.pat.some(p => p.id === 'diarrhoea_dominant'), 'Rome IV IBS-D agrees with diarrhoea_dominant firing');

// 12. gut_brain investigations are reachable (PI key was psych_gut_load before).
const rGB = run(2, {}, { pss4Score: 16 });
ok(rGB.pat.some(p => p.id === 'gut_brain'), 'gut_brain pattern fires');
ok((rGB.tri.investigations || []).some(i => /PHQ-9/.test(i)), 'gut_brain investigations now appear in triage output');

// 13. Unified revealMet predicate (item + cluster + any) drives the section reveal.
const cn = (a) => scoring.computeScores(a, {}).clusterNorm;
const sec = (id) => schema.SECTIONS.find(s => s.id === id).revealIf;
const aCon = { gsrs_constip: 3, gsrs_hard: 3, gsrs_incomplete: 3 };
ok(schema.revealMet(sec('AR'), { answers: aCon, clusterNorm: cn(aCon) }) === true, 'constipation cluster reveals pelvic-floor (AR)');
const aRef = { gsrs_heartburn: 3, gsrs_regurg: 3 };
ok(schema.revealMet(sec('UG'), { answers: aRef, clusterNorm: cn(aRef) }) === true, 'reflux cluster reveals upper-GI (UG)');
ok(schema.revealMet(sec('SY'), { answers: { bg_fatigue: 2 }, clusterNorm: {} }) === true, 'fatigue reveals systemic/autonomic (SY)');
const ctx0 = { answers: {}, clusterNorm: {} };
ok(!schema.revealMet(sec('AR'), ctx0) && !schema.revealMet(sec('UG'), ctx0) && !schema.revealMet(sec('SY'), ctx0), 'blank form reveals no targeted sections');
ok(schema.revealMet(undefined, ctx0) === true, 'no revealIf → always shown (core/red-flags never gated)');

// 13a. D0b — cluster reveal thresholds re-tuned ×0.75 for the 0–4 scale. A
// mild-moderate constipation picture (Constipation norm ≈ 0.33: one item at 2,
// two at 1, of the 3-item cluster max 12) must now reveal AR under the new 0.30
// gate — it would have stayed HIDDEN under the old 0.40 gate, silently dropping
// the pelvic-floor section for exactly the patients it targets.
const aConMild = { gsrs_constip: 2, gsrs_hard: 1, gsrs_incomplete: 1 };
ok(cn(aConMild).Constipation < 0.40 && cn(aConMild).Constipation >= 0.30,
  'D0b: mild-moderate constipation norm lands in the re-tuned (0.30–0.40) reveal window on the 0–4 scale');
ok(schema.revealMet(sec('AR'), { answers: aConMild, clusterNorm: cn(aConMild) }) === true,
  'D0b: re-tuned 0.30 gate reveals AR for a mild-moderate constipation picture (old 0.40 would have hidden it)');
// F0 — paradoxical pelvic-floor arm. Incomplete evacuation ≥2 with NO constipation-
// cluster burden must reveal AR via the new gsrs_incomplete item arm, so F2
// (PFD-paradoxical) can fire for straining/incomplete WITHOUT constipation.
const aParadox = { gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 2 };
ok(cn(aParadox).Constipation < 0.30, 'F0: paradoxical fixture keeps the Constipation cluster below the 0.30 gate');
ok(schema.revealMet(sec('AR'), { answers: aParadox, clusterNorm: cn(aParadox) }) === true,
  'F0: gsrs_incomplete≥2 alone reveals AR (paradoxical pelvic-floor arm, no constipation cluster)');

// 13b. Item-level follow-up + card gates.
ok(schema.revealMet({ type: 'item', id: 'im_histamine', min: 2 }, { answers: { im_histamine: 2 } }) === true, 'histamine follow-up reveals at ≥2');
ok(schema.revealMet({ type: 'item', id: 'im_histamine', min: 2 }, { answers: { im_histamine: 1 } }) === false, 'histamine follow-up hidden below threshold');
ok(schema.revealMet({ type: 'item', id: 'gsrs_pain', min: 1 }, { answers: { gsrs_pain: 0 } }) === false, 'pain/Rome cards hidden when gsrs_pain == 0');
ok(schema.revealMet({ type: 'item', id: 'gsrs_pain', min: 1 }, { answers: { gsrs_pain: 1 } }) === true, 'pain/Rome cards shown when gsrs_pain ≥ 1');
// free-text follow-up items exist and carry revealIf
ok(schema.QUESTIONS.some(q => q.id === 'nu_known_def_which' && q.freeText && q.revealIf), 'nu_known_def_which is a gated free-text follow-up');

// 14. Conditional sections never enter the validated Index.
const aPelvic = {}; GI_IDS.forEach(id => (aPelvic[id] = 0));
aPelvic.ar_incont_urge = 3; aPelvic.ar_straining = 3; aPelvic.ar_blockage = 3;
ok(scoring.computeScores(aPelvic, {}).index === 0, 'answered targeted (AR) items do not move the GSRS Index');

// 15. pelvic_floor pattern fires and reaches Tier 2 (physio candidacy).
const rPF = run(2, { ar_incont_urge: 3, ar_straining: 3, ar_blockage: 3 });
ok(rPF.pat.some(p => p.id === 'pelvic_floor' && p.axis === 'pelvic'), 'pelvic_floor pattern fires (axis pelvic)');
ok(reasons(rPF.tri).some(r => /pelvic-floor physiotherapy/i.test(r.text)), 'pelvic_floor reaches a triage tier (physio candidacy)');
// 15b. Each faecal-incontinence subtype independently fires the pattern.
['ar_incont_urge', 'ar_incont_passive', 'ar_incont_flatus'].forEach(id =>
  ok(run(2, { [id]: 3 }).pat.some(p => p.id === 'pelvic_floor'), `${id} alone fires pelvic_floor`));

// 15c. F2 — PFD-paradoxical (dyssynergic defecation). Straining/incomplete
// evacuation WITH normal-or-loose stool and a LOW constipation cluster fires the
// paradoxical pattern and routes to pelvic-floor PT + anorectal assessment (not
// laxatives) — separately from a constipation-dominant read.
const rPara = run(0, { ar_straining: 3, gsrs_constip: 0, gsrs_hard: 0, gsrs_diarrhoea: 2, gsrs_loose: 2 }, { bristol: 4 });
ok(rPara.pat.some(p => p.id === 'pelvic_floor_paradox' && p.axis === 'pelvic'),
  'F2: straining + normal/loose stool + low constipation cluster fires pelvic_floor_paradox');
ok(reasons(rPara.tri).some(r => /dyssynergic|not laxatives/i.test(r.text)),
  'F2: paradoxical PFD routes to pelvic-floor PT + anorectal assessment (not laxatives)');
// It must NOT fire for an ordinary hard-stool constipation picture (that's
// constipation_dominant's job) — the paradox pattern needs non-hard stool.
const rHardConstip = run(0, { gsrs_constip: 3, gsrs_hard: 3, gsrs_incomplete: 3, ar_straining: 3 }, { bristol: 1 });
ok(!rHardConstip.pat.some(p => p.id === 'pelvic_floor_paradox'),
  'F2: a hard-stool constipation picture does NOT fire the paradoxical pattern (constipation_dominant covers it)');
ok(rHardConstip.pat.some(p => p.id === 'constipation_dominant'),
  'F2: the hard-stool picture still fires constipation_dominant (no regression)');
// Paradoxical arm can also fire off gsrs_incomplete when the sibling constipation
// items are low (F0 reveal fixture) — normal/loose stool required.
const rParaInc = run(0, { gsrs_incomplete: 2, gsrs_constip: 0, gsrs_hard: 0, gsrs_diarrhoea: 2 }, { bristol: 4 });
ok(rParaInc.pat.some(p => p.id === 'pelvic_floor_paradox'),
  'F2: incomplete evacuation with low constipation cluster + normal stool fires the paradoxical pattern');
ok(/pelvic_floor_paradox: \[/.test(html) && /balloon expulsion test/i.test(html),
  'F2: paradoxical PFD has its own investigations (anorectal physiology / balloon expulsion)');

// 15d. Tranche G — 2-D severity × frequency matrix (read-only display dimension).
const sfScore = scoring.computeScores(Object.fromEntries(GI_IDS.map(id => [id, 3])), {});
// High severity everywhere; Indigestion also high-frequency (band 3 = daily) →
// priority quadrant; Reflux with no frequency answered → incomplete quadrant.
const sfCells = scoring.severityFrequencyMatrix(sfScore, { clusterFreq: { Indigestion: 3 } });
const indig = sfCells.find(c => c.cluster === 'Indigestion');
ok(indig && indig.sevHi === true && indig.freqHi === true && indig.quadrant === 'priority',
  'G: severe + frequent cluster → priority quadrant');
const reflux = sfCells.find(c => c.cluster === 'Reflux');
ok(reflux && reflux.sevHi === true && reflux.freqHi === null && reflux.quadrant === null,
  'G: severe but frequency-unanswered → incomplete (no quadrant)');
// Frequency is read-only: adding a frequency answer must NOT move the index.
const sfNoFreq = scoring.computeScores(Object.fromEntries(GI_IDS.map(id => [id, 2])), {});
ok(typeof sfNoFreq.index === 'number', 'G: index computes independent of the frequency dimension');
ok(/function severityFrequencyCard/.test(html) && /Symptom severity × frequency/.test(html),
  'G: severity × frequency widget rendered in the clinician surfaces');

// G2. Shared sevFreqBodyHtml renderer: no-frequency fallback vs 2D quadrant grid,
// used identically by both the on-screen card and buildClinicianPrint (item 3).
ok(/function sevFreqBodyHtml\(cells\)/.test(html), 'G2: shared severity×frequency body renderer exists');
ok(/sevFreqBodyHtml\(sfCells\)/.test(html), 'G2: print item 3 uses the shared renderer (not its own flat table)');
const sfBodyFn = html.match(/function sevFreqBodyHtml\(cells\)\s*\{[\s\S]*?\n\}\n/)[0];
ok(/Frequency: Not recorded this visit/.test(sfBodyFn), 'G2: no-frequency-anywhere state renders the clean fallback header');
ok(/grid-template-columns/.test(sfBodyFn) && /Episodic/.test(sfBodyFn) && /Frequent/.test(sfBodyFn), 'G2: frequency-present state renders a real 2D quadrant grid');
// No-frequency-anywhere fixture (severity only, no clusterFreq/painFreq answered).
const sfAllNoFreq = scoring.severityFrequencyMatrix(sfScore, {});
ok(sfAllNoFreq.length > 0 && sfAllNoFreq.every(c => c.freqIdx == null), 'G2: fixture with no frequency answers has every cell freqIdx null');
// Low severity + low frequency → low quadrant.
const sfLow = scoring.computeScores({ gsrs_bloating: 1 }, {});
const sfLowCells = scoring.severityFrequencyMatrix(sfLow, { clusterFreq: { Indigestion: 0 } });
const lowIndig = sfLowCells.find(c => c.cluster === 'Indigestion');
ok(lowIndig && lowIndig.quadrant === 'low', 'G: mild + infrequent cluster → low quadrant');

// 15e. Tranche G — intervention overlay (annotation only, never scored).
ok(scales.interventionSummary({}) === null, 'G: no interventions → null summary');
ok(scales.interventionSummary({ interventionChips: ['diet_lowfodmap', 'pelvic_pt'] }) === 'Low-FODMAP trial, Pelvic-floor physiotherapy',
  'G: chip interventions render as human-readable labels');
ok(scales.interventionSummary({ interventionChips: ['ppi'], interventionNotes: '20mg om, review 6/52' }) === 'Acid suppression (PPI/H2) trial · 20mg om, review 6/52',
  'G: chips + free-text notes combine in the summary');
ok(/interventionChips: \[\], interventionNotes: ''/.test(html), 'G: blankExtras seeds the intervention fields');
ok(/function interventionCard/.test(html) && /Interventions this visit/.test(html),
  'G: editable intervention card rendered on the clinician surface');
ok(/interventions:.*interventionSummary|↳ interventions/.test(html),
  'G: interventions overlaid on the trend rows');

// 16. functional_dyspepsia fires on early satiety / fullness.
const rFD = run(2, { ug_earlysat: 3, ug_fullness: 3 });
ok(rFD.pat.some(p => p.id === 'functional_dyspepsia'), 'functional_dyspepsia pattern fires');

// 17. Expanded chip lists + helpers.
ok(scales.KNOWN_CONDITIONS.length >= 15 && scales.KNOWN_CONDITIONS.some(c => c.id === 'sibo'), 'KNOWN_CONDITIONS expanded (incl. SIBO)');
ok(scales.MED_CONFOUNDERS.some(m => m.id === 'glp1'), 'MED_CONFOUNDERS includes GLP-1 agonist');
ok(scales.FAMILY_HISTORY.length === 3, 'FAMILY_HISTORY chip set present');
ok(scales.medConfounders({ medsConfounders: ['glp1', 'opioid'] }).count === 2, 'medConfounders() counts selected meds');

// 18. Family history moved out of red flags + wired into triage.
ok(!req('redflags.js').RED_FLAGS.some(f => f.id === 'rf_famhist'), 'rf_famhist removed from red flags');
const rFamCancer = run(1, {}, { familyHistory: ['fh_cancer'] });
ok(reasons(rFamCancer.tri).some(r => /colorectal screening/i.test(r.text)), 'fh_cancer → Tier-2 screening candidacy');
ok((rFamCancer.tri.investigations || []).some(i => /colonoscopy/i.test(i)), 'fh_cancer adds a screening investigation');
const rFamCeliac = run(1, {}, { familyHistory: ['fh_celiac'] });
ok((rFamCeliac.tri.familyNotes || []).some(n => /coeliac serology/i.test(n)), 'fh_celiac → coeliac-serology family note');

// 19. Diagnosed-condition guidance + gynaecological overlap.
const rIBS = run(2, {}, { conditions: ['ibs'] });
ok((rIBS.tri.conditionGuidance || []).some(n => /manage as IBS/i.test(n)), 'diagnosed IBS → management guidance note');
const rGyn = run(2, { gy_cyclical: 3 });
ok(rGyn.tri.gynNote && /endometriosis/i.test(rGyn.tri.gynNote), 'cyclical flare + pain → gyn overlap note');

// 20. Dead microbiome field removed from axisProfile.
ok(scoring.axisProfile(scoring.computeScores({}, {}), {}, { count: 0 }).microbiome === undefined, 'axisProfile microbiome field removed');

// 21. Clinical-review changes 1 & 2 — alarm wording quantified / lowered.
const RF = req('redflags.js').RED_FLAGS;
const rfWeight = RF.find(f => f.id === 'rf_weightloss');
const rfOnset  = RF.find(f => f.id === 'rf_newonset50');
ok(/5%/.test(rfWeight.label), 'weight-loss alarm quantified (≈5% threshold in wording)');
ok(/45/.test(rfOnset.label) && /6 weeks/i.test(rfOnset.label) && !/age 50/.test(rfOnset.label), 'new-onset alarm lowered to 45 + persistence (≥6 weeks)');

// 21b. E2 — red-flag urgency stratification.
const rfMod = req('redflags.js');
ok(RF.every(f => ['emergency', 'urgent', 'routine'].includes(f.urgency)), 'E2: every red flag carries a valid urgency tier');
ok(rfMod.RED_FLAGS.find(f => f.id === 'rf_hematemesis').urgency === 'emergency' &&
   rfMod.RED_FLAGS.find(f => f.id === 'rf_bleeding').urgency === 'emergency' &&
   rfMod.RED_FLAGS.find(f => f.id === 'rf_jaundice').urgency === 'emergency',
  'E2: acute GI-bleed / jaundice features map to emergency');
ok(rfMod.RED_FLAGS.find(f => f.id === 'rf_weightloss').urgency === 'urgent' &&
   rfMod.RED_FLAGS.find(f => f.id === 'rf_nocturnal').urgency === 'urgent',
  'E2: weight-loss + nocturnal map to urgent (locked decision #4 — not routine)');
ok(rfMod.topUrgency({ rf_nocturnal: true, rf_hematemesis: true }) === 'emergency',
  'E2: topUrgency returns the highest tier present (emergency > urgent)');
ok(rfMod.topUrgency({ rf_nocturnal: true }) === 'urgent' && rfMod.topUrgency({}) === null,
  'E2: topUrgency reflects urgent-only, and is null with no flags');
const fbu = rfMod.firedByUrgency({ rf_nocturnal: true, rf_hematemesis: true });
ok(fbu[0].tier === 'emergency' && fbu[1].tier === 'urgent', 'E2: firedByUrgency groups highest-acuity first');
// Tiering never downgrades below refer — any fired flag still forces Tier 1.
const rEmerg = run(0, {}, { redflags: { rf_hematemesis: true } });
ok(rEmerg.tri.level === 1 && reasons(rEmerg.tri).some(r => /same-day/i.test(r.text)),
  'E2: emergency flag → Tier 1 with same-day wording in the reason');
const rUrg = run(0, {}, { redflags: { rf_nocturnal: true } });
ok(rUrg.tri.level === 1 && reasons(rUrg.tri).some(r => /within-days|prompt/i.test(r.text)),
  'E2: urgent flag → Tier 1 with prompt/within-days wording (never below refer)');

// 22. Change 5a — diabetes/thyroid/PCOS now carry clinNotes → conditionGuidance.
['thyroid', 'diabetes', 'pcos'].forEach(id =>
  ok(!!scales.KNOWN_CONDITIONS.find(c => c.id === id).clinNote, `${id} has a clinNote (wired into interpretation)`));
const rDiab = run(2, {}, { conditions: ['diabetes'] });
ok((rDiab.tri.conditionGuidance || []).some(n => /gastroparesis/i.test(n)), 'diagnosed diabetes → gastroparesis interpretation note');

// 23. Change 5b/5c — probiotic naming softened; manual therapy hedged.
const rDis = run(2, {}, { meds: { abx: true } });
ok((rDis.tri.investigations || []).some(i => /strain selection/i.test(i)) &&
   !(rDis.tri.investigations || []).some(i => /Lactobacillus rhamnosus/i.test(i)), 'probiotic recommendation softened (no named organisms)');
ok(/after.*assess|once other causes/i.test(req('triage.js').TIERS[2].action), 'Tier-2 action hedges manual therapy as post-assessment adjunct');

// 24. Change 4 — obstetric history exported, risk-graded, drives reveal + note.
ok(Array.isArray(scales.OBSTETRIC_HISTORY) && scales.OBSTETRIC_HISTORY.length === 4, 'OBSTETRIC_HISTORY chip set present');
ok(scales.obstetricHistory({ obstetric: ['ob_vaginal'] }).risk === true &&
   scales.obstetricHistory({ obstetric: ['ob_vaginal'] }).highRisk === false, 'vaginal birth = pelvic risk, not high-risk');
ok(scales.obstetricHistory({ obstetric: ['ob_instrumental'] }).highRisk === true, 'assisted birth flagged high-risk');
// AR section reveals on the pelvicRisk flag even with no constipation/urgency.
const arRevealIf = schema.SECTIONS.find(s => s.id === 'AR').revealIf;
ok(schema.revealMet(arRevealIf, { answers: {}, clusterNorm: {}, flags: { pelvicRisk: true } }) === true,
   'obstetric pelvicRisk flag reveals the AR (pelvic-floor) section');
ok(schema.revealMet(arRevealIf, { answers: {}, clusterNorm: {}, flags: { pelvicRisk: false } }) === false,
   'no symptom signal + no pelvicRisk → AR stays hidden');
const rOb = run(1, {}, { obstetric: ['ob_instrumental'] });
ok(rOb.tri.pelvicNote && /pelvic-floor/i.test(rOb.tri.pelvicNote) && /higher risk/i.test(rOb.tri.pelvicNote),
   'obstetric high-risk history → pelvic-floor interpretation note');

// 25. Anthropometrics — BMI / WHtR math, band boundaries, notes, minor caveat.
const A = (ex, session = {}) => scales.anthropometrics(ex, session);
ok(A({ heightCm: 170, weightKg: 68 }).bmi === 23.5, 'BMI computed (170cm/68kg → 23.5)');
ok(A({ heightCm: 170, waistCm: 84 }).whtr === 0.49, 'WHtR computed (84/170 → 0.49)');
ok(A({ heightCm: 170 }).bmi === null && A({ weightKg: 68 }).bmi === null, 'BMI null when an input missing');
ok(A({ heightCm: 170 }).whtr === null, 'WHtR null when waist missing');
// BMI band boundaries (height 100cm makes BMI == weight).
ok(A({ heightCm: 100, weightKg: 18.4 }).bmiBand === 'Underweight', 'BMI 18.4 → Underweight');
ok(A({ heightCm: 100, weightKg: 18.5 }).bmiBand === 'Normal', 'BMI 18.5 → Normal');
ok(A({ heightCm: 100, weightKg: 25 }).bmiBand === 'Overweight', 'BMI 25 → Overweight');
ok(A({ heightCm: 100, weightKg: 30 }).bmiBand === 'Obese', 'BMI 30 → Obese');
// WHtR band boundaries (height 100cm makes WHtR == waist/100).
ok(A({ heightCm: 100, waistCm: 49 }).whtrBand === 'Healthy', 'WHtR 0.49 → Healthy');
ok(A({ heightCm: 100, waistCm: 50 }).whtrBand === 'Increased', 'WHtR 0.50 → Increased');
ok(A({ heightCm: 100, waistCm: 60 }).whtrBand === 'High', 'WHtR 0.60 → High');
// Notes.
ok(A({ heightCm: 100, weightKg: 17 }).notes.some(n => /malabsorption/i.test(n)), 'low BMI → malabsorption note');
ok(A({ heightCm: 100, waistCm: 55 }).notes.some(n => /cardiometabolic/i.test(n)), 'WHtR ≥0.5 → cardiometabolic note');
ok(A({ heightCm: 170, weightKg: 68, waistCm: 80 }).notes.length === 0, 'normal anthropometrics → no notes');
ok(A({}).notes.length === 0 && A({}).bmi === null, 'empty anthropometrics → no notes, null values');
// Minor caveat — adult BMI bands suppressed for under-18s.
const minor = A({ heightCm: 100, weightKg: 17 }, { age: '12' });
ok(minor.bmi === 17 && minor.bmiBand === null && /Under 18/i.test(minor.caveat || ''), 'under-18 → BMI value shown, band suppressed, caveat set');
// Triage note wiring (notes-only — never changes the Tier).
const rAnthro = run(0, {}, { heightCm: 100, weightKg: 17 });
ok(rAnthro.tri.anthroNote && /malabsorption/i.test(rAnthro.tri.anthroNote), 'low BMI surfaces as triage anthroNote');
ok(rAnthro.tri.level === run(0).tri.level, 'anthropometrics does not change the triage Tier');

// 26. Reorg invariants — sections unchanged, de-blend still holds.
ok(['GI','IM','BG','NU','IMP','AR','UG','SY'].every(id => schema.SECTIONS.some(s => s.id === id)), 'all sections still present after reorg');
ok(run(0, { im_food_react: 3, im_histamine: 3, sk_skin: 3 }, { heightCm: 100, weightKg: 30, waistCm: 70 }).heads.primary.symptom.value === 0, 'GSRS Index unchanged by anthropometrics / systemic answers');

// 27. Clinician-only tool — the patient summary print has been removed. There is
// a single (clinician) report; no buildPatientPrint / patient-facing copy maps /
// "Patient summary" button, and printSummary() takes no mode argument.
ok(!/function buildPatientPrint/.test(html), 'patient summary print removed (buildPatientPrint gone)');
ok(!/PT_HEAD_DESC|PT_SUBTYPE_DESC/.test(html), 'patient-only copy maps removed (PT_HEAD_DESC / PT_SUBTYPE_DESC gone)');
ok(!/Patient summary/.test(html), 'the "Patient summary" print button is gone');
ok(!/printSummary\('patient'\)|printSummary\('clinician'\)/.test(html), 'printSummary() is mode-less (clinician-only)');
ok(/function printSummary\(includeAppendix\)/.test(html) && /area\.appendChild\(buildClinicianPrint\(lastCalc, \{ includeAppendix: !!includeAppendix \}\)\)/.test(html),
  'printSummary() renders the clinician report directly (appendix opt-in via checkbox)');
ok(!/CONCERN_BANDS/.test(html), 'dead CONCERN_BANDS set removed');

// 28. Clinician report — structure (source-level; DOM renderer not loadable here).
const clFn = html.match(/function buildClinicianPrint\(c, opts\)\s*\{[\s\S]*?\n\}\n/);
ok(!!clFn, 'buildClinicianPrint present');
const clSrc = clFn ? clFn[0] : '';
// Report consolidation redesign — descriptive section headers (no running item
// numbers), read from the REPORT_SECTIONS source of truth via sectionTitle(key).
// Page 1 is a pure at-a-glance (score, red flags, impression, burden matrix);
// the triage verdict + full plan are reunited on page 2 (no cross-page pointer);
// the overloaded "lenses" split into Interpretation + History & context.
ok(/clinicalImpression\(c\)/.test(clSrc), 'clinician: clinical impression generated');
// The "not a diagnosis" caveat used to be restated inside Clinical impression,
// duplicating the report footer's identical sentence — now stated exactly
// once, in the footer, at the very end of the report.
ok(!/Screening synthesis only — not a diagnosis/.test(html), 'clinician: impression no longer restates its own "not a diagnosis" caveat (de-duplicated)');
ok((html.match(/not a diagnosis or prescription\. Apply clinical judgement/g) || []).length === 2,
  'clinician: single "not a diagnosis" disclaimer at the end of each surface (print footer + on-screen closing note)');

// Page-group headers + hero.
ok(/Page 1 · At a glance/.test(clSrc), 'clinician: Page 1 group header present');
ok(/Page 2 · Assessment &amp; clinical detail/.test(clSrc), 'clinician: Page 2 group header present');
ok(/Page 3\+ · Appendix/.test(clSrc), 'clinician: Page 3+ group header present');
ok(/class="pr-hero"/.test(clSrc), 'clinician: headline score hero present in print');
ok(clSrc.indexOf('Page 1 ·') < clSrc.indexOf('Page 2 ·') && clSrc.indexOf('Page 2 ·') < clSrc.indexOf('Page 3+ ·'),
  'clinician: the 3 pages appear in order');

// Every section header present, sourced from REPORT_SECTIONS via sectionTitle(key).
// (History & context + Modifiable drivers are now one 'context' section; 'trend'
// only renders when a prior visit exists, so it may sit after 'context'.)
['flags', 'impression', 'burden', 'plan', 'interp', 'context', 'trend', 'actions', 'appendix'].forEach(k => {
  ok(clSrc.includes(`sectionTitle('${k}')`), `clinician: ${k} section header present`);
});
// Sections appear in the intended order across the report — hybrid page-1 reorg
// (item 8): plan (triage box + care-track badges) then flags lead page 1, then
// impression (+ peak alert + clinical flags), then the burden matrix; page 2
// opens with interp → context → trend → actions (last) → appendix.
const secIdx = ['plan', 'flags', 'impression', 'burden', 'interp', 'context', 'trend', 'actions', 'appendix'].map(k => clSrc.indexOf(`sectionTitle('${k}')`));
ok(secIdx.every((v, i) => v >= 0 && (i === 0 || v > secIdx[i - 1])), 'clinician: sections appear in the intended order (plan → … → appendix)');
// Page 1 is: hero → triage/plan + care-track badges → red flags → impression +
// peak alert + clinical flags → burden matrix (LAST section before page-2 break).
ok(clSrc.indexOf('class="pr-hero"') < clSrc.indexOf(`sectionTitle('plan')`), 'clinician: hero leads, ahead of the triage/plan box');
ok(clSrc.indexOf(`sectionTitle('burden')`) < clSrc.indexOf('Page 2 ·'), 'clinician: burden matrix is the last page-1 section');

// REPORT_SECTIONS is the single source of truth both surfaces read from.
const reportSecMatch = html.match(/const REPORT_SECTIONS = \{[\s\S]*?\n\};/);
const reportSecSrc = reportSecMatch ? reportSecMatch[0] : '';
ok(!!reportSecMatch, 'REPORT_SECTIONS constant defined (single source of truth for section titles)');
[['flags', 'Red flags'], ['impression', 'Clinical impression'], ['burden', 'Symptom burden — severity × frequency'],
 ['plan', 'Assessment & plan'], ['interp', 'Interpretation'], ['context', 'Context & drivers'],
 ['trend', 'Longitudinal trend'], ['actions', 'Suggested Actions'], ['appendix', 'Full item-level responses']].forEach(([k, title]) => {
  ok(reportSecSrc.includes(`${k}:`) && reportSecSrc.includes(`'${title}'`), `REPORT_SECTIONS.${k} === '${title}'`);
});
ok(/function sectionTitle\(key\)/.test(html), 'sectionTitle() helper defined');
ok(!/reportItemHeader|REPORT_ITEMS/.test(html), 'old numbered item-header scheme fully removed');

// Assessment & plan reunites verdict + plan: the triage box, investigations, and
// physiotherapy candidacy all sit inside the plan section — no cross-page pointer.
ok(clSrc.indexOf(`sectionTitle('plan')`) < clSrc.indexOf('pr-triage'), 'clinician: triage box sits inside the plan section');
// Suggested Actions (2-column investigations/management) now sits in its own
// 'actions' section at the END of page 2, after Context & drivers/trend — a
// clinician reads the verdict + evidence before the action list (item 1).
ok(clSrc.indexOf(`sectionTitle('context')`) < clSrc.indexOf(`sectionTitle('actions')`)
  && clSrc.indexOf(`sectionTitle('actions')`) < clSrc.indexOf('Page 3+'),
  'clinician: Suggested Actions sits after Context & drivers, before the appendix');
ok(clSrc.indexOf('pr-triage') < clSrc.indexOf('Page 2 ·'), 'clinician: the triage/plan is on page 1 (hybrid reorg), not page 2');
ok(!/are in item 6|item 6 \(/.test(clSrc), 'clinician: the old cross-page "see item 6" pointer is gone');
// Readability trims (de-wall): "also consider" is tier-names-only (no per-pattern
// reason dump), and the triage box carries only action-modifying "Clinical flags"
// — the fact-restatement notes (conditionNote/medNote/anthroNote/duration/bowelFreq)
// are NOT repeated in the plan (they live once, in Context & drivers).
ok(/careTrackBadgesHtml\(tri\.alsoConsider\)/.test(clSrc), 'clinician: "Also consider" rendered as care-track badge chips (tier names only)');
ok(/function careTrackBadgesHtml\(alsoConsider\)/.test(html) && /alsoConsider\.map\(\(a, i\)/.test(html) && !/a\.reasons\.map\(r => esc\(r\.text\)\)\.join/.test(html),
  'clinician: care-track badges built from alsoConsider tier names, not a per-pattern reason dump');
ok(/Clinical flags:/.test(clSrc) && /planFlags = dedupeList/.test(clSrc), 'clinician: plan shows curated "Clinical flags" (deduped)');
ok(!/tri\.conditionNote \? \[tri\.conditionNote\]|tri\.medNote \? \[tri\.medNote\]|tri\.anthroNote \? \[tri\.anthroNote\]/.test(clSrc),
  'clinician: fact-restatement notes (condition/med/anthro) removed from the plan box (shown once in Context & drivers)');
// Investigations + patterns are deduped/capped for readability.
// Investigations dedup/cap now live in actionColumnsHtml() (2-column Suggested
// Actions), called from clSrc but defined ahead of it — check html.
ok(/function actionColumnsHtml\(tri, physio\)/.test(html) && /dedupeList\(tri\.investigations \|\| \[\]\)/.test(html),
  'clinician: investigations list is de-duplicated');
ok(/capList\(group\.priority\.concat\(group\.consider\), 10\)/.test(html),
  'clinician: investigations/management lists are capped (with a "+N more" line)');
// Suggested Actions items are further split by priority — the top-ranked
// firing pattern's items vs everything else (lower-ranked patterns, Rome IV
// subtype/family add-ons, physiotherapy candidacy).
ok(/investigationsRanked/.test(html) && /r\.rank === 0 \? bucket\.priority : bucket\.consider/.test(html),
  'clinician: Suggested Actions items are tagged Priority vs Also-consider by pattern rank');
ok(/capList\(patterns, 6\)/.test(clSrc), 'clinician: patterns table capped to the top 6 prominent patterns');
ok(/function dedupeList\(arr\)/.test(html) && /function capList\(arr, n\)/.test(html), 'dedupeList/capList helpers defined');

// Interpretation: patterns → Rome IV → axis & domain profile, in order.
ok(clSrc.indexOf(`sectionTitle('interp')`) < clSrc.indexOf('Prominent patterns'), 'clinician: Patterns sits inside the interpretation section');
ok(clSrc.indexOf('Prominent patterns') < clSrc.indexOf('>Axis &amp; domain profile<'), 'clinician: Patterns leads the Axis & domain profile');
ok(clSrc.indexOf('Rome IV-informed bowel-pain pattern') < clSrc.indexOf('>Axis &amp; domain profile<'), 'clinician: Rome IV leads the Axis & domain profile');
ok((clSrc.match(/sectionTitle\('burden'\)/g) || []).length === 1, 'clinician: burden matrix section renders exactly once');

// Consolidation dedup checks:
// - the standalone overlapping "Microbiome-correlate signals" block is gone; each
//   load's signals fold under the merged axis & domain profile instead.
ok(!/\$\{lens\.count\}\/6/.test(clSrc), 'clinician: standalone overlapping microbiome-signal block (lens.count/6) removed from the print');
ok(/<b>Disruption Load<\/b>/.test(clSrc) && /<b>Dysbiosis Correlate Load<\/b>/.test(clSrc),
  'clinician: disruption/correlate signal lists folded under the axis & domain profile');
// The old "Axis profile" and "Domain breakdown" were two separate tables that
// repeated the same figure for 4 of 7 rows (Gut Symptom Burden/GI, Nutrient
// Risk/NU, Inflammatory/IM, Functional Impact/IMP) — now ONE table, ONE row
// each, Score/Max + % + Band together. Psychosocial load (PSS-4 composite) and
// Brain-gut & mood (raw item burden) are genuinely different numbers, so both
// still get their own row rather than being force-merged into one figure.
ok(!/>Axis profile</.test(clSrc) && !/>Domain breakdown</.test(clSrc), 'clinician: separate "Axis profile" / "Domain breakdown" tables are gone');
ok(/>Axis &amp; domain profile</.test(clSrc), 'clinician: merged into one "Axis & domain profile" table');
ok(/Psychosocial load/.test(clSrc) && /PSS-4 composite/.test(clSrc), 'clinician: Psychosocial load (PSS-4 composite) kept as its own row, distinct from Brain-gut & mood');
// - per-cluster severity lives once (burden matrix); the domain breakdown drops the ↳ rows.
ok(!/↳ \$\{esc\(k\)\}/.test(clSrc), 'clinician: domain breakdown no longer repeats per-cluster severity (lives once in the burden matrix)');
// - confidence + completeness stated once (hero) — no axis-profile "Confidence" row.
ok(!/<tr><td>Confidence<\/td><td colspan="3">/.test(clSrc), 'clinician: axis profile no longer repeats the Confidence row (hero owns it)');
// - the patient-language hero descriptor (sv.desc) is dropped from the clinician hero.
ok(!/pr-hero[\s\S]{0,400}esc\(sv\.desc/.test(clSrc), 'clinician: hero drops the patient-facing sv.desc descriptor');

// 28-unified. The clinician report is the single UNIFIED, LAYERED report: a
// plain-language impression synthesis on top of the detailed clinical sections,
// and it must surface every advanced lens (E2–F2 + Tranche G).
const impFn = html.match(/function clinicalImpression\(c\)\s*\{[\s\S]*?\n\}\n/);
const impSrc = impFn ? impFn[0] : '';
// The impression layer is a terse 2-line synthesis (line1/line2) that leads
// with the pattern and does NOT restate the band, index %, confidence, or the
// triage tier — all of which live once, in the hero score / results grid and
// the Assessment & plan section. It also no longer carries its own "not a
// diagnosis" caveat — that used to duplicate the report footer's identical
// sentence; now stated once, at the very end of the report (see above).
ok(/line1/.test(impSrc) && /line2/.test(impSrc), 'unified: impression layer returns a two-line clinical story ({line1, line2})');
ok(!/return \{ line1, line2, caveat \}/.test(impSrc) && !/const caveat = /.test(impSrc),
  'unified: impression layer no longer returns its own caveat (de-duplicated into the single report-end disclaimer)');
ok(!/peakAlerts\.map|score\.peakAlerts/.test(impSrc), 'unified: impression layer does not duplicate the itemized peak-symptom alert list (lives in the axis profile)');
ok(!/idxTxt|score\.index|score\.completeness/.test(impSrc), 'unified: impression layer no longer restates the index % / completeness (hero owns them)');
ok(/patterns \|\| \[\]\)\[0\]/.test(impSrc), 'unified: impression layer synthesises the single leading pattern (patterns[0]) into line 1, not an exhaustive list');
ok(/same-day assessment|prompt assessment/.test(impSrc), 'unified: impression layer leads red flags with E2 urgency');
ok(!/\btri\b/.test(impSrc.replace(/\/\/.*$/gm, '')), 'unified: impression layer no longer reads the triage object at all (Assessment & plan owns the tier)');
// Advanced reads all present in the report body.
ok(/sectionTitle\('burden'\)/.test(clSrc), 'unified: report contains the Tranche G severity × frequency burden section');
ok(/Interventions this visit/.test(clSrc), 'unified: report contains the Tranche G interventions section');
ok(/Peak-symptom alert/.test(clSrc), 'unified: report contains the E4 peak-symptom alert row');
ok(/highest: \$\{esc\(topMeta\.label\)\}|firedByUrgency/.test(clSrc), 'unified: report groups red flags by E2 urgency tier');
// Red flags on page 1 lead the axis & domain profile on page 2.
ok(clSrc.indexOf(`sectionTitle('flags')`) < clSrc.indexOf('>Axis &amp; domain profile<'), 'clinician: red flags (page 1) lead the axis & domain profile (page 2)');
// Physio candidacy callout.
// Physio candidacy no longer gets its own heading on either surface — it's
// folded into the Management & Therapeutics column of Suggested Actions (a
// therapeutic referral, same bucket as dietitian/psych referrals), on both
// the print report and the on-screen clinician tab.
ok(/physioCandidacy\(tri\)/.test(clSrc) && /actionColumnsHtml\(tri, physio\)/.test(clSrc)
  && /mgmt\.consider = dedupeList\(mgmt\.consider\.concat\(dedupeList\(\(physio \|\| \[\]\)\.map\(r => r\.text\)\)\)\)/.test(html),
  'clinician: physiotherapy candidacy folded into the Management & Therapeutics column (Also-consider tier)');
// Merged table carries no provenance column (the "Basis" validated/derived/
// draft detail was already dropped from print in an earlier pass; the
// on-screen axisProfileCard still shows it via the separate provTag() helper).
ok(!/prProv\(o\.validated\)/.test(clSrc), 'clinician: merged table shows no Basis/provenance column');
ok(/prBandPill\(o\.band\)/.test(clSrc), 'clinician: load/psychosocial rows colour-coded by band');
ok(!/Scores — primary/.test(clSrc) && !/Scores — secondary/.test(clSrc), 'clinician: two score tables merged into one');
// Every row (domain + load + psychosocial) is colour-coded by band, not just some.
ok(/bandForPct\(pct\)/.test(clSrc) && /bandPillFromPct/.test(clSrc), 'clinician: domain rows colour-coded by band');
// Numbers sit close to their label (no far-right-spaced columns) — the merged
// table intentionally drops the old fixed colgroup + text-align:right combo
// that spread Score/Max, %, and Band across a wide row.
ok(!/text-align:right.*Domain/.test(clSrc) && !clSrc.includes('col style="width:46%"'), 'clinician: merged table has no wide fixed-width right-aligned columns (mobile-readable)');
// Rome collapses when unanswered.
ok(/if \(rome\.answered\)/.test(clSrc) && /Not answered \(pain items/.test(clSrc), 'clinician: Rome IV collapses to one line when unanswered');
// Two-column item responses.
ok(/column-count:2/.test(clSrc), 'clinician: item-level responses use two columns');
// Helper unit-style checks via source presence (functions are closure-bound).
ok(/function clinicalImpression\(c\)/.test(html) && /function physioCandidacy\(tri\)/.test(html), 'clinician: impression + physio helpers defined');
ok(/function prBandPill\(band\)/.test(html), 'clinician: print band-pill helper defined');
ok(!/function prProv\(/.test(html), 'clinician: dead prProv() helper removed (Basis column dropped, never called since)');

// A4 regression. physioCandidacy()'s regex must not match the bare word
// "visceral" (used as GI-motility jargon in constipation_dominant's label,
// NOT a manual-therapy signal) — previously this mis-flagged plain IBS-C as
// physiotherapy candidacy. Extract the function body and check the regex
// literal directly, plus confirm the constipation label no longer uses the
// ambiguous word at all.
const physioFnMatch = html.match(/function physioCandidacy\(tri\) \{[\s\S]*?\n\}/);
const physioSrc = physioFnMatch ? physioFnMatch[0] : '';
ok(!!physioSrc, 'physioCandidacy function body extracted for regex check');
const regexLiteralMatch = physioSrc.match(/\/[^/]*manual[^/]*\/i/);
ok(!!regexLiteralMatch && !/\bvisceral\b/.test(regexLiteralMatch[0]),
  'physioCandidacy regex no longer matches bare "visceral" (A4: no IBS-C mis-flag)');
ok(!/'Constipation-dominant \(visceral/.test(html), 'constipation_dominant label no longer contains "visceral"');
ok(/'Constipation-dominant \(slow-transit\) pattern'/.test(html), 'constipation_dominant relabelled to slow-transit');
// Adhesion-surgery candidacy (a genuine manual-therapy signal) still matches.
ok(/manual\[- \]therapy|pelvic-floor/.test(physioSrc), 'physioCandidacy regex still matches genuine manual-therapy/pelvic-floor wording');

// 29. Clinician TAB (on-screen) parity — source-level (DOM renderer not loadable).
const rcFn = html.match(/function renderClinician\(\)\s*\{[\s\S]*?\n\}\n/);
ok(!!rcFn, 'renderClinician present');
const rcSrc = rcFn ? rcFn[0] : '';
ok(/clinicalImpression\(c\)/.test(rcSrc), 'clinician tab: clinical impression added');
ok(rcSrc.indexOf('clinicalImpression') < rcSrc.indexOf('headlineCard(heads'), 'clinician tab: impression above the headline');
// Physio candidacy folded into the on-screen Suggested Actions card too (no
// separate heading), same as print — see actionColumnsHtml.
ok(/physioCandidacy\(tri\)/.test(rcSrc) && /actionColumnsHtml\(tri, physio\)/.test(rcSrc), 'clinician tab: physio candidacy folded into Suggested Actions');
ok(/No red flags identified this visit/.test(rcSrc), 'clinician tab: foregrounded red-flags card (with none-reassurance)');
ok(rcSrc.indexOf(`sectionTitle('flags')`) < rcSrc.indexOf('axisProfileCard'), 'clinician tab: red flags (page 1) before axis profile (page 2)');
// Same hybrid page-1 layout mirrored on-screen (matches the print reorg):
// page 1 = hero → Triage/plan + care-track badges → red flags → impression +
// peak alert → burden matrix; page 2 opens with interpretation → context →
// trend → Suggested Actions (last); page 3 is the appendix (which on-screen
// also carries the history & context detail card).
['Page 1 · At a glance', `sectionTitle('plan')`, `sectionTitle('flags')`,
 `sectionTitle('impression')`, `sectionTitle('burden')`,
 'Page 2 · Assessment & clinical detail',
 `sectionTitle('interp')`, `sectionTitle('context')`, `sectionTitle('trend')`, `sectionTitle('actions')`,
 'Page 3+ · Appendix', `sectionTitle('appendix')`,
].forEach(txt => ok(rcSrc.includes(txt), `clinician tab: on-screen section header "${txt}" present`));
ok(rcSrc.indexOf('class="hero"') < rcSrc.indexOf('triageCard(tri'), 'clinician tab: headline score hero leads, before the triage/plan card');
ok(rcSrc.indexOf('triageCard(tri') < rcSrc.indexOf('rfCard'), 'clinician tab: triage/plan card precedes the red-flag card');
ok(rcSrc.indexOf('rfCard') < rcSrc.indexOf('impCard'), 'clinician tab: red-flag card precedes the impression card');
ok(rcSrc.indexOf('impCard') < rcSrc.indexOf('severityFrequencyCard'), 'clinician tab: impression precedes the burden matrix');
ok(rcSrc.indexOf('severityFrequencyCard') < rcSrc.indexOf('Page 2 ·'), 'clinician tab: burden matrix is the last page-1 element');
ok(rcSrc.indexOf(`sectionTitle('plan')`) < rcSrc.indexOf('triageCard(tri'), 'clinician tab: triage card sits inside the plan section');
ok(rcSrc.indexOf(`sectionTitle('interp')`) < rcSrc.indexOf('headlineCard(heads'), 'clinician tab: headline/axis reads sit inside the interpretation section');
ok(rcSrc.indexOf(`sectionTitle('context')`) < rcSrc.lastIndexOf('modifiableDriversCard'), 'clinician tab: modifiable-driver card sits inside the context section');
ok(rcSrc.indexOf(`sectionTitle('actions')`) < rcSrc.indexOf('Page 3+'), 'clinician tab: Suggested Actions sits before the appendix');
ok(rcSrc.indexOf('clinicianDetailCard(c)') > rcSrc.lastIndexOf(`sectionTitle('actions')`), 'clinician tab: clinicianDetailCard renders after Suggested Actions, under the appendix header');
// De-dup — the buried red-flag block is gone from clinicianDetailCard.
const cdFn = html.match(/function clinicianDetailCard\(c\)\s*\{[\s\S]*?\n\}\n/);
ok(cdFn && !/Red flags — \$\{fired\.length\} answered Yes/.test(cdFn[0]), 'clinician detail: buried red-flag block removed (no duplication)');
// De-dup — modifiable-driver raw values now live only in the item 6
// standalone card, not duplicated inside the appendix detail card.
ok(/function modifiableDriversCard\(driverExtras\)/.test(html), 'modifiableDriversCard() helper defined');
ok(cdFn && !/Modifiable driver raw values/.test(cdFn[0]), 'clinician detail: modifiable-driver table removed from the appendix (moved to item 6)');

// 30. Questionnaire & scoring audit fix pass.

// 30a. Cluster-balanced GI index — equal per-symptom severity in clusters of
// different sizes (Reflux=2 items, Indigestion=4 items) must yield the SAME
// index. Previously the index was an item-weighted mean, so severe-reflux-only
// (6/45=13%) and severe-indigestion-only (12/45=27%) landed in different bands
// despite identical per-symptom severity.
const refluxOnly = { gsrs_heartburn: 4, gsrs_regurg: 4, gsrs_pain: 0, gsrs_hunger: 0, gsrs_nausea: 0,
  gsrs_rumbling: 0, gsrs_bloating: 0, gsrs_burping: 0, gsrs_gas: 0, gsrs_diarrhoea: 0, gsrs_loose: 0,
  gsrs_urgency: 0, gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 0 };
const indigOnly = { gsrs_heartburn: 0, gsrs_regurg: 0, gsrs_pain: 0, gsrs_hunger: 0, gsrs_nausea: 0,
  gsrs_rumbling: 4, gsrs_bloating: 4, gsrs_burping: 4, gsrs_gas: 4, gsrs_diarrhoea: 0, gsrs_loose: 0,
  gsrs_urgency: 0, gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 0 };
const sRefluxOnly = scoring.computeScores(refluxOnly, {});
const sIndigOnly = scoring.computeScores(indigOnly, {});
ok(sRefluxOnly.index === sIndigOnly.index, 'cluster-balanced index: equal severity in different-size clusters yields equal index');
ok(sRefluxOnly.index === 20, 'cluster-balanced index: one maxed cluster of five yields the expected 20% mean');

// 30a-E4. Peak-override anti-dilution. A single ceiling (very-severe = 4) symptom
// among otherwise-zero answers averages down into Minimal by the number, but the
// DISPLAYED band floor is raised to Mild–Moderate and a peak alert is attached.
// gsrs_bloating sits in the 4-item Indigestion cluster: 4/16 = 0.25 cluster norm,
// mean over 5 clusters = 0.05 → raw index 5 (Minimal), escalated for display.
const peakCeil = scoring.computeScores({ gsrs_heartburn: 0, gsrs_regurg: 0, gsrs_pain: 0, gsrs_hunger: 0, gsrs_nausea: 0,
  gsrs_rumbling: 0, gsrs_bloating: 4, gsrs_burping: 0, gsrs_gas: 0, gsrs_diarrhoea: 0, gsrs_loose: 0,
  gsrs_urgency: 0, gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 0 }, {});
ok(peakCeil.index === 5, 'E4: raw index is UNCHANGED by peak-override (still 5 — the number never moves)');
ok(peakCeil.peakAlerts.length === 1 && peakCeil.peakAlerts[0].level === 'ceiling' && peakCeil.peakAlerts[0].id === 'gsrs_bloating',
  'E4: a ceiling (4) item produces a ceiling-level peak alert');
ok(peakCeil.peakEscalated === true && peakCeil.severity.label === 'Mild–Moderate',
  'E4: displayed band floored to Mild–Moderate (Minimal would have diluted the peak)');
// INVARIANT: the raw cluster mean the pattern engine reads (secNorm.GI) is NOT lifted
// by the peak — it stays the un-nudged 0.05, so no pattern gate can flip on a peak.
ok(Math.abs(peakCeil.secNorm.GI - 0.05) < 1e-9, 'E4: secNorm.GI (pattern gate) untouched by peak-override — invariant holds');
// A single Severe (3) item likewise escalates and is tagged 'severe'.
const peakSev = scoring.computeScores({ gsrs_heartburn: 0, gsrs_regurg: 0, gsrs_pain: 0, gsrs_hunger: 0, gsrs_nausea: 0,
  gsrs_rumbling: 0, gsrs_bloating: 3, gsrs_burping: 0, gsrs_gas: 0, gsrs_diarrhoea: 0, gsrs_loose: 0,
  gsrs_urgency: 0, gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 0 }, {});
ok(peakSev.peakAlerts.length === 1 && peakSev.peakAlerts[0].level === 'severe' && peakSev.peakEscalated === true,
  'E4: a single Severe (3) item → severe-level alert + escalated band');
// No peak → no escalation. All-Moderate (2) answers: no item at 3 or 4.
const noPeak = scoring.computeScores(Object.fromEntries(GI_IDS.map(id => [id, 2])), {});
ok(noPeak.peakAlerts.length === 0 && noPeak.peakEscalated === false,
  'E4: no ceiling/severe item → no peak alerts, no escalation');
// Higher band is never downgraded: a broadly-severe picture already in Significant/
// Severe keeps its band; peak alerts are attached but peakEscalated stays false.
const highBand = scoring.computeScores(Object.fromEntries(GI_IDS.map(id => [id, 4])), {});
ok(highBand.peakAlerts.length > 0 && highBand.peakEscalated === false && highBand.severity.label === 'Severe',
  'E4: peak-override never downgrades a higher band (Severe stays Severe, no false escalation)');
// 30b. Bristol/frequency DECOUPLED from the Index (post-D0 follow-up): Bristol
// now feeds Rome IV subtyping only; frequency feeds only the read-only
// severity×frequency widget. Neither may move score.index anymore, on a pure-
// reflux patient (bowel clusters unanswered) OR on a patient with bowel
// clusters answered (previously the "positive nudge" case — now must be a
// no-op too, since the nudge mechanism itself was removed, not just narrowed).
const pureRefluxSparse = { gsrs_heartburn: 1, gsrs_regurg: 1 };
const sNoBristol = scoring.computeScores(pureRefluxSparse, {});
const sWithBristol = scoring.computeScores(pureRefluxSparse, { bristol: 1 });
ok(sNoBristol.index === sWithBristol.index, 'Bristol does not move the index when bowel-habit clusters are unanswered (decoupled)');
ok(sWithBristol.bristolAddPts === undefined && sWithBristol.bristolSignal === undefined,
  'bristolAddPts/bristolSignal are no longer part of the score object (nudge mechanism removed)');
// Bowel clusters answered: Bristol must STILL be a no-op (previously this was
// the "positive nudge" case — decoupling means it's now a no-op everywhere).
const bowelAnswered = { gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 0, gsrs_diarrhoea: 0, gsrs_loose: 0, gsrs_urgency: 0 };
const sBowelNoBristol = scoring.computeScores(bowelAnswered, {});
const sBowelWithBristol1 = scoring.computeScores(bowelAnswered, { bristol: 1 });
const sBowelWithBristol7 = scoring.computeScores(bowelAnswered, { bristol: 7 });
ok(sBowelWithBristol1.index === sBowelNoBristol.index && sBowelWithBristol7.index === sBowelNoBristol.index,
  'Bristol (any type, including the most abnormal 1/7) never moves the index when bowel-habit clusters are answered (decoupled)');
// secNorm.GI and index are now literally the same value (× 100) — the plain
// cluster-balanced mean, nothing else feeds it.
ok(scoring.computeScores(bowelAnswered, { bristol: 1 }).index === Math.round(scoring.computeScores(bowelAnswered, { bristol: 1 }).secNorm.GI * 100),
  'index === secNorm.GI × 100 exactly — no separate nudged/raw split remains');

// 30c. Re-confirm the de-blend invariant survives the cluster-mean rewrite.
ok(run(0, { im_food_react: 3, im_infections: 3 }, { pss4Score: 16 }).heads.primary.symptom.value === 0,
  'de-blend invariant still holds after the cluster-balanced index rewrite');

// 30d. Symptom-duration item — driverOnly (never touches the Index), and now
// reveal-gated so it is only asked once a gut symptom is present (Option C).
const durQ = schema.QUESTIONS.find(q => q.id === 'sx_duration');
ok(!!durQ && durQ.driverOnly === true, 'sx_duration present, driverOnly');
ok(!!durQ.revealIf && Array.isArray(durQ.revealIf.any) && durQ.revealIf.any.length === 5,
  'sx_duration reveal-gated on any GI cluster being present (Option C)');
// Hidden for a no-symptom patient, shown once any cluster has a positive answer.
ok(schema.revealMet(durQ.revealIf, { answers: {}, clusterNorm: {} }) === false,
  'sx_duration hidden when no gut symptom present');
ok(schema.revealMet(durQ.revealIf, { answers: {}, clusterNorm: cn({ gsrs_heartburn: 1 }) }) === true,
  'sx_duration revealed once a gut symptom is present');
// 'Not sure / it varies' (index 5) must never read as a chronic onset: it is
// beyond the ordinal DURATION/ROME_ONSET bands, so Rome IV onset ignores it.
ok(scales.SCALES.DURATION.length === 6 && /Not sure/.test(scales.SCALES.DURATION[5]),
  'DURATION carries a trailing "Not sure / it varies" escape option');
const rrUnsure = rome.classifyRomeIV({ painFreq: 3, rm_assoc_defecation: true, rm_assoc_freqchange: true }, {}, 5);
ok(rrUnsure.answered === false, 'sx_duration "Not sure" (index 5) does NOT satisfy Rome IV onset');
const rrChronic = rome.classifyRomeIV({ painFreq: 3, rm_assoc_defecation: true, rm_assoc_freqchange: true }, {}, 4);
ok(rrChronic.answered === true, 'a real chronic sx_duration band (index 4) still satisfies Rome IV onset');
// revealMet item predicate now supports an optional max bound (used so the
// "Not sure" sentinel does not trip the pain/Rome duration-based card reveal).
ok(schema.revealMet({ type: 'item', id: 'sx_duration', min: 2, max: 4 }, { answers: { sx_duration: 5 } }) === false,
  'revealMet item max bound excludes the "Not sure" sentinel');

// F1 — Rome IV stool-form proportion (>25% rule) subtyping. Truth table over the
// two proportions, plus fallback to single-Bristol / cluster-norm when absent.
const romeCrit = { painFreq: 3, onset: 3, rm_assoc_defecation: true, rm_assoc_freqchange: true }; // meets criteria
const propSub = (hardPct, loosePct) => rome.classifyRomeIV(romeCrit, {}, undefined, undefined, { hardPct, loosePct }).subtype;
ok(propSub(40, 10) === 'IBS-C', 'F1: hard >25% & loose <25% → IBS-C');
ok(propSub(10, 40) === 'IBS-D', 'F1: loose >25% & hard <25% → IBS-D');
ok(propSub(40, 40) === 'IBS-M', 'F1: both >25% → IBS-M (only proportions can surface this)');
ok(propSub(10, 10) === 'IBS-U', 'F1: neither >25% → IBS-U');
// Boundary: exactly 25% is NOT >25% (Rome uses a strict greater-than).
ok(rome.classifyRomeIV(romeCrit, {}, undefined, undefined, { hardPct: 25, loosePct: 25 }).subtype === 'IBS-U',
  'F1: exactly 25% does not meet the >25% threshold');
ok(rome.classifyRomeIV(romeCrit, {}, undefined, undefined, { hardPct: 40, loosePct: 10 }).subtypeBasis === 'proportion',
  'F1: subtypeBasis reports "proportion" when both proportions are given');
// Fallback: with no proportions, a decisive single Bristol still resolves C/D.
ok(rome.classifyRomeIV(romeCrit, {}, undefined, 1).subtype === 'IBS-C' &&
   rome.classifyRomeIV(romeCrit, {}, undefined, 1).subtypeBasis === 'single-bristol',
  'F1: falls back to single-Bristol (type 1 → IBS-C) when proportions absent');
// Fallback: no proportions, indeterminate Bristol (type 4) → cluster-norm read.
ok(rome.classifyRomeIV(romeCrit, { Constipation: 0.6 }, undefined, 4).subtypeBasis === 'cluster-norm',
  'F1: falls back to cluster-norm when proportions absent and Bristol indeterminate');
// A partial proportion (only one of the two) must NOT trigger the proportion rule.
ok(rome.classifyRomeIV(romeCrit, {}, undefined, 1, { hardPct: 40 }).subtypeBasis === 'single-bristol',
  'F1: a single proportion is insufficient — the >25% rule needs both');
// UI wiring + disclaimer present.
ok(/reveal-bristol-props/.test(html) && /hard or lumpy \(Bristol 1–2\)/.test(html) && /loose or watery \(Bristol 6–7\)/.test(html),
  'F1: proportion rows rendered in the Bristol card');
ok(/PROPORTION_PCT_MID = \[10, 40, 70\]/.test(html), 'F1: proportion band→percentage midpoints defined');
ok(schema.revealMet({ type: 'item', id: 'sx_duration', min: 2, max: 4 }, { answers: { sx_duration: 3 } }) === true,
  'revealMet item max bound admits a real chronic band');
ok(scoring.computeScores({ sx_duration: 4, gsrs_pain: 0 }, {}).index === 0, 'sx_duration answer never enters the Index');
const rNoDuration = run(1, {});
ok(rNoDuration.tri.durationNote == null, 'durationNote absent when sx_duration unanswered');
// durationNote is populated via ui-patient.js computeAll() (durationLabel lookup),
// not via run()'s raw triage() call — verify the wiring exists in source instead.
ok(/durationLabel/.test(html) && /result\.durationNote/.test(html), 'durationLabel/durationNote wiring present in source');

// 30e. gy_cyclical reachability — the SY section must reveal on pain/bloating
// (its own item's real clinical trigger), not just fatigue/brain-fog. Item-level
// revealIf cannot work here since refreshReveals() toggles the item holder
// independently of its ancestor section holder (a nested display:none parent
// still hides a "visible" child) — so this must be a section-level gate.
const sySection = schema.SECTIONS.find(s => s.id === 'SY');
const syCtxPainOnly = { answers: { gsrs_pain: 2 }, clusterNorm: {} };
const syCtxFatigueOnly = { answers: { bg_fatigue: 2 }, clusterNorm: {} };
const syCtxNeither = { answers: { gsrs_pain: 0, bg_fatigue: 0 }, clusterNorm: {} };
ok(schema.revealMet(sySection.revealIf, syCtxPainOnly), 'SY section reveals on gsrs_pain alone (gy_cyclical reachable)');
ok(schema.revealMet(sySection.revealIf, syCtxFatigueOnly), 'SY section still reveals on bg_fatigue alone (original trigger preserved)');
ok(!schema.revealMet(sySection.revealIf, syCtxNeither), 'SY section stays hidden when neither trigger is met');
// End-to-end: pain + cyclical answered, no fatigue/brain-fog → gynNote fires.
const r30e = run(0, { gsrs_pain: 2, gy_cyclical: 2 });
ok(r30e.tri.gynNote != null, 'gynOverlap note fires for pain+cyclical presentation with no fatigue/brain-fog (previously unreachable)');

// 31. Content-overlap cleanup — gas & food-reaction questions.

// 31a. im_food_react reworded to a digestive-symptom construct, no longer
// overlapping im_histamine's allergic/vasomotor wording ("rash"/"congestion").
const imFoodReactQ = schema.QUESTIONS.find(q => q.id === 'im_food_react');
ok(!!imFoodReactQ && !/rash|congestion/i.test(imFoodReactQ.patientSub || ''),
  'im_food_react wording no longer overlaps im_histamine (no rash/congestion)');

// 31b. Pattern wiring for both items is untouched — only text changed.
ok(/av\(a, 'im_food_react'\)/.test(html), 'im_food_react still read by id in bloating_fermentation');
ok(/av\(a, 'im_histamine'\)/.test(html), 'im_histamine still read by id in inflammatory_immune');
// inflammatory_immune fires on im_histamine alone (GI present, no im_food_react
// or skin needed) — confirms the histamine signal still gates the pattern.
const r31b = run(1, { im_histamine: 3, im_food_react: 0, sk_skin: 0 });
ok(r31b.pat.some(p => p.id === 'inflammatory_immune'), 'inflammatory_immune still fires on im_histamine alone');

// 31c. dys.gasFoul UI label no longer implies frequency ("Excessive") — that's
// gsrs_gas's job; this field is scoped to the foul/sulfur quality signal.
ok(/'Foul or sulfur-smelling gas'/.test(html), 'dys.gasFoul label uses patient-friendly "gas" without "Excessive"');
ok(!/Excessive or foul/.test(html), 'old "Excessive or foul" gasFoul wording removed');
ok(!/'Foul or sulfur-smelling wind'/.test(html), 'old British "wind" gasFoul wording removed');

// 31d. secNorm.IM composition unchanged in shape — still exactly 6 scored items.
const imScored = schema.QUESTIONS.filter(q => q.section === 'IM' && !q.optional && !q.freeText && !q.driverOnly);
ok(imScored.length === 6, 'IM section still has exactly 6 scored items (no item silently added/removed)');

// 31e. foodallergy clinNote surfaces end-to-end via conditionGuidance.
const foodallergyDef = scales.KNOWN_CONDITIONS.find(c => c.id === 'foodallergy');
ok(!!foodallergyDef && !!foodallergyDef.clinNote, 'foodallergy carries a clinNote');
const r31e = run(0, {}, { conditions: ['foodallergy'] });
ok(r31e.tri.conditionGuidance.some(n => /food allergy/i.test(n)), 'foodallergy clinNote surfaces in triage.conditionGuidance end-to-end');

// 32. Coverage-gap additions — bowel frequency, smoking, caffeine, hydration,
// treatments already tried.

// 32a. blankExtras() carries the new fields with correct default shapes.
ok(/bowelFreq: null/.test(html), 'blankExtras: bowelFreq default present');
ok(/smoking: null, caffeine: null, hydration: null/.test(html), 'blankExtras: smoking/caffeine/hydration defaults present');
ok(/treatmentsTried: \[\], *$/m.test(html) || /treatmentsTried: \[\],/.test(html), 'blankExtras: treatmentsTried default present');
ok(/treatmentsTriedOther: ''/.test(html), 'blankExtras: treatmentsTriedOther default present');

// 32b. None of the 5 new fields touch computeScores().index — regression guard.
// (They're never read by computeScores() at all — it only reads QUESTIONS-based
// answers — so this just confirms the baseline is unaffected by their presence
// in an extras-shaped object passed alongside.)
const baselineIdx = scoring.computeScores({ gsrs_pain: 2, gsrs_heartburn: 1 }, {}).index;
const idxWithNewFields = scoring.computeScores({ gsrs_pain: 2, gsrs_heartburn: 1 }, { bristol: null }).index;
ok(baselineIdx === idxWithNewFields, 'new coverage-gap fields do not touch computeScores().index');

// 32c. modifiableFactors() — smoking folds into the Lifestyle row's score
// string; caffeine/hydration produce a new Hydration & caffeine row.
const mfBase = scales.modifiableFactors({});
const lifestyleRowBase = mfBase.find(f => f.label === 'Lifestyle');
ok(lifestyleRowBase && lifestyleRowBase.band === '—' && lifestyleRowBase.score === null, 'Lifestyle row shows — / null when unset');
// modifiableFactors({}).allEmpty flags the "nothing answered" empty state so the
// clinician surfaces can render a one-line fallback instead of a 9-row —-filled table.
ok(mfBase.allEmpty === true, 'modifiableFactors({}): allEmpty is true when nothing was recorded');
ok(scales.modifiableFactors({ nrsPain: 4 }).allEmpty === false, 'modifiableFactors(): allEmpty is false once any driver is recorded');
ok(/allEmpty/.test(html) && /No modifiable-driver data recorded this visit/.test(html),
  'modifiable-driver fallback copy present in the report source');
const hydRowBase = mfBase.find(f => f.label === 'Hydration & caffeine');
ok(hydRowBase && hydRowBase.band === '—' && hydRowBase.score === null, 'Hydration & caffeine row shows — / null when unset');
const mfSet = scales.modifiableFactors({ alcohol: 1, smoking: 2, activity: 3, caffeine: 3, hydration: 0 });
const lifestyleRowSet = mfSet.find(f => f.label === 'Lifestyle');
ok(/Alcohol: Light/.test(lifestyleRowSet.score) && /Smoking: Current smoker/.test(lifestyleRowSet.score),
  'Lifestyle row score combines alcohol + smoking when both set');
const hydRowSet = mfSet.find(f => f.label === 'Hydration & caffeine');
ok(hydRowSet.band === 'Low (<1L/day)' && /Caffeine: Daily/.test(hydRowSet.score),
  'Hydration & caffeine row shows both fields when set');

// 32d. treatmentsTried(extras) resolves ids → labels correctly.
const ttEmpty = scales.treatmentsTried({});
ok(ttEmpty.count === 0 && ttEmpty.list.length === 0, 'treatmentsTried: empty extras → count 0');
const ttSet = scales.treatmentsTried({ treatmentsTried: ['probiotic', 'lowfodmap'], treatmentsTriedOther: 'acupuncture' });
ok(ttSet.count === 2 && ttSet.list.map(t => t.label).join(',') === 'Probiotic,Low-FODMAP diet' && ttSet.other === 'acupuncture',
  'treatmentsTried: ids resolve to labels, Other passes through');

// 32e. End-to-end triage notes — call triage() directly (mirrors how run()
// builds its opts) since bowelFreqLabel/smokingLabel/treatmentsTried are
// resolved in ui-patient.js's computeAll(), not in run()'s simplified rebuild.
const base32 = run(1, {});
function triageWith(extraOpts) {
  return triage(base32.score, base32.pat, [], base32.correlateLoad, Object.assign({
    impactBand: base32.prof.impact.band, romeResult: base32.rr, adhesionSurgery: false,
  }, extraOpts));
}
ok(triageWith({}).bowelFreqNote == null, 'bowelFreqNote null when bowelFreqLabel unset');
ok(/3–6 times\/week/.test(triageWith({ bowelFreqLabel: '3–6 times/week' }).bowelFreqNote), 'bowelFreqNote set when bowelFreqLabel provided');
ok(triageWith({ smokingLabel: 'Never smoked' }).smokingNote == null, 'smokingNote null for Never smoked');
ok(triageWith({ smokingLabel: 'Former smoker' }).smokingNote == null, 'smokingNote null for Former smoker');
ok(/Current smoker|reflux\/PUD/.test(triageWith({ smokingLabel: 'Current smoker' }).smokingNote || ''), 'smokingNote set only for Current smoker');
ok(triageWith({}).treatmentsTriedNote == null, 'treatmentsTriedNote null when nothing tried');
const ttNote = triageWith({ treatmentsTried: ['Probiotic', 'Low-FODMAP diet'], treatmentsTriedOther: 'acupuncture' }).treatmentsTriedNote;
ok(/Probiotic/.test(ttNote) && /Low-FODMAP diet/.test(ttNote) && /acupuncture/.test(ttNote), 'treatmentsTriedNote lists resolved labels + Other');

// 32f. All three render sites reference the three new note fields (source-level
// presence check, matching the existing durationNote wiring-check style).
ok(/tri\.bowelFreqNote/.test(html) && /tri\.smokingNote/.test(html) && /tri\.treatmentsTriedNote/.test(html),
  'bowelFreqNote/smokingNote/treatmentsTriedNote referenced in source (render wiring present)');

// 33. Frequency dimension — DECOUPLED from the Index (post-D0 follow-up).
// Per-cluster symptom frequency (clusterFreq) and Rome's romePainFreq used to
// nudge the Index by up to FREQUENCY_ALPHA; that mechanism was removed along
// with the Bristol nudge (see block 30b above) — frequency now feeds ONLY the
// read-only Tranche G severity×frequency widget (severityFrequencyMatrix()),
// never computeScores(). bristolAddPts/frequencyAddPts/nudgeAddPts no longer
// exist on the score object at all.

// 33a. Frequency answers (any cluster, any level) must be a complete no-op on
// the index — computeScores() doesn't even read opts.clusterFreq anymore.
const refluxMild = { gsrs_heartburn: 1, gsrs_regurg: 1 };            // norm = 2/6 ≈ 0.333
const refluxNoFreq = scoring.computeScores(refluxMild, {});
const refluxWithFreq = scoring.computeScores(refluxMild, { clusterFreq: { Reflux: 3 } }); // Daily
ok(refluxWithFreq.index === refluxNoFreq.index, 'frequency no longer moves the index on any cluster (decoupled)');
ok(refluxWithFreq.frequencyAddPts === undefined && refluxWithFreq.nudgeAddPts === undefined,
  'frequencyAddPts/nudgeAddPts are no longer part of the score object');

// 33b. Frequency on an unanswered cluster is (still, trivially) a no-op.
const refluxOnlyNoConstipFreq = scoring.computeScores(refluxMild, { clusterFreq: { Constipation: 3 } });
ok(refluxOnlyNoConstipFreq.index === refluxNoFreq.index, 'frequency on an unanswered cluster does not move the index');

// 33c. Bristol + frequency together on the same bowel cluster: still a no-op,
// combined or alone — there is no cap logic left to test, only "never fires".
const constipMild = { gsrs_constip: 1, gsrs_hard: 1, gsrs_incomplete: 1 }; // norm ≈ 0.333
const constipBaseline = scoring.computeScores(constipMild, {});
const combined = scoring.computeScores(constipMild, { bristol: 1, clusterFreq: { Constipation: 3 } });
ok(combined.index === constipBaseline.index, 'Bristol + frequency together still leave the index unchanged (fully decoupled, not just capped)');

// 33d. Raw clusterNorm (read by patterns.js) was always unaffected by
// frequency — now the Index is too, so this is a stronger invariant than
// before: literally nothing about a cluster's scoring changes with frequency.
ok(refluxWithFreq.clusterNorm.Reflux === refluxNoFreq.clusterNorm.Reflux,
  'raw clusterNorm.Reflux is unaffected by frequency answers (patterns.js unaffected)');
const pat33 = patterns.detectPatterns(refluxNoFreq, { dys: {} }, refluxMild);
const pat33Freq = patterns.detectPatterns(refluxWithFreq, { dys: {} }, refluxMild);
ok(JSON.stringify(pat33.map(p => p.id)) === JSON.stringify(pat33Freq.map(p => p.id)),
  'pattern firing is identical with/without frequency answers (frequency affects nothing in computeScores)');

// 33d2 (A1 regression, now trivially true post-decoupling). secNorm.GI and
// index are the SAME un-nudged value — a full frequency nudge can no longer
// push secNorm.GI over the giPresent (0.2) gate even in principle, since
// there is no nudge path left. Keep the fixture (Reflux-only, sum=1/6≈0.167,
// paired with the proxyCount≥2 route via nu_hair/nu_iron) as a regression
// guard against the nudge mechanism ever being reintroduced.
const giGateAnswers = { gsrs_heartburn: 1, gsrs_regurg: 0, nu_hair: 2, nu_iron: 2 };
const giGateNoFreq = scoring.computeScores(giGateAnswers, {});
const giGateWithFreq = scoring.computeScores(giGateAnswers, { clusterFreq: { Reflux: 3 } });
ok(giGateNoFreq.secNorm.GI < 0.2 && giGateWithFreq.secNorm.GI < 0.2,
  'secNorm.GI stays UN-NUDGED (below giPresent threshold) regardless of frequency answers — A1 regression');
ok(giGateWithFreq.index === giGateNoFreq.index,
  'the Index itself no longer rises with frequency answers (decoupled — was previously an intentional nudge, now fully removed)');
const patGateNoFreq = patterns.detectPatterns(giGateNoFreq, { dys: {} }, giGateAnswers);
const patGateWithFreq = patterns.detectPatterns(giGateWithFreq, { dys: {} }, giGateAnswers);
ok(!patGateNoFreq.some(p => p.id === 'nutrient_malabsorption') && !patGateWithFreq.some(p => p.id === 'nutrient_malabsorption'),
  'nutrient_malabsorption does not fire on driver-only frequency answers alone (A1: no Tier-4-to-Tier-1 flip via secNorm.GI leak)');

// A2 regression. trend.js's visitScore() must recompute the SAME index as the
// live computeAll()/CSV path for the same visit — historically this guarded
// against clusterFreq/romePainFreq nudge parity; now that both are fully
// decoupled from the index (no-ops), the invariant that matters is simpler
// but still real: the two code paths must never silently diverge on the
// SAME answers, whatever computeScores() does or doesn't read from opts.
const a2Answers = { gsrs_heartburn: 2, gsrs_regurg: 2 };
const a2Extras = { bristol: null, clusterFreq: { Reflux: 3 }, rome: { painFreq: null } };
const a2Live = scoring.computeScores(a2Answers, { bristol: a2Extras.bristol, clusterFreq: a2Extras.clusterFreq, romePainFreq: a2Extras.rome.painFreq });
const a2Trend = trend.visitScore({ id: 'v1', date: 1, answers: a2Answers, extras: a2Extras });
ok(a2Trend.index === a2Live.index, `trend visitScore().index (${a2Trend.index}) matches live computeScores().index (${a2Live.index})`);
ok(a2Trend.index === 50, 'sanity: this fixture (Reflux cluster fully Moderate, 4/8) is the plain un-nudged 50% mean');

// A3 regression. A Tier-1 (refer) result must not carry reassuring lower-tier
// framing for the PATIENT — but the underlying candidacy data must still be
// present (clinician view keeps it). Two checks: (a) the tri object itself
// still computes alsoConsider (data intact for clinicians), gated by a
// separate suppressAlsoConsiderForPatient flag; (b) the flag is true only
// when primary === Tier 1.
const a3Severe = { gsrs_heartburn: 3, gsrs_regurg: 3, gsrs_pain: 3, gsrs_bloating: 3, gsrs_burping: 3,
  gsrs_constip: 3, gsrs_hard: 3, gsrs_incomplete: 3, gsrs_diarrhoea: 3, gsrs_urgency: 3, gsrs_loose: 3,
  gsrs_gas: 3, gsrs_nausea: 3, gsrs_rumbling: 3, gsrs_abdpain: 3,
  lifestyle_modifiable: 0 };
const a3SevereScore = scoring.computeScores(a3Severe, {});
ok(a3SevereScore.severity.label === 'Severe', 'sanity: a3Severe fixture actually bands Severe');
const a3SeverePats = patterns.detectPatterns(a3SevereScore, {}, a3Severe);
const a3TriSevere = triage(a3SevereScore, a3SeverePats, [], { count: 0 }, {});
ok(a3TriSevere.level === 1, 'sanity: Severe burden routes to Tier 1');
ok(a3TriSevere.suppressAlsoConsiderForPatient === true, 'Tier 1 (Severe) sets suppressAlsoConsiderForPatient');
const a3Minimal = { gsrs_heartburn: 0 };
const a3MinimalScore = scoring.computeScores(a3Minimal, {});
const a3TriMinimal = triage(a3MinimalScore, [], [], { count: 0 }, {});
ok(a3TriMinimal.suppressAlsoConsiderForPatient === false, 'Tier 4 (Minimal) does not set suppressAlsoConsiderForPatient');
ok(typeof a3TriSevere.alsoConsider === 'object', 'alsoConsider data itself is NOT deleted from the tri object at Tier 1 (clinician view keeps the full landscape)');
ok(/suppressAlsoConsiderForPatient/.test(code) && code.includes('showAlsoConsider'), 'triageCard() render layer references the patient-suppression gate (source check)');

// 33e. Every opts combination (bristol alone, clusterFreq alone, both, or
// neither) must produce the SAME index for the same answers — there is no
// longer any code path where an opts field changes score.index.
const legacyNoFreqOpt = scoring.computeScores(bowelAnswered, { bristol: 1 });
const noOptsAtAll = scoring.computeScores(bowelAnswered, {});
const bothOpts = scoring.computeScores(bowelAnswered, { bristol: 1, clusterFreq: { Constipation: 3 }, romePainFreq: 5 });
ok(legacyNoFreqOpt.index === noOptsAtAll.index && bothOpts.index === noOptsAtAll.index,
  'every opts combination (bristol/clusterFreq/romePainFreq, alone or combined) yields the identical index');

// 33f. UI wiring present in source.
ok(/CLUSTER_FREQ_LEVELS/.test(html) && /clusterFreqCard/.test(html), 'clusterFreqCard + CLUSTER_FREQ_LEVELS present in source');
ok(/clusterFreq: extras\.clusterFreq/.test(html), 'computeAll() passes extras.clusterFreq into computeScores()');
ok(/clusterFreq: \{ Reflux: null/.test(html), 'blankExtras() initialises clusterFreq for all 5 clusters');

// 34. Code-review fix pass: pattern-eval bugs, triage routing, dead code,
// duplications (Pain-frequency vs Rome, sx_duration vs Rome onset).

// 34a. bloating_fermentation fires on im_food_react/foodTriggers alone (were
// computed into signals but silently excluded from the fires OR-chain).
const r34a = run(0, { im_food_react: 3 }, { dys: { foodTriggers: [] } });
ok(r34a.pat.some(p => p.id === 'bloating_fermentation'), 'bloating_fermentation now fires on im_food_react alone');
const r34a2 = run(0, { im_food_react: 0 }, { dys: { foodTriggers: ['a', 'b'] } });
ok(r34a2.pat.some(p => p.id === 'bloating_fermentation'), 'bloating_fermentation now fires on >=2 fermentable-food triggers alone');

// 34b. inflammatory_immune fires on sk_skin alone (with GI present) — was
// computed into signals but silently excluded from the fires condition.
const r34b = run(1, { sk_skin: 3, im_food_react: 0, im_histamine: 0, im_infections: 0, im_allergies: 0, im_joint: 0 });
ok(r34b.pat.some(p => p.id === 'inflammatory_immune'), 'inflammatory_immune now fires on sk_skin alone (GI present)');

// 34c. Triage routes inflammatory_immune by signalHits, not confidence.
ok(/infl\.signalHits/.test(html) && !/infl\.confidence === 'High'/.test(html),
  'triage.js routes inflammatory_immune by signalHits, not confidence');

// 34d. Stale "Foul / excessive gas" label fixed; no "excessive" language left
// on the gasFoul signal (it's scoped to quality, not frequency — gsrs_gas
// already owns frequency).
ok(!/Foul \/ excessive gas/.test(html), 'stale "Foul / excessive gas" dysbiosisLens signal label removed');
ok(/Foul-smelling gas/.test(html), 'dysbiosisLens signal now reads "Foul-smelling gas"');

// 34e. Dead code removed: gutHealthIndex/GHI_WEIGHTS, pss4Band, QTOTAL, hasResult.
ok(!/function gutHealthIndex/.test(html) && !/GHI_WEIGHTS/.test(html), 'gutHealthIndex()/GHI_WEIGHTS removed');
ok(!/function pss4Band/.test(html), 'pss4Band() removed');
ok(!/const QTOTAL/.test(html), 'QTOTAL removed');
ok(!/__e\.hasResult/.test(html), 'Patient.hasResult removed');

// 34f. rf_vomiting split into two red flags (persistent vomiting vs hematemesis).
ok(RF.some(f => f.id === 'rf_vomiting') && RF.some(f => f.id === 'rf_hematemesis'),
  'rf_vomiting split into rf_vomiting + rf_hematemesis');

// 34g. Duplication fix — Pain cluster frequency now comes from Rome's
// painFreq, not a second "how often do you get abdominal pain" question.
// clusterFreqCard no longer renders a Pain row.
ok(!/GI_CLUSTERS\.forEach\(k => \{\s*body\.appendChild\(segRow\(GI_CLUSTER_FREQ_LABELS\[k\]/.test(html),
  'clusterFreqCard no longer iterates all 5 clusters unconditionally');
ok(/GI_CLUSTERS\.filter\(k => k !== 'Pain'\)/.test(html), 'clusterFreqCard explicitly excludes Pain');
// romePainFreq (0-5 Rome scale) is now a no-op on the index too (decoupled) —
// Pain-cluster frequency feeds only Rome IV criteria matching / the severity×
// frequency widget, not computeScores().
const painMild = { gsrs_pain: 1, gsrs_hunger: 1, gsrs_nausea: 1 };
const painNoFreq = scoring.computeScores(painMild, {});
const painWithRomeFreq = scoring.computeScores(painMild, { romePainFreq: 5 });
ok(painWithRomeFreq.index === painNoFreq.index, 'romePainFreq no longer nudges the Pain cluster / index (decoupled)');
const painStaleClusterFreq = scoring.computeScores(painMild, { clusterFreq: { Pain: 3 } });
ok(painStaleClusterFreq.index === painNoFreq.index, 'clusterFreq.Pain is (still) ignored — Pain frequency was never wired through clusterFreq');

// 34h. Duplication fix — Rome IV onset question removed from romeCard();
// classifyRomeIV() falls back to sx_duration when rome.onset is unanswered.
ok(!/When did this pattern first start/.test(html), 'romeCard no longer asks a separate onset question');
const rome34h_fallback = rome.classifyRomeIV({ painFreq: 5, onset: null, rm_assoc_defecation: true, rm_assoc_freqchange: true }, {}, 2);
ok(rome34h_fallback.answered === true && rome34h_fallback.criteriaMet === true,
  'classifyRomeIV falls back to sx_duration (index 2 = onset met) when rome.onset is unanswered');
const rome34h_toorecent = rome.classifyRomeIV({ painFreq: 5, onset: null, rm_assoc_defecation: true, rm_assoc_freqchange: true }, {}, 0);
ok(rome34h_toorecent.criteriaMet === false, 'classifyRomeIV onset-not-met correctly derived from sx_duration index 0 (<3mo)');
const rome34h_explicit = rome.classifyRomeIV({ painFreq: 5, onset: 4, rm_assoc_defecation: true, rm_assoc_freqchange: true }, {}, 0);
ok(rome34h_explicit.criteriaMet === true, 'explicit rome.onset still takes priority over sx_duration fallback when both present');

// 34i. CSV export's computeScores(a) call takes only answers — bristol/
// clusterFreq/romePainFreq never fed the Index (a leftover `opts` param that
// was silently unused; removed as dead code). Recomputation now can't diverge
// on those fields because there's nothing left for it to diverge on.
ok(/const sc = computeScores\(a\)/.test(html), 'CSV export computeScores() call takes only answers (no unused opts)');
ok(!/function computeScores\(answers, opts\)/.test(html), 'computeScores() no longer declares the unused opts parameter');

// A5/A9 CSV regression. Header/row column-count parity, medsOther surfaced,
// formula-injection guard, no literal "null" for a core-skipped visit, and
// the dead `capped` column removed.
const csvDbFull = { patients: [{ visits: [{ id: 'v1', date: Date.now(),
  answers: { gsrs_heartburn: 2 },
  extras: { medsOther: '=cmd|test', surgeryOther: '+injected', clusterFreq: { Reflux: 2 },
    treatmentsTried: ['probiotic', 'ppi'], bowelFreq: 1, smoking: 2, caffeine: 1, hydration: 2,
    heightCm: 170, weightKg: 70, waistCm: 90, rome: {} },
}] }] };
const csvText = storage.pilotExportCSV(csvDbFull);
const csvLines = csvText.split('\n');
const csvHeaderCols = csvLines[0].split(',').length;
function splitCSVLine(line) {
  const re = /(?:^|,)("(?:[^"]|"")*"|[^,]*)/g;
  const out = []; let mm;
  while ((mm = re.exec(line))) { if (mm[0] === '' && mm.index === line.length) break; out.push(mm[1]); if (re.lastIndex >= line.length) break; }
  return out;
}
const csvRowCols = splitCSVLine(csvLines[1]).length;
ok(csvHeaderCols === csvRowCols, `CSV header (${csvHeaderCols}) and row (${csvRowCols}) column counts match`);
ok(csvLines[0].includes('ex_medsOther'), 'CSV header includes ex_medsOther (A5)');
ok(csvLines[1].includes('cmd|test'), 'medsOther value present in exported row (formula-guard prefix does not corrupt the value)');
ok(!/^=|,=/.test(csvLines[1].replace(/"[^"]*"/g, '')), 'no un-neutralised leading = outside quoted cells (formula-injection guard, A9)');
ok(!csvLines[0].includes('capped') && !csvLines[0].includes(',capped,'), 'CSV header no longer has the dead capped column (A9)');

// A6/A9 — a core-skipped visit exports no literal "null" for index/band.
const csvDbEmpty = { patients: [{ visits: [{ id: 'v2', date: Date.now(), answers: {}, extras: {} }] }] };
const csvEmptyText = storage.pilotExportCSV(csvDbEmpty);
const csvEmptyRow = csvEmptyText.split('\n')[1];
ok(!/(^|,)null(,|$)/.test(csvEmptyRow), 'core-skipped visit does not export the literal string "null" (A6)');

// A5/A7 print regressions. Both prints must surface tri.autonomicNote and
// tri.conditionNote (previously present in the on-screen triageCard but
// silently dropped from both print builders' note concats). Clinician print
// must also surface driverExtras.medsOther.
ok(/tri\.autonomicNote/.test(clSrc), 'clinician print surfaces autonomicNote as a clinical flag (A7)');
ok(/row\('Medication confounders'/.test(clSrc), 'medication confounders still surfaced (now a Context & drivers row, not the plan box)');
ok(/medsOther/.test(clSrc), 'clinician print surfaces driverExtras.medsOther (A5)');

// A6 regression. deltaLabel() must null-guard BOTH curr and prev — a null
// index (core GI section not completed on a visit) must never coerce to 0
// and produce a false "Improved"/"Worsened" label.
ok(trend.deltaLabel(50, null) === null, 'deltaLabel: null prev → null (first visit)');
ok(trend.deltaLabel(null, 50) === null, 'deltaLabel: null curr → null (A6, was previously coerced to 0-50=-50 "Improved")');
ok(trend.deltaLabel(null, null) === null, 'deltaLabel: both null → null');
ok(trend.deltaLabel(60, 50) !== null && trend.deltaLabel(60, 50).dir === 'worsened', 'deltaLabel: sane non-null case unaffected');

// A6 render-site regressions (source-level — these are DOM renderers).
ok(/p\.index != null \? `\$\{p\.index\}%` : '—'/.test(html) || /idxTxt/.test(html), 'clinician-print progression table null-guards the index cell');
ok(/bandCls\(label\)/.test(html) && /sev-unknown/.test(html), 'bandCls() has a distinct fallback class for a null/unknown band (not silently Minimal)');
ok(/latest && latest\.index != null/.test(html), 'ui-record patient-card null-guards latest.index');

// A8 regression. Pregnancy is now a PER-VISIT applicability flag: captured
// into currentVisit() and restored by loadVisit() from the saved visit
// (previously loadVisit() unconditionally blanked it, so the Pregnant
// banner/caveat vanished on any saved-visit reload/print).
ok(/pregnant: session\.pregnant \|\| ''/.test(html), 'currentVisit() captures session.pregnant per visit (A8)');
ok(/session\.pregnant = v\.pregnant \|\| ''/.test(html), 'loadVisit() restores session.pregnant from the saved visit, not blanked (A8)');

// A9 regression. The "Not applicable" button must re-run updateProgress()/
// refreshReveals() like every other answer control — otherwise a revealed
// follow-up item (e.g. im_known_dx_which) stays visible after its parent is
// set N/A, since the reveal gate is never re-evaluated.
const naBtnMatch = html.match(/naBtn\.onclick = \(\) => \{[\s\S]*?\};/);
ok(!!naBtnMatch && /updateProgress\(\)/.test(naBtnMatch[0]) && /refreshReveals\(\)/.test(naBtnMatch[0]),
  'N/A button handler calls updateProgress() + refreshReveals() (A9)');

// A9 regression. loadVisit() deep-merges clusterFreq like meds/dys/rome —
// previously inconsistent hardening left a latent TypeError on a partial
// imported backup missing the clusterFreq key.
ok(/extras\.clusterFreq = Object\.assign\(blankExtras\(\)\.clusterFreq, saved\.clusterFreq \|\| \{\}\)/.test(html),
  'loadVisit() deep-merges clusterFreq (A9)');

// Resolve which tier a candidacy reason with the given text fragment is filed
// under: tri.level if it's the primary reason, otherwise look it up in
// alsoConsider (whose entries carry { label, reasons }, label == TIERS[lvl].label).
const TIERS = req('triage.js').TIERS;
function tierLevelForLabel(label) {
  for (const lvl of Object.keys(TIERS)) if (TIERS[lvl].label === label) return Number(lvl);
  return null;
}
function candidacyTier(tri, textFragment) {
  const re = new RegExp(textFragment);
  if (tri.reasons.some(r => re.test(r.text))) return tri.level;
  for (const a of tri.alsoConsider) if (a.reasons.some(r => re.test(r.text))) return tierLevelForLabel(a.label);
  return null;
}

// B1 regression. diarrhoea_dominant must route to Tier 2 ("exclude organic
// causes first"), not Tier 3 ("microbiome-support candidate") — chronic
// diarrhoea mandates calprotectin/coeliac serology before a probiotic frame.
const b1Answers = { gsrs_diarrhoea: 3, gsrs_urgency: 3, gsrs_loose: 3 };
const b1Score = scoring.computeScores(b1Answers, {});
const b1Pats = patterns.detectPatterns(b1Score, {}, b1Answers);
ok(b1Pats.some(p => p.id === 'diarrhoea_dominant'), 'sanity: diarrhoea_dominant pattern fires on this fixture');
const b1Tri = triage(b1Score, b1Pats, [], { count: 0 }, {});
ok(candidacyTier(b1Tri, 'Loose-stool') === 2, 'diarrhoea_dominant candidacy is filed under Tier 2, not Tier 3 (B1)');

// B2 regression. A lab-confirmed deficiency (nu_known_def) fires
// nutrient_malabsorption on its own, even when current GI symptoms are mild
// (giPresent false) — previously gated out, silently dropping a
// referral-grade signal for exactly the patient it targets.
const b2Answers = { gsrs_heartburn: 0, nu_known_def: 1 };
const b2Score = scoring.computeScores(b2Answers, {});
ok((b2Score.secNorm.GI || 0) < 0.2, 'sanity: b2Answers fixture keeps secNorm.GI below the 0.2 giPresent gate');
const b2Pats = patterns.detectPatterns(b2Score, {}, b2Answers);
ok(b2Pats.some(p => p.id === 'nutrient_malabsorption'), 'nutrient_malabsorption fires on lab-confirmed deficiency alone, independent of giPresent (B2)');
const b2Tri = triage(b2Score, b2Pats, [], { count: 0 }, {});
ok(b2Tri.level === 1, 'lab-confirmed deficiency alone reaches Tier 1 even with mild current GI symptoms (B2)');

// B5 regression. inflammatory_immune with a diagnosed condition
// (im_known_dx) as the only specific signal reaches Tier 2, not Tier 3 —
// previously signalHits=2 (<3) routed it to Tier 3 despite the routing
// comment's stated intent that a diagnosed condition should reach Tier 2.
const b5Answers = { gsrs_heartburn: 2, im_known_dx: 1 };
const b5Score = scoring.computeScores(b5Answers, {});
const b5Pats = patterns.detectPatterns(b5Score, {}, b5Answers);
const b5Infl = b5Pats.find(p => p.id === 'inflammatory_immune');
ok(!!b5Infl, 'sanity: inflammatory_immune fires on im_known_dx alone (GI present)');
ok(b5Infl.signalHits < 3, 'sanity: this fixture has signalHits < 3 (the case that was previously mis-routed)');
const b5Tri = triage(b5Score, b5Pats, [], { count: 0 }, { immuneKnownDx: true });
ok(candidacyTier(b5Tri, 'Inflammatory') === 2, 'diagnosed condition (im_known_dx) alone routes inflammatory_immune to Tier 2, not Tier 3 (B5)');
const b5TriNoDx = triage(b5Score, b5Pats, [], { count: 0 }, { immuneKnownDx: false });
ok(candidacyTier(b5TriNoDx, 'Inflammatory') === 3, 'sanity: without immuneKnownDx, low-signalHits inflammatory_immune still routes Tier 3 as before');
ok(/immuneKnownDx/.test(html), 'immuneKnownDx opt wired through computeAll() → triage() (source check)');

// B3 regression. Coeliac-serology timing note fires whenever a coeliac
// work-up is plausible: nutrient_malabsorption/inflammatory_immune firing,
// OR coeliac already flagged via reported condition or family history — and
// is null otherwise.
ok(b2Tri.coeliacTimingNote && /gluten[\s\S]*false-negative/.test(b2Tri.coeliacTimingNote),
  'coeliacTimingNote fires when nutrient_malabsorption fires (B3)');
const b3TriNone = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 }, {});
ok(b3TriNone.coeliacTimingNote === null, 'coeliacTimingNote is null with no malabsorption/inflammatory pattern and no coeliac flag');
const b3TriFamily = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 },
  { knownConditions: { list: [] }, family: { list: ['Coeliac disease'] } });
ok(b3TriFamily.coeliacTimingNote && /gluten[\s\S]*false-negative/.test(b3TriFamily.coeliacTimingNote),
  'coeliacTimingNote fires from family-history coeliac flag alone, even with no pattern firing (B3)');
ok(/tri\.coeliacTimingNote/.test(clSrc) && /tri\.coeliacTimingNote/.test(html.match(/function triageCard\(tri, rome, showInvestigations, includeInvestigationsList\)[\s\S]*?\n\}/)[0]),
  'coeliacTimingNote wired into both render sites (triageCard + clinician print)');

// B4 regression. Unsupervised-restriction note fires when Low-FODMAP or
// Elimination diet is in the resolved treatmentsTried label list — a
// standing dietitian-review caution, independent of tier/severity.
const b4TriRestrict = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 },
  { treatmentsTried: ['Low-FODMAP diet'] });
ok(b4TriRestrict.restrictionNote && /dietitian/.test(b4TriRestrict.restrictionNote),
  'restrictionNote fires when Low-FODMAP diet is in treatmentsTried (B4)');
const b4TriElim = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 },
  { treatmentsTried: ['Elimination diet'] });
ok(b4TriElim.restrictionNote && /dietitian/.test(b4TriElim.restrictionNote),
  'restrictionNote fires when Elimination diet is in treatmentsTried (B4)');
const b4TriNone = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 },
  { treatmentsTried: ['Probiotic', 'PPI / acid suppressant'] });
ok(b4TriNone.restrictionNote === null, 'restrictionNote is null when no restrictive diet is in treatmentsTried');
ok(/tri\.restrictionNote/.test(clSrc), 'restrictionNote wired into the clinician print');

// C1 regression. romeDisplaySubtype() layers Bristol on top of bowelSubtype()
// for the DISPLAYED Rome subtype only — bowelSubtype() itself (pattern-firing
// source of truth) must stay untouched (2-arg, cluster-norm-only).
ok(rome.bowelSubtype.length === 1, 'bowelSubtype() unchanged — still cluster-norm-only, no bristol param (C1)');
ok(rome.romeDisplaySubtype({}, 1) === 'IBS-C', 'romeDisplaySubtype: Bristol type 1 (no cluster signal) → IBS-C');
ok(rome.romeDisplaySubtype({}, 2) === 'IBS-C', 'romeDisplaySubtype: Bristol type 2 → IBS-C');
ok(rome.romeDisplaySubtype({}, 6) === 'IBS-D', 'romeDisplaySubtype: Bristol type 6 → IBS-D');
ok(rome.romeDisplaySubtype({}, 7) === 'IBS-D', 'romeDisplaySubtype: Bristol type 7 → IBS-D');
const c1BothProminent = { Constipation: 0.5, Diarrhoea: 0.5 };
ok(rome.romeDisplaySubtype(c1BothProminent, null) === 'IBS-M', 'romeDisplaySubtype: Bristol unanswered, both clusters prominent → falls back to IBS-M (unchanged pre-change behaviour)');
ok(rome.romeDisplaySubtype(c1BothProminent, 4) === 'IBS-M', 'romeDisplaySubtype: Bristol indeterminate (3-5) → falls back to cluster-norm read, not forced to a single direction');
ok(rome.romeDisplaySubtype(c1BothProminent, null) === rome.bowelSubtype(c1BothProminent),
  'romeDisplaySubtype fallback matches bowelSubtype exactly when Bristol is unanswered (no behaviour change for that case)');

// C1: classifyRomeIV's 4th param threads through to the displayed subtype.
const c1Rome = { painFreq: 5, onset: 4, rm_assoc_defecation: true, rm_assoc_freqchange: true };
const c1Result = rome.classifyRomeIV(c1Rome, {}, null, 1);
ok(c1Result.criteriaMet === true && c1Result.subtype === 'IBS-C', 'classifyRomeIV(...,bristol=1) surfaces Bristol-driven IBS-C subtype end-to-end');
const c1ResultNoBristol = rome.classifyRomeIV(c1Rome, {}, null);
ok(c1ResultNoBristol.subtype === 'IBS-U', 'classifyRomeIV without bristol arg is unchanged (backward compatible, falls back to cluster norms)');

// C1 anti-regression: pattern firing (constipation_dominant/diarrhoea_dominant)
// must NOT flip based on Bristol contradicting the cluster-norm direction —
// this is the exact bug class A1 fixed; C1 must not reintroduce it via a
// different path. romeSignal() (patterns.js) deliberately omits bristol.
const c1PatFixture = { gsrs_diarrhoea: 3, gsrs_urgency: 3, gsrs_loose: 3 }; // Diarrhoea cluster prominent
const c1PatScoreNoBristol = scoring.computeScores(c1PatFixture, {});
const c1PatScoreWithBristol = scoring.computeScores(c1PatFixture, { bristol: 1 }); // Bristol says constipated
const c1PatsNoBristol = patterns.detectPatterns(c1PatScoreNoBristol, {}, c1PatFixture);
const c1PatsWithBristol = patterns.detectPatterns(c1PatScoreWithBristol, { bristol: 1 }, c1PatFixture);
ok(c1PatsNoBristol.some(p => p.id === 'diarrhoea_dominant') === c1PatsWithBristol.some(p => p.id === 'diarrhoea_dominant'),
  'diarrhoea_dominant firing is unchanged by a contradicting Bristol answer (C1 does not leak into pattern firing)');
ok(!c1PatsWithBristol.some(p => p.id === 'constipation_dominant'),
  'constipation_dominant does NOT fire purely because Bristol contradicts the cluster-norm direction (anti-regression for the A1 bug class)');

// C2 regression. The Symptom axis note no longer overclaims an unmodified
// validated instrument.
ok(!/'GSRS-based, validated instrument\.'/.test(html), 'old overreaching "validated instrument" note string removed (C2)');
ok(/'GSRS-derived \(modified 5-point 0–4 scale\); index includes stool-form\/frequency adjustments — provisional\.'/.test(html),
  'new accurate provisional note string present (C2/D0 — 5-point 0–4 scale)');
ok(/symptom:\s*\{ axis: 'symptom',[\s\S]{0,300}validated: 'derived',/.test(html),
  "Symptom axis is validated:'derived' — modified 5-point scale is GSRS-DERIVED, not the unmodified validated instrument (D0)");

// C4 regression checks.
ok(/Over the last 3 months, on average, how often do you get abdominal pain\?/.test(html),
  'Rome pain-frequency stem carries the "last 3 months" time anchor (C4)');
ok(!/'On average, how often do you get abdominal pain\?'/.test(html),
  'old Rome pain-frequency stem (without the time anchor) is gone (C4)');

// Pain/Rome card reveal now fires on chronicity too, even when gsrs_pain===0.
ok(schema.revealMet(schema.CARD_REVEAL ? schema.CARD_REVEAL['reveal-card-pain'] : { any: [{ type: 'item', id: 'gsrs_pain', min: 1 }, { type: 'item', id: 'sx_duration', min: 2 }] },
  { answers: { gsrs_pain: 0, sx_duration: 2 } }) === true,
  'pain/Rome card reveals on chronic sx_duration even when gsrs_pain is 0 (C4)');
ok(schema.revealMet({ any: [{ type: 'item', id: 'gsrs_pain', min: 1 }, { type: 'item', id: 'sx_duration', min: 2 }] },
  { answers: { gsrs_pain: 1, sx_duration: 0 } }) === true,
  'pain/Rome card still reveals on gsrs_pain alone (unchanged behaviour, C4)');
ok(schema.revealMet({ any: [{ type: 'item', id: 'gsrs_pain', min: 1 }, { type: 'item', id: 'sx_duration', min: 2 }] },
  { answers: { gsrs_pain: 0, sx_duration: 0 } }) === false,
  'pain/Rome card stays hidden when neither pain nor chronicity is present (C4)');
ok(/'reveal-card-pain': \{ any: \[/.test(html) && /'reveal-card-rome': \{ any: \[/.test(html),
  'CARD_REVEAL wires the any-branch for both pain and Rome cards (source check, C4)');

// rf_newonset50 wording split — age cue is its own sentence, same firing logic.
const rfNewonset50 = req('redflags.js').RED_FLAGS.find(f => f.id === 'rf_newonset50');
ok(/This applies at any age, but is especially important if you are over 45\./.test(rfNewonset50.label),
  'rf_newonset50 age cue is its own sentence, not a parenthetical qualifier (C4)');
ok(/lasting 6 weeks or more\./.test(rfNewonset50.label), 'rf_newonset50 still states the 6-week persistence threshold (C4)');

// De-jargon (C4): the "validated questionnaire" overclaim must stay gone. (The
// patient-facing PT_HEAD_DESC map that carried the accurate replacement copy was
// removed with the patient summary — the clinician report uses the axis-profile
// provenance tags instead, checked elsewhere.)
ok(!/from a validated questionnaire/.test(html), 'gut_symptom_burden "validated questionnaire" overclaim stays removed (C4)');

// D5 regression. FIT added to both the family-cancer-history investigation and
// diarrhoea_dominant's investigation list.
const fhCancer = scales.FAMILY_HISTORY.find(f => f.id === 'fh_cancer');
ok(/FIT \(faecal immunochemical test\)/.test(fhCancer.invest), 'FIT added to fh_cancer investigation text (D5)');
ok(/FIT \(faecal immunochemical test\)/.test(html.match(/diarrhoea_dominant: \[[^\]]*\]/)[0]),
  'FIT added to diarrhoea_dominant investigation list (D5)');

// D2 regression. endo now carries a clinNote (surfaces via
// knownConditions().notes → triage.conditionGuidance, already-wired
// mechanism — no triage.js change needed).
const d2Endo = scales.KNOWN_CONDITIONS.find(c => c.id === 'endo');
ok(!!d2Endo.clinNote && /pelvic adhesion risk/.test(d2Endo.clinNote), 'endo now has a clinNote (D2)');
const d2Conditions = scales.knownConditions({ conditions: ['endo'] });
ok(d2Conditions.notes.some(n => /pelvic adhesion risk/.test(n)), 'endo clinNote surfaces via knownConditions().notes end-to-end (D2)');

// pelvicRisk composition — each of the three OR'd sources independently true.
ok(scales.surgicalFlags({ surgeries: ['adhesion_surgery'] }).adhesion !== undefined,
  'sanity: surgicalFlags().adhesion is a real field on the returned object');
const d2AdhesionSurgeryId = scales.SURGERIES.find(s => s.adhesion) && scales.SURGERIES.find(s => s.adhesion).id;
ok(!!d2AdhesionSurgeryId, 'sanity: at least one SURGERIES entry is flagged adhesion:true');
ok(scales.surgicalFlags({ surgeries: [d2AdhesionSurgeryId] }).adhesion === true,
  'an adhesion-flagged surgery sets surgicalFlags().adhesion (one of pelvicRisk\'s three OR sources, D2)');
ok(/pelvicRisk = obstetricHistory\(extras\)\.risk \|\| surgicalFlags\(extras\)\.adhesion\s*\n\s*\|\| \(extras\.conditions \|\| \[\]\)\.includes\('endo'\)/.test(html),
  'pelvicRisk composes obstetric history OR adhesion surgery OR endo condition (source check, D2)');

// D4 regression. gsrs_incomplete is a corroborating signal for pelvic_floor,
// not a firing requirement — existing firing fixtures must be unchanged
// (regression guard), and the new signal appears in the pattern's output.
const d4Fixture = { ar_incont_urge: 3, ar_straining: 3, ar_blockage: 3 };
const d4Score = scoring.computeScores(Object.assign({}, d4Fixture), {});
const d4Pats = patterns.detectPatterns(d4Score, {}, d4Fixture);
const d4PF = d4Pats.find(p => p.id === 'pelvic_floor');
ok(!!d4PF, 'pelvic_floor still fires on the existing incontinence fixture unchanged (D4 regression guard)');
ok(d4PF.signalTotal === 7, 'pelvic_floor now carries 7 signals (was 6) — gsrs_incomplete added (D4)');
// Firing logic itself (incont || (strain && (blockage||maneuv))) is untouched —
// a strain-only fixture without incontinence, blockage, or maneuvers must NOT fire
// merely because gsrs_incomplete is high.
const d4NoFire = { ar_straining: 3, gsrs_incomplete: 3 };
const d4NoFireScore = scoring.computeScores(d4NoFire, {});
const d4NoFirePats = patterns.detectPatterns(d4NoFireScore, {}, d4NoFire);
ok(!d4NoFirePats.some(p => p.id === 'pelvic_floor'),
  'pelvic_floor does NOT fire on gsrs_incomplete alone (still not a firing requirement, D4)');

// D1 regression. Low BMI or a diagnosed EPI/bariatric history fires
// nutrient_malabsorption on its own, independent of giPresent — mirrors the
// nu_known_def standalone-fire logic from the prior tranche.
const d1BaseAnswers = { gsrs_heartburn: 0 }; // GI absent → giPresent false
const d1BaseScore = scoring.computeScores(d1BaseAnswers, {});
ok((d1BaseScore.secNorm.GI || 0) < 0.2, 'sanity: d1BaseAnswers fixture keeps giPresent false');

const d1LowBMI = scales.anthropometrics({ heightCm: 170, weightKg: 50 }, {});
ok(d1LowBMI.bmi < 18.5, 'sanity: d1LowBMI fixture is actually under the 18.5 threshold');
const d1PatsLowBMI = patterns.detectPatterns(d1BaseScore, { anthro: d1LowBMI }, d1BaseAnswers);
ok(d1PatsLowBMI.some(p => p.id === 'nutrient_malabsorption'), 'nutrient_malabsorption fires on low BMI alone, GI absent (D1)');

const d1PatsPancreas = patterns.detectPatterns(d1BaseScore, { conditions: ['pancreas'] }, d1BaseAnswers);
ok(d1PatsPancreas.some(p => p.id === 'nutrient_malabsorption'), 'nutrient_malabsorption fires on a diagnosed pancreatic/EPI condition alone (D1)');

const d1PatsBariatric = patterns.detectPatterns(d1BaseScore, { surgeries: ['bariatric'] }, d1BaseAnswers);
ok(d1PatsBariatric.some(p => p.id === 'nutrient_malabsorption'), 'nutrient_malabsorption fires on bariatric-surgery history alone (D1)');

const d1PatsNone = patterns.detectPatterns(d1BaseScore, { anthro: scales.anthropometrics({}, {}), conditions: [], surgeries: [] }, d1BaseAnswers);
ok(!d1PatsNone.some(p => p.id === 'nutrient_malabsorption'), 'nutrient_malabsorption does not fire with none of the known-tier signals present (D1 regression guard)');

// driverExtras carries anthro end-to-end (source check on computeAll()).
ok(/const anthro = anthropometrics\(extras, session\);/.test(html) && /driverExtras = \{[\s\S]{0,900}anthro,/.test(html),
  'computeAll() computes anthro before driverExtras and includes it (D1)');
const d1DrvSiteMatches = html.match(/conditions: ex\.conditions, surgeries: ex\.surgeries, anthro: anthropometrics\(ex, \{\}\)/g) || [];
ok(d1DrvSiteMatches.length === 2,
  'both CSV export AND trend.js visitScore() drv objects carry conditions/surgeries/anthro for pattern-firing parity (D1)');

// computeAll()'s driverExtras must carry clusterFreq end-to-end — this is what
// buildClinicianPrint/severityFrequencyCard read via severityFrequencyMatrix(score,
// driverExtras). Without it, every cluster except Pain (which comes via rome.painFreq)
// silently reads as "frequency not recorded" in the live report regardless of what
// was actually entered on the clusterFreqCard — found by generating a fully-answered
// sample report and seeing Reflux/Indigestion/Diarrhoea/Constipation frequency vanish
// even though extras.clusterFreq had real values for them.
ok(/driverExtras = \{[\s\S]{0,900}rome: extras\.rome, clusterFreq: extras\.clusterFreq,/.test(html),
  'computeAll() driverExtras carries clusterFreq (severity×frequency widget reads it from driverExtras, not extras)');
// Same bug class: buildClinicianPrint's "Interventions this visit" line reads
// interventionSummary(driverExtras) — found alongside the clusterFreq gap by the
// same fully-answered sample report (the line always read "None recorded" even
// with extras.interventionChips/interventionNotes populated).
ok(/driverExtras = \{[\s\S]{0,1000}interventionChips: extras\.interventionChips, interventionNotes: extras\.interventionNotes,/.test(html),
  'computeAll() driverExtras carries interventionChips/interventionNotes (print "Interventions this visit" reads driverExtras, not extras)');

// D3 regression. referredPainNote fires on low-back/abdominal pain location +
// a prominent Pain cluster (>=0.5), same threshold as the existing Tier-2
// "Prominent abdominal-pain cluster" check. Context note only, never a Tier
// trigger on its own.
const d3PainAnswers = { gsrs_pain: 3 }; // Pain cluster prominent (norm >= 0.5)
const d3PainScore = scoring.computeScores(d3PainAnswers, {});
ok((d3PainScore.clusterNorm.Pain || 0) >= 0.5, 'sanity: d3PainAnswers fixture keeps the Pain cluster >= 0.5');
const d3TriLowBack = triage(d3PainScore, [], [], { count: 0 }, { painRegion: 'low_back' });
ok(!!d3TriLowBack.referredPainNote && /low back/.test(d3TriLowBack.referredPainNote), 'referredPainNote fires for low_back painRegion + prominent Pain cluster (D3)');
const d3TriAbdomen = triage(d3PainScore, [], [], { count: 0 }, { painRegion: 'abdomen' });
ok(!!d3TriAbdomen.referredPainNote && /abdominal/.test(d3TriAbdomen.referredPainNote), 'referredPainNote fires for abdomen painRegion + prominent Pain cluster (D3)');
const d3TriOther = triage(d3PainScore, [], [], { count: 0 }, { painRegion: 'joints' });
ok(d3TriOther.referredPainNote === null, 'referredPainNote does not fire for a non-referred-pain region (joints) (D3)');
const d3TriNoRegion = triage(d3PainScore, [], [], { count: 0 }, {});
ok(d3TriNoRegion.referredPainNote === null, 'referredPainNote does not fire when painRegion is unset (D3)');
const d3MildPainAnswers = { gsrs_pain: 1 }; // Pain cluster below 0.5
const d3MildPainScore = scoring.computeScores(d3MildPainAnswers, {});
ok((d3MildPainScore.clusterNorm.Pain || 0) < 0.5, 'sanity: d3MildPainAnswers fixture keeps the Pain cluster below 0.5');
const d3TriMild = triage(d3MildPainScore, [], [], { count: 0 }, { painRegion: 'low_back' });
ok(d3TriMild.referredPainNote === null, 'referredPainNote does not fire on painRegion alone without a prominent Pain cluster (D3)');
ok(/tri\.referredPainNote/.test(clSrc), 'referredPainNote wired into the clinician print (D3)');

// D6 regression. restrictionScreenNote fires on imp_food>=2 AND (a restrictive
// diet history OR low BMI) — a wiring-only note, not a new screening instrument.
const d6Base = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 }, { impFood: 2, treatmentsTried: ['Low-FODMAP diet'] });
ok(!!d6Base.restrictionScreenNote, 'restrictionScreenNote fires on imp_food>=2 + Low-FODMAP diet history (D6)');
const d6LowBMI = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 }, { impFood: 2, anthro: { bmi: 17 } });
ok(!!d6LowBMI.restrictionScreenNote, 'restrictionScreenNote fires on imp_food>=2 + low BMI alone (D6)');
const d6ImpFoodOnly = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 }, { impFood: 2 });
ok(d6ImpFoodOnly.restrictionScreenNote === null, 'restrictionScreenNote is null when imp_food>=2 alone (no restrictive history/low BMI) (D6)');
const d6RestrictOnly = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 }, { treatmentsTried: ['Low-FODMAP diet'] });
ok(d6RestrictOnly.restrictionScreenNote === null, 'restrictionScreenNote is null when restrictive history alone (no imp_food>=2) (D6)');
ok(/tri\.restrictionScreenNote/.test(clSrc), 'restrictionScreenNote wired into the clinician print (D6)');

// D2 follow-up (browser-caught). conditionsCard()'s chip toggle must call
// refreshReveals() — pelvicRisk now depends on extras.conditions (endo), so
// without this the AR section silently stayed hidden after selecting
// Endometriosis until some unrelated answer triggered a refresh.
const conditionsCardFn = html.match(/function conditionsCard\(\)\s*\{[\s\S]*?\n\}/);
ok(!!conditionsCardFn && (conditionsCardFn[0].match(/refreshReveals\(\)/g) || []).length === 2,
  'conditionsCard() chip toggle AND "None of these" toggle both call refreshReveals() (D2 browser-caught fix)');

// ── M2: patient-reported known lab results (extras-only, drives triage) ──
// Vocabulary + helper shape.
ok(Array.isArray(scales.KNOWN_LABS) && scales.KNOWN_LABS.length === 6, 'KNOWN_LABS has 6 lab chips');
ok(['calprotectin', 'coeliac', 'crp', 'tsh', 'hba1c', 'vitamins'].every(id => scales.KNOWN_LABS.some(L => L.id === id)),
  'KNOWN_LABS covers calprotectin/coeliac/crp/tsh/hba1c/vitamins');
const kl0 = scales.knownLabs({});
ok(kl0.count === 0 && kl0.summary === '' && Array.isArray(kl0.items), 'knownLabs({}) → empty, no summary');
const klD = scales.knownLabs({ knownLabs: ['calprotectin', 'coeliac'], knownLabsDetail: { calprotectin: '180' } });
ok(klD.count === 2 && /calprotectin/i.test(klD.summary) && /180/.test(klD.summary),
  'knownLabs() summary folds the free-text value into the label');
// Never enters the Index (extras-only).
ok(scoring.computeScores({ gsrs_heartburn: 0 }, {}).index === 0, 'M2 labs are extras-only (no Index path)');
// Routing: calprotectin + coeliac → Tier 1 regardless of symptom burden.
const rCal = run(0, {}, { knownLabs: ['calprotectin'] });
ok(rCal.tri.level === 1 && reasons(rCal.tri).some(r => /calprotectin/i.test(r.text)), 'raised calprotectin → Tier 1 referral');
const rCoe = run(0, {}, { knownLabs: ['coeliac'] });
ok(rCoe.tri.level === 1 && reasons(rCoe.tri).some(r => /coeliac/i.test(r.text)), 'positive coeliac serology → Tier 1 referral');
// CRP: Tier 1 only when burden is Severe, else Tier 2.
const rCrpSevere = run(3, {}, { knownLabs: ['crp'] });
const rCrpMild = run(0, {}, { knownLabs: ['crp'] });
ok(rCrpSevere.tri.level === 1, 'raised CRP + Severe burden → Tier 1');
ok(reasons(rCrpMild.tri).some(r => /inflammatory markers/i.test(r.text)), 'raised CRP alone still surfaces as a candidacy reason');
ok(rCrpMild.tri.level !== 1, 'raised CRP without Severe burden does NOT force Tier 1');
// TSH: Tier 1 only with a constipation-dominant pattern.
const rTshConstip = run(0, { gsrs_constip: 3, gsrs_hard: 3, gsrs_incomplete: 3 }, { knownLabs: ['tsh'] });
ok(rTshConstip.pat.some(p => p.id === 'constipation_dominant') && rTshConstip.tri.level === 1,
  'abnormal TSH + constipation-dominant → Tier 1');
// labNote summarises for the clinician; null when nothing reported.
ok(rCal.tri.labNote && /calprotectin/i.test(rCal.tri.labNote), 'labNote summarises reported abnormal labs');
ok(run(0, {}).tri.labNote == null, 'labNote null when no labs reported');
// Wired into all three render sites + de-identified CSV columns.
ok(/tri\.labNote/.test(html), 'labNote referenced in a UI render site');
ok(/tri\.labNote\.replace/.test(clSrc), 'labNote surfaced as a Context & drivers row (moved out of the plan box)');
ok(/ex_lab_' \+ L\.id/.test(html) && /\(ex\.knownLabs \|\| \[\]\)\.includes\(L\.id\)/.test(html),
  'M2 labs exported as de-identified yes/no CSV columns (free-text excluded)');
ok(/knownLabs: \[\]/.test(html) && /knownLabsDetail: \{\}/.test(html), 'blankExtras seeds knownLabs / knownLabsDetail');

// ── P2: score snapshot frozen at save-time ──
// visitScore() reads a visit's frozen scoreSnapshot for the displayed numbers
// (so a later engine recalibration can't change what a past visit shows), and
// falls back to a live recompute for pre-snapshot visits.
const snapVisit = { id: 'v1', date: 1000, answers: { gsrs_pain: 2 }, extras: {},
  scoreSnapshot: { index: 99, severity: { label: 'Severe' }, secNorm: {}, clusterNorm: { Pain: 0.6 }, completeness: 42 } };
const vsSnap = trend.visitScore(snapVisit);
ok(vsSnap.index === 99 && vsSnap.band === 'Severe' && vsSnap.completeness === 42,
  'visitScore() reads the frozen scoreSnapshot (index/band/completeness) verbatim');
const oldVisit = { id: 'v2', date: 900, answers: { gsrs_pain: 2 }, extras: {} };
const vsOld = trend.visitScore(oldVisit);
ok(typeof vsOld.index === 'number' && vsOld.index !== 99,
  'visitScore() falls back to a live recompute for pre-snapshot visits');
// Wiring: snapshot written at save-time (both new + edit paths) and read by CSV.
ok(/function buildScoreSnapshot\(a, ex\)/.test(html), 'buildScoreSnapshot() helper present');
ok((html.match(/scoreSnapshot: buildScoreSnapshot\(answers, extras\)/g) || []).length === 2,
  'scoreSnapshot written on both the new-visit and edit-in-place save paths');
ok(/const snap = v\.scoreSnapshot \|\| null;[\s\S]{0,400}snap \? snap\.index/.test(html),
  'pilot CSV prefers the frozen snapshot index when present');

// ── Hierarchical reveal for bowel cluster frequency ──
// Constipation/Diarrhoea frequency rows show conditionally based on bowelFreq:
// - Constipation: show only if bowelFreq < 2 AND constipation symptoms present
// - Diarrhoea: show only if bowelFreq >= 2 AND diarrhoea symptoms present
// - Reflux/Indigestion: show if cluster has symptoms (no hierarchical logic)
ok(/const bowelFreqVal = extras\.bowelFreq/.test(html), 'hierarchical reveal reads bowelFreq from extras');
ok(/bowelFreqVal < 2 && clusterHasSymptoms/.test(html), 'Constipation frequency shows only when bowelFreq < 2 AND symptoms present');
ok(/bowelFreqVal >= 2 && clusterHasSymptoms/.test(html), 'Diarrhoea frequency shows only when bowelFreq >= 2 AND symptoms present');
ok(/} else \{[\s\S]{0,100}show = clusterHasSymptoms;[\s\S]{0,50}}\s+}\s+h\.style\.display = show/.test(html),
  'Reflux/Indigestion fall through to non-hierarchical logic (show if cluster > 0)');
ok(/These are symptom-frequency questions/.test(html), 'clusterFreqCard clarifies symptom-frequency vs stool-output distinction');
ok(/Constipation: shown only if bowelFreq < 2[\s\S]{0,300}Diarrhoea: shown only if bowelFreq >= 2/.test(html),
  'clusterFreqCard comment documents hierarchical reveal logic');

// ── Treatments already tried moved to the end of intake ──
// It used to sit in the History group (before red flags); it should now be its
// own group after the Adaptive deep dive, right before the "See results" action.
ok(/'Treatments already tried'[\s\S]{0,60}treatmentsTriedCard\(\)/.test(html),
  'treatmentsTriedCard() renders under its own "Treatments already tried" group');
ok(/targetedSymptomsArea\(\)\);[\s\S]{0,400}treatmentsTriedCard\(\)[\s\S]{0,300}justify-content:flex-end/.test(html),
  'treatmentsTriedCard() now renders after the adaptive deep dive, just before the See-results action row');
ok(!/medConfoundersCard\(\)\);\s*root\.appendChild\(treatmentsTriedCard\(\)\);/.test(html),
  'treatmentsTriedCard() no longer sits directly after medConfoundersCard() in the History group');

// ── bloating_fermentation: gasFoul is a low-yield correlate, must not solo-fire ──
// Foul-smelling gas alone (no Indigestion-cluster burden) used to fire the whole
// pattern; now it needs at least mild Indigestion-cluster signal alongside it.
const rGasAlone = run(0, {}, { dys: { gasFoul: 2 } });
ok(!rGasAlone.pat.some(p => p.id === 'bloating_fermentation'),
  'bloating_fermentation does NOT fire on gasFoul alone with zero Indigestion-cluster burden');
const rGasWithIndig = run(0, { gsrs_rumbling: 1, gsrs_bloating: 1, gsrs_burping: 1, gsrs_gas: 1 }, { dys: { gasFoul: 2 } });
ok(rGasWithIndig.pat.some(p => p.id === 'bloating_fermentation'),
  'bloating_fermentation fires when gasFoul co-occurs with mild Indigestion-cluster burden');

// ── F5 — Functional dyspepsia PDS/EPS/Mixed subtyping ──
// PDS (early satiety/fullness) and EPS (burning independent of meals) are Rome
// IV's two FD subtypes with different first-line management; subtype must not
// change whether the pattern fires or its Tier, only which investigations text
// is attached.
const fdPDS = run(1, { ug_fullness: 2 });
ok(fdPDS.pat.find(p => p.id === 'functional_dyspepsia').subtype === 'PDS', 'functional_dyspepsia resolves PDS subtype on fullness alone');
ok(fdPDS.tri.investigations.includes('Trial of prokinetic therapy or meal-spacing advice (smaller, more frequent meals)'), 'PDS routes to prokinetic/meal-spacing management');
ok(!fdPDS.tri.investigations.includes('Trial of acid suppression (4–8 weeks)'), 'PDS does NOT get the EPS acid-suppression line');

const fdEPS = run(1, { ug_burning: 2 });
ok(fdEPS.pat.find(p => p.id === 'functional_dyspepsia').subtype === 'EPS', 'functional_dyspepsia resolves EPS subtype on fasting-burning alone');
ok(fdEPS.tri.investigations.includes('Trial of acid suppression (4–8 weeks)'), 'EPS routes to acid-suppression management');
ok(!fdEPS.tri.investigations.includes('Trial of prokinetic therapy or meal-spacing advice (smaller, more frequent meals)'), 'EPS does NOT get the PDS prokinetic line');

const fdMixed = run(1, { ug_fullness: 2, ug_burning: 2 });
ok(fdMixed.pat.find(p => p.id === 'functional_dyspepsia').subtype === 'Mixed', 'functional_dyspepsia resolves Mixed subtype when both discriminators present');
ok(fdMixed.tri.investigations.includes('Trial of acid suppression (4–8 weeks)') && fdMixed.tri.investigations.includes('Trial of prokinetic therapy or meal-spacing advice (smaller, more frequent meals)'), 'Mixed gets both PDS and EPS management lines');
ok(fdPDS.tri.investigationsRanked.some(r => r.text === 'Trial of prokinetic therapy or meal-spacing advice (smaller, more frequent meals)'), 'PDS management line is ranked, not just in the flat list');
ok(!fdPDS.pat.some(p => p.id === 'reflux_upper_gi'), 'sanity: fixture does not accidentally also fire reflux_upper_gi');

// ── F3b — Histamine-reactive branch of inflammatory_immune ──
// im_histamine alone still fires inflammatory_immune generically; adding the
// atopic corroborator (im_allergies) resolves a distinct subtype that firms up
// the management line, without changing whether/how the pattern fires.
const imGeneric = run(2, { im_histamine: 3 });
ok(imGeneric.pat.find(p => p.id === 'inflammatory_immune').subtype === null, 'im_histamine alone does NOT resolve the histamine-reactive subtype');
ok(imGeneric.tri.investigations.includes('Low-histamine / DAO discussion if a histamine pattern fits'), 'generic histamine picture keeps the hedged default line');

const imHist = run(2, { im_histamine: 3, im_allergies: 3 });
ok(imHist.pat.find(p => p.id === 'inflammatory_immune').subtype === 'Histamine-reactive', 'im_histamine + im_allergies resolves Histamine-reactive subtype');
ok(imHist.tri.investigations.some(t => /histamine-reactive pattern/.test(t)), 'Histamine-reactive subtype firms up the management line');
ok(!imHist.tri.investigations.includes('Low-histamine / DAO discussion if a histamine pattern fits'), 'Histamine-reactive branch replaces the generic hedged line, not adds to it');
ok(imHist.tri.reasons.concat(imHist.tri.alsoConsider.flatMap(a => a.reasons)).some(r => /histamine-reactive/i.test(r.text)), 'Histamine-reactive subtype named in the triage candidacy reason');

// ── F4 — Autonomic / connective-tissue (hEDS) overlap, pattern-gated ──
// The note only fires when a relevant GI pattern (constipation/dyspepsia/
// reflux) co-occurs with orthostatic intolerance, palpitations, OR joint
// hypermobility — never on the autonomic signal alone.
const a4Answers = { gsrs_constip: 3, gsrs_hard: 3, gsrs_incomplete: 3, sy_hypermobile: 3 };
const a4Score = scoring.computeScores(a4Answers, {});
const a4Pats = patterns.detectPatterns(a4Score, { dys: {} }, a4Answers);
ok(a4Pats.some(p => p.id === 'constipation_dominant'), 'sanity: F4 fixture fires constipation_dominant');
const a4TriWithPattern = triage(a4Score, a4Pats, [], { count: 0 }, {
  autonomicFlag: true, autonomicSource: { orthostatic: false, palpitations: false, hypermobile: true },
});
ok(/joint hypermobility/.test(a4TriWithPattern.autonomicNote || ''), 'autonomicNote fires and names hypermobility when a relevant GI pattern co-occurs');
const a4TriNoPattern = triage(scoring.computeScores({ gsrs_heartburn: 1 }, {}), [], [], { count: 0 }, {
  autonomicFlag: true, autonomicSource: { orthostatic: false, palpitations: false, hypermobile: true },
});
ok(a4TriNoPattern.autonomicNote === null, 'autonomicNote does NOT fire on the autonomic signal alone without a relevant GI pattern');
const a4TriNoFlag = triage(a4Score, a4Pats, [], { count: 0 }, { autonomicFlag: false, autonomicSource: {} });
ok(a4TriNoFlag.autonomicNote === null, 'autonomicNote does NOT fire on a relevant GI pattern alone without an autonomic signal');

// ── F3a — Bile-acid malabsorption (BAM) lens ──
// Fires on Diarrhoea-cluster burden + cholecystectomy history + (stool sign OR
// fatty-meal trigger). Co-flags alongside diarrhoea_dominant rather than
// replacing it. The bam_stool/bam_fatty items are reveal-gated (hidden until a
// Diarrhoea signal or a reported cholecystectomy) — never scored into the
// Index (no `cluster` tag) and never inflate mandatory completeness (optional).
const diarrSys = { gsrs_diarrhoea: 3, gsrs_loose: 3, gsrs_urgency: 3 };
const bamFull = run(0, { ...diarrSys, bam_stool: 3 }, { surgeries: ['gallbladder'] });
ok(bamFull.pat.some(p => p.id === 'bile_acid_malabsorption'), 'BAM fires on Diarrhoea cluster + cholecystectomy + stool sign');
ok(bamFull.tri.investigations.includes('Trial of a bile-acid sequestrant (cholestyramine or colesevelam)'), 'BAM adds its specific sequestrant-trial line');
ok(bamFull.tri.investigations.includes('Consider bile acid malabsorption (empirical trial or SeHCAT)'), 'BAM shares the canonical SeHCAT line with diarrhoea_dominant (no duplicate wording)');
ok(bamFull.tri.reasons.concat(bamFull.tri.alsoConsider.flatMap(a => a.reasons)).some(r => /Bile-acid malabsorption pattern/.test(r.text)), 'BAM named in the triage candidacy reason');

const bamFattyOnly = run(0, { ...diarrSys, bam_fatty: 3 }, { surgeries: ['gallbladder'] });
ok(bamFattyOnly.pat.some(p => p.id === 'bile_acid_malabsorption'), 'BAM also fires on the fatty-meal-trigger signal alone (stool sign not required)');

const bamNoSurgery = run(0, { ...diarrSys, bam_stool: 3, bam_fatty: 3 }, { surgeries: [] });
ok(!bamNoSurgery.pat.some(p => p.id === 'bile_acid_malabsorption'), 'BAM does NOT fire without a reported cholecystectomy, even with both discriminators present');

const bamNoDiscriminator = run(0, diarrSys, { surgeries: ['gallbladder'] });
ok(!bamNoDiscriminator.pat.some(p => p.id === 'bile_acid_malabsorption'), 'BAM does NOT fire on cholecystectomy + diarrhoea alone, without a stool/fatty-trigger discriminator');

const bamNoDiarrhoea = run(0, { bam_stool: 3, bam_fatty: 3 }, { surgeries: ['gallbladder'] });
ok(!bamNoDiarrhoea.pat.some(p => p.id === 'bile_acid_malabsorption'), 'BAM does NOT fire without Diarrhoea-cluster burden');

// bam_stool/bam_fatty reveal gating (hidden until relevant) — schema-level check.
ok(/id: 'bam_stool'[\s\S]{0,250}revealIf:/.test(html), 'bam_stool is reveal-gated, not always shown');
ok(/id: 'bam_fatty'[\s\S]{0,250}revealIf:/.test(html), 'bam_fatty is reveal-gated, not always shown');
ok(/cluster: 'Diarrhoea', min: 0\.30 \}, \{ type: 'flag', flag: 'cholecystectomy'/.test(html), 'BAM items reveal on Diarrhoea-cluster signal OR reported cholecystectomy');

// bam_stool/bam_fatty must never enter the Index — functional check (not text
// matching): answering them at ceiling severity must not move the score.
const bamIndexBase = scoring.computeScores({ gsrs_diarrhoea: 2 }, {});
const bamIndexWithBam = scoring.computeScores({ gsrs_diarrhoea: 2, bam_stool: 4, bam_fatty: 4 }, {});
ok(bamIndexBase.index === bamIndexWithBam.index, 'bam_stool/bam_fatty answers do NOT move the Gut Symptom Index');

// F3a browser-caught fix: surgicalCard()'s chip toggle must call refreshReveals()
// — cholecystectomy now gates the BAM items. Without this, toggling "Gallbladder
// removal" wouldn't live-reveal bam_stool/bam_fatty until an unrelated answer
// happened to trigger a refresh (same class of bug conditionsCard() was
// already fixed for, D2 above).
const surgicalCardFn = html.match(/function surgicalCard\(\)\s*\{[\s\S]*?\n\}/);
ok(!!surgicalCardFn && /refreshReveals\(\)/.test(surgicalCardFn[0]),
  'surgicalCard() chip toggle calls refreshReveals() (F3a browser-caught fix)');

// ── Pattern-refinement pass: specificity routing for gut_brain and
// bloating_fermentation, mirroring inflammatory_immune's existing signalHits
// fix. A single weak proxy used to earn the same wording/Tier as a well-
// corroborated multi-signal picture; signalHits now distinguishes them. ──

// gut_brain: weak (fatigue alone) stays Tier 2 but gets lower-specificity
// wording; strong (brainfog + fatigue both present) gets the firmer wording.
const gbWeak = run(1, { bg_fatigue: 2 });
ok(gbWeak.pat.some(p => p.id === 'gut_brain'), 'sanity: gut_brain fixture (weak) fires');
const gbWeakReasons = reasons(gbWeak.tri).map(r => r.text);
ok(gbWeakReasons.some(t => /single corroborating signal/i.test(t) && /Gut-brain/i.test(t)), 'gut_brain: single weak proxy gets lower-specificity wording');
ok(gbWeak.tri.level === 2, 'gut_brain: still routes to Tier 2 even at lower specificity (psychosocial signals are not downgraded away)');

const gbStrong = run(1, { bg_fatigue: 2, bg_brainfog: 2 });
const gbStrongReasons = reasons(gbStrong.tri).map(r => r.text);
ok(gbStrongReasons.some(t => /multiple corroborating signals/i.test(t) && /Gut-brain/i.test(t)), 'gut_brain: 2+ corroborating signals gets the firmer wording');

// bloating_fermentation: weak (foodReact alone) stays Tier 3 generic; strong
// (indig + bloating + foodReact + triggers) escalates to Tier 2 with a direct
// SIBO-testing steer.
const bfWeak = run(0, { im_food_react: 3 });
ok(bfWeak.pat.some(p => p.id === 'bloating_fermentation'), 'sanity: bloating_fermentation fixture (weak) fires');
const bfWeakReasons = reasons(bfWeak.tri).map(r => r.text);
ok(bfWeakReasons.some(t => t === 'Bloating / fermentation pattern'), 'bloating_fermentation: single weak signal keeps the generic Tier-3 wording');
ok(bfWeak.tri.level !== 2 || bfWeakReasons.some(t => /calprotectin|malabsorption/i.test(t)), 'sanity: weak bloating_fermentation fixture does not itself force Tier 2');

const bfStrong = run(0, { gsrs_rumbling: 3, gsrs_bloating: 3, gsrs_burping: 3, gsrs_gas: 3, im_food_react: 3 }, { dys: { foodTriggers: ['a', 'b'] } });
ok(bfStrong.pat.some(p => p.id === 'bloating_fermentation'), 'sanity: bloating_fermentation fixture (strong) fires');
const bfStrongReasons = reasons(bfStrong.tri).map(r => r.text);
ok(bfStrongReasons.some(t => /multiple corroborating signals.*SIBO breath testing directly/i.test(t)), 'bloating_fermentation: well-corroborated picture escalates to a direct SIBO-testing steer');
ok(bfStrong.tri.level === 2, 'bloating_fermentation: well-corroborated picture routes to Tier 2');

// ── Pattern-overlap cross-references ──
// When ≥2 members of a known-overlapping group fire together, one synthesizing
// note should tie them together; a single member alone should not trigger it.
const overlapAll3 = run(0, { gsrs_heartburn: 3, gsrs_regurg: 3, ug_fullness: 2, gsrs_bloating: 3 });
ok(['reflux_upper_gi', 'functional_dyspepsia', 'bloating_fermentation'].every(id => overlapAll3.pat.some(p => p.id === id)), 'sanity: reflux + FD + bloating fixture fires all three');
ok(overlapAll3.tri.patternOverlapNotes.some(n => /one upper-GI symptom complex/.test(n)), 'upper-GI overlap note appears when 2+ of reflux/FD/bloating co-fire');

const overlapRefluxOnly = run(0, { gsrs_heartburn: 3, gsrs_regurg: 3 });
ok(overlapRefluxOnly.pat.some(p => p.id === 'reflux_upper_gi') && !overlapRefluxOnly.pat.some(p => p.id === 'functional_dyspepsia' || p.id === 'bloating_fermentation'), 'sanity: reflux-only fixture fires just reflux_upper_gi');
ok(overlapRefluxOnly.tri.patternOverlapNotes.length === 0, 'overlap note does NOT appear when only 1 group member fires');

// ── Clinician-only wording pass: red-flag/Rome-IV labels ──
// `label` is the actual intake-question text (redFlagCard()/romeCard() render
// it as-is to the patient) and must stay unchanged; `clinLabel`, where
// present, is a same-meaning clinical rewording used ONLY on clinician-only
// surfaces. Verify: (a) id/urgency/label untouched — no behavioural change,
// (b) clinLabel exists for the 6 flags + 1 Rome row that had "you/your"
// wording, (c) the 4 clinician-only render sites actually prefer clinLabel,
// (d) the 2 intake-form render sites still use plain label.
const redflagsMod = req('redflags.js');
const romeMod = req('romeiv.js');
const RF_IDS_WITH_CLINLABEL = ['rf_bleeding', 'rf_weightloss', 'rf_nocturnal', 'rf_newonset50', 'rf_mass', 'rf_fever'];
ok(RF_IDS_WITH_CLINLABEL.every(id => {
  const f = redflagsMod.RED_FLAGS.find(x => x.id === id);
  return f && typeof f.clinLabel === 'string' && f.clinLabel.length > 0 && !/\byou\b|\byour\b/i.test(f.clinLabel);
}), 'the 6 red flags with patient-facing "you/your" wording each have a clinLabel with no second-person pronouns');
ok(redflagsMod.RED_FLAGS.every(f => typeof f.label === 'string' && f.label.length > 0), 'sanity: every red flag still has its original patient-facing label');
ok(redflagsMod.RED_FLAGS.length === 11, 'sanity: red-flag count unchanged (11) — this is a wording-only change');
const rmFreqchange = romeMod.ROME_ASSOC.find(a => a.id === 'rm_assoc_freqchange');
ok(rmFreqchange && rmFreqchange.clinLabel === 'Pain associated with a change in stool frequency', 'rm_assoc_freqchange has a clinical clinLabel');
ok(/\byou\b|\byour\b/i.test(rmFreqchange.label), 'sanity: rm_assoc_freqchange.label (intake wording) is untouched');

// Render-site checks (text-based, since these are DOM-building functions).
const rfClinTabFn = html.match(/function renderClinician\(\)\s*\{[\s\S]*?\n\}/);
ok(!!rfClinTabFn && /f\.clinLabel \|\| f\.label/.test(rfClinTabFn[0]), 'renderClinician() red-flag list prefers clinLabel');
const printFn = html.match(/function buildClinicianPrint\([\s\S]*?\n\}/);
ok(!!printFn && (printFn[0].match(/f\.clinLabel \|\| f\.label/g) || []).length >= 1, 'buildClinicianPrint() red-flag list prefers clinLabel');
ok(!!printFn && (printFn[0].match(/a\.clinLabel \|\| a\.label/g) || []).length >= 1, 'buildClinicianPrint() Rome IV table prefers clinLabel');
const detailFn = html.match(/function clinicianDetailCard\([\s\S]*?\n\}/);
ok(!!detailFn && /a\.clinLabel \|\| a\.label/.test(detailFn[0]), 'clinicianDetailCard() Rome IV table prefers clinLabel');

// Intake form must NOT be touched — it should still render plain label/label.
const redFlagCardFn = html.match(/function redFlagCard\(\)\s*\{[\s\S]*?\n\}/);
ok(!!redFlagCardFn && /esc\(f\.label\)/.test(redFlagCardFn[0]) && !/clinLabel/.test(redFlagCardFn[0]), 'redFlagCard() (intake form) still renders plain patient-facing label, untouched');
const romeCardFn = html.match(/function romeCard\(\)\s*\{[\s\S]*?\n\}/);
ok(!!romeCardFn && !/clinLabel/.test(romeCardFn[0]), 'romeCard() (intake form) untouched — no clinLabel reference');
// calc()'s patient-results red-flag banner is intentionally patient-facing —
// confirm it still uses plain label (not clinLabel), i.e. it was correctly
// left alone rather than accidentally caught by a broad find/replace.
const calcFn = html.match(/function calc\(\)\s*\{[\s\S]*?\n(?=function )/);
ok(!!calcFn && /esc\(f\.label\)/.test(calcFn[0]) && !/f\.clinLabel/.test(calcFn[0]), "calc()'s patient-facing red-flag banner still uses plain label (correctly left alone)");

// ── Tier B: tighten the patient-facing gate ──
// calc() (the immediate post-submit screen — may be seen by an unsupervised
// patient) should show only: applicability note, red-flag banner, headline
// card, hero score card, trend (if tracked), and the actions row. Axis
// profile, domain breakdown, modifiable drivers, detected patterns, the risk
// matrix, and the triage/Tier verdict move to Clinician-tab-only.
ok(!!calcFn, 'sanity: calc() function body captured');
ok(!/axisProfileCard\(/.test(calcFn[0]), 'calc() no longer renders the axis profile card');
ok(!/domainBarsCard\(/.test(calcFn[0]), 'calc() no longer renders the domain breakdown bars');
ok(!/riskMatrixCard\(/.test(calcFn[0]), 'calc() no longer renders the risk matrix');
ok(!/triageCard\(/.test(calcFn[0]), 'calc() no longer renders the triage/Tier verdict card');
ok(!/Patterns to discuss/.test(calcFn[0]), 'calc() no longer renders the "patterns to discuss" card');
ok(!/'Modifiable drivers'/.test(calcFn[0]), 'calc() no longer renders the inline modifiable-drivers card');
// Still present: the safety-critical and reassurance-level (Tier B) content.
ok(/headlineCard\(heads, rome\)/.test(calcFn[0]), 'calc() still renders the headline card');
ok(/Gut Symptom Burden/.test(calcFn[0]), 'calc() still renders the hero score card');
ok(/trendCard\(/.test(calcFn[0]), 'calc() still renders the trend card when prior visits exist');
ok(/anyRedFlag\(redflags\)/.test(calcFn[0]), 'calc() still renders the red-flag banner');
ok(/appendixToggleEl\(\)/.test(calcFn[0]) && /printSummary\(/.test(calcFn[0]), 'calc() still exposes the Clinician-report print button (kept on the immediate screen per direction)');

// Nothing was lost — renderClinician() must still render every card removed
// from calc() above (in full, or a richer equivalent).
ok(!!rcSrc, 'sanity: renderClinician() source captured');
ok(/axisProfileCard\(/.test(rcSrc), 'renderClinician() still renders the axis profile card');
ok(/domainBarsCard\(/.test(rcSrc), 'renderClinician() still renders the domain breakdown');
ok(/riskMatrixCard\(/.test(rcSrc), 'renderClinician() still renders the risk matrix');
ok(/triageCard\(/.test(rcSrc), 'renderClinician() still renders the triage/Tier verdict');
ok(/modifiableDriversCard\(/.test(rcSrc), 'renderClinician() still renders modifiable drivers');
ok(/clinicianDetailCard\(/.test(rcSrc), "renderClinician() still renders the pattern-analysis appendix (clinicianDetailCard, superset of calc()'s old 'patterns to discuss')");

// ── Fix: 0–4 scale answer buttons wrapping to a second row ──
// .opts used a hardcoded repeat(4,1fr), a leftover from the 0–3 scale (4
// options); DEFAULT is now 5 options (0–4), so the 5th wrapped onto its own
// row. Fixed via a --n-opts custom property set per-question from
// labels.length, so any scale length (DEFAULT's 5, DURATION's 6) lays out in
// one row on wide screens without a hardcoded column count.
ok(/\.opts\{display:grid;grid-template-columns:repeat\(var\(--n-opts,4\),1fr\)/.test(html), '.opts grid-template-columns is driven by --n-opts, not a hardcoded column count');
ok(/style: `--n-opts:\$\{labels\.length\}`/.test(html), 'questionRow() sets --n-opts from the scale\'s actual option count');
ok(/@media\(max-width:520px\)\{\.opts\{grid-template-columns:repeat\(2,1fr\)\}\}/.test(html), 'mobile 2-column override is untouched and still applies regardless of --n-opts');

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
