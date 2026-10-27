# Product & flow architecture handoff — GSHS / Beyond-Gut (free web tool)

**Audience:** Next implementer (e.g. Claude)  
**Date:** 2026-10-27  
**Repo:** Single-file app (`index.html` + `src/core/*` modules; build via `build.mjs` → `dist/`)  
**Deployment model:** Free online tool — link on clinic/therapist websites; patients and therapists open the same URL in a browser. No login, no server-side PHI, client-side only (`localStorage`).

---

## 1. Product context (constraints that shape every recommendation)

### What this is

- A **browser-based screening questionnaire** with patient-facing wizard, results, and clinician-facing report.
- **Offline-first / zero cloud:** answers and “patient records” live in **browser `localStorage`** only (`KEY = 'bmgutscreen_v2'` in `storage.js`).
- **No accounts:** identity is optional name + optional clinician reference code; automated patient codes use per-device **site prefix** (`db.meta.siteCode`, UI: “Site: BMG”).
- **Dual audience on one URL:**
  - **Patient** completes the form (often alone, on phone).
  - **Therapist/clinician** reviews Clinician tab, may save/export, may run follow-ups from Patient records.

### Implications for flow work

| Constraint | Design consequence |
|------------|-------------------|
| Anyone can open the link | Default path must be **short and legible**; “full functional medicine intake” cannot be the only first impression. |
| Data stays on device | **Returning patients on a new device** have no history unless they export/import JSON or clinician re-enters — persistence fixes help **same browser + same saved patient**, not cross-device magic. |
| Shared clinic tablets | UI already warns to clear data after each patient (`sessionStorage` dismissible notice). History persistence must not make “forget to clear” worse — still support **anonymous one-off** screens. |
| Therapist embeds link on website | Marketing copy (README ~15–25 min) **conflicts** with in-app meta (~5–7 min for mandatory Likerts). Align before launch. |
| No per-user settings API | “Clinician configures modules” = **`localStorage` meta on that device/browser** (like `siteCode`), optionally exportable preset — not cloud profiles unless you add auth later. |

---

## 2. Validated diagnosis (grounded in code)

### 2.1 Two products, one linear wizard

The **scoring model** already separates:

- **Job A — Gut triage:** GSRS-based **Gut Symptom Burden Index** (`SECTIONS` → `GI`, `role: 'core'`). Only GI core feeds the index (`schema.js` comments).
- **Job B — Systemic / functional intake:** `IM`, `BG`, `NU`, `IMP` standalone axes, lifestyle/dysbiosis drivers, chip-based history, meds, treatments — rolled up in `axisProfile()` / `headlineOutputs()` / `triage()`.

The **UI** (`buildSteps()` in `index.html` / `ui-patient.js`) presents one long wizard:

1. About & history (anthropometrics + conditions, labs, family, obstetric, surgical)  
2. Medications + confounders  
3. Safety (red flags)  
4. Gut symptoms (+ Bristol, cluster freq, pain/Rome cards)  
5. Lifestyle + sleep + dysbiosis  
6. Systemic (IM/BG/NU/IMP + PSS-4 + adaptive AR/UG/SY)  
7. Treatments tried  

So patients pay **Job B’s time cost** before reaching **Job A’s symptoms** (gut is step 4).

### 2.2 Inventory (use these numbers, not ~51)

Parsed from `QUESTIONS` in `index.html`:

| Metric | Count |
|--------|------:|
| Total Likert / structured `QUESTIONS` | 50 |
| Mandatory (`!optional`) | 34 |
| Optional (adaptive AR/UG/SY, BAM, free-text follow-ups) | 16 |
| GI section items | 18 (16 mandatory incl. 15 GSRS + conditional `sx_duration` `driverOnly`) |
| Red flags (`RED_FLAGS`) | 11 yes/no (separate from `QUESTIONS`) |

Plus **~10 chip/card selectors** in `blankExtras()` (conditions, surgeries, treatments, meds confounders, labs, family, obstetric, diet triggers, etc.) — not in `mainQ` time estimate.

In-app time copy (`render()`): counts mandatory questions × 8–12 s/question, **floors at ~3 minutes**; optional block quoted separately. **Does not** fully model chip cards or driver steps.

### 2.3 Returning patients re-enter static history (confirmed bug / waste)

```text
newVisitFor(identity, followup) → reset() → extras = blankExtras()
```

- `reset()` clears `answers`, `redflags`, `extras`, `loadedVisitId`, `currentStep` (`ui-patient.js` / `index.html`).
- `newVisitFor` only restores **session demographics** (name, age, gender, ref, followup flag).
- `saveVisit()` persists `extras` on the **visit** only; patient record updates **name/age/gender/ref** — no `patient.profile` for chips.

For a **free tool marketed to track patients over time**, this is the largest avoidable friction on follow-ups (same device, saved patient).

### 2.4 Follow-up is a label, not a shorter flow

`session.followup` changes **recall wording** (`recallNote()`) and display tags only — **same steps and mandatory counts**.

### 2.5 Partial data and scoring

- Index/completeness: optional and `driverOnly` items excluded per `computeScores()` rules.
- Patterns: `detectPatterns()` uses coverage-style signals; missing systemic data → **lower confidence**, not necessarily wrong gut index.
- **Do not claim** “full triage unchanged on gut-only path” — many `triage()` notes use `knownConditions()`, surgeries, family, dysbiosis, PSS-4, etc. from `extras` / answers.

### 2.6 Dual maintenance

Logic exists in **`src/core/*.js`** and bundled **`index.html`** (and `dist/index.html`). Any change: edit modules + run build, or edit monolith consistently. Tests: `tests/e2e.spec.js`, `scripts/gshs-smoke.mjs`.

---

## 3. Product principles (for a free public web tool)

1. **Default = respect patient time** — Quick gut screen + safety is the front door; full systemic intake is opt-in or post-result.
2. **Safety never optional** — Red flags stay mandatory in every mode (`RED_FLAGS` invariant in `redflags.js`).
3. **Honest outputs** — If modules skipped, patient and clinician UIs must say **provisional / incomplete systemic assessment** (leverage existing `scoreConfidence` / completeness).
4. **Same browser, same patient** — Optimize repeat visits via **patient-level profile** hydration; document limits for new device / cleared storage.
5. **Therapist choice without accounts** — Module defaults via `db.meta` on device (extend `siteCode` pattern); optional named presets in JSON export/import.
6. **Embeddable trust** — Short first screen, clear time per step, “skip is OK” for optional blocks; align README with UI.

---

## 4. Recommendations (implementation-ready)

### 4.1 Two-tier screening — use `screenScope`, not a second app

**Add** visit/session field, e.g. `screenScope: 'gut' | 'full'` (default `'gut'` for new anonymous sessions; configurable default in meta).

**Gate steps** via existing `buildSteps()` `showIf` predicates — same cards, same IDs, same scoring (presentation + gating only, per wizard comment block ~line 3688 in `index.html`).

#### Suggested “Quick gut screen” (`screenScope === 'gut'`)

| Include | Notes |
|---------|--------|
| Safety (red flags) | Consider order: **Safety → Gut** before history for first-time users. |
| 15 GSRS items | Core index + clusters. |
| Bristol + bowel frequency + cluster freq | Rome/subtype and results context; already on gut step. |
| Pain / Rome cards | Reveal-gated as today. |
| Conditional `sx_duration` | Triage duration note. |

**Explicit product decisions needed:**

| Item | Recommendation |
|------|----------------|
| IMP (4 mandatory items) | Either keep in quick path (functional impact is gut-adjacent) **or** move to `full` only and accept impact axis absent on quick report. |
| `bg_anxiety` / `bg_mood` | Dual-role: affect BG axis **and** index via psych screen. Quick mode should **hide** them or clinicians will get psych index inflation without intending “full” screen. |
| History chips | Quick path: **defer** to post-result or “confirm profile” step (see 4.2). |
| Lifestyle / dys / PSS-4 / IM / NU | `full` only or post-result expansion. |

**Post-result expansion (preferred over upfront toggle):**  
After results: “Your answers suggest nutrient absorption may be relevant — add ~N questions?” Reuse `refreshReveals()` / conditional section pattern at **wizard level** (`screenScope` transition mid-visit or “continue questionnaire” without losing answers).

**Persist** `screenScope` on saved visit + mention in `scoreSnapshot` metadata for audit/pilot CSV.

**UX copy:** Clinician report sections for skipped modules → “Not completed in this session (gut-only screen).”

---

### 4.2 Patient-level history persistence (highest ROI, phase 1)

**Problem:** `newVisitFor` + `reset()` wipes all chip history every visit.

**Data model** — add to patient object in `storage.js` / `saveVisit()`:

```javascript
patient.profile = {
  conditions: [],
  surgeries: [],
  surgeryOther: '',
  familyHistory: [],
  obstetric: [],
  knownLabs: [],
  knownLabsDetail: {},
  medsConfounders: [],
  meds: { abx, ppi, nsaid },
  medsOther: '',
  heightCm: null,           // relatively stable
  profileUpdatedAt: null,
  profileSourceVisitId: null, // optional audit
}
```

**Visit-level `extras`** retain symptom-varying fields: weight/waist, bristol, dys, pss4, sleep, treatmentsTried, intervention chips, rome, clusterFreq, etc.

**`newVisitFor(identity, followup)` flow:**

1. `reset()` visit-scoped state (answers, redflags, symptom extras).
2. If `findPatient(db)` exists → **hydrate** `extras` chip fields from `patient.profile` (merge helper).
3. First wizard step for known patients: **“Anything changed since [date]?”** with collapsed cards pre-filled; single tap “No changes” advances.

**Migration** (`normalise()` in `storage.js`): for each patient without `profile`, copy from **latest visit’s `extras`** (stable fields only).

**Anonymous users** (no save / no ref): unchanged — blank extras.

**Privacy:** profile still PII in localStorage; keep shared-device warning; optional “clear all data” unchanged.

**Save path:** on `saveVisit()`, write stable fields back to `patient.profile` from current `extras`.

---

### 4.3 Reorder and compress wizard (phase 2, low scoring risk)

**PR A — step order** (edit `buildSteps()` only):

Suggested default order for **full** mode:

1. Safety  
2. Gut symptoms (+ Bristol / cluster / pain / Rome)  
3. Systemic (if `screenScope === 'full'`)  
4. Lifestyle / dys / sleep (if full or gated)  
5. **Profile confirm** (anthropometrics + history chips) — shortened for returning patients  
6. Medications  
7. Treatments tried  

**PR B — split monolithic “About & history”:**

- Step “About you” — age/gender/ref/pregnant only (already partly in banner).  
- “Background (optional, ~2 min)” — collapsible chip cards with per-card time hints.

---

### 4.4 Clinician / therapist configuration without auth (phase 4)

Extend `db.meta` (same pattern as `siteCode`):

```javascript
meta.screenDefaults = {
  defaultScope: 'gut',       // 'gut' | 'full'
  modules: {
    systemic: true,
    lifestyle: true,
    treatments: true,
    anthropometrics: true,
  },
  followupScope: 'gut',      // or 'symptoms_only' future
}
```

UI: Settings on Records tab (or gear near Site code). **Per browser**, not per therapist login.

Optional: **named presets** (“Physio — gut + pelvic”, “Nutrition — full”) stored in meta as array; clinician picks preset before “New patient”.

Document for website embedders: “Configure once on your clinic tablet.”

---

### 4.5 Follow-up symptom-only mode (phase 4b)

When `session.followup === true` and `meta.screenDefaults.followupScope === 'symptoms_only'`:

- Skip profile confirm if “no changes”  
- GSRS + red flags + optional IMP delta  
- Do not re-ask full IM/BG/NU unless clinician expands  

Requires profile persistence (4.2) to be valuable.

---

### 4.6 Time estimates and marketing alignment (phase 5)

- Add `estimatedMinutes` per step in `buildSteps()` (count visible questions + card heuristic).  
- Update stepper subtitle (`#gstepsub`) when conditional sections reveal.  
- Fix **README.md** and **CLINICIAN_HANDOFF.md** to match in-app numbers or explain “gut-only vs full”.  
- For **website embed**: expose one sentence for iframe landing — “~4 min gut check; optional deeper modules.”

---

### 4.7 Testing requirements

Add / extend:

| Test | Intent |
|------|--------|
| `gut` scope smoke | Complete gut + red flags → See results → completeness & clinician sections |
| Follow-up hydration | Save patient with profile → `newVisitFor` → chips pre-filled |
| Migration | Import legacy DB → profile backfill |
| E2E | Update `tests/e2e.spec.js` if default scope changes |

---

## 5. Suggested execution order

| Phase | Deliverable | Risk | User-visible win |
|------:|-------------|------|------------------|
| **1** | `patient.profile` + hydrate + migration + save sync | Low (no scoring change) | Follow-ups on same device much faster |
| **2** | Reorder steps + split history step | Low | Feels like a screening tool, not intake |
| **3** | `screenScope` + gating + provisional copy + persist on visit | Medium | Default short path for web traffic |
| **4** | `meta.screenDefaults` + follow-up symptom mode | Low–medium | Therapist-tailored embeds |
| **5** | Per-step time + README/handoff alignment | Low | Trust, fewer drop-offs |

**Do not** re-derive weights or pattern thresholds in the same initiative unless clinical sign-off — this is **flow/UI/state** work.

---

## 6. Key code locations (cheat sheet)

| Concern | Location |
|---------|----------|
| Wizard steps | `buildSteps()` — `index.html` (~3696) / `src/core/ui-patient.js` |
| Reset / new visit | `reset()`, `newVisitFor()` — `ui-patient.js` |
| Extras shape | `blankExtras()` — `ui-patient.js` |
| Save visit | `saveVisit()`, `currentVisit()` — `ui-patient.js` |
| Patient DB | `storage.js` — `loadDB`, `saveDB`, `normalise`, `mergeImport` |
| Schema / sections | `schema.js` — `SECTIONS`, `QUESTIONS`, `revealMet` |
| Scoring / completeness | `scoring.js` — `computeScores`, `scoreConfidence` |
| Patterns | `patterns.js` — `detectPatterns` |
| Triage | `triage.js` |
| Red flags | `redflags.js` — `RED_FLAGS` |
| App entry | `src/core/app.js` — `goQuestionnaire` → `Patient.newVisitFor` |
| E2E | `tests/e2e.spec.js`, `scripts/gshs-smoke.mjs` |
| Build | `build.mjs` / `esbuild.config.mjs` |

---

## 7. Open product decisions (need human call before coding)

1. **Default scope** for anonymous link open: `gut` vs `full`?  
2. **IMP in gut-only:** include or exclude?  
3. **Quick mode psych items:** hide `bg_anxiety` / `bg_mood` entirely?  
4. **Profile on first visit:** still ask full history once, or defer all chips until after first results?  
5. **Cross-device:** do you want a future “email me a link with no data” only, or invest in export QR / import prompt for patients?

---

## 8. Success metrics (free web tool)

- **Completion rate** — % reaching “See results” (instrument via optional analytics later; today manual).  
- **Time to results** — median active minutes (gut scope target: ~4–6 min).  
- **Follow-up friction** — chip interactions on 2nd visit (should drop sharply after profile).  
- **Drop-off step** — which wizard step loses users (stepper index on abandon if you add telemetry).  

---

## 9. Summary for implementer

The engine is already **gut-first**; the product experience is **intake-first**. For a **free website tool**, default to a **gut + safety screen**, persist **static history on the patient record**, let therapists **configure depth per device**, and **say clearly** when systemic modules were skipped. Phase 1 (profile persistence) is the best first PR: high payoff, no scoring change, directly fixes the contradiction between “track patients over time” and `reset()` on every `newVisitFor`.

---

*Handoff prepared from codebase review (2026-10-27). Prior review validated `newVisitFor`/`reset`, `buildSteps` order, question counts, and localStorage patient model.*
