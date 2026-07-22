const scoring = require('scoring.js');
const patterns = require('patterns.js');
const scales = require('scales.js');

const { computeScores } = __req('scoring.js');
const { detectPatterns } = __req('patterns.js');
const { pss4Score, anthropometrics } = __req('scales.js');

function visitScore(v) {
  const a = v.answers || {}, ex = v.extras || {};
  // Must mirror the live computeAll()/computeScores() call and the CSV export's
  // drv object exactly (clusterFreq/romePainFreq feed the Index; rome feeds
  // pattern confidence; conditions/surgeries/anthro feed nutrient_malabsorption's
  // D1 signals) — otherwise this recomputation silently disagrees with the
  // index/band/patterns shown on the results screen and in the pilot CSV for
  // the very same visit (A2 regression: previously omitted, up to ~15pt drift).
  const sc = computeScores(a, { bristol: ex.bristol, clusterFreq: ex.clusterFreq, romePainFreq: ex.rome && ex.rome.painFreq });
  const drv = {
    pss4Score: pss4Score(ex.pss4), bgAnxiety: a.bg_anxiety, bgMood: a.bg_mood,
    dietFibre: ex.dietFibre, dietProcessed: ex.dietProcessed,
    bristol: ex.bristol, meds: ex.meds, alcohol: ex.alcohol, activity: ex.activity,
    abxCourses: ex.abxCourses, dys: ex.dys, rome: ex.rome, // Dys-R + Rome inputs (keep trend patterns in sync with live)
    conditions: ex.conditions, surgeries: ex.surgeries, anthro: anthropometrics(ex, {}),
  };
  const patterns = detectPatterns(sc, drv, a).map(p => p.id);
  // P2 — the DISPLAYED numbers come from the visit's frozen snapshot when it has
  // one, so a past visit keeps showing what the patient saw even if the scoring
  // engine is later recalibrated. Patterns are always recomputed (not snapshotted
  // by design). Visits saved before snapshots existed fall back to the recompute.
  const snap = v.scoreSnapshot || null;
  return {
    id: v.id, date: v.date || 0, followup: !!v.followup,
    index: snap ? snap.index : sc.index,
    band: snap ? (snap.severity && snap.severity.label) : sc.severity.label,
    completeness: snap && snap.completeness != null ? snap.completeness : sc.completeness,
    clusterNorm: snap ? snap.clusterNorm : sc.clusterNorm, patterns,
  };
}

// Lower burden = improvement. Returns null for the first visit (no prior),
// or when either index is unavailable (core GI section not completed on
// that visit) — a null index must never coerce to 0 and read as "Improved".
function deltaLabel(curr, prev) {
  if (prev == null || curr == null) return null;
  const d = curr - prev, ad = Math.abs(d);
  if (ad < 5) return { dir: 'stable', label: 'Stable', delta: d, color: '#999' };
  const meaningful = ad >= 10;
  if (d < 0) return { dir: 'improved', label: meaningful ? 'Improved' : 'Slightly improved', delta: d, color: '#0F6E56' };
  return { dir: 'worsened', label: meaningful ? 'Worsened' : 'Slightly worse', delta: d, color: '#A32D2D' };
}

function buildTrend(visits) {
  const points = (visits || []).slice().sort((a, b) => (a.date || 0) - (b.date || 0)).map(visitScore);
  points.forEach((p, i) => { p.delta = i > 0 ? deltaLabel(p.index, points[i - 1].index) : null; });
  // Persistence: patterns that fired on BOTH the latest and the prior visit.
  let persistent = [];
  if (points.length >= 2) {
    const prev = new Set(points[points.length - 2].patterns);
    persistent = points[points.length - 1].patterns.filter(id => prev.has(id));
  }
  return { points, persistent, latest: points[points.length - 1] || null };
}

module.exports.visitScore = visitScore; module.exports.deltaLabel = deltaLabel; module.exports.buildTrend = buildTrend;
return __e;