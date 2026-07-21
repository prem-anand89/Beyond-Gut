# GSHS Core Modules

This directory contains the core calculation engine for the Gut & Systemic Health Screen (GSHS). All modules are currently **inlined in `index.html`** for single-file deployment. This README serves as a navigation guide and roadmap for future modularization.

## Module Architecture

```
Core Scoring Engine
├── schema.js        ✅ Extracted
├── scales.js        ✅ Extracted
├── redflags.js      ✅ Extracted
│
├── scoring.js       📝 (Documented, inlined)
│   └─ Computes multi-axis burden scores and Index
│
├── patterns.js      📝 (Documented, inlined)
│   └─ Detects 12 clinical patterns
│
├── triage.js        📝 (Documented, inlined)
│   └─ Routes to 4-tier management pathway
│
├── romeiv.js        📝 (Documented, inlined)
│   └─ IBS subtyping (Rome IV criteria)
│
└── trend.js         📝 (Documented, inlined)
    └─ Visit progression tracking & snapshots
```

## Module Dependency Graph

```
Questionnaire Input
         │
    ┌────▼─────────────────────┐
    │  Schema / Scales / Flags  │
    └────┬─────────────────────┘
         │
    ┌────┴──────┬───────────┬─────────┐
    │           │           │         │
┌───▼────┐  ┌───▼────┐  ┌──▼───┐  ┌──▼────┐
│Scoring │  │Patterns│  │Triage│  │Rome IV│
└───┬────┘  └───┬────┘  └──┬───┘  └──┬────┘
    │           │          │         │
    └───────┬───┴──────────┴────┬────┘
            │                   │
        ┌───▼─────┐         ┌───▼───┐
        │ Trend   │         │  UI   │
        └─────────┘         └───────┘
```

## Current State

### ✅ Extracted Modules (Separate Files)
- **schema.js** — Question definitions, sections, reveal logic
- **scales.js** — Scale definitions, helper calculations
- **redflags.js** — Safety screening questions

### 📝 Documented but Inlined
These modules are documented here (reference files) but code is still inlined in `index.html`:

1. **scoring.js** (line 1163–1433 in index.html)
   - Computes Index, cluster norms, axis profile
   - Exports: `computeScores()`, `axisProfile()`, `headlineOutputs()`

2. **patterns.js** (line 1590–1877)
   - Detects 12 clinical patterns
   - Exports: `detectPatterns()`, `clu()`

3. **triage.js** (line 1880–2143)
   - Routes to Tier 1–4
   - Exports: `triage()`

4. **romeiv.js** (line 1495–1587)
   - Rome IV IBS classification
   - Exports: `classifyRomeIV()`, `bowelSubtype()`

5. **trend.js** (line 2145–2214)
   - Visit progression tracking
   - Exports: `computeTrend()`, `visitScore()`, `buildScoreSnapshot()`

## Build & Testing

**Build verification**:
```bash
npm run build
```
Verifies all 11 modules are present in index.html.

**Smoke tests**:
```bash
node scripts/gshs-smoke.mjs
```
Runs 250+ checks covering all modules.

## Future: Module Extraction

The `.js` reference files in this directory document the API and design principles for when modules are extracted to separate files.

To extract a module:
1. Copy implementation from index.html
2. Replace `__req()` calls with `require()`
3. Add `module.exports`
4. Update build config to bundle
5. Run smoke tests to verify

See each module's `.js` file for detailed extraction guidance.
