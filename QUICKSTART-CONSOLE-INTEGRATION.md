# Quick Start: Integrating GSHS into Your Console App

This guide shows how to import and use the GSHS scoring engine in your main console application.

## Installation

Clone/reference the GSHS repo or copy the `src/core` directory into your project:

```bash
# Option 1: Use as a git submodule
git submodule add https://github.com/prem-anand89/beyond-gut.git ./vendor/beyond-gut

# Option 2: Copy the src/core directory
cp -r /path/to/beyond-gut/src/core ./vendor/gshs-core
```

## Basic Usage (Node.js)

### 1. Import the Scoring Engine
```javascript
const {
  QUESTIONS,
  SECTIONS,
  computeScores,      // (Phase 1b — coming soon)
  detectPatterns,     // (Phase 1b — coming soon)
  triage,             // (Phase 1b — coming soon)
} = require('./vendor/gshs-core');

// Or if published to npm:
// const gshs = require('@beyond-gut/gshs-core');
```

### 2. Display Questionnaire
```javascript
// List all questions for rendering
console.log(`Total questions: ${QUESTIONS.length}`);

// Get questions for a specific section (e.g., GI core)
const giQuestions = QUESTIONS.filter(q => q.section === 'GI');
console.log(`GI section has ${giQuestions.length} questions`);

// Map question id to index for quick lookup
const { QID } = require('./vendor/gshs-core');
const painIndex = QID['gsrs_pain'];  // Returns question array index
```

### 3. Handle Patient Answers
```javascript
// Collect answers from form submission
const patientAnswers = {
  gsrs_pain: 2,
  gsrs_bloating: 1,
  gsrs_heartburn: 0,
  // ... all questions answered 0-3 ...
  bg_anxiety: 1,
  nu_hair: 2,
  // ... and so on ...
};

// Store non-scored metadata separately
const extras = {
  // History
  surgeries: ['pelvic'],
  conditions: ['ibs'],
  medsConfounders: ['glp1'],
  
  // Drivers
  pss4Score: 8,
  bristol: 4,
  nrsPain: 5,
  sleep: [1, 2, 1, 0],
};

const session = {
  age: 45,
  gender: 'Female',
};
```

### 4. Run Scoring (When Available)
```javascript
// Phase 1b release
const { computeScores, axisProfile, detectPatterns, triage } = require('./vendor/gshs-core');

// Compute scores
const score = computeScores(patientAnswers, extras, session);

// Get axis profile (Gut Symptom, Inflammatory, Nutrient, Impact, Psychosocial, etc.)
const profile = axisProfile(score, extras, score.dysLens);

// Detect patterns (gut-brain, pelvic-floor, nutrient malabsorption, etc.)
const patterns = detectPatterns(patientAnswers, score, extras);

// Determine triage tier and referral candidacy
const triageResult = triage(score, patientAnswers, {
  patterns,
  rome: score.rome,
  impactBand: profile.impact?.band,
});
```

### 5. Store in Database
```javascript
// Save patient visit to your database
const visit = {
  patientId: 'P-1234',
  timestamp: new Date().toISOString(),
  answers: patientAnswers,
  extras: extras,
  results: {
    score,
    profile,
    patterns,
    triage: triageResult,
  },
};

// Save to PostgreSQL, MongoDB, Firebase, etc.
await db.visits.insert(visit);
```

### 6. Display Results
```javascript
// Show patient-friendly summary
console.log(`Gut Symptom Burden: ${profile.symptom.value}% (${profile.symptom.band})`);
console.log(`Systemic Burden: ${profile.inflammatory?.value}%`);
console.log(`Clinical Tier: Tier ${triageResult.level}`);

if (patterns.length) {
  console.log('Detected patterns:');
  patterns.forEach(p => console.log(`  - ${p.label}: ${p.desc}`));
}

if (triageResult.reasons.length) {
  console.log('Referral candidates:');
  triageResult.reasons.forEach(r => console.log(`  - ${r.text}`));
}
```

## Browser / React Integration

### 1. Import in React Component
```javascript
// components/GHSQuestionnaire.jsx
import { QUESTIONS, SECTIONS, revealMet, QID } from '../vendor/gshs-core';

export function GHSQuestionnaire({ onSubmit }) {
  const [answers, setAnswers] = React.useState({});
  const [clusterNorm, setClusterNorm] = React.useState({});

  const handleChange = (questionId, value) => {
    const newAnswers = { ...answers, [questionId]: value };
    setAnswers(newAnswers);
    
    // Trigger adaptive reveal re-evaluation
    // (Update clusterNorm based on new answers)
  };

  return (
    <div>
      {SECTIONS.map(section => (
        <Section
          key={section.id}
          section={section}
          questions={QUESTIONS.filter(q => q.section === section.id)}
          answers={answers}
          onChange={handleChange}
          context={{ answers, clusterNorm }}
        />
      ))}
      <button onClick={() => onSubmit(answers)}>Submit</button>
    </div>
  );
}

function Section({ section, questions, answers, onChange, context }) {
  return (
    <fieldset>
      <legend>{section.full}</legend>
      {questions.map(q => (
        revealMet(q.revealIf, context) && (
          <Question
            key={q.id}
            question={q}
            value={answers[q.id] ?? ''}
            onChange={(val) => onChange(q.id, val)}
          />
        )
      ))}
    </fieldset>
  );
}

function Question({ question, value, onChange }) {
  return (
    <div>
      <label htmlFor={question.id}>
        <strong>{question.patientText}</strong>
        {question.patientSub && <p>{question.patientSub}</p>}
      </label>
      <select id={question.id} value={value} onChange={e => onChange(Number(e.target.value))}>
        <option value="">Choose...</option>
        <option value="0">None</option>
        <option value="1">Mild</option>
        <option value="2">Moderate</option>
        <option value="3">Severe</option>
      </select>
    </div>
  );
}
```

### 2. Submit and Score
```javascript
async function handleGHSSubmit(answers) {
  // Phase 1b: use computeScores
  // const { computeScores } = require('../vendor/gshs-core');
  // const score = computeScores(answers, extras);

  const response = await fetch('/api/ghs-screening', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ answers, extras }),
  });

  const results = await response.json();
  navigate('/results', { state: { results } });
}
```

### 3. Display Results
```javascript
export function GHSResults({ results }) {
  const { profile, patterns, triage } = results;

  return (
    <div className="results">
      <section className="headline">
        <h2>Your Results</h2>
        <div className="outputs">
          <Output label="Gut Symptom Burden" value={profile.symptom.value} band={profile.symptom.band} />
          <Output label="Systemic Burden" value={profile.systemic?.value} band={profile.systemic?.band} />
          <Output label="Disruption Load" value={profile.disruption?.value} band={profile.disruption?.band} />
          <Output label="Dysbiosis Correlate Load" value={profile.dysbiosis?.value} band={profile.dysbiosis?.band} />
        </div>
      </section>

      <section className="patterns">
        <h3>Patterns Noted</h3>
        <ul>
          {patterns.map(p => (
            <li key={p.id}>
              <strong>{p.label}</strong> — {p.desc}
            </li>
          ))}
        </ul>
      </section>

      <section className="triage">
        <h3>Clinical Tier</h3>
        <p className={`tier tier-${triage.level}`}>
          Tier {triage.level}: {triage.label}
        </p>
        <p>{triage.actionText}</p>
        <ul>
          {triage.reasons.map((r, i) => (
            <li key={i}>{r.text}</li>
          ))}
        </ul>
      </section>
    </div>
  );
}

function Output({ label, value, band }) {
  return (
    <div className="output">
      <h4>{label}</h4>
      <div className="value">{value}%</div>
      <div className="band">{band}</div>
    </div>
  );
}
```

## Current Status & Limitations

### ✅ Available Now (Phase 1a)
- Question schema (`QUESTIONS`, `SECTIONS`, `QID`)
- Reveal logic (`revealMet` for adaptive sections)
- Scale metadata (PSS-4, Bristol, pain regions, etc.)
- Helper functions (anthropometrics, knownConditions, medConfounders, etc.)
- Red flags (alarm features)

### ⏳ Coming Soon (Phase 1b)
- `computeScores()` — main scoring engine
- `axisProfile()` — per-axis results
- `detectPatterns()` — pattern detection
- `triage()` — tier determination & referrals
- `classifyRomeIV()` — bowel-subtype classification

### Timeline
- **Phase 1b**: scoring/patterns/triage extraction (this week)
- **Phase 2**: UI module extraction (next week)
- **Phase 3**: Build config + npm publishing (following week)

## Tips for Integration

1. **Start with questionnaire rendering** — use QUESTIONS + SECTIONS now
2. **Store answers in your database** — no dependency on GSHS storage yet
3. **Plan for Phase 1b** — when scoring comes out, update your backend to call computeScores()
4. **Version tracking** — keep a GSHS version file in your project (`src/gshs-version.txt`) for reference

Example version file:
```
GSHS Module Extraction Phase: 1a (Initial core modules)
Last updated: 2025-07-09
Branch: claude/upbeat-hamilton-gh2920
Commit: 3b90b1c
Scoring API: Phase 1b (pending)
```

## Example: Full Console Integration

```javascript
// server.js (Node.js Express backend)

const express = require('express');
const db = require('./database');
const gshs = require('./vendor/gshs-core');

const app = express();
app.use(express.json());

// GET /api/ghs/schema
app.get('/api/ghs/schema', (req, res) => {
  res.json({
    sections: gshs.SECTIONS,
    questions: gshs.QUESTIONS,
    qid: gshs.QID,
  });
});

// POST /api/ghs/screening
app.post('/api/ghs/screening', async (req, res) => {
  const { patientId, answers, extras } = req.body;
  
  // Phase 1b: replace with actual scoring
  // const score = gshs.computeScores(answers, extras);
  // const results = {
  //   profile: gshs.axisProfile(score, extras),
  //   patterns: gshs.detectPatterns(answers, score, extras),
  //   triage: gshs.triage(score, answers, { patterns: ... }),
  // };

  // For now, store raw answers
  const visit = {
    patientId,
    timestamp: new Date(),
    answers,
    extras,
    // results: results (when Phase 1b is available)
  };

  await db.visits.insert(visit);
  
  res.json({
    success: true,
    visitId: visit.id,
    // results (when available)
  });
});

app.listen(3001, () => console.log('Console API running on :3001'));
```

## Troubleshooting

### Q: "Cannot find module './vendor/gshs-core'"
**A**: Copy `src/core` from the Beyond-Gut repo to your project path:
```bash
cp -r /path/to/beyond-gut/src/core ./vendor/gshs-core
```

### Q: "computeScores is not defined"
**A**: That's in Phase 1b (pending). For now, use the schema + store raw answers.

### Q: "How do I handle optional/conditional questions?"
**A**: Use `revealMet(question.revealIf, context)` where context has `{ answers, clusterNorm, flags }`.

### Q: "Can I use this in TypeScript?"
**A**: Yes, but you'll need to create .d.ts files or use JSDoc. Phase 3 will include TypeScript definitions.

---

**Next Steps**: Watch for Phase 1b release (scoring/patterns/triage extraction) and update your integration code to call the scoring functions. This guide will be updated with complete examples when Phase 1b is ready.

For questions or updates, check the main **GSHS-MODULE-INTEGRATION.md** and **MODULE-EXTRACTION-STATUS.md** files.
