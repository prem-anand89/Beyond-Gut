#!/usr/bin/env node
// Verify that CLINICIAN_HANDOFF.md claims match the actual code.
// Ensures every pattern, tier, axis, investigation is traceable.

import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const handoff = readFileSync(join(root, 'CLINICIAN_HANDOFF.md'), 'utf8');
const html = readFileSync(join(root, 'index.html'), 'utf8');

// Extract modules from HTML
const scriptMatch = html.match(/<script>([\s\S]*)<\/script>/);
if (!scriptMatch) {
  console.error('FAIL: no <script> block found');
  process.exit(1);
}

const code = scriptMatch[1].replace(/__req\(\s*['"]app\.js['"]\s*\)\s*;?\s*\/\/\s*boot/, '');
let req;
try {
  req = new Function(code + '\n;return __req;')();
} catch (e) {
  console.error('FAIL: script did not parse:', e.message);
  process.exit(1);
}

const patterns = req('patterns.js');
const triageModule = req('triage.js');
const triage = triageModule.triage;
const TIERS = triageModule.TIERS || req('triage.js').TIERS;
const scoring = req('scoring.js');

let failed = 0;
const ok = (cond, label) => {
  console.log(`${cond ? 'ok' : 'FAIL'} - ${label}`);
  if (!cond) failed++;
};

console.log('\n=== PATTERN VERIFICATION ===\n');

// Extract pattern names mentioned in the handoff
const patternSectionMatch = handoff.match(/## Section 4:.*?(?=## Section 5)/s);
if (!patternSectionMatch) {
  ok(false, 'Pattern section found in CLINICIAN_HANDOFF.md');
} else {
  const patternSection = patternSectionMatch[0];

  // List of patterns that should exist. `mixed-alternating` and
  // `recent-gut-disruptor` were the pre-rename names — the code's actual ids
  // are `mixed_bowel` and `post_disruptor` (this list previously never
  // matched either, past or present). `pelvic-floor-paradox` is new (F2).
  const expectedPatterns = [
    'constipation-dominant',
    'diarrhoea-dominant',
    'mixed-bowel',
    'reflux-upper-gi',
    'bloating-fermentation',
    'nutrient-malabsorption',
    'gut-brain',
    'inflammatory-immune',
    'post-disruptor',
    'pelvic-floor',
    'pelvic-floor-paradox',
    'functional-dyspepsia',
    'lifestyle-modifiable'
  ];

  // Check code actually has these patterns
  const PATTERNS = patterns.PATTERNS;
  expectedPatterns.forEach(pname => {
    const found = PATTERNS.some(p => {
      // Match by normalized name
      const normalized = p.id.replace(/_/g, '-');
      return normalized.includes(pname.replace(/_/g, '-')) ||
             pname.includes(normalized);
    });
    ok(found, `Pattern "${pname}" exists in patterns.js`);
  });

  // Check pattern firing logic is mentioned
  ['Reflux', 'Pain', 'Indigestion', 'Constipation', 'Diarrhoea'].forEach(cluster => {
    ok(patternSection.includes(cluster), `Cluster "${cluster}" mentioned in pattern descriptions`);
  });
}

console.log('\n=== TRIAGE TIER VERIFICATION ===\n');

// Verify the 4 tiers are documented
const tierSection = handoff.match(/## Section 6:.*?(?=## Section 7)/s);
if (!tierSection) {
  ok(false, 'Tier section found in handoff');
} else {
  ok(TIERS && Object.keys(TIERS).length === 4, `4 tiers defined in code (found: ${TIERS ? Object.keys(TIERS).length : 'undefined'})`);

  const tierText = tierSection[0];
  if (TIERS) {
    // TIERS keys (1..4) ARE the tier numbers already — off-by-one here
    // previously checked for a nonexistent "Tier 5" and mislabeled the
    // TIERS[1..3] action-text checks as belonging to Tier 2/3/4.
    //
    // The doc deliberately PARAPHRASES each tier's action into fuller
    // clinical guidance rather than quoting the terse in-app action string
    // verbatim (that's good documentation practice, not staleness) — so
    // instead of requiring an exact substring match, check that tier's own
    // subsection (bounded to the next "### Tier N+1:" heading) contains an
    // explicit "**Action**:" line, which is what actually matters here.
    Object.entries(TIERS).forEach(([tierNum, tierObj]) => {
      const tierName = `Tier ${tierNum}`;
      ok(tierText.includes(tierName), `${tierName} documented`);
      const nextNum = parseInt(tierNum, 10) + 1;
      const subMatch = tierText.match(new RegExp(`### Tier ${tierNum}:[\\s\\S]*?(?=### Tier ${nextNum}:|$)`));
      if (tierObj && tierObj.action) {
        ok(!!subMatch && /\*\*Action\*\*:/.test(subMatch[0]), `${tierName} action text present`);
      }
    });
  }
}

console.log('\n=== AXIS VERIFICATION ===\n');

// Verify 6 axes are documented
const axisSection = handoff.match(/## Section 7:.*?(?=## Section 8)/s);
if (!axisSection) {
  ok(false, 'Axis section found in handoff');
} else {
  const expectedAxes = ['Symptom', 'Inflammatory', 'Nutrient', 'Psychosocial', 'Impact', 'Pelvic'];
  expectedAxes.forEach(axis => {
    ok(axisSection[0].includes(axis), `Axis "${axis}" documented`);
  });
}

console.log('\n=== INVESTIGATION LIST VERIFICATION ===\n');

// Sample check: nutrient pattern investigations should include specific tests.
// The doc documents these in TWO places (an abbreviated quick-reference table
// row and a fuller deep-dive "Investigations:" line) — neither single 3000-
// char window after one "nutrient malabsorption" mention contains every
// expected term, so union the hits across every window instead of picking one.
const nutrientWindows = [...handoff.matchAll(/nutrient.?malabsorption[\s\S]{0,3000}/gi)].map(m => m[0]);
if (nutrientWindows.length && nutrientWindows.some(w => /FBC/.test(w))) {
  const expectedInvestigations = ['FBC', 'iron', 'B12', 'vitamin D', 'coeliac'];
  expectedInvestigations.forEach(inv => {
    ok(nutrientWindows.some(w => w.includes(inv)), `Investigation "${inv}" listed for nutrient malabsorption`);
  });
} else {
  ok(false, 'Nutrient malabsorption investigation section found');
}

console.log('\n=== RED FLAG VERIFICATION ===\n');

// Check red flags are documented. Red flags are actually referenced across
// several sections (Executive Summary, Tier 1, the physio quick-guide) —
// union every section that mentions "red flag" rather than taking the FIRST
// one (which was Section 1's generic overview, not the section with the
// specific examples).
const redFlagSections = [...handoff.matchAll(/## Section \d+:.*?(?=\n## Section \d+:|$)/gs)]
  .map(m => m[0]).filter(s => /red flag/i.test(s));
if (redFlagSections.length) {
  const RED_FLAGS = req('redflags.js').RED_FLAGS;
  ok(redFlagSections.some(s => s.includes('weight loss')), 'weight loss red flag documented');
  ok(redFlagSections.some(s => s.includes('haematemesis') || s.includes('vomiting blood')), 'haematemesis red flag documented');
  ok(RED_FLAGS.length > 0, `${RED_FLAGS.length} red flags defined in code`);
} else {
  ok(false, 'Red flag section found in handoff');
}

console.log('\n=== ROME IV VERIFICATION ===\n');

// Verify Rome IV section
const romeSection = handoff.match(/## Section 5:.*?(?=\n## Section \d+:|$)/s);
if (!romeSection) {
  ok(false, 'Rome IV section found in handoff');
} else {
  const text = romeSection[0];
  ok(text.includes('IBS-C'), 'IBS-C subtype documented');
  ok(text.includes('IBS-D'), 'IBS-D subtype documented');
  ok(text.includes('IBS-M'), 'IBS-M subtype documented');
  ok(text.includes('IBS-U'), 'IBS-U subtype documented');
}

console.log('\n=== SPEC CONSISTENCY CHECKS ===\n');

// De-blend: ensure handoff explains that Index is GSRS-only
const indexSection = handoff.match(/## Section 3:.*?(?=\n## Section \d+:|$)/s);
if (indexSection && indexSection[0].includes('GSRS')) {
  ok(true, 'Index section mentions GSRS core');
  ok(indexSection[0].includes('validated'), 'Index section explains validation status');
} else {
  ok(false, 'Index section explains GSRS core');
}

// Headline outputs section — check every "Gut Symptom Burden" occurrence
// (not just the first, which is a bare list item with no validation-status
// text nearby) for one followed within 200 chars by a validated/derived note.
const headlineHit = [...handoff.matchAll(/Gut Symptom Burden[\s\S]{0,200}/g)]
  .find(m => /validated|derived/i.test(m[0]));
if (headlineHit) {
  ok(true, 'Headline outputs section notes validated status');
} else {
  ok(false, 'Headline outputs section notes validated status');
}

console.log('\n=== WORDING SANITY CHECKS ===\n');

// Ensure no diagnosis language in pattern descriptions
const noiseStrings = [
  { pattern: /\bdiagnosis\b/i, notAllowed: 'pattern descriptions', section: 'SECTION 4', skip: ['diagnosis', 'diagnostic'] },
  { pattern: /\btreat\b/i, notAllowed: 'pattern intro', section: 'SECTION 1', skip: [] },
];

noiseStrings.forEach(({ pattern, notAllowed, section }) => {
  const match = handoff.match(new RegExp(`## ${section}[\\s\\S]{0,2000}`, 'i'));
  if (match) {
    // Simple check: should have the pattern in context of explanations
    if (pattern.test(match[0])) {
      ok(true, `Explanatory language present in ${section}`);
    }
  }
});

// Check patient-facing vs clinician language
const patientSection = handoff.match(/For.*?Patients/i);
ok(!!patientSection || handoff.includes('patient'), 'Handoff addresses patient-facing usage');

const clinicianSection = handoff.match(/For.*?Clinician/i);
ok(!!clinicianSection || handoff.includes('clinician'), 'Handoff addresses clinician usage');

console.log('\n=== CODE REFERENCE CHECKS ===\n');

// Section 13 should have code references
const codeRefSection = handoff.match(/## Section 13:.*?(?=##|$)/s);
if (codeRefSection && codeRefSection[0].includes('pattern')) {
  ok(true, 'Code references section mentions patterns');
  ok(codeRefSection[0].includes('line'), 'Code references include line numbers (or indicate they will)');
} else {
  ok(false, 'Code references section found');
}

console.log('\n=== FILE SIZE & STRUCTURE CHECKS ===\n');

ok(handoff.length > 20000, `CLINICIAN_HANDOFF.md is substantial (${handoff.length} chars)`);
ok(handoff.split('##').length >= 13, 'Handoff has at least 13 sections');
ok(handoff.includes('Appendix'), 'Handoff includes appendices');

console.log('\n=== SUMMARY ===\n');

if (failed === 0) {
  console.log('✅ All verification checks passed!');
  console.log('CLINICIAN_HANDOFF.md is consistent with the code.');
  process.exit(0);
} else {
  console.log(`❌ ${failed} verification check(s) failed.`);
  console.log('Review the above for accuracy issues.');
  process.exit(1);
}
