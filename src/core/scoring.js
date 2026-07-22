const schema = require('schema.js');

const { SECTIONS, QUESTIONS, QID, itemMax, sectionMax } = __req('schema.js');

// Provisional bands on the 0–100 Index. Co-design: stricter 20/40/60 cutoffs.
// TODO[recalibration, opened 2026-06]: cutoffs AND the 0.6/0.4 core/screen
// weighting are provisional placeholders — refit against pilot distribution +
// any lab-confirmed outcomes (breath test, GI-MAP) before treating as final.
const BANDS = [
  { label: 'Minimal',       maxPct: 20,        color: '#0F6E56', bg: '#E1F5EE', cls: 'sev-min' },
  { label: 'Mild–Moderate', maxPct: 40,        color: '#BA7517', bg: '#FAEEDA', cls: 'sev-mod' },
  { label: 'Significant',   maxPct: 60,        color: '#C2622E', bg: '#FAECE7', cls: 'sev-sig' },
  { label: 'Severe',        maxPct: Infinity,  color: '#A32D2D', bg: '#FCEBEB', cls: 'sev-sev' },
];
const SEVERITY_DESC = {
  'Minimal':       'Minimal gut-symptom burden on this screen.',
  'Mild–Moderate': 'Mild-to-moderate gut-symptom burden — worth discussing with your clinician.',
  'Significant':   'Significant gut-symptom burden — clinician-guided assessment recommended.',
  'Severe':        'High gut-symptom burden — comprehensive clinical assessment recommended.',