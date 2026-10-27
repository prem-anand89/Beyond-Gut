# Gut Quick report contract

**Purpose:** Source of truth for `screenScope: 'gut'` vs `'full'` — what must be collected, what each report surface shows, and what optional expansions restore. Use for Phase 3 implementation and acceptance tests.

**Product context:** Public Theranet embed; patients complete a **short first pass**; therapists may **expand** or run **full** intake. Question text and scoring logic stay identical; only visibility, order, completeness rules, and messaging differ.

**Flow (resolves plan inconsistency):**

| Phase | Gut Quick |
|--------|-----------|
| **Initial wizard → first results** | Safety → Gut block only (Tier A). **No** history chip wall, **no** full meds/confounders/treatments, **no** IM/BG/NU/lifestyle/dys/PSS-4. |
| **After results or explicit expand** | Optional: **Clinical context** (Tier B) → **Full systemic** (Tier C). Returning patients: profile hydrate + “Anything changed?” (Phase 1). |

Full mode keeps today’s step order: `about → meds → safety → gut → lifestyle → systemic → treatments`.

---

## 1. Input tiers

### Tier A — Required in Gut Quick (initial wizard)

| ID / source | Fields | Feeds |
|-------------|--------|--------|
| **Safety** | `RED_FLAGS` (11 yes/no → `redflags`) | Patient RF banner; Tier 1; clinician safety block |
| **GSRS core** | 15 items (`gsrs_*`) | Index, clusters, domain GI bar, most bowel/reflux patterns, triage severity |
| **Duration** | `sx_duration` (when any GI cluster > 0) | `durationNote`; Rome onset fallback |
| **Functional impact** | `imp_work`, `imp_social`, `imp_food`, `imp_global` | IMP axis; Tier 2 impact escalation; restriction screen note (with diet history if present later) |
| **Stool / habit** | `extras.bristol`, `extras.bowelFreq` | Bowel patterns; Rome subtype; `bowelFreqNote` |
| **Frequency** | `extras.clusterFreq` (5 clusters) | Patient severity × frequency matrix; Pain uses `rome.painFreq` when pain card shown |
| **Pain / Rome** (reveal-gated) | `extras.nrsPain`, `extras.painRegion`, `extras.rome`, `extras.bristolProps` | Rome criteria Tier 2; referred-pain note; matrix Pain row |
| **BAM** (optional, reveal-gated) | `bam_stool`, `bam_fatty` + `surgeries` includes `gallbladder` for pattern | `bile_acid_malabsorption` pattern |
| **Identity** (light) | `session.age`, `gender`, `pregnant`, `ref`/`name` | Caveats, female gating, save/trend — not scored |

**Explicitly excluded from initial Gut Quick wizard:** IM, BG, NU (incl. `bg_anxiety` / `bg_mood`), PSS-4, sleep, lifestyle, dys, treatments tried, anthropometrics chip step, conditions/labs/family/obstetric/surgical chips, med confounders (unless Tier B expansion).

### Tier B — Optional expansion: “Clinical context (~2 min)”

| ID / source | Fields | Feeds |
|-------------|--------|--------|
| **Meds (minimal)** | `extras.meds` (abx, ppi, nsaid), `extras.abxCourses`, `extras.medsOther` | Disruption load; `post_disruptor`; reflux+PPI signal |
| **Meds (full)** | `extras.medsConfounders` | `medNote` |
| **Background** | `conditions`, `knownLabs`, `knownLabsDetail`, `surgeries`, `surgeryOther`, `familyHistory`, `obstetric` | Tier 2 routes, context notes, BAM/adhesion, family tier, coeliac timing, pelvic note, AR reveal flags |
| **Anthro** | `heightCm`, `weightKg`, `waistCm` | BMI/WHtR notes; malabsorption `lowBMI` signal |

Hydration from **`patient.profile`** (Phase 1) counts as answered for Tier B without re-clicking chips if user taps “No changes.”

### Tier C — Optional expansion: “Full systemic assessment”

| ID / source | Fields | Feeds |
|-------------|--------|--------|
| **Systemic axes** | IM, BG, NU sections (+ adaptive AR/UG/SY) | Axis profile, domain bars, inflammatory/gut-brain/nutrient patterns, targeted triage |
| **Drivers** | PSS-4, sleep, diet, alcohol, activity, smoking, caffeine, hydration, `extras.dys` | Psych load, dys correlate load, fermentation pattern, lifestyle pattern, modifiable drivers card |
| **Treatments** | `treatmentsTried`, `treatmentsTriedOther` | `treatmentsTriedNote`, restriction notes |

---

## 2. Completeness & honesty (Phase 3 requirement)

| Scope | Completeness denominator | Patient messaging |
|--------|---------------------------|-------------------|
| **`gut`** | Tier A mandatory items only (GSRS + IMP + any shown gut-step items). IM/BG/NU/lifestyle items **excluded** from denominator, not counted as “missing.” | If Tier B/C not done: “Gut screen complete”; not “45% provisional” because NU was hidden. |
| **`full`** | Current behaviour (all mandatory `QUESTIONS` in included sections). | Existing completeness + confidence rules. |

**Visit metadata (persist on save):** `screenScope`, `expandedAt`, `modulesCompleted: { context: bool, systemic: bool }`.

**Clinician / print:** Sections not collected show **“Not completed this session”** (not blank silence). Mode badge: **Gut screen** vs **Full assessment**.

---

## 3. Patient report mapping (`#patient-results`)

| UI block | Required inputs (Gut Quick minimum) | Degraded if Tier B/C skipped |
|----------|-------------------------------------|------------------------------|
| Applicability (pregnant / minor) | `session` | — |
| Red-flag banner | `redflags` | — |
| Pointer to Clinician tab | — | — |
| **Headline card** (`headlineCard`) | Index (GSRS); Rome if pain/Rome answered | Nutrient risk pill weak/absent without NU/labs; Disruption often **0** without Tier B meds; Correlate often **Low/empty** without dys |
| **Gut Symptom Burden hero** | 15 GSRS; scope-aware completeness | — |
| **Severity × frequency** | GSRS + `clusterFreq` (+ Rome pain freq) | — |
| **Trend** | Saved visits | — |
| Actions (save / print / CSV) | — | — |

Patient view **never** shows Tier, pattern list, or full domain breakdown (by design).

---

## 4. Clinician report mapping (`renderClinician` / print)

| UI block | Gut Quick (Tier A only) | + Tier B | + Tier C (full) |
|----------|-------------------------|----------|-----------------|
| Clinical impression / peak alerts | GSRS, patterns from A, red flags, IMP | + context notes (meds, labs, family, conditions) | + systemic patterns, psych, dys |
| Severity × frequency | Yes | Yes | Yes |
| Patterns & mechanisms | Bowel/reflux/BAM (if signals); **no** gut_brain/inflammatory without BG/IM | + malabsorption from labs/BMI/conditions | + fermentation, lifestyle, pelvic, FD, etc. |
| **Tier / suggested next step** | GSRS band, RF, IMP impact, Rome, core patterns | + lab/condition/family/adhesion routes | + full pattern + dys tier routing |
| Axis profile / domain bars | **Symptom (GI)**, **Impact (IMP)** strong; IM/BG/NU absent or “not assessed” | Partial context in drivers | All axes |
| Modifiable drivers | Minimal (Bristol, cluster freq, Rome) | + meds, anthro, conditions | + lifestyle, sleep, dys, PSS-4 |
| Suggested actions (investigations) | Pattern-matched lists for **fired** patterns only | Richer med/lab context | Full lists |
| Trend / interventions | If saved visits | Same | Same |
| Appendix | Answered items only | + profile fields | Full |

---

## 5. Pattern & triage coverage (Gut Quick, Tier A only)

**Expected to work well without Tier B/C:**

- `constipation_dominant`, `diarrhoea_dominant`, `mixed_bowel`, `reflux_upper_gi` (PPI signal only if meds answered)
- Tier from **red flags**, **Severe/Significant** GSRS band, **IMP** impact band, **Rome** if pain path completed
- `bile_acid_malabsorption` only if BAM items + **gallbladder surgery** (surgery is Tier B — document as “complete clinical context for BAM”)

**Expected absent or low-specificity until expansion:**

- `nutrient_malabsorption` (unless strong NU proxies — NU not in gut quick; labs/BMI/conditions need Tier B)
- `gut_brain`, `inflammatory_immune`, `bloating_fermentation` (needs BG/IM/dys)
- `post_disruptor` (needs meds/abx)
- Family/coeliac/med/lab **notes** and many **Tier 2** context routes

Acceptance: clinician copy must **not** imply full systemic workup was done when `screenScope === 'gut'` and Tier B/C false.

---

## 6. Optional expansion UX (acceptance)

| Expansion | Trigger | Sets `modulesCompleted` | Re-run results without losing answers |
|-----------|---------|-------------------------|--------------------------------------|
| **Clinical context** | Post-result CTA or profile confirm | `context: true` | Yes — append steps or modal cards, then `calc()` |
| **Full systemic** | Post-result CTA | `systemic: true`, `screenScope` → `full` or hybrid flag | Yes |
| **Profile “No changes”** | Phase 1 returning patient | `context: true` (hydrated) | Skip chip UI |

---

## 7. Phase 3 acceptance tests (checklist)

### Smoke / regex (`scripts/gshs-smoke.mjs`)

- [ ] `screenScope` on session and visit payload
- [ ] `buildSteps()` returns gut order: safety before gut; no `about` chips in gut initial steps
- [ ] Scope-aware completeness function referenced from `computeScores` or wrapper

### Browser (`scripts/browser-verification.mjs` or Playwright)

- [ ] **Gut-only path:** answer Tier A → results → completeness ≥ threshold (e.g. ≥80%) without IM/BG/NU answered
- [ ] **Clinician tab:** mode badge “Gut screen”; IM/BG/NU show not assessed or hidden with explicit caveat
- [ ] **Expand context:** add PPI + condition chip → Disruption load > 0; `medNote` or disruption signals appear
- [ ] **Expand full:** IM section appears; completeness denominator includes IM when in full scope
- [ ] **Save/reload:** `screenScope` and `modulesCompleted` persist on visit

### Manual QA (Theranet embed story)

- [ ] Patient link: first screen is safety or gut, not 19 condition chips
- [ ] Print footer: mode + “sections not completed” when gut-only
- [ ] Therapist: full mode still available before start (toggle or `?scope=full`)

---

## 8. URL / session hints (embed, optional)

| Param | Effect |
|-------|--------|
| `scope=gut` \| `full` | Initial `screenScope` (default `gut`) |
| `role=patient` \| `clinician` | Chrome / Records prominence (Phase 3.5) |

---

## 9. Change log

| Date | Note |
|------|------|
| 2026-10-27 | Initial contract; aligns with `PRODUCT_FLOW_HANDOFF.md` and gut-first phased plan. |
