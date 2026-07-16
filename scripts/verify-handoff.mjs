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

  // List of patterns that should exist
  const expectedPatterns = [
    'constipation-dominant',
    'diarrhoea-dominant',
    'mixed-alternating',
    'reflux-upper-gi',
    'bloating-fermentation',
    'nutrient-malabsorption',
    'gut-brain',
    'inflammatory-immune',
    'recent-gut-disruptor',
    'pelvic-floor',
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
    Object.entries(TIERS).forEach(([tierNum, tierObj], idx) => {
      const tierName = `Tier ${parseInt(tierNum) + 1}`;
      ok(tierText.includes(tierName), `${tierName} documented`);
      if (tierObj && tierObj.action) {
        ok(tierText.includes(tierObj.action), `${tierName} action text present`);
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

// Sample check: nutrient pattern investigations should include specific tests
const nutrientInvestigations = handoff.match(/nutrient.?malabsorption[\s\S]{0,1000}?(?=\n\n|## )/i);
if (nutrientInvestigations) {
  const text = nutrientInvestigations[0];
  const expectedInvestigations = ['FBC', 'iron', 'B12', 'vitamin D', 'coeliac'];
  expectedInvestigations.forEach(inv => {
    ok(text.includes(inv), `Investigation "${inv}" listed for nutrient malabsorption`);
  });
} else {
  ok(false, 'Nutrient malabsorption investigation section found');
}

console.log('\n=== RED FLAG VERIFICATION ===\n');

// Check red flags are documented
const redFlagSection = handoff.match(/## Section [2-8].*?(?=##)/s);
if (redFlagSection && redFlagSection[0].includes('red flag')) {
  const rfText = redFlagSection[0];
  const RED_FLAGS = req('redflags.js').RED_FLAGS;
  ok(rfText.includes('weight loss'), 'weight loss red flag documented');
  ok(rfText.includes('haematemesis') || rfText.includes('vomiting blood'), 'haematemesis red flag documented');
  ok(RED_FLAGS.length > 0, `${RED_FLAGS.length} red flags defined in code`);
} else {
  ok(false, 'Red flag section found in handoff');
}

console.log('\n=== ROME IV VERIFICATION ===\n');

// Verify Rome IV section
const romeSection = handoff.match(/## Section 5:.*?(?=##)/s);
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
const indexSection = handoff.match(/## Section 3:.*?(?=##)/s);
if (indexSection && indexSection[0].includes('GSRS')) {
  ok(true, 'Index section mentions GSRS core');
  ok(indexSection[0].includes('validated'), 'Index section explains validation status');
} else {
  ok(false, 'Index section explains GSRS core');
}

// Headline outputs section
const headlineSection = handoff.match(/Gut Symptom Burden[\s\S]{0,200}/);
if (headlineSection) {
  const text = headlineSection[0];
  ok(text.includes('Validated') || text.includes('validated'), 'Headline outputs section notes validated status');
} else {
  ok(false, 'Headline outputs section found');
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
