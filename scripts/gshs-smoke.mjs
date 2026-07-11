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
  const correlateLoad = { count: heads.primary.correlate.value, signals: (heads.primary.correlate.signals || []).map(l => ({ label: l })) };
  const conditions = scales.knownConditions(ex);
  const famhx = scales.familyHistory(ex);
  const obstetric = scales.obstetricHistory(ex);
  const gynOverlap = (typeof a.gy_cyclical === 'number' && a.gy_cyclical >= 2) && (typeof a.gsrs_pain === 'number' && a.gsrs_pain >= 2);
  const anthro = scales.anthropometrics(ex, {});
  const tri = triage(score, pat, [], correlateLoad, {
    impactBand: prof.impact.band, romeResult: rr, adhesionSurgery: false,
    knownConditions: conditions, conditionNotes: conditions.notes, family: famhx, gynOverlap, obstetric, anthro,
  });
  return { score, prof, heads, pat, rr, tri, correlateLoad, obstetric, anthro };
}
const reasons = (tri) => [tri.reasons, ...tri.alsoConsider.map(x => x.reasons)].flat();

// 1. De-blend: GI=0 with systemic high → Gut Symptom Burden Minimal, systemic rises.
const r1 = run(0, { im_food_react: 3, im_infections: 3, im_allergies: 3, im_joint: 3, im_histamine: 3, sk_skin: 3, nu_hair: 3, nu_iron: 3, nu_mouth: 3, imp_work: 3, imp_social: 3, imp_food: 3, imp_global: 3 });
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

// 27. Patient summary report — structure (source-level; buildPatientPrint is a
// DOM renderer not loadable in this dependency-free harness, but its data inputs
// — heads / rome / patterns / anthro — are engine-tested above).
const ptFn = html.match(/function buildPatientPrint\(c\)\s*\{[\s\S]*?\n\}/);
ok(!!ptFn, 'buildPatientPrint present');
const ptSrc = ptFn ? ptFn[0] : '';
ok(/\bheads\b/.test(ptSrc) && /\banthro\b/.test(ptSrc) && /\brome\b/.test(ptSrc) && /\bpatterns\b/.test(ptSrc),
   'patient print uses heads, anthro, rome, patterns from c');
ok(/Your results at a glance/.test(ptSrc), 'patient print: four-output glance grid heading');
ok(/heads\.primaryList\.forEach/.test(ptSrc), 'patient print: iterates the 4 primary outputs');
ok(/heads\.secondaryList\.filter/.test(ptSrc), 'patient print: shows secondary axes (answered only)');
ok(/What this means for you/.test(ptSrc), 'patient print: plain-language triage heading');
ok(/conditionGuidance[\s\S]*familyNotes[\s\S]*anthroNote/.test(ptSrc), 'patient print: surfaces triage notes as bullets');
ok(/rome && rome\.criteriaMet/.test(ptSrc), 'patient print: Rome subtype shown only when criteria met');
ok(/patterns\.length/.test(ptSrc), 'patient print: patterns section gated on any fired');
ok(/Symptom breakdown/.test(ptSrc), 'patient print: per-area bars renamed to Symptom breakdown');
ok(/Body measurements/.test(ptSrc) && /anthro\.bmi != null/.test(ptSrc), 'patient print: anthropometrics block gated on entered values');
ok(/Modifiable factors/.test(ptSrc), 'patient print: lifestyle factors renamed to Modifiable factors');
// Plain-language maps present and jargon-free.
ok(/PT_HEAD_DESC/.test(html) && /PT_SUBTYPE_DESC/.test(html), 'patient print: plain-language description maps defined');
const headDesc = html.match(/const PT_HEAD_DESC = \{[\s\S]*?\};/);
ok(headDesc && !/GSRS|axis|norm|cluster/i.test(headDesc[0]), 'patient head descriptions are jargon-free');
ok(/clinicalImpression\(c\)/.test(ptSrc), 'patient print: clinical impression synthesized');
ok(/Clinical impression/.test(ptSrc) && ptSrc.indexOf('Clinical impression') < ptSrc.indexOf('Your results at a glance'), 'patient print: clinical impression appears before results');

// 28. Clinician report — structure (source-level; DOM renderer not loadable here).
const clFn = html.match(/function buildClinicianPrint\(c\)\s*\{[\s\S]*?\n\}\n/);
ok(!!clFn, 'buildClinicianPrint present');
const clSrc = clFn ? clFn[0] : '';
// Clinical impression up top, before Triage.
ok(/clinicalImpression\(c\)/.test(clSrc), 'clinician: clinical impression generated');
ok(clSrc.indexOf('Clinical impression') < clSrc.indexOf('>Triage<'), 'clinician: impression appears before triage');
ok(/Screening synthesis only — not a diagnosis/.test(html), 'clinician: impression carries not-a-diagnosis caveat');
// Red flags moved up — before the Axis profile.
ok(clSrc.indexOf('>Red flags<') < clSrc.indexOf('>Axis profile<'), 'clinician: red flags moved above axis profile');
ok(clSrc.indexOf('>Red flags<') < clSrc.indexOf('>Domain breakdown<'), 'clinician: red flags above domain breakdown');
// Physio candidacy callout.
ok(/physioCandidacy\(tri\)/.test(clSrc) && /Physiotherapy candidacy/.test(clSrc), 'clinician: physiotherapy candidacy callout');
// Merged axis profile with provenance + colour.
ok(/>Axis profile</.test(clSrc) && /prProv\(o\.validated\)/.test(clSrc), 'clinician: axis profile shows validated/draft provenance');
ok(/prBandPill\(o\.band\)/.test(clSrc), 'clinician: axis bands colour-coded');
ok(!/Scores — primary/.test(clSrc) && !/Scores — secondary/.test(clSrc), 'clinician: two score tables merged into one');
// Domain breakdown colour-coded by band.
ok(/bandForPct\(pct\)\.color/.test(clSrc), 'clinician: domain breakdown % colour-coded by band');
// Rome collapses when unanswered.
ok(/if \(rome\.answered\)/.test(clSrc) && /Not answered \(pain items/.test(clSrc), 'clinician: Rome IV collapses to one line when unanswered');
// Two-column item responses.
ok(/column-count:2/.test(clSrc), 'clinician: item-level responses use two columns');
// Helper unit-style checks via source presence (functions are closure-bound).
ok(/function clinicalImpression\(c\)/.test(html) && /function physioCandidacy\(tri\)/.test(html), 'clinician: impression + physio helpers defined');
ok(/function prBandPill\(band\)/.test(html) && /function prProv\(validated\)/.test(html), 'clinician: print band-pill + provenance helpers defined');

// 29. Clinician TAB (on-screen) parity — source-level (DOM renderer not loadable).
const rcFn = html.match(/function renderClinician\(\)\s*\{[\s\S]*?\n\}\n/);
ok(!!rcFn, 'renderClinician present');
const rcSrc = rcFn ? rcFn[0] : '';
ok(/clinicalImpression\(c\)/.test(rcSrc), 'clinician tab: clinical impression added');
ok(rcSrc.indexOf('clinicalImpression') < rcSrc.indexOf('headlineCard(heads'), 'clinician tab: impression above the headline');
ok(/physioCandidacy\(tri\)/.test(rcSrc) && /Physiotherapy candidacy/.test(rcSrc), 'clinician tab: physio candidacy callout');
ok(/No red flags answered Yes/.test(rcSrc), 'clinician tab: foregrounded red-flags card (with none-reassurance)');
ok(rcSrc.indexOf('Red flags') < rcSrc.indexOf('axisProfileCard'), 'clinician tab: red flags before axis profile');
// De-dup — the buried red-flag block is gone from clinicianDetailCard.
const cdFn = html.match(/function clinicianDetailCard\(c\)\s*\{[\s\S]*?\n\}\n/);
ok(cdFn && !/Red flags — \$\{fired\.length\} answered Yes/.test(cdFn[0]), 'clinician detail: buried red-flag block removed (no duplication)');

// 30. Questionnaire & scoring audit fix pass.

// 30a. Cluster-balanced GI index — equal per-symptom severity in clusters of
// different sizes (Reflux=2 items, Indigestion=4 items) must yield the SAME
// index. Previously the index was an item-weighted mean, so severe-reflux-only
// (6/45=13%) and severe-indigestion-only (12/45=27%) landed in different bands
// despite identical per-symptom severity.
const refluxOnly = { gsrs_heartburn: 3, gsrs_regurg: 3, gsrs_pain: 0, gsrs_hunger: 0, gsrs_nausea: 0,
  gsrs_rumbling: 0, gsrs_bloating: 0, gsrs_burping: 0, gsrs_gas: 0, gsrs_diarrhoea: 0, gsrs_loose: 0,
  gsrs_urgency: 0, gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 0 };
const indigOnly = { gsrs_heartburn: 0, gsrs_regurg: 0, gsrs_pain: 0, gsrs_hunger: 0, gsrs_nausea: 0,
  gsrs_rumbling: 3, gsrs_bloating: 3, gsrs_burping: 3, gsrs_gas: 3, gsrs_diarrhoea: 0, gsrs_loose: 0,
  gsrs_urgency: 0, gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 0 };
const sRefluxOnly = scoring.computeScores(refluxOnly, {});
const sIndigOnly = scoring.computeScores(indigOnly, {});
ok(sRefluxOnly.index === sIndigOnly.index, 'cluster-balanced index: equal severity in different-size clusters yields equal index');
ok(sRefluxOnly.index === 20, 'cluster-balanced index: one maxed cluster of five yields the expected 20% mean');

// 30b. Bristol nudge scoped to bowel-habit clusters only — a pure-reflux
// patient (Constipation/Diarrhoea genuinely unanswered) must see NO index
// change from an abnormal Bristol type, since neither bowel cluster exists to
// nudge. Previously the nudge was added to the whole GI norm regardless.
const pureRefluxSparse = { gsrs_heartburn: 1, gsrs_regurg: 1 };
const sNoBristol = scoring.computeScores(pureRefluxSparse, {});
const sWithBristol = scoring.computeScores(pureRefluxSparse, { bristol: 1 });
ok(sNoBristol.index === sWithBristol.index, 'Bristol nudge does not move the index when bowel-habit clusters are unanswered');
ok((sWithBristol.bristolAddPts || 0) === 0, 'bristolAddPts is 0 when bowel-habit clusters are unanswered');
// Positive case: an answered (even all-zero) bowel-habit cluster DOES get nudged.
const bowelAnswered = { gsrs_constip: 0, gsrs_hard: 0, gsrs_incomplete: 0, gsrs_diarrhoea: 0, gsrs_loose: 0, gsrs_urgency: 0 };
const sBowelNoBristol = scoring.computeScores(bowelAnswered, {});
const sBowelWithBristol = scoring.computeScores(bowelAnswered, { bristol: 1 });
ok(sBowelWithBristol.index > sBowelNoBristol.index, 'Bristol nudge raises the index when bowel-habit clusters are answered');

// 30c. Re-confirm the de-blend invariant survives the cluster-mean rewrite.
ok(run(0, { im_food_react: 3, im_infections: 3 }, { pss4Score: 16 }).heads.primary.symptom.value === 0,
  'de-blend invariant still holds after the cluster-balanced index rewrite');

// 30d. Universal symptom-duration item — ungated, driverOnly, never touches
// the Index; feeds triage.durationNote as plain context (never the Tier).
const durQ = schema.QUESTIONS.find(q => q.id === 'sx_duration');
ok(!!durQ && !durQ.revealIf && durQ.driverOnly === true, 'sx_duration present, ungated, driverOnly');
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
ok(/'Foul or sulfur-smelling wind'/.test(html), 'dys.gasFoul label present without "Excessive"');
ok(!/Excessive or foul/.test(html), 'old "Excessive or foul" gasFoul wording removed');

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

// 33. Frequency dimension — per-cluster symptom frequency nudging the Index.

// 33a. Frequency-only nudge on a non-bowel cluster (no Bristol arm applies).
const refluxMild = { gsrs_heartburn: 1, gsrs_regurg: 1 };            // norm = 2/6 ≈ 0.333
const refluxNoFreq = scoring.computeScores(refluxMild, {});
const refluxWithFreq = scoring.computeScores(refluxMild, { clusterFreq: { Reflux: 3 } }); // Daily
ok(refluxWithFreq.index > refluxNoFreq.index, 'frequency nudge raises the index on a non-bowel cluster');
ok(refluxWithFreq.frequencyAddPts === 15, 'frequencyAddPts reports the full FREQUENCY_ALPHA lift (+15) when uncapped');
ok(refluxWithFreq.index === refluxNoFreq.index + 15, 'index rise matches frequencyAddPts exactly');

// 33b. Frequency does not nudge an unanswered cluster.
const refluxOnlyNoConstipFreq = scoring.computeScores(refluxMild, { clusterFreq: { Constipation: 3 } });
ok(refluxOnlyNoConstipFreq.index === refluxNoFreq.index, 'frequency on an unanswered cluster does not move the index');

// 33c. Combined Bristol + frequency on the SAME bowel cluster is capped at
// NUDGE_CAP_PER_CLUSTER (0.15), not the naive sum (0.30) — the case that
// motivated nudgeAddPts as a separate, always-accurate combined-total field.
const constipMild = { gsrs_constip: 1, gsrs_hard: 1, gsrs_incomplete: 1 }; // norm ≈ 0.333
const bristolOnly = scoring.computeScores(constipMild, { bristol: 1 });          // Bristol type 1 → full BRISTOL_ALPHA
const combined = scoring.computeScores(constipMild, { bristol: 1, clusterFreq: { Constipation: 3 } });
ok(combined.index === bristolOnly.index, 'combined Bristol+frequency nudge on one cluster is capped, not additive (index unchanged vs Bristol alone)');
ok(combined.nudgeAddPts === 15, 'nudgeAddPts reports the capped combined total (+15), not the naive sum (+30)');
// Documented edge case: per-signal marginal isolation can both read 0 here —
// this is correct (holding either signal fixed, the other alone already
// saturates the cap) but must never be summed as a substitute for nudgeAddPts.
ok(combined.bristolAddPts === 0 && combined.frequencyAddPts === 0,
  'per-signal marginal AddPts both read 0 in the saturated case (documented, use nudgeAddPts instead)');

// 33d. Raw clusterNorm (read by patterns.js) is unaffected by frequency —
// only clusterNormForIndex/secNorm.GI/index move. Same separation Bristol's
// nudge already relies on, must hold for every nudge added to this mechanism.
ok(refluxWithFreq.clusterNorm.Reflux === refluxNoFreq.clusterNorm.Reflux,
  'raw clusterNorm.Reflux is unaffected by the frequency nudge (patterns.js unaffected)');
const pat33 = patterns.detectPatterns(refluxNoFreq, { dys: {} }, refluxMild);
const pat33Freq = patterns.detectPatterns(refluxWithFreq, { dys: {} }, refluxMild);
ok(JSON.stringify(pat33.map(p => p.id)) === JSON.stringify(pat33Freq.map(p => p.id)),
  'pattern firing is identical with/without the frequency nudge (only the Index moved)');

// 33e. Backward compatibility — clusterFreq entirely absent from opts behaves
// identically to the pre-change Bristol-only mechanism (same fixture as the
// earlier Bristol-scoping regression test).
const legacyNoFreqOpt = scoring.computeScores(bowelAnswered, { bristol: 1 });
ok(legacyNoFreqOpt.index === sBowelWithBristol.index, 'omitting clusterFreq entirely behaves identically to pre-change Bristol-only behaviour');

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
// Frequency-only nudge on Pain driven by romePainFreq (0-5 Rome scale), not clusterFreq.Pain.
const painMild = { gsrs_pain: 1, gsrs_hunger: 1, gsrs_nausea: 1 };
const painNoFreq = scoring.computeScores(painMild, {});
const painWithRomeFreq = scoring.computeScores(painMild, { romePainFreq: 5 });
ok(painWithRomeFreq.index > painNoFreq.index, 'Pain cluster nudged by romePainFreq');
ok(painWithRomeFreq.index === painNoFreq.index + 15, 'Pain romePainFreq nudge matches FREQUENCY_ALPHA magnitude (+15)');
const painStaleClusterFreq = scoring.computeScores(painMild, { clusterFreq: { Pain: 3 } });
ok(painStaleClusterFreq.index === painNoFreq.index, 'clusterFreq.Pain is ignored — Pain frequency only comes from romePainFreq');

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

// 34i. CSV export now passes clusterFreq + romePainFreq into computeScores()
// (previously silently dropped, so exported index could disagree with the
// on-screen index for any patient with frequency answers).
ok(/computeScores\(a, \{ bristol: ex\.bristol, clusterFreq: ex\.clusterFreq, romePainFreq: ex\.rome/.test(html),
  'CSV export computeScores() call includes clusterFreq + romePainFreq');

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
