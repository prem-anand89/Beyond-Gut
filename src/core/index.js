/**
 * GSHS Core Engine Entry Point
 *
 * Re-exports all core (non-UI) modules for convenient importing.
 * These modules have no DOM dependencies and can be used in any JavaScript
 * environment (Node.js, browser, other frameworks).
 *
 * Usage:
 *   // Import everything
 *   const gshs = require('@beyond-gut/gshs-core');
 *
 *   // Or import specific modules
 *   const { computeScores, detectPatterns } = require('@beyond-gut/gshs-core');
 */

// Schema & questions
const schema = require('./schema.js');
const scales = require('./scales.js');
const redflags = require('./redflags.js');

// Core scoring logic (to be extracted)
// const scoring = require('./scoring.js');
// const patterns = require('./patterns.js');
// const triage = require('./triage.js');
// const romeiv = require('./romeiv.js');

// ── PUBLIC API ──────────────────────────────────────────────────────────────

module.exports = {
  // Schema & questionnaire
  ...schema,

  // Scales & helpers
  ...scales,

  // Red flags
  ...redflags,

  // Scoring (to be added)
  // ...scoring,
  // ...patterns,
  // ...triage,
  // ...romeiv,

  // Convenience re-exports
  schema,
  scales,
  redflags,
};
