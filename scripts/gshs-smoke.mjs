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

const scales = req('scales.js');
const scoring = req('scoring.js');
const patterns = req('patterns.js');
const triage = req('triage.js').triage;
const rome = req('romeiv.js');

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
  const tri = triage(score, pat, [], dys, { impactBand: prof.impact.band, romeResult: rr, adhesionSurgery: false, knownConditions: scales.knownConditions(ex) });
  return { score, prof, heads, pat, rr, tri };
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

console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
process.exit(failed ? 1 : 0);
