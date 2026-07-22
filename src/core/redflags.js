const RED_FLAGS = [
  // Lower-GI / colorectal alarm features
  { id: 'rf_bleeding',   label: 'Blood in your stool, rectal bleeding, or black tarry stools' },
  // Quantified so self-report maps to the meaningful clinical threshold (~5% over
  // 6 months) rather than any trivial fluctuation. No fixed kg figure — 5% varies
  // by body size — with a concrete everyday cue instead.
  { id: 'rf_weightloss', label: 'Losing weight without trying — for example, your clothes feel looser, or you have lost more than about 5% of your body weight over the past 6 months' },
  { id: 'rf_nocturnal',  label: 'Gut symptoms that wake you from sleep at night' },
  // Threshold lowered to 45 and reframed around persistence (≥6 weeks) — early-onset
  // colorectal cancer is rising and a sustained change warrants review at any age.
  { id: 'rf_newonset50', label: 'A new, persistent change in your bowel habit lasting 6 weeks or more. This applies at any age, but is especially important if you are over 45.' },
  { id: 'rf_mass',       label: 'A lump or mass you (or a doctor) can feel in your abdomen' },
  // (Family history moved out of acute red flags — it's a risk factor, not an acute
  // alarm. Captured as a Family-history chip set and wired in triage instead.)
  // Upper-GI alarm features
  { id: 'rf_dysphagia',  label: 'Difficulty or pain when swallowing' },
  { id: 'rf_vomiting',   label: 'Persistent vomiting' },
  { id: 'rf_hematemesis',label: 'Vomiting blood or coffee-ground material' },
  // Systemic / other
  { id: 'rf_anaemia',    label: 'Diagnosed iron-deficiency anaemia without a clear cause' },
  { id: 'rf_jaundice',   label: 'Yellowing of the skin or eyes (jaundice)' },
  { id: 'rf_fever',      label: 'Fever accompanying your gut symptoms' },
];
function anyRedFlag(answers) { return !!answers && RED_FLAGS.some(f => answers[f.id] === true); }
function firedRedFlags(answers) { return answers ? RED_FLAGS.filter(f => answers[f.id] === true) : []; }
const RED_FLAG_BANNER = "One or more of your answers suggest symptoms that should be assessed directly by a clinician before starting a gut-health protocol. This doesn't replace that evaluation — please discuss these specific answers with your clinician.";
module.exports.RED_FLAGS = RED_FLAGS; module.exports.anyRedFlag = anyRedFlag; module.exports.firedRedFlags = firedRedFlags; module.exports.RED_FLAG_BANNER = RED_FLAG_BANNER;
return __e;