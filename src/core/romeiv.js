const ROME_FREQ = [
  'Less than 1 day a month', '1–3 days a month', '1 day a week',
  '2–3 days a week', 'More than half the days', 'Every day',
];
const ROME_FREQ_MET = 2; // index >= this meets Rome IV's "≥1 day/week"
const ROME_ONSET = [
  'Less than 3 months ago', '3–6 months ago',
  '6 months to a year ago', '1–3 years ago', 'More than 3 years ago',
];
const ROME_ONSET_MET = 2; // index >= this meets Rome IV's "onset ≥6 months ago"
const ROME_ASSOC = [
  { id: 'rm_assoc_defecation', label: 'Pain is better or worse around a bowel movement' },
  { id: 'rm_assoc_freqchange', label: 'Pain comes with a change in how often you pass stool' },
  { id: 'rm_assoc_formchange', label: 'Pain comes with a change in stool consistency/appearance' },
];

// ── ONE source of truth for bowel subtype (PATTERN FIRING) ─────────────────
// constipation_dominant/diarrhoea_dominant (patterns.js) BOTH derive bowel
// direction from THIS function (off the GSRS Constipation/Diarrhoea cluster
// norms), so they can never disagree with each other. Previously Rome IV used
// its own 0.3 thresholds while the patterns used 0.4 — a latent contradiction.
// Lives in romeiv.js (loaded before patterns.js, which already requires this
// module).
//
// Rome IV's DISPLAYED subtype label (below, romeDisplaySubtype) is a
// SEPARATE function that layers Bristol stool form on top for THAT LABEL
// ONLY — Bristol is the true Rome IV subtyping criterion, but must never
// reach this function: constipation_dominant/diarrhoea_dominant firing (and
// therefore triage tier) must stay driven by symptom-severity cluster norms
// alone, not a single driver-card stool-form answer (same principle as the
// nudge/pattern-firing separation in scoring.js's coreMean vs secNorm.GI) —
// otherwise a Bristol answer could flip which of two mutually-exclusive
// patterns fires. This means the Rome-IV-criteria label and the
// constipation/diarrhoea PATTERN can occasionally disagree for a patient
// whose Bristol answer contradicts their GSRS cluster pattern; that is
// accepted as correct, not a bug — they measure different things (Rome IV's
// own methodology vs this tool's severity-weighted symptom scoring).
const BOWEL_HI = 0.3; // cluster-norm threshold for "this direction is prominent"
function bowelSubtype(clusterNorm) {
  const cn = clusterNorm || {};
  const c = (cn.Constipation ?? 0) >= BOWEL_HI;
  const d = (cn.Diarrhoea ?? 0) >= BOWEL_HI;
  if (c && d) return 'IBS-M';
  if (c) return 'IBS-C';
  if (d) return 'IBS-D';
  return 'IBS-U';
}

// Rome IV's own subtyping criterion is predominant stool FORM (Bristol 1–2 vs
// 6–7), not symptom severity — using cluster norms for the displayed Rome
// subtype over-called IBS-M whenever both clusters carried some burden. A
// single visit only records one Bristol observation (not the diary Rome IV
// was validated against), so it can decisively resolve IBS-C/IBS-D but not
// IBS-M — Bristol 3–5 (indeterminate) or unanswered falls back to the
// cluster-norm read, which is the only route that can surface IBS-M.
function romeDisplaySubtype(clusterNorm, bristol) {
  if (typeof bristol === 'number') {
    if (bristol <= 2) return 'IBS-C';
    if (bristol >= 6) return 'IBS-D';
  }
  return bowelSubtype(clusterNorm);
}

// Single cross-sectional pass, NOT the prospective diary Rome IV was validated
// against. Classifies a PATTERN CONSISTENT WITH Rome IV criteria — never call
// this a diagnosis in any UI string.
// sxDuration: optional fallback for onset, from the universal sx_duration item
// (schema.js) — DURATION and ROME_ONSET share identical index-mapped bands
// (see scales.js comment), so no rescaling needed. rome.onset was previously a
// SEPARATE question asked again inside the Rome card for pain-positive
// patients — a near-exact duplicate of sx_duration, which every patient
// already answers. Only fall back when rome.onset itself is unanswered
// (preserves any historical visit that explicitly answered both).
function classifyRomeIV(rome, clusterNorm, sxDuration, bristol) {
  const r = rome || {};
  // sxDuration index >= ROME_ONSET.length is the 'Not sure / it varies' escape
  // (schema.js DURATION) — not a real onset band, so it must not satisfy onsetMet.
  const onset = typeof r.onset === 'number' ? r.onset
    : (typeof sxDuration === 'number' && sxDuration < ROME_ONSET.length ? sxDuration : null);
  const freqMet = typeof r.painFreq === 'number' && r.painFreq >= ROME_FREQ_MET;
  const onsetMet = typeof onset === 'number' && onset >= ROME_ONSET_MET;
  const assocCount = ROME_ASSOC.filter(a => !!r[a.id]).length;
  const answered = typeof r.painFreq === 'number' && typeof onset === 'number';
  if (!answered) return { criteriaMet: false, answered: false, subtype: null, assocCount };
  const criteriaMet = freqMet && onsetMet && assocCount >= 2;
  if (!criteriaMet) return { criteriaMet: false, answered: true, subtype: null, assocCount };
  return { criteriaMet: true, answered: true, subtype: romeDisplaySubtype(clusterNorm, bristol), assocCount };
}
module.exports.ROME_FREQ = ROME_FREQ; module.exports.ROME_ONSET = ROME_ONSET; module.exports.ROME_ASSOC = ROME_ASSOC;
module.exports.ROME_FREQ_MET = ROME_FREQ_MET; module.exports.ROME_ONSET_MET = ROME_ONSET_MET;
module.exports.classifyRomeIV = classifyRomeIV; module.exports.bowelSubtype = bowelSubtype; module.exports.romeDisplaySubtype = romeDisplaySubtype;
return __e;