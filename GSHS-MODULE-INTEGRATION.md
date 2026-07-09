# GSHS Module Integration Guide

## Overview

The Gut & Systemic Health Screen (GSHS) is being refactored from a single-file HTML app into modular, reusable components. This allows the core clinical scoring engine to be integrated into other applications while optionally using or replacing the UI layer.

## Architecture

### Layers

1. **Core Engine** (`src/core/`) — Pure logic, no DOM dependencies
   - Schema definitions (SECTIONS, QUESTIONS, questionnaire structure)
   - Scales and scoring functions
   - Pattern detection
   - Triage logic
   - No browser/DOM access required

2. **UI Layer** (`src/ui/`) — DOM-dependent components
   - Patient questionnaire rendering
   - Results visualization
   - Print functions (patient summary, clinician report)
   - Dialogs and form helpers

3. **Single-File Deployment** (`index.html`) — Self-contained offline app
   - All modules inlined for offline use
   - HTTP Basic Auth wrapper (server.js)
   - Original deployment target

### Module Separation Strategy

The refactoring maintains backward compatibility with the existing single-file deployment while enabling modular imports.

#### Core Modules (Pure JavaScript, no DOM)

```
src/core/
├── schema.js          # SECTIONS, QUESTIONS, QID, questionnaire structure
├── scales.js          # Scoring scales, helper calculations
├── scoring.js         # Main scoring engine (computeScores, axisProfile, etc.)
├── patterns.js        # Pattern detection logic
├── triage.js          # Triage tier determination
├── romeiv.js          # Rome IV classification
└── index.js           # Public API exports
```

**Usage Example:**
```javascript
import { computeScores, axisProfile, detectPatterns } from '@beyond-gut/gshs-core';

// Run scoring on a patient's answers
const answers = { gsrs_pain: 2, gsrs_bloating: 1, /* ... */ };
const score = computeScores(answers, extras);
const profile = axisProfile(score, extras, dysLens);
const patterns = detectPatterns(answers, score, extras);
```

#### UI Modules (DOM-dependent)

```
src/ui/
├── util.js            # DOM helpers, dialogs, forms
├── renderer.js        # Questionnaire rendering
├── printer.js         # Print functions (patient + clinician)
└── index.js           # UI component exports
```

**Usage Example:**
```javascript
import { renderQuestionnaire, buildPatientPrint } from '@beyond-gut/gshs-ui';

// Render questionnaire to a container
renderQuestionnaire(answersObject, containerId);

// Generate patient print
const printHTML = buildPatientPrint(computedResults);
```

#### Storage & Session Management

```
src/
├── storage.js         # localStorage abstraction
└── session.js         # Session/visit management
```

## Integration Patterns

### Pattern 1: Headless Integration (Core Only)

Use GSHS as a pure scoring/triage engine in another app:

```javascript
import gshs from '@beyond-gut/gshs-core';

// On form submit
async function handleScreening(patientAnswers) {
  const score = gshs.computeScores(patientAnswers);
  const results = {
    axes: gshs.axisProfile(score),
    patterns: gshs.detectPatterns(patientAnswers, score),
    triage: gshs.triageAssessment(score, patientAnswers)
  };
  
  // Save to database, send to clinician, etc.
  await api.saveResults(patientId, results);
}
```

### Pattern 2: Embedded UI Component

Use GSHS UI as a form component in a larger app:

```javascript
import { GHSQuestionnaire } from '@beyond-gut/gshs-ui';

// In your React/Vue/Svelte component
const [answers, setAnswers] = useState({});
const results = gshs.computeScores(answers);

return (
  <GHSQuestionnaire 
    answers={answers}
    onChange={setAnswers}
    onSubmit={(results) => handleResults(results)}
  />
);
```

### Pattern 3: Wrapper Component (Current Model)

Use the existing single-file app as-is with the Express server wrapper:

```bash
npm install
npm start  # Starts server on port 3000 with HTTP Basic Auth
```

## Current State

- **Branch**: `claude/upbeat-hamilton-gh2920`
- **Deployed**: https://beyond-gut-demo.up.railway.app/ (HTTP Basic Auth: demo/gshs2024)
- **Smoke Tests**: 120+ checks passing
- **Last Verified**: Anthropometrics + section reorg + patient/clinician print

## Next Steps: Module Extraction

1. **Extract core modules** (schema, scales, scoring, patterns, triage, romeiv)
   - Convert from inlined `__modules` to CommonJS/ES modules
   - Create `/src/core/` directory with individual files
   - Update exports for public API

2. **Extract UI modules** (util, renderer, printer)
   - Move DOM-dependent code to `/src/ui/`
   - Create adapter/wrapper for integration with other frameworks

3. **Create build configuration**
   - Package.json with multiple entry points
   - Build script to regenerate single-file deployment
   - Publishing to npm (optional)

4. **Documentation & examples**
   - API reference for core modules
   - Integration examples for React/Vue/vanilla JS
   - Database schema recommendations for persistent storage

5. **Testing**
   - Extend smoke tests to cover modular imports
   - Cross-module integration tests
   - Browser compatibility verification

## Implementation Timeline

- **Phase 1** (current): Extract core modules, create src/ structure
- **Phase 2**: Extract UI modules, create adapters
- **Phase 3**: Build configuration, publishing
- **Phase 4**: Comprehensive documentation and examples

## Notes

- Single-file deployment (index.html + server.js) remains the primary distribution method
- All extracted modules maintain the same APIs as the inlined versions
- The `__modules` / `__req` system is retained for offline.html for backward compatibility
- Modular version uses standard ES6 imports or CommonJS requires

---

**Goal**: Enable GSHS to be integrated as a reusable module into the main console application while maintaining the existing single-file deployment for standalone use.
