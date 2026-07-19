/**
 * redflags.js — Organic pathology alarm features
 *
 * Separate module so red-flag answers can never be summed into the score.
 * Binary Yes/No items surfaced as an alert banner before results.
 *
 * Pure logic — no DOM dependencies.
 */

const RED_FLAGS = [
  // Lower-GI / colorectal alarm features
  { id: 'rf_bleeding',   label: 'Blood in your stool, rectal bleeding, or black tarry stools' },
  { id: 'rf_weightloss', label: 'Losing weight without trying — for example, your clothes feel looser, or you have lost more than about 5% of your body weight over the past 6 months' },
  { id: 'rf_nocturnal',  label: 'Gut symptoms that wake you from sleep at night' },
  { id: 'rf_newonset50', label: 'A new, persistent change in your bowel habit lasting 6 weeks or more (especially if you are over 45)' },
  { id: 'rf_mass',       label: 'A lump or mass you (or a doctor) can feel in your abdomen' },
  // Upper-GI alarm features
  { id: 'rf_dysphagia',  label: 'Difficulty or pain when swallowing' },
  { id: 'rf_vomiting',   label: 'Persistent vomiting, or vomiting blood / coffee-ground material' },
  // Systemic / other
  { id: 'rf_anaemia',    label: 'Diagnosed iron-deficiency anaemia without a clear cause' },
  { id: 'rf_jaundice',   label: 'Yellowing of the skin or eyes (jaundice)' },
  { id: 'rf_fever',      label: 'Fever accompanying your gut symptoms' },
];

function anyRedFlag(answers) {
  return !!answers && RED_FLAGS.some(f => answers[f.id] === true);
}

function firedRedFlags(answers) {
  return answers ? RED_FLAGS.filter(f => answers[f.id] === true) : [];
}

const RED_FLAG_BANNER = "One or more of your answers suggest symptoms that should be assessed directly by a clinician before starting a gut-health protocol. This doesn't replace that evaluation — please discuss these specific answers with your clinician.";

module.exports = {
  RED_FLAGS,
  anyRedFlag,
  firedRedFlags,
  RED_FLAG_BANNER,
};
