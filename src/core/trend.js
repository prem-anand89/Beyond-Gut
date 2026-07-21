/**
 * Trend Module (trend.js)
 *
 * Visit progression and outcome tracking for repeated assessments.
 * Compares current visit to historical visits to show improvement/worsening.
 *
 * CORE EXPORTS:
 *   - computeTrend(currentVisit, previousVisits, session)
 *       Computes progression summary:
 *       - Index delta (improved/stable/worsened)
 *       - Pattern changes (new, resolved, persistent)
 *       - Outcome indicators (lab trends, medication changes)
 *
 *   - visitScore(visit, opts)
 *       Re-computes a visit's score from stored answers.
 *       Uses frozen scoreSnapshot if available (for historical preservation).
 *       Falls back to live compute for pre-snapshot visits.
 *
 *   - buildScoreSnapshot(visit)
 *       Captures Index + band + completeness at save time.
 *       Ensures historical visits don't re-score differently if calculation changes.
 *
 * WHY SNAPSHOTS MATTER:
 *   If scoring logic changes (e.g., band cutoffs updated, new nudge added),
 *   ALL historical visits would re-score with new logic, losing the original
 *   snapshot. Snapshots preserve the EXACT score at the time of visit,
 *   so trends are stable across code updates.
 *
 * PROGRESSION TRACKING:
 *   Compares:
 *   - Gut Symptom Index: "Improved X points" / "Stable" / "Worsened Y points"
 *   - Patterns: "New patterns: [list]" / "Resolved: [list]"
 *   - High-burden burden signals: Labs, red flags, psychosocial load changes
 *
 * DELTA BANDS:
 *   - ≥ +10 pts: "Significantly improved"
 *   - +5 to +9: "Improved"
 *   - -4 to +4: "Stable"
 *   - -9 to -5: "Worsened"
 *   - ≤ -10: "Significantly worsened"
 *
 * OUTCOME INDICATORS:
 *   - Lab improvements (e.g., CRP down, coeliac serology converted to negative)
 *   - Medication reduction (discontinuation of FODMAP/probiotics/PPI trial)
 *   - Psychosocial improvement (stress score lowered, mood improved)
 *   - New red flags (escalation signal)
 *
 * USE CASES:
 *   1. Patient-facing: "You've improved by 15 points since last visit"
 *   2. Clinician: Track efficacy of an intervention (diet, medication, PT)
 *   3. Research: Audit population-level outcomes over time
 *   4. Safety: Detect sudden worsening or new alarm features
 *
 * DEPENDENCIES:
 *   - scoring.js (computeScores for re-scoring)
 *   - patterns.js (detectPatterns for pattern comparison)
 *   - storage.js (loadVisit to fetch historical visits)
 *
 * DESIGN PRINCIPLES:
 *   1. Snapshots are immutable — captured at save, never recomputed
 *   2. Trends are RELATIVE — only compare patient to self, never to population
 *   3. Statistical rigor — deltas <5pts are noise (sample variability)
 *   4. Context-aware — acknowledge confounders (medication changes, infections)
 *
 * LIMITATIONS:
 *   - Single-patient view (no population benchmarks)
 *   - Intra-visit snapshot only (doesn't track within-week symptom variability)
 *   - Confounding uncontrolled (can't distinguish intervention effect from natural variation)
 *   - Causality not implied ("improved after starting probiotics" ≠ probiotics caused improvement)
 */

// PLACEHOLDER: This is a reference document.
// In production, trend.js is currently inlined in index.html ~line 2145–2214.
// Future extraction will move the actual implementation here as a CommonJS module.
//
// TODO[module-extraction]:
//   1. Extract trend module from index.html
//   2. Convert __req() calls to require()
//   3. Export computeTrend, visitScore, buildScoreSnapshot
//   4. Add tests for snapshot preservation across code updates
//   5. Verify delta calculation robustness (NaN/null handling)

module.exports = {
  // To be populated when module is extracted
  computeTrend: null,
  visitScore: null,
  buildScoreSnapshot: null,
};
