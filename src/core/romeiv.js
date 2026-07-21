/**
 * Rome IV Module (romeiv.js)
 *
 * IBS classification using Rome IV criteria (2016 version).
 * Classifies patients into IBS subtypes based on symptom patterns.
 *
 * CORE EXPORTS:
 *   - classifyRomeIV(romeAnswers, clusterNorm, sxDuration, bristol)
 *       Determines if Rome IV criteria are met and subtype.
 *       Returns:
 *       { criteriaMet, subtype, onset, painFreq, notes }
 *
 *   - bowelSubtype(clusterNorm, bristol)
 *       Determines bowel pattern subtype (C/D/M/U) from cluster norms and Bristol.
 *       - IBS-C: Constipation ≥ 0.3 (cluster norm) or Bristol 1–2
 *       - IBS-D: Diarrhoea ≥ 0.3 or Bristol 6–7
 *       - IBS-M: Both present and ≥ 0.3
 *       - IBS-U: Pain without clear pattern
 *
 * ROME IV CRITERIA (2016):
 *   Recurrent abdominal pain at least 1 day per week for 3 months,
 *   with symptom onset ≥ 6 months prior, associated with ≥2 of:
 *   1. Bowel movement frequency change
 *   2. Stool form change
 *   3. Symptom relief after bowel movement
 *
 * SUBTYPES:
 *   - IBS-C (Constipation-Predominant)
 *     Bristol 1–2 OR cluster norm Constipation ≥ 0.3 (and > Diarrhoea)
 *   - IBS-D (Diarrhoea-Predominant)
 *     Bristol 6–7 OR cluster norm Diarrhoea ≥ 0.3 (and > Constipation)
 *   - IBS-M (Mixed)
 *     Both Constipation and Diarrhoea cluster norms ≥ 0.3
 *   - IBS-U (Unclassified)
 *     Meets Rome pain criteria but bowel pattern unclear
 *
 * SINGLE-VISIT LIMITATION:
 *   Rome IV is validated on prospective 7-day symptom diaries.
 *   This tool provides a single-visit screening estimate, not formal diagnosis.
 *   Transient symptoms or atypical snapshot may mis-classify.
 *
 * RECALL WINDOWS:
 *   - Pain frequency: "Last 3 months, on average"
 *   - Onset: Multi-year bands (<6 mo, 6–12 mo, 1–3 yr, >3 yr)
 *   - Bristol: Current observation (single stool type)
 *
 * INVESTIGATIONS BY SUBTYPE:
 *   IBS-C: Slow-transit study (defecography), dietitian review, osmotic laxatives trial
 *   IBS-D: Stool PCR, coeliac serology, SeHCAT (bile-acid malabsorption), low-FODMAP trial
 *   IBS-M: Combine C and D workup as clinically indicated
 *   IBS-U: Pain-focused investigation (exclude organic causes)
 *
 * KEY DESIGN DECISIONS:
 *   1. Single source of truth for bowel subtype — clu() from patterns.js
 *      ensures Rome IV and pattern detection never disagree on the same patient.
 *   2. Bristol type prioritized over cluster norms (Bristol is objective form)
 *   3. Frequency signal from romeAnswers.painFreq (0–5 scale), separate from
 *      cluster frequency (which is a separate nudge applied to Index)
 *   4. No diagnosis claim — output explicitly labeled "screening estimate"
 *
 * DEPENDENCIES:
 *   - scoring.js (cluster norms from computeScores output)
 *   - schema.js (QUESTIONS for answering logic)
 *   - patterns.js (clu() for single source of bowel-subtype truth)
 *
 * VALIDATION:
 *   - Rome IV criteria: Gold-standard IBS classification (Lacy et al. 2016)
 *   - Single-visit implementation: Provisional; awaiting prospective diary validation
 */

// PLACEHOLDER: This is a reference document.
// In production, romeiv.js is currently inlined in index.html ~line 1495–1587.
// Future extraction will move the actual implementation here as a CommonJS module.
//
// TODO[module-extraction]:
//   1. Extract romeiv module from index.html
//   2. Convert __req() calls to require()
//   3. Export classifyRomeIV and bowelSubtype
//   4. Add tests for subtype classification edge cases
//   5. Ensure single source of truth with patterns.clu()

module.exports = {
  // To be populated when module is extracted
  classifyRomeIV: null,
  bowelSubtype: null,
};
