# GSHS Core Modules

Pure JavaScript scoring and classification engine for the Gut & Systemic Health Screen (GSHS). No DOM dependencies — use this in Node.js, browsers, other frameworks, or backend services.

## Modules

### `schema.js`
**Questionnaire structure and definitions**

- `SCHEMA_VERSION` — current schema version
- `SECTIONS` — form section metadata (id, label, axis, role, styling)
- `QUESTIONS` — all questionnaire items with ids, text, sections, scales
- `QID` — question index (freeze-protected object: `{ 'gsrs_pain': 0, ... }`)
- `QTOTAL` — total question count
- `revealMet(condition, context)` — pure reveal logic for adaptive sections
- `itemMax(question)` — max score for a single question
- `sectionMax(sectionId)` — max possible score for a section
- `questionsOf(sectionId)` — filter questions by section

**Usage:**
```javascript
const { QUESTIONS, QID, SECTIONS, revealMet } = require('@beyond-gut/gshs-core');

// Find a question by id
const painQ = QUESTIONS[QID['gsrs_pain']];

// Check if a section should reveal (adaptive questionnaire)
const answers = { bg_fatigue: 2 };
const shouldShow = revealMet(
  { type: 'item', id: 'bg_fatigue', min: 2 },
  { answers }
);

// Get all questions in a section
const imQuestions = QUESTIONS.filter(q => q.section === 'IM');
```

### `scales.js`
**Scoring scales, helper functions, and metadata**

#### Scales & Instruments
- `SCALES` / `scaleFor(name)` — lookup semantic scales (DEFAULT is 0-3 severity)
- `RECALL_NOTE` — standard 2-week recall window text

#### Perceived Stress (PSS-4)
- `PSS4_ITEMS`, `PSS4_REVERSED`, `PSS4_ANCHORS` — instrument metadata
- `pss4Score(arr)` — compute PSS-4 total (0-16)
- `pss4Band(score)` — band + colour (Low/Moderate/High)

#### Bowel & Pain
- `BRISTOL_TYPES` — Bristol Stool Form Scale types 1-7 with descriptions
- `PAIN_REGIONS` — body regions for pain localization
- `painBand(score)` — NRS pain 0-10 band

#### Sleep & Diet
- `SLEEP_ITEMS`, `SLEEP_ANCHORS` — sleep instrument
- `sleepBurden(arr)` / `sleepBand(burden)` — aggregate & band sleep disturbance
- `dietBurden(extras)` / `dietBand(burden)` — diet quality burden & band

#### Psychological Load
- `psychLoadScore(extras)` — composite PSS-4 + affective items (0-100)
- `loadBand(score)` — band + colour (Low/Moderate/High)

#### Microbiome & History
- `dysbiosisLens(extras)` — count & list dysbiosis-correlate signals
- `SURGERIES` — surgical history metadata
- `surgicalFlags(extras)` — parse surgical history, identify adhesion/microbiome flags
- `KNOWN_CONDITIONS`, `knownConditions(extras)` — diagnosed conditions + notes
- `MED_CONFOUNDERS`, `medConfounders(extras)` — medications that confound GI interpretation
- `FAMILY_HISTORY`, `familyHistory(extras)` — family history + screening recommendations
- `OBSTETRIC_HISTORY`, `obstetricHistory(extras)` — birth trauma history & risk assessment

#### Anthropometrics
- `anthropometrics(extras, session)` — compute BMI, WHtR, bands, and notes
  - Returns: `{ bmi, bmiBand, whtr, whtrBand, notes, caveat }`
  - Notes are clinician-facing interpretation guidance

#### Modifiable Factors
- `modifiableFactors(extras)` — comprehensive driver summary for reporting
  - Returns array of driver objects with icon, label, band, score, colour

#### Metadata
- `DISRUPTORS` — recent microbiome disruptors (abx, PPI, NSAID)
- `ALCOHOL_LEVELS`, `ACTIVITY_LEVELS` — lifestyle scales
- `FOOD_TRIGGERS`, `ABX_COURSES`, `GAS_LEVELS`, `STOOLVAR_LEVELS` — dysbiosis lens items
- `TRIM_PLAN` — co-design decisions & candidates for future trimming
- `GHI_WEIGHTS` — legacy weights (DEPRECATED; kept for CSV export only)

**Usage:**
```javascript
const { psychLoadScore, anthropometrics, knownConditions } = require('@beyond-gut/gshs-core');

// Compute psychological load from extras
const extras = {
  pss4Score: 8,
  bgAnxiety: 2,
  bgMood: 1,
};
const psLoad = psychLoadScore(extras); // 0-100

// Compute anthropometrics
const anthro = anthropometrics(
  { heightCm: 170, weightKg: 68, waistCm: 82 },
  { age: 45 }
);
console.log(anthro.bmi);       // 23.4
console.log(anthro.bmiBand);   // 'Normal'
console.log(anthro.notes);     // [] (no notes for normal values)

// Parse known conditions
const cond = knownConditions({ conditions: ['celiac', 'ibs'] });
console.log(cond.referList);   // ['Coeliac disease', 'IBD (...)']
console.log(cond.notes);       // [clinical interpretation notes]
```

### `redflags.js`
**Organic pathology alarm features**

- `RED_FLAGS` — list of clinical alarm items (id, label)
- `anyRedFlag(answers)` — boolean: any alarm raised?
- `firedRedFlags(answers)` — array of alarm items that were answered Yes
- `RED_FLAG_BANNER` — standard alert message text

**Usage:**
```javascript
const { RED_FLAGS, firedRedFlags } = require('@beyond-gut/gshs-core');

const answers = { rf_bleeding: true, rf_weightloss: false, rf_fever: true };
const alarms = firedRedFlags(answers);
// [{ id: 'rf_bleeding', label: '...' }, { id: 'rf_fever', label: '...' }]
```

## Data Structures

### Question Object
```javascript
{
  id: 'gsrs_pain',          // globally unique
  section: 'GI',            // section id
  cluster: 'Pain',          // (optional) GSRS cluster for sub-analysis
  axis: 'symptom',          // (optional) clinical axis for reporting
  patientText: 'Abdominal pain',
  patientSub: 'Aches or pain...',
  scale: undefined,         // uses DEFAULT 0-3 if not specified
  optional: false,          // (optional) not required for completeness
  freeText: false,          // (optional) free-text answer (not scored)
  driverOnly: false,        // (optional) counts toward driver, not index
  driverGroup: undefined,   // (optional) which driver group (e.g. 'psych')
  revealIf: undefined,      // (optional) reveal condition
}
```

### Section Object
```javascript
{
  id: 'GI',
  label: 'GI',
  full: 'Gut symptoms (GSRS-based)',
  role: 'core',              // 'core' | 'standalone'
  axis: 'symptom',           // clinical axis
  color: '#0F6E56',          // UI accent colour
  bg: '#E1F5EE',             // UI background colour
  conditional: false,        // (optional) adaptive reveal
  revealIf: undefined,       // (optional) reveal condition
}
```

### Reveal Condition
```javascript
// Single item condition
{ type: 'item', id: 'gsrs_pain', min: 1 }

// Cluster (normalized 0-1) condition
{ type: 'cluster', cluster: 'Constipation', min: 0.4 }

// Flag (from context) condition
{ type: 'flag', flag: 'pelvicRisk' }

// Logical combinations
{ any: [condition1, condition2] }  // OR
{ all: [condition1, condition2] }  // AND

// No gate (always shown)
null or undefined
```

### Extras Object (Non-Scored Answers)
```javascript
{
  // History
  surgeries: ['abdominal', 'pelvic'],
  conditions: ['celiac', 'ibs'],
  medsConfounders: ['glp1', 'opioid'],
  familyHistory: ['fh_celiac'],
  obstetric: ['ob_vaginal', 'ob_tear'],

  // Modifiable drivers
  pss4Score: 8,           // PSS-4 total (0-16)
  bgAnxiety: 2,           // brain-gut anxiety 0-3
  bgMood: 1,              // brain-gut mood 0-3
  nrsPain: 5,             // pain NRS 0-10
  bristol: 4,             // Bristol stool 1-7
  meds: { abx: true, ppi: false, nsaid: false },
  dietFibre: 2,           // dietary fibre frequency 0-3
  dietProcessed: 1,       // processed food frequency 0-3
  alcohol: 1,             // alcohol level 0-3
  activity: 2,            // activity level 0-3
  sleep: [1, 2, 1, 0],    // 4 sleep items 0-3

  // Dysbiosis lens
  abxCourses: 1,          // antibiotic courses /12mo
  dys: {
    postInfectious: 0,    // 0 | 1
    foodTriggers: [],     // food trigger ids
    gasFoul: 2,           // gas severity 0-3
    fibreParadox: 0,      // 0 | 1
    stoolVar: 1,          // stool variability 0-2
  },

  // Anthropometrics
  heightCm: 170,
  weightKg: 68,
  waistCm: 82,

  // Other context
  medsOther: 'free text',  // other meds (free-text)
}
```

## Integration Patterns

### Node.js / Headless
```javascript
const gshs = require('./src/core');

const answers = { gsrs_pain: 2, gsrs_bloating: 1, /* ... */ };
const extras = { pss4Score: 8, bristol: 4 };
const session = { age: 45, gender: 'Female' };

// Validate & compute
const allQuestions = gshs.QUESTIONS;
const index = gshs.QID['gsrs_pain'];

// Later: use scoring.computeScores(answers, extras, session)
```

### Browser / TypeScript
```typescript
import * as gshs from './src/core/index.js';

const sectionMax = gshs.sectionMax('GI');
const imQuestions = gshs.questionsOf('IM');
```

### React Component
```javascript
import { QUESTIONS, QID, revealMet } from '@beyond-gut/gshs-core';

export function QuestionnaireComponent({ answers, setAnswers }) {
  const handleChange = (id, value) => {
    setAnswers({ ...answers, [id]: value });
    // Trigger re-render (adaptive reveals re-evaluate)
  };

  return (
    <div>
      {QUESTIONS.map(q => (
        revealMet(q.revealIf, { answers }) && (
          <Question key={q.id} q={q} value={answers[q.id]} onChange={handleChange} />
        )
      ))}
    </div>
  );
}
```

## Extending the Schema

To add a new question:

1. Add to `QUESTIONS` in `schema.js`:
   ```javascript
   { id: 'my_new_item', section: 'GI', patientText: '...', patientSub: '...' }
   ```

2. All downstream reads use question id, so no code changes needed in other modules.

3. If the new item should affect scoring:
   - Add it to the relevant section's `role` in `SECTIONS` (core | standalone)
   - Update `scoring.js` to handle the new axis if needed

4. Commit with a clear message: `schema: add my_new_item to GI`

## Testing

All core modules are pure logic and highly unit-testable:

```javascript
const { psychLoadScore, loadBand, revealMet, SECTIONS } = require('./src/core');

// Test load band boundaries
console.assert(loadBand(32).l === 'Low');
console.assert(loadBand(33).l === 'Moderate');
console.assert(loadBand(65).l === 'Moderate');
console.assert(loadBand(66).l === 'High');

// Test reveal logic
const cond = { type: 'item', id: 'bg_fatigue', min: 2 };
console.assert(revealMet(cond, { answers: { bg_fatigue: 2 } }) === true);
console.assert(revealMet(cond, { answers: { bg_fatigue: 1 } }) === false);

// Test schema consistency
console.assert(SECTIONS.every(s => s.id && s.label && s.role));
```

## Next Steps

This is Phase 1 of module extraction. Upcoming:

1. **Phase 1b** — Extract remaining core modules (scoring.js, patterns.js, triage.js, romeiv.js)
2. **Phase 2** — Extract UI modules (renderer.js, printer.js, util.js)
3. **Phase 3** — Build configuration (webpack/tsup, multiple entry points)
4. **Phase 4** — Publishing (npm, CDN)
5. **Phase 5** — Full API documentation & integration examples

---

**Status**: Initial extraction (Phase 1a) complete. Ready for feedback and next phase.
