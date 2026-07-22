const SCALES = {
  // generic 0–3 severity fallback (placeholder; real scales added in co-design)
  DEFAULT: ['None', 'Mild', 'Moderate', 'Severe'],
  // Universal symptom-duration scale (sx_duration) — same onset bands as Rome
  // IV's own onset question (romeiv.js ROME_ONSET), duplicated here as a plain
  // vocabulary so schema.js doesn't need to reach into the Rome IV module for a
  // label list. Never scored numerically beyond its driverOnly item index.
  // The trailing 'Not sure / it varies' (index 5) is a non-ordinal escape for
  // symptomatic patients who can't place an onset — consumers that treat this
  // index as an ordinal duration (Rome onset fallback, pain/Rome card reveal)
  // must reject any index >= ROME_ONSET.length so it never reads as "chronic".
  DURATION: ['Less than 3 months', '3–6 months', '6 months to a year', '1–3 years', 'More than 3 years', 'Not sure / it varies'],