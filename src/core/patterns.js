const scales = require('scales.js');
const romeiv = require('romeiv.js');

const { psychLoadScore, dietBurden } = __req('scales.js');
const { classifyRomeIV, bowelSubtype } = __req('romeiv.js');

// Helpers: each evaluator returns { fires, signals } so callers can compute a
// data-coverage confidence without re-checking the same conditions.
// Each signal is {a: was-answered, t: passed-threshold-given-data}. The pattern's
// `fires` logic reads .t; CONFIDENCE reads .a (i.e. data coverage, NOT how
// strongly the data corroborates). Strength-of-corroboration is exposed
// separately on the engine output so it can be displayed (under a different
// label) without conflating the two.
const sig = (v, ok) => ({ a: v != null, t: v != null && ok(v) });
const ge  = (v, t)  => sig(v, x => x >= t);
const le  = (v, t)  => sig(v, x => x <= t);
// Driver booleans (e.g. meds toggles) need to distinguish "card not opened" from
// "answered no" — pass the *carrier object* so we can read both facts.
const hasFlag = (carrier, val) => carrier == null ? { a: false, t: false } : { a: true, t: !!val };
const clu = (s, k) => (s.clusterNorm && s.clusterNorm[k] != null) ? s.clusterNorm[k] : null;
const gi  = (s) => (s.secNorm && s.secNorm.GI != null) ? s.secNorm.GI : null;
// Individual item value (id-map answers); 'na'/blank → null so they never count.
const av  = (a, id) => (a && typeof a[id] === 'number') ? a[id] : null;

// Rome IV as a corroborating signal only — never gates firing, just adds to coverage.
// a: sx_duration answer, passed through so classifyRomeIV can fall back to it
// for onset (see romeiv.js comment) — every eval calling this must declare `a`.
const romeSignal = (ex, s, wantSubtype, a) => {
  // Deliberately omits `bristol` here — this read feeds pattern CONFIDENCE
  // (coverage/corroboration), not the displayed Rome label, and must stay on
  // the same cluster-norm-only subtype the pattern's own firing logic uses
  // (see bowelSubtype()'s header comment) to avoid a driver-card Bristol
  // answer shifting confidence math independent of what actually fired.
  const r = classifyRomeIV((ex && ex.rome) || {}, (s && s.clusterNorm) || {}, a && a.sx_duration);
  return { a: r.answered, t: r.criteriaMet && r.subtype === wantSubtype };