/**
 * Patterns Module (patterns.js)
 *
 * Detects clinical patterns from questionnaire responses and scoring data.
 * Patterns are NOT diagnoses but evidence-informed signals for investigation.
 *
 * CORE EXPORTS:
 *   - detectPatterns(score, driverExtras, answers)
 *       Fires 12 clinical patterns and returns array of matched patterns:
 *       [{ id, label, desc, axis, confidence, signals, investigations }]
 *
 *   - clu(score, clusterKey)
 *       Looks up raw cluster norm (Reflux/Pain/Indigestion/Diarrhoea/Constipation)
 *       from the score object. Single source of truth for cluster values.
 *       Used by Rome IV classification and triage routing.
 *
 * THE 12 PATTERNS:
 *   1. constipation_dominant (IBS-C)  — Slow transit, hard stools, straining
 *   2. diarrhoea_dominant (IBS-D)     — Frequent loose/urgent stools
 *   3. mixed_alternating             — Both constipation and diarrhoea
 *   4. reflux_upper_gi                — Heartburn, regurgitation, dyspepsia
 *   5. bloating_fermentation          — Gas, bloating, fermentation signals
 *   6. nutrient_malabsorption         — Hair loss, anaemia, low BMI, deficiency
 *   7. gut_brain_axis                 — High psychosocial burden with GI symptoms
 *   8. inflammatory_immune            — Immune/inflammatory/skin/joint signals
 *   9. recent_gut_disruptor           — Recent antibiotics, PPI, surgery, infection
 *   10. pelvic_floor                  — Pelvic-floor dysfunction, anorectal
 *   11. functional_dyspepsia          — Upper-GI fullness, early satiation
 *   12. lifestyle_modifiable          — Addressable lifestyle factors (diet, alcohol, stress)
 *
 * FIRING LOGIC:
 *   Each pattern has independent firing conditions checked in detectPatterns().
 *   Patterns may fire at HIGH/MODERATE/LOW confidence based on signal count and specificity.
 *   Confidence does NOT change the Tier automatically (triage.js decides that).
 *
 * INVESTIGATIONS (per pattern):
 *   Each pattern carries a suggested investigation list (e.g., coeliac serology,
 *   FIT, stool PCR, pelvic-floor PT referral). Clinician-facing only.
 *
 * CLINICAL AXIS:
 *   Each pattern is tagged with a clinical axis (symptom, inflammatory, nutrient,
 *   psychosocial, microbiome, pelvic, autonomic) for filtering and UI grouping.
 *
 * KEY DESIGN DECISIONS:
 *   1. No diagnosis made — patterns suggest investigation, not diagnosis
 *   2. Multi-signal detection — most patterns require ≥2 corroborating signals
 *   3. Lab anchors trusted — if lab-confirmed deficiency exists, it alone fires
 *   4. De-duplication — malabsorption pattern doesn't double-count with nutrient axis
 *   5. Confidence tracking — lets UI show "High" vs "Moderate" certainty to clinician
 *
 * DEPENDENCIES:
 *   - scales.js (psychLoadScore, anthropometrics, dysbiosisLens)
 *   - scoring.js (computeScores, axisProfile via its output)
 *   - romeiv.js (classifyRomeIV for bowel-pattern detection)
 *
 * PATTERN-SPECIFIC GATES (examples):
 *   - nutrient_malabsorption: fires on lab-confirmed deficiency OR (≥2 soft proxies + GI present)
 *   - inflammatory_immune: fires on reported condition OR (≥2 immune signals)
 *   - gut_brain_axis: fires on high psychosocial burden + GI present
 *   - pelvic_floor: fires on incontinence OR (straining + blockage/maneuvers)
 *
 * VALIDATION:
 *   - Patterns are empirically-derived correlates, NOT validated diagnostic criteria
 *   - Rome IV criteria for bowel patterns: standards-based (Rome IV 2016)
 *   - Remaining patterns: investigator-built, awaiting validation in pilot
 *
 * BACKWARD COMPATIBILITY:
 *   - Patterns never change the Tier by themselves (triage.js applies tier routing)
 *   - Adding a new pattern doesn't affect existing pattern firing (independent evals)
 *   - Confidence levels can be added/adjusted without breaking the API
 */

// PLACEHOLDER: This is a reference document.
// In production, patterns.js is currently inlined in index.html ~line 1590–1877.
// Future extraction will move the actual implementation here as a CommonJS module.
//
// TODO[module-extraction]:
//   1. Extract patterns module from index.html
//   2. Convert __req() calls to require()
//   3. Export detectPatterns and clu
//   4. Add unit tests for each pattern firing condition
//   5. Document signal confidence scoring

module.exports = {
  // To be populated when module is extracted
  detectPatterns: null,
  clu: null,
};
