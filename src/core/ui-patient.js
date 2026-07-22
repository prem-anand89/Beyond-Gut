const schema = require('schema.js');
const scales = require('scales.js');
const scoring = require('scoring.js');

const { SECTIONS, QUESTIONS, questionsOf, sectionMax, itemMax, revealMet } = __req('schema.js');
const { scaleFor, RECALL_NOTE, PSS4_ITEMS, PSS4_ANCHORS, PSS4_REVERSED, pss4Score, BRISTOL_TYPES, PAIN_REGIONS, modifiableFactors,
        DISRUPTORS, ALCOHOL_LEVELS, ACTIVITY_LEVELS, SLEEP_ITEMS, SLEEP_ANCHORS,
        STOOL_FREQ_LEVELS, SMOKING_LEVELS, HYDRATION_LEVELS, FREQ_LEVELS, CLUSTER_FREQ_LEVELS,
        FOOD_TRIGGERS, ABX_COURSES, GAS_LEVELS, STOOLVAR_LEVELS, POSTINF_OPTS, PARADOX_OPTS, dysbiosisLens,
        SURGERIES, surgicalFlags, KNOWN_CONDITIONS, knownConditions, KNOWN_LABS, knownLabs,
        MED_CONFOUNDERS, medConfounders, TREATMENTS_TRIED, treatmentsTried, FAMILY_HISTORY, familyHistory,
        OBSTETRIC_HISTORY, obstetricHistory, anthropometrics } = __req('scales.js');
const { computeScores, scoreConfidence, axisProfile, headlineOutputs, bandForPct, GI_CLUSTERS } = __req('scoring.js');
// Human-readable per-cluster prompt for clusterFreqCard() — mirrors the same
// 5 GSRS clusters scoring.js nudges, kept in sync by reusing GI_CLUSTERS
// itself as the iteration order (not a separately-maintained id list).
const GI_CLUSTER_FREQ_LABELS = {
  Reflux: 'Heartburn or acid reflux',
  Pain: 'Abdominal pain', // not rendered by clusterFreqCard() — Rome IV's painFreq
                          // already asks this; kept here only to document the mapping.
  Indigestion: 'Bloating, gas, or fullness',
  Diarrhoea: 'Loose or urgent stools',
  Constipation: 'Constipation or hard stools',