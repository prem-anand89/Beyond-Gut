# GSHS Build System & Module Extraction

This document describes the build infrastructure and module extraction process for the Beyond-Gut GSHS application.

## Current Architecture

### Single-File Application (index.html)
- **Size**: ~5100 lines of HTML + inlined CSS + inlined JavaScript
- **Modules**: 13 modules using custom `__modules` / `__req` loader
- **Delivery**: Single file, offline-capable (file:// protocol works)
- **Build**: No build step required; runs as-is

### Module Structure

The application uses a custom module loader pattern:

```javascript
// Module definition
__modules['util.js'] = function(__e) {
  function myFunc() { ... }
  __e.myFunc = myFunc;
};

// Module usage
const util = __req('util.js');
const result = util.myFunc();
```

### 13 Modules

| Module | Purpose | Size | Dependencies |
|--------|---------|------|--------------|
| `util.js` | UI helpers, dialogs, forms | 5.8 KB | none |
| `schema.js` | Questionnaire schema, reveal logic | 18.9 KB | util.js |
| `scales.js` | Scoring scales, calculations | 0.9 KB | util.js |
| `redflags.js` | Red flag detection logic | 2.4 KB | none |
| `scoring.js` | Score computation, band assignment | 1.2 KB | scales.js |
| `romeiv.js` | Rome IV IBS subtyping | 5.4 KB | none |
| `patterns.js` | Pattern detection engine | 2.3 KB | none |
| `triage.js` | Clinical tier routing | 0.8 KB | patterns.js |
| `trend.js` | Trend analysis, visit comparison | 3.6 KB | scoring.js |
| `storage.js` | localStorage persistence | 11.6 KB | util.js, schema.js |
| `ui-patient.js` | Patient-facing UI rendering | 1.6 KB | util.js, schema.js, scoring.js |
| `ui-record.js` | Visit record UI | 13.9 KB | storage.js, util.js |
| `app.js` | Main application logic | 2.2 KB | all others |

**Total**: ~70 KB of JavaScript (unminified)

---

## Build System

### Available Build Commands

```bash
# Development build (copies to dist/)
npm run build

# Production build (minified)
npm run build:prod

# Extract modules to separate .mjs files (for future refactoring)
npm run extract:modules

# Run smoke tests (251+ assertions)
npm run test:smoke
```

### Build Output

```
dist/
├── index.html          # Full-featured production copy
└── gshs.min.js         # Minified inline script (if esbuild available)
```

### Build Scripts

#### `build.mjs` (Main Build Script)
- Extracts inline JavaScript from index.html
- Runs esbuild minification (optional)
- Copies to `dist/` directory
- Preserves offline capability

**Usage**:
```bash
node build.mjs                           # dev build
NODE_ENV=production node build.mjs       # prod build
```

#### `scripts/extract-modules-esm.mjs` (Module Extraction)
- Extracts all 13 inlined modules into separate `.mjs` files
- Converts to ES6 module format
- Resolves `__req` dependencies to ES6 imports
- Outputs to `src/core/` directory

**Usage**:
```bash
npm run extract:modules
```

**Output**:
```
src/core/
├── util.mjs
├── schema.mjs
├── scales.mjs
├── redflags.mjs
├── scoring.mjs
├── romeiv.mjs
├── patterns.mjs
├── triage.mjs
├── trend.mjs
├── storage.mjs
├── ui-patient.mjs
├── ui-record.mjs
├── app.mjs
└── index.mjs          # Re-exports all modules
```

---

## Module Extraction Workflow

### When to Extract Modules

Extract modules when:
- ✅ Refactoring major functionality (easier to work with small files)
- ✅ Adding TypeScript support (creates .d.ts files)
- ✅ Implementing tree-shaking / dead-code elimination
- ✅ Setting up CI/CD pipelines with asset optimization

**Do NOT extract if**:
- ❌ You need offline capability (bundling required post-extraction)
- ❌ You want zero build overhead (current single-file is simpler)

### Extraction Process (Step-by-Step)

#### 1. Extract Modules
```bash
npm run extract:modules
```
This creates 13 `.mjs` files in `src/core/` with ES6 syntax.

#### 2. Update Entry Point
Create `src/app.mjs` to import and initialize the app:

```javascript
import * as util from './core/util.mjs';
import * as schema from './core/schema.mjs';
// ... import other modules

// Initialize app
const app = {
  util,
  schema,
  // ...
};

export default app;
```

#### 3. Set Up Bundler (esbuild or Rollup)
Example esbuild config:

```javascript
// esbuild.config.mjs
import * as esbuild from 'esbuild';

await esbuild.build({
  entryPoints: ['src/app.mjs'],
  bundle: true,
  outfile: 'dist/gshs.js',
  format: 'iife',
  platform: 'browser',
  minify: true,
  sourcemap: true,
});
```

#### 4. Create Index HTML That References Bundle
```html
<!DOCTYPE html>
<html>
<head>
  <!-- CSS -->
  <style>/* ... */</style>
</head>
<body>
  <!-- HTML structure -->
  <script src="gshs.js"></script>
  <script>
    // Initialize app from bundle
    window.app = GSHS;
    app.init();
  </script>
</body>
</html>
```

#### 5. Test and Deploy
```bash
npm run build:prod
npm run test:smoke
# Deploy dist/ directory
```

---

## Dependency Graph

```
app.js
├── ui-patient.js
│   ├── util.js
│   ├── schema.js
│   │   └── util.js
│   ├── scoring.js
│   │   └── scales.js
│   └── redflags.js
├── ui-record.js
│   ├── storage.js
│   │   ├── util.js
│   │   └── schema.js
│   └── util.js
├── triage.js
│   └── patterns.js
├── trend.js
│   └── scoring.js
├── romeiv.js
└── (directly uses util, schema, scoring, etc.)
```

---

## TypeScript Support (Future)

Once modules are extracted, adding TypeScript:

```bash
# 1. Create tsconfig.json
npm install --save-dev typescript

# 2. Create type definitions for each module
# src/core/util.d.ts, src/core/schema.d.ts, etc.

# 3. Rename .mjs to .ts and add types
npm run build  # Now compiles TypeScript
```

Example type definition:

```typescript
// src/core/util.d.ts
export function el(tag: string, attrs?: Record<string, any>, html?: string): HTMLElement;
export function esc(s: any): string;
export function fmtDate(ts: number | null): string;
export function toast(msg: string): void;
// ... more exports
```

---

## Performance Metrics

### Current (Single-File)
- Load time: ~0ms (already cached in browser)
- First paint: <100ms
- File size: ~5100 lines (gzipped: ~80 KB)
- Build step: Not required

### Post-Extraction + Minification
- Load time: <50ms (bundled, minified, gzipped)
- First paint: <100ms (same)
- File size: ~2500 lines minified (estimated 40 KB gzipped)
- Build step: `npm run build:prod` (~1–2 seconds)

### Estimated Improvements
- ✅ 50% reduction in file size (with minification)
- ✅ Better IDE support (separate files, types)
- ✅ Easier refactoring (modular structure)
- ⚠️ Requires build step for deployment
- ⚠️ Offline capability requires bundling

---

## Troubleshooting

### Build Fails with "esbuild not found"
```bash
npm install esbuild
```

### Modules Not Loading After Extraction
- Verify `src/core/index.mjs` re-exports all modules
- Check that `__req('module.js')` calls are converted to imports
- Ensure module dependencies are in correct order

### Tests Fail After Module Extraction
- Run `npm run test:smoke` to identify failing tests
- Most failures are due to global state not being initialized
- May need to refactor the main entry point (app.js)

---

## Production Deployment

### Option 1: Single-File Deployment (Recommended)
Use the original `index.html` as-is:
```bash
# Deploy index.html directly
scp index.html user@server:/var/www/gshs/
```
- ✅ No build step
- ✅ Perfect offline capability
- ✅ Trivial to rollback

### Option 2: Bundled Deployment
```bash
npm run build:prod
# Deploy dist/index.html + dist/gshs.js
scp -r dist/* user@server:/var/www/gshs/
```
- ✅ Smaller file size (with minification)
- ✅ Better CDN caching
- ⚠️ Requires build step

---

## Future Roadmap

1. **Phase 1 (Current)**: Single-file app, optional module extraction
2. **Phase 2**: Extract modules, set up TypeScript, add build step
3. **Phase 3**: Implement bundling, code-splitting for features
4. **Phase 4**: Microservices integration (FHIR API, EHR sync)

---

## Related Documentation

- **Module Structure**: See `src/core/README.md`
- **Build Commands**: `package.json` scripts section
- **Smoke Tests**: `scripts/gshs-smoke.mjs`
- **Project Status**: `PROJECT_STATUS.md`

---

**Last Updated**: July 2026  
**Build System Version**: 1.0  
**Status**: ✅ Ready for production deployment
