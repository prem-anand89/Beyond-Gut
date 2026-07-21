/**
 * Triage Module (triage.js)
 *
 * Clinical triage routing: converts computed scores and patterns into
 * four-tier management pathways with reasoning notes.
 *
 * CORE EXPORTS:
 *   - triage(score, patterns, redflags, opts)
 *       Primary triage function. Returns:
 *       - Tier (1/2/3/4): Clinical urgency level
 *       - Reasons array: Human-readable explanations for the tier
 *       - Notes: Context-specific clinical guidance (med confounders, pregnancy, etc.)
 *
 * THE FOUR TIERS:
 *   Tier 1: REFER — Urgent clinical assessment needed
 *     - Any red flag (safety concern)
 *     - Severe burden (Gut Symptom Index ≥60%)
 *     - Lab-confirmed abnormalities (calprotectin, coeliac serology, CRP)
 *     - Significant systemic burden on a psychosocial or inflammatory axis
 *     → Timeframe: Same day / next week
 *
 *   Tier 2: MANAGE WITH SPECIALIST INPUT — Pattern-specific investigation
 *     - Significant burden (Index 40–60%) + pattern fired
 *     - Impact axis elevated (high functional impairment)
 *     - Pelvic-floor dysfunction, dyspepsia, inflammatory signals
 *     → Timeframe: 2–4 weeks, often GI referral or physiotherapy
 *
 *   Tier 3: MICROBIOME/LIFESTYLE FOCUS — Low burden or recent disruptor
 *     - Recent antibiotic/PPI/surgery with mild symptoms
 *     - Screening-level concern without alarm features
 *     - Modifiable drivers prominent (diet, alcohol, stress)
 *     → Timeframe: 4–8 weeks, dietitian/lifestyle trial
 *
 *   Tier 4: MONITOR/REASSURE — No patterns, low burden
 *     - Minimal symptoms, no red flags
 *     - Reassurance + lifestyle advice
 *     → Routine follow-up or patient-initiated if symptoms persist
 *
 * TIER-SETTING LOGIC:
 *   Priority hierarchy: Red flags > Severe burden > Patterns > Impact axis > Modifiers
 *   - Any red flag immediately → Tier 1
 *   - Severe burden → Tier 1 (high symptom severity alone is significant)
 *   - Pattern + significant burden → Tier 2
 *   - High Impact (QOL/functional) even with modest burden → Tier 2 escalation
 *   - Recent disruptor without burden → Tier 3
 *   - Everything else → Tier 4
 *
 * CLINICIAN NOTES (NEVER change Tier, only provide context):
 *   - anthrroNote: BMI/WHtR interpretation (low BMI → malabsorption risk)
 *   - medNote: Drug-induced symptoms (GLP-1 + nausea, opioid + constipation)
 *   - gynNote: Cyclical symptom flare with pain → endometriosis overlap
 *   - pelvicNote: Pelvic-floor candidacy for physiotherapy
 *   - familyNote: Family history of coeliac → lower testing threshold
 *   - durationNote: Symptom chronicity context (acute vs chronic)
 *   - labNote: Lab abnormalities summary
 *
 * INVESTIGATIONS (pattern-specific):
 *   Each fired pattern includes investigation suggestions (e.g., calprotectin,
 *   SeHCAT, stool PCR, H. pylori test). Clinician reference only.
 *
 * DEPENDENCIES:
 *   - scoring.js (axisProfile for Tier 1 systemic escalation)
 *   - patterns.js (pattern.axis for axis-aware candidacy)
 *   - redflags.js (fired red flags for Tier 1 decision)
 *
 * DESIGN PRINCIPLES:
 *   1. Safety first — red flags always escalate; never buried
 *   2. Clarity — tiers and reasons are patient-safe, clinician-readable
 *   3. No false reassurance — Tier 4 is truly "no patterns + low burden"
 *   4. Context matters — notes acknowledge complexity (pregnancy, meds) without tier swapping
 *   5. Axis awareness — physiotherapy candidacy linked to pelvic axis, not just patterns
 *
 * TIER IS NOT ABSOLUTE:
 *   Clinical judgment can override. Examples:
 *   - A Tier 3 patient with high psychosocial distress may benefit from Tier 2 MBT
 *   - A Tier 1 lab abnormality might not need urgent referral if patient is stable
 *   - Context (life stressor, medication change, new infection) may explain symptoms
 *
 * VALIDATION:
 *   - Tier 1 criteria (red flags, severe burden): Clinical consensus
 *   - Pattern-tier mapping: Investigator-defined, validated on pilot data
 *   - Note messaging: Clinician-reviewed for safety and clarity
 */

// PLACEHOLDER: This is a reference document.
// In production, triage.js is currently inlined in index.html ~line 1880–2143.
// Future extraction will move the actual implementation here as a CommonJS module.
//
// TODO[module-extraction]:
//   1. Extract triage module from index.html
//   2. Convert __req() calls to require()
//   3. Export triage function
//   4. Add tests for all tier-setting edge cases (red flag + low burden, etc.)
//   5. Verify note messaging matches clinical safety review

module.exports = {
  // To be populated when module is extracted
  triage: null,
};
