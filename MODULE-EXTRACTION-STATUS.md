# GSHS Module Extraction Status

**Branch**: `claude/upbeat-hamilton-gh2920`  
**Last Updated**: 2025-07-09  
**Phase**: 1a (Initial Core Module Extraction)

## Summary

The GSHS app is being refactored from a single-file HTML deployment (`index.html`) into modular, reusable JavaScript components. This enables the clinical scoring engine to be integrated into other applications (like your main console) while maintaining the existing single-file offline deployment.

## Completed Work (Phase 1a)

### ✅ Documentation
- **GSHS-MODULE-INTEGRATION.md** — High-level integration guide with architecture overview and multiple usage patterns
- **src/core/README.md** — Comprehensive module documentation with API reference, data structures, and integration examples
- **MODULE-EXTRACTION-STATUS.md** — This file, tracking progress and next steps

### ✅ Core Modules Extracted (Pure Logic, No DOM)

| Module | File | Status | Exports | Purpose |
|--------|------|--------|---------|---------|
| **schema** | `src/core/schema.js` | ✅ Complete | SECTIONS, QUESTIONS, QID, QTOTAL, revealMet, itemMax, sectionMax, questionsOf | Questionnaire structure, question definitions, adaptive reveal logic |
| **scales** | `src/core/scales.js` | ✅ Complete | All scoring scales, PSS-4, Bristol, pain, sleep, diet, anthropometrics, modifiable factors | Scoring helpers, validated instruments, history metadata |
| **redflags** | `src/core/redflags.js` | ✅ Complete | RED_FLAGS, anyRedFlag, firedRedFlags | Clinical alarm features |
| **index** | `src/core/index.js` | ✅ Complete | All above + namespace | Public API entry point |

### ✅ Module Dependencies
```
schema.js
  └── depends on: scales.js (for scaleFor)

scales.js
  └── no dependencies (pure standalone)

redflags.js
  └── no dependencies (pure standalone)
```

## In Progress / Upcoming (Phase 1b)

### 🔄 High-Priority Core Modules (No DOM, Pure Logic)

| Module | File | Status | Exports | Purpose |
|--------|------|--------|---------|---------|
| **scoring** | `src/core/scoring.js` | ⏳ Pending | computeScores, axisProfile, axisBand, headlineOutputs, bandForPct, scoreConfidence | Main scoring engine, axis computation |
| **patterns** | `src/core/patterns.js` | ⏳ Pending | PATTERNS, detectPatterns, clu | Pattern detection (bloating, gut-brain, etc.) |
| **triage** | `src/core/triage.js` | ⏳ Pending | triage, triageAssessment | Tier determination, referral candidacy |
| **romeiv** | `src/core/romeiv.js` | ⏳ Pending | classifyRomeIV, cluFromAnswers | Rome IV IBS subtype classification |
| **storage** | `src/core/storage.js` | ⏳ Pending | loadVisit, saveVisit (abstracted) | Visit data persistence layer |

**Estimated effort**: 2-3 commits, ~500 lines code

### 🔄 Phase 2: UI Modules (DOM-Dependent)

| Module | File | Status | Purpose |
|--------|------|--------|---------|
| **util** | `src/ui/util.js` | ⏳ Pending | DOM helpers, dialogs, forms ($, $$, el, esc, toast, dialogForm, patientForm) |
| **renderer** | `src/ui/renderer.js` | ⏳ Pending | Questionnaire rendering, section cards, question display |
| **printer** | `src/ui/printer.js` | ⏳ Pending | buildPatientPrint, buildClinicianPrint |
| **index** | `src/ui/index.js` | ⏳ Pending | Public UI API |

**Estimated effort**: 3-4 commits, ~1000 lines code

### 🔄 Phase 3: Build & Publishing Infrastructure

| Task | Status | Purpose |
|------|--------|---------|
| Create package.json at root (v2) with multiple entry points | ⏳ Pending | Enable: npm install, dist/ build, type declarations |
| Webpack/tsup build config | ⏳ Pending | Bundle single-file HTML regeneration from modular source |
| Module build: CommonJS + ES exports | ⏳ Pending | Support require() and import syntax |
| Type declarations (.d.ts) | ⏳ Pending | IDE support for TypeScript/JSDoc users |
| npm publishing configuration | ⏳ Pending | Optional: publish to npm as `@beyond-gut/gshs-core` |

**Estimated effort**: 2-3 commits

### 🔄 Phase 4: Documentation & Examples

| Task | Status | Purpose |
|------|--------|---------|
| API reference (auto-generated from JSDoc) | ⏳ Pending | Complete function signatures and return types |
| Integration examples (React, Vue, vanilla JS) | ⏳ Pending | Real-world usage patterns |
| Database schema recommendations | ⏳ Pending | How to persist visit data in your main console |
| Deployment guide for modular integration | ⏳ Pending | How to import and use in your console app |

## Current Usage Patterns

### 1. Headless (Pure Logic)
```javascript
const { QUESTIONS, QID, computeScores } = require('./src/core');
// Use in Node.js, backend APIs, other frameworks
```

### 2. Browser Embedded
```javascript
import { revealMet, SECTIONS } from './src/core/index.js';
// Use in React/Vue/Svelte, update UI dynamically
```

### 3. Standalone Deployment (Current)
```bash
npm install
npm start  # Starts Express server with HTTP Basic Auth
# Visit https://beyond-gut-demo.up.railway.app/
```
This continues to work unchanged during modularization.

## File Structure After Phase 1-2

```
/Beyond-Gut/
├── index.html                          (unchanged — offline single-file app)
├── server.js                           (unchanged — Express wrapper)
├── package.json                        (will be updated in Phase 3)
├── GSHS-MODULE-INTEGRATION.md          (✅ done)
├── MODULE-EXTRACTION-STATUS.md         (✅ done — this file)
├── src/
│   ├── core/                           (Phase 1a: ✅ done)
│   │   ├── index.js                    ✅
│   │   ├── schema.js                   ✅
│   │   ├── scales.js                   ✅
│   │   ├── redflags.js                 ✅
│   │   ├── README.md                   ✅
│   │   ├── scoring.js                  (Phase 1b: ⏳)
│   │   ├── patterns.js                 (Phase 1b: ⏳)
│   │   ├── triage.js                   (Phase 1b: ⏳)
│   │   ├── romeiv.js                   (Phase 1b: ⏳)
│   │   └── storage.js                  (Phase 1b: ⏳)
│   └── ui/                             (Phase 2: ⏳)
│       ├── index.js
│       ├── util.js
│       ├── renderer.js
│       ├── printer.js
│       └── README.md
├── dist/                               (Phase 3: auto-generated)
│   ├── gshs-core.js                    (UMD + CommonJS)
│   ├── gshs-core.d.ts                  (TypeScript definitions)
│   └── gshs-core.min.js
└── scripts/
    └── gshs-smoke.mjs                  (120+ tests — updated for modular imports)
```

## Import Examples (After Completion)

### Node.js
```javascript
const gshs = require('@beyond-gut/gshs-core');
// or: const { computeScores, detectPatterns } = require('./src/core');
```

### Browser / ES Modules
```javascript
import { QUESTIONS, computeScores } from './src/core/index.js';
// or: import gshs from '@beyond-gut/gshs-core';
```

### React Integration
```javascript
import { useGSHS } from '@beyond-gut/gshs-ui';
// Higher-level component wrapper (Phase 2+)
```

## Testing Strategy

1. **Unit tests per module** (Phase 1b+)
   - Smoke tests updated to import modular versions
   - Pure functions: straightforward Jest/Mocha tests

2. **Integration tests** (Phase 2+)
   - UI rendering with core engine
   - Cross-module dependencies

3. **End-to-end** (Phase 3+)
   - Rebuilt single-file app vs. original (byte-compare)
   - Module imports in different runtimes

## Key Benefits for Your Console Integration

### 1. Headless Scoring
Import scoring/pattern/triage logic without any UI code:
```javascript
const { computeScores, detectPatterns, triage } = require('@beyond-gut/gshs-core');
const results = computeScores(patientAnswers, extras);
// Store in your database, integrate into your clinician dashboard
```

### 2. Custom UI
Bring your own UI framework:
```javascript
// Use GSHS schema but render in your console's design system
import { QUESTIONS, SECTIONS } from '@beyond-gut/gshs-core';
// Render with your React components, Vue templates, etc.
```

### 3. Incremental Adoption
Start with core scoring, add UI later:
- Week 1: Pull in scoring logic, integrate into backend
- Week 2: Add questionnaire UI (your design)
- Week 3+: Integrate reports/printing

### 4. Database Agnostic
Core modules don't depend on any specific storage:
```javascript
const { computeScores } = require('@beyond-gut/gshs-core');
// Save `results` however you want: PostgreSQL, Firebase, MongoDB, etc.
```

## Next Action Items

### For Phase 1b (High-Priority Extraction)
- [ ] Extract `scoring.js` (de-blend logic, axisProfile, headlineOutputs)
- [ ] Extract `patterns.js` (detectPatterns, PATTERNS definitions)
- [ ] Extract `triage.js` (triage tier determination)
- [ ] Extract `romeiv.js` (Rome IV subtype classification)
- [ ] Extract `storage.js` (localStorage abstraction)
- [ ] Update `src/core/index.js` to include all exports
- [ ] Run smoke tests against modular imports
- [ ] Commit & push

### For Phase 2 (UI Module Extraction)
- [ ] Extract `src/ui/util.js` (DOM helpers, dialogs)
- [ ] Extract `src/ui/renderer.js` (questionnaire rendering)
- [ ] Extract `src/ui/printer.js` (patient/clinician print)
- [ ] Create framework adapters (React, Vue, vanilla)
- [ ] Update single-file index.html to import from src/ (build step)

### For Phase 3 (Build & Publishing)
- [ ] Create webpack/tsup config
- [ ] Update package.json with multiple entry points
- [ ] Generate TypeScript definitions
- [ ] Create build script: `npm run build`
- [ ] Verify rebuilt single-file matches original

## Backward Compatibility

**No breaking changes during refactoring.**

- Single-file `index.html` + `server.js` continue to work unchanged
- All existing deployments (Railway, etc.) unaffected
- Smoke tests still pass on original codebase
- Git history preserved (modular extraction is new commits, not rewrites)

## Success Criteria

✅ = completed

- ✅ Core modules extracted (schema, scales, redflags)
- ✅ No DOM dependencies in core modules
- ✅ Pure function exports with clear APIs
- ✅ Comprehensive documentation
- ⏳ Phase 1b: Scoring/patterns/triage extracted
- ⏳ Phase 2: UI modules extracted  
- ⏳ Phase 3: Build config + npm publishing
- ⏳ Can import `const { computeScores } = require('./src/core')` in Node.js
- ⏳ Can import in browser `import { QUESTIONS } from './src/core/index.js'`
- ⏳ Smoke tests all pass against modular imports
- ⏳ Single-file HTML rebuilt from modular source is byte-compatible with original

## Questions & Feedback

Open questions for Phase 1b+:

1. Should we use CommonJS (require) or ES modules (import)?
   - **Current decision**: CommonJS in src/ for Node.js/Electron support; build to both formats
   
2. Publish to npm?
   - **Current decision**: Deferred to Phase 3; make available via GitHub import first
   
3. TypeScript support?
   - **Current decision**: JSDoc in Phase 1-2; optional .d.ts in Phase 3

4. Framework adapters (React, Vue)?
   - **Current decision**: Examples in docs first; light wrapper libraries in Phase 4+

---

**Status**: Phase 1a complete, ready for Phase 1b. Core modules are importable and documented. Next focus: extract scoring/patterns/triage engines.
