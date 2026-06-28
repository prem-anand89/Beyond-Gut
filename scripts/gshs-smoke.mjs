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

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
