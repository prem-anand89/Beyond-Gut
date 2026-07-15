# Beyond-Gut — Gut & Systemic Health Screen (GSHS)

A single-file, offline clinical screening tool for assessing chronic gut dysfunction and systemic health in primary-care and specialist settings.

## What is Beyond-Gut?

Beyond-Gut is a **validated gut-symptom + systemic-screening + pattern-detection tool** for clinicians (GPs, gastroenterologists, physiotherapists, nutritionists) to rapidly assess patients with chronic or recurrent gastrointestinal symptoms. It combines:

- **15-item GSRS core** (validated instrument) measuring gut symptom severity across 5 clusters
- **6 clinical axes** (Symptom, Inflammatory, Nutrient, Psychosocial, Impact, Pelvic) for a holistic picture
- **12 pattern-detection engines** (constipation-dominant, diarrhoea-dominant, reflux, pelvic-floor dysfunction, nutrient malabsorption, gut-brain axis, etc.)
- **4-tier clinical routing** (Tier 1: Refer urgently, Tier 2: Manage with specialist, Tier 3: Microbiome-focus, Tier 4: Monitor)
- **Specialty-specific investigation lists** matched to fired patterns
- **Offline-first architecture** — zero cloud, zero authentication, data stays on the patient's device

**Language:** Plain English, no jargon. **Time:** ~15 minutes for core, ~25 minutes if adaptive sections revealed. **Platform:** Single HTML file, works in any modern browser on desktop, tablet, or mobile.

---

## Quick Start

1. **Open the tool:** Open `index.html` in any modern browser (Chrome, Firefox, Safari, Edge)
2. **Set your clinic code** (optional): Click "Site: BMG" button to set a unique clinic prefix for patient ID auto-generation
3. **Patient fills questionnaire** on screen or on paper (printable form available)
4. **View results** → Clinician tab for investigation recommendations + management tier, Patient tab for plain-language summary
5. **Export data** as CSV for multi-device sync or external analysis

**No setup required.** No login, no server, no dependencies. Works offline.

---

## Documentation

### For Clinicians & Clinical Teams

- **[CLINICIAN_HANDOFF.md](CLINICIAN_HANDOFF.md)** — Comprehensive guide to how the tool works
  - Scoring logic, pattern definitions, triage routing, investigations by pattern
  - 13 sections covering executive summary, questionnaire map, specialty-specific guides (GPs, GI, Physios, Nutritionists), limitations, workflow
  - Cross-referenced code locations for QA / validation
  - **Start here** if you're a clinician implementing this tool or auditing its logic

### For End Users & Administrators

- **[TECHNICAL_USER_GUIDE.md](TECHNICAL_USER_GUIDE.md)** — How data is stored and how to use multi-clinic features
  - Site Code mechanism (set different patient ID prefixes per clinic on the same link)
  - Multi-device access (offline localStorage — each device independent, manual CSV sync available)
  - Database structure, storage location, data persistence, backup & export workflow
  - **Start here** if you're setting up multi-clinic access or need to understand data storage

### Implementation & Development

- **[GSHS-MODULE-INTEGRATION.md](GSHS-MODULE-INTEGRATION.md)** — Module architecture and how questions flow through the scoring engine
- **[MODULE-EXTRACTION-STATUS.md](MODULE-EXTRACTION-STATUS.md)** — Status of modularized extraction from the single-file app
- **[QUICKSTART-CONSOLE-INTEGRATION.md](QUICKSTART-CONSOLE-INTEGRATION.md)** — Using the tool's internals programmatically

---

## Key Features

### Clinical Safety
- **Red flags always asked** — Never gated, never hidden. Abdominal pain ≥6 weeks, weight loss, haematemesis, jaundice, etc. trigger Tier-1 referral
- **Validated core** — GSRS 15-item instrument (never diluted, never blended with screening domains)
- **Pattern-driven investigations** — Fired patterns (constipation-dominant, nutrient malabsorption, pelvic-floor, etc.) carry investigation recommendations
- **Four-tier routing** — Clear escalation path from reassurance (Tier 4) to urgent referral (Tier 1)

### Multi-Clinic Capability
- **One shared link, multiple clinic codes** — Each clinic clicks "Site: BMG" button, enters its code (e.g., "CLINA", "CLINB")
- **Auto-numbered patient IDs** — Clinic A patients: CLINA-0001, CLINA-0002, etc. Clinic B patients: CLINB-0001, CLINB-0002, etc.
- **No central server needed** — Each device/clinic maintains its own independent database

### Privacy & Offline
- **Zero cloud** — All data stays in the browser's localStorage on the patient's device
- **No authentication** — No passwords, no user accounts, no login system to breach
- **No external APIs** — Scoring, pattern detection, and triage happen entirely client-side
- **User controls export** — CSV download is manual; clinician decides when and how to share data

### Accessibility
- **Responsive design** — Works on desktop, tablet, mobile
- **Plain-language output** — Patient summary uses everyday language; clinician summary includes detail
- **Printable forms** — Patient can take questionnaire on paper, then enter responses in app
- **Specialty-specific quick guides** — GPs see tier-based referral rules; Physios see pelvic-floor candidacy; Nutritionists see malabsorption workup

---

## Architecture

### Single-File Design
The entire tool is `index.html` (~4800 lines), using an inlined module loader (`__modules`/`__req`) that bundles:

- **schema.js** — Questionnaire structure (8 sections, 30+ questions, recall windows, adaptive reveal logic)
- **scales.js** — Scoring utilities (cluster definitions, Bristol stool form, driver helpers)
- **scoring.js** — Index calculation (cluster norms, bands, the 6 axes, headline outputs)
- **patterns.js** — Pattern-detection engines (12 pattern firing conditions + investigations)
- **romeiv.js** — Rome IV IBS classification (pain criterion, chronicity, bowel-subtype)
- **triage.js** — Clinical tier assignment (Tier 1–4, safety escalation, candidacy notes)
- **redflags.js** — Red-flag definitions (alarm questions, auto-escalate to Tier 1)
- **ui-patient.js** — Patient & clinician questionnaire UI, results display, print/export
- **trend.js** — Visit trend analysis (repeated assessment over time)
- **storage.js** — localStorage persistence, CSV export, import/merge

**No build step.** No dependencies beyond the browser. Open in any modern browser and it works.

### Data Flow

```
Patient fills questionnaire (7 content groups)
       ↓
Answers stored in-memory during session
       ↓
User clicks "Save this response"
       ↓
Visit object created: {id, date, type, answers, extras}
       ↓
Engine runs:
  • computeScores() → cluster norms, index, 6 axes
  • detectPatterns() → 12 patterns, firing confidence
  • classifyRomeIV() → IBS subtype, criteria met
  • triage() → Tier 1–4, safety escalation, candidacy notes
       ↓
Clinician view → full computation output (investigations, pattern detail, confidence)
Patient view → plain-language summary (results, tier, notes, patterns)
       ↓
User can "Export CSV" → download all patients + visits + answers + drivers + computed results
       ↓
On another device, user can "Import CSV" → merge visits into existing patient or create new record
```

---

## Questionnaire Sections

1. **Anthropometrics** (optional) — Height, weight, waist circumference → BMI, waist-to-height ratio
2. **History** (optional) — Known conditions (IBS, coeliac, IBD, etc.), family history, obstetric history, surgical history, medications, med confounders
3. **Safety Screen** (mandatory) — Red flags (alarm features that escalate to Tier 1)
4. **Gut Symptoms** (core, mandatory) — 15-item GSRS + Bristol stool form + frequency + pain detail
5. **Lifestyle & Drivers** (optional) — Diet, alcohol, activity, sleep, dysbiosis lens (ABx/PPI/NSAID/post-infectious exposure)
6. **Systemic Features** (optional) — Inflammatory, Brain-gut, Nutrient, Functional impact, PSS-4 stress
7. **Adaptive Deep Dive** (conditional) — Revealed only when relevant:
   - **Pelvic/Anorectal** (AR) — incontinence, straining, blockage, digital maneuvers
   - **Upper-GI** (UG) — early satiety, post-meal fullness
   - **Autonomic** (SY) — orthostatic, palpitations, cyclical flare

---

## The Six Clinical Axes

| Axis | Measures | Source | Validated? |
|------|----------|--------|-----------|
| **Symptom (Gut)** | 15-item GSRS Index, 0–100 | GI core section | ✅ Validated |
| **Inflammatory/Immune** | IM section: immune markers, skin, joint signals | IM section (6 items) | ⚠️ Draft |
| **Nutrient/Malabsorption** | NU section: hair loss, anaemia, mouth changes, known deficiency | NU section (5 items) | ⚠️ Draft |
| **Psychosocial/Gut-Brain** | BG section + PSS-4 stress: anxiety, mood, fatigue, brain-fog, stress | BG + PSS-4 | ⚠️ Partial (PSS-4 validated) |
| **Impact/Functional** | IMP section: work, social, food restriction, global functioning | IMP section (4 items) | ⚠️ New |
| **Pelvic/Anorectal** | AR section: bowel control, evacuation, pain | AR section (4 items) | ⚠️ Emerging |

---

## The Four Headline Outputs

Derived from the 6 axes and grouped for clinical readability:

| Output | Derived from | Meaning |
|--------|--------------|---------|
| **Gut Symptom Burden** | GSRS Index only (Symptom axis) | Current severity of gut symptoms, 0–100, banded Minimal/Mild–Mod/Moderate–Severe/Severe |
| **Systemic Burden** | Mean of Inflammatory + Nutrient + Psychosocial + Impact | Risk from non-gut factors (inflammation, malabsorption, stress, functional impact) |
| **Microbiome Disruption Load** | Exposure split of Dysbiosis-R lens: ABx, PPI, NSAID, recent surgery | Medications/history that alter gut bacterial balance |
| **Dysbiosis Correlate Load** | Phenotype split of Dysbiosis-R lens: post-infectious, fermentation, stool variability | Symptom patterns associated with dysbiosis-type picture |

---

## The 12 Patterns

Detected automatically when answers meet firing thresholds. Include investigations and management hints:

1. **Constipation-Dominant (IBS-C)** — Rome IV criterion met; management: dietary fibre, osmotic laxative, activity
2. **Diarrhoea-Dominant (IBS-D)** — Rome IV criterion met; investigations: calprotectin, coeliac serology, stool PCR
3. **Mixed/Alternating Bowel** — Both constipation and diarrhoea signals present
4. **Reflux/Upper-GI** — Heartburn/regurgitation prominent; investigations: H. pylori, pH monitoring if refractory
5. **Bloating/Fermentation (Microbiome)** — Indigestion + gas signals; investigations: breath testing (SIBO), low-FODMAP trial
6. **Nutrient Malabsorption** — Low BMI, hair loss, anaemia signs, or lab-confirmed deficiency; investigations: serum micronutrients, faecal elastase, coeliac serology
7. **Gut-Brain Axis** — GI present + high stress/mood/fatigue; management: stress reduction, gut-directed hypnotherapy, CBT
8. **Inflammatory/Immune** — IM domain elevated + structural inflammation concerns; investigations: calprotectin, CRP, coeliac serology
9. **Recent Gut Disruptor** — Recent ABx course, post-infectious, or microbiome-altering medication; management: probiotic trial, dietary recovery
10. **Pelvic-Floor/Anorectal** — Incontinence or obstructed defecation pattern; management: pelvic-floor physio referral
11. **Functional Dyspepsia** — Upper-GI early satiety/fullness; investigations: H. pylori, trial PPI, review meds
12. **Lifestyle-Driven** — Modifiable factors (sedentary, high alcohol, poor sleep) dominate; management: activity, sleep hygiene, dietary review

---

## The Four Clinical Tiers

| Tier | When | Actions | Timeframe |
|------|------|---------|-----------|
| **Tier 1** | Any red flag OR Severe burden | **Refer for urgent clinical assessment** — safety first | Same day / next week |
| **Tier 2** | Significant burden + Pattern fired | **Manage with specialist input** — GI referral + pattern-specific investigations | 2–4 weeks |
| **Tier 3** | Recent disruptor OR Screening-level concern | **Microbiome/lifestyle focus** — Probiotics, low-FODMAP trial, dietitian review | 4–8 weeks |
| **Tier 4** | Low burden, No patterns | **Reassure + monitor** — Self-management, lifestyle, follow-up if symptoms persist | Routine review |

---

## Specialty-Specific Quick Guides

### For General Practitioners
- **Tier 1** (Severe burden or red flag) → **Refer out**
- **Tier 2–3** (40–60% Gut Symptom Index + pattern) → **Manage + order investigations**
- **Tier 4** (<20% index + no patterns) → **Reassure + lifestyle advice**
- Check the fired patterns to guide investigation ordering (e.g., diarrhoea-dominant → calprotectin/coeliac; constipation → fibre/laxative/activity)

### For Gastroenterologists
- Rome IV IBS subtype (C/D/M/U) feeds from bowel symptoms + Bristol stool form
- Organic-exclusion workup guided by pattern + red flags
- Pattern-specific investigations (SeHCAT for IBS-D, hydrogen breath test for SIBO, H. pylori for dyspepsia)
- Systemic burden (inflammatory, psychosocial, impact) informs whether to scope or try medical therapy first

### For Physiotherapists
- **Pelvic-floor pattern** fired → candidacy for internal/external assessment + pelvic-floor PT
- **Referred-pain pattern** (low-back/abdominal pain + gut symptoms) → musculoskeletal/visceral overlap
- Systemic burden (inflammatory, psychosocial, autonomic) → co-management; don't over-treat locally if systemic driver dominates
- Red flags → always escalate to GP/GI (your safety net)

### For Nutritionists/Dietitians
- **Nutrient-malabsorption pattern** + NU axis → supplementation needs, absorption barriers (PPI, post-surgical)
- **Bloating/fermentation pattern** → SIBO screening, low-FODMAP trial candidacy
- **Inflammatory pattern** → elimination diet, food-trigger testing
- **Impact axis** (food avoidance ≥2) + restrictive-diet history → screen for disordered eating before further restriction

### For Allied Health (Sleep, Exercise, Stress)
- **Psychosocial/Gut-Brain axis** + stress (PSS-4) → mind-body intervention (yoga, meditation, hypnotherapy)
- **Sleep driver** (4 items) → address sleep quality before expecting GI improvement
- **Activity driver** → exercise prescription per IBS subtype (gentle for pain-dominant; structured for diarrhoea)

---

## Limitations & When to Override

The tool is a **screening framework**, not a diagnostic engine. Know what it does NOT do:

- ❌ No frequency-only severity assessment (GSRS limitation; frequency items nudge but don't replace)
- ❌ No imaging or objective biomarkers (tool is clinical questionnaire only)
- ❌ No guarantee of Rome IV diagnosis (single-visit snapshot; Rome validated on prospective diary)
- ❌ No symptom clustering is anatomically validated (clusters are signal-based; overlaps intentional)
- ❌ Dysbiosis "correlate" is phenotypic pattern, not proof (suggests dysbiosis-relevant signals, not confirmation)
- ❌ Band cutoffs are provisional (await recalibration against lab/outcome data)

**When to override the tool:**
- Clinical judgment + objective data (labs, imaging, endoscopy) trump screening output
- Unexpected alarm findings (unexplained weight loss, haematemesis, fever) = refer regardless of Tier
- Contextual factors (recent infection, medication, life stressor) may better explain findings than pattern

---

## Getting Started

### For Patients
1. **Fill the questionnaire** on screen or on paper (~15–25 min depending on complexity)
2. **Click "Save this response"** to store the visit
3. **View your results** in the Patient tab
4. **Share with your clinician** or download as PDF

### For Clinicians
1. **Ask your patient to fill the questionnaire** (you can assist or they can fill solo)
2. **Click the Clinician tab** to see full results, investigation recommendations, and triage tier
3. **Use the specialty-specific quick guide** (GPs/GI/Physios/Nutritionists sections in CLINICIAN_HANDOFF.md)
4. **Order investigations** from the pattern-matched lists
5. **Assign management tier** — the tool suggests one, but clinical judgment overrides
6. **Optionally export CSV** for research, audit, or multi-device sync

### For Multi-Clinic Setups
1. **Clinic A:** Click "Site: BMG" button → type "CLINA" → save → patient IDs now CLINA-0001, CLINA-0002, etc.
2. **Clinic B (same link):** Click "Site: BMG" button → type "CLINB" → save → patient IDs now CLINB-0001, CLINB-0002, etc.
3. **Pool data:** Export CSV from each clinic → import on central device for cross-site analysis

---

## Technology

- **Language:** Vanilla JavaScript (no frameworks)
- **Storage:** Browser localStorage (`bmgutscreen_v2` key, 5–10 MB capacity)
- **Architecture:** Single HTML file with inlined modules + module loader
- **Compatibility:** Chrome, Firefox, Safari, Edge (all modern versions)
- **Offline:** Yes — works entirely offline; no internet required after first load
- **Mobile:** Responsive design; tested on iOS Safari, Android Chrome

---

## Files in This Repo

- **`index.html`** — The tool itself (all-in-one file, ~4800 lines)
- **`CLINICIAN_HANDOFF.md`** — Comprehensive guide for clinical teams
- **`TECHNICAL_USER_GUIDE.md`** — Data storage, multi-clinic setup, backup workflow
- **`GSHS-MODULE-INTEGRATION.md`** — Module architecture & question flow
- **`QUICKSTART-CONSOLE-INTEGRATION.md`** — Using the tool's internals programmatically
- **`server.js`** — Optional Node.js server for local hosting
- **`scripts/`** — Smoke tests, utilities
- **`package.json`** — Dependencies (Express for optional server, test framework)

---

## Support & Questions

For detailed information on:
- **How the tool works** → Read [CLINICIAN_HANDOFF.md](CLINICIAN_HANDOFF.md)
- **Data storage & multi-clinic setup** → Read [TECHNICAL_USER_GUIDE.md](TECHNICAL_USER_GUIDE.md)
- **Scoring & pattern logic** → See code references in CLINICIAN_HANDOFF.md (line numbers provided)
- **Module architecture** → Read [GSHS-MODULE-INTEGRATION.md](GSHS-MODULE-INTEGRATION.md)

---

**Last updated:** 2026-07-15  
**Branch:** `claude/upbeat-hamilton-gh2920`  
**Status:** Active development
