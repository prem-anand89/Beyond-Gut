# Scoring, Sensitivity & Report Review

**Date**: 2026-07-22
**Scope**: Evaluation of three proposal documents against the current engine, with implementation recommendations. Goal: a more *sensitive* and *appropriate* tool with defensible psychometrics, and a clinician-only report.

---

## How to read this

Each proposal is rated:

- 🟢 **ADOPT** — sound, high value, compatible with the current architecture, low risk.
- 🟡 **ADOPT WITH CHANGES** — the intent is right but the proposed mechanism conflicts with an existing safeguard; adopt a modified form.
- 🔵 **DECISION NEEDED** — defensible but changes the tool's identity/psychometrics; genuinely your call (flagged for sign-off).
- 🔴 **DECLINE / DEFER** — conflicts with a deliberate safeguard or adds risk without matching value.

The single most important architectural fact to keep in mind: **the engine deliberately separates the number that drives the displayed Index from the number that gates pattern-firing.** The nudge (Bristol/frequency) reaches only `index`; the *un-nudged* cluster mean feeds `patterns.gi()`. This exists so a driver-card answer can never silently flip a Tier-4 patient into a Tier-1 referral. Several proposals below (multiplicative burden, frequency into scoring) would break that separation if implemented naïvely — the recommendations preserve it.

---

## Document 1 — Scale & Scoring Upgrades (`geminicode`)

### 1.1 · Five-point (0–4) severity scale — 🔵 DECISION NEEDED

**Current**: 4-point (0–3), already flagged "modified 4-point scale … provisional."

**Analysis.** The 0–4 anchors in the proposal are actually *better written* than the current generic None/Mild/Moderate/Severe — they are impact-anchored ("cannot be ignored, occasionally disrupts activities" … "incapacitating, constant distress"), which improves inter-rater consistency and gives the extra granularity a sensitivity tool wants. Psychometrically a 5-point ordinal is a reasonable sweet spot.

**The catch — this is an identity decision, not a cosmetic one.** The tool's "Symptom axis is validated" claim rests on the GSRS 15-item / 5-cluster *structure*. GSRS proper is a **7-point** instrument; the tool already departs from it with the 4-point scale. Moving to 5-point departs further. That is **fine** — but only if the tool is honestly positioned as a **GSRS-*derived* screening instrument requiring its own validation** (which the pilot plan already sets up), not a validated GSRS clone.

**Cost is lowest right now.** Every stored answer's meaning changes with the scale, and all band cutoffs must be re-anchored. Because the pilot has **not yet run**, there is no collected data to migrate — this is the cheapest possible moment to make the change. Waiting until after pilot data exists makes it far more expensive.

**Recommendation.** Adopt the 0–4 scale **iff** you accept re-labelling the Symptom axis from `validated: true` → `validated: 'derived'` (note text: *"GSRS-derived 5-point scale — provisional, pending pilot validation"*). If you want to preserve the strict "validated GSRS" claim, keep 0–3. → **Your call (Q1).**

### 1.2 · Severity % = Σscores / (N×max) — 🟢 ALREADY IMPLEMENTED

This *is* the current cluster-norm calculation (`sum / max`). Nothing to do beyond swapping the max from 3→4 if 1.1 is adopted.

### 1.3 · Lived Burden = Severity × (1 + w·Frequency) — 🟡 ADOPT AS 2-D, NOT MULTIPLICATIVE

**Analysis.** The insight is correct: severity alone can't distinguish "severe once a month" from "severe daily." But a *multiplicative* modifier `Severity × (1 + w·F)` can nearly **double** the score, which is a far bigger swing than the current bounded ±0.15 nudge — and it would re-introduce exactly the failure mode the engine guards against (a frequency answer alone lifting the band / flipping pattern-firing).

**Better: adopt the document's own Section-3 idea — a 2-D severity × frequency read.** Report **Symptom Severity** and **Symptom Frequency** as two separate dimensions and plot them on a 2×2 (the "High Burden / High Impact" quadrant is the urgent one). This is *more* clinically informative than one blended number, and it keeps pattern-firing on un-nudged severity where the safeguards live.

**Recommendation.** Surface frequency as its own reported axis + a 2×2 burden×frequency matrix in the clinician report. Do **not** collapse it into a single multiplicative Index. Keep the existing bounded nudge (or retire it in favour of the explicit 2-D display — cleaner). → tied to **Q2**.

### 1.4 · Rome IV Bristol-% subtyping + pain-defecation linkage — 🟢 ADOPT (highest-value accuracy win)

**Analysis.** Rome IV subtyping is defined on the **proportion** of bowel movements that are Bristol 1–2 vs 6–7 (the >25% rule), assessed over a diary. The tool currently uses a **single** Bristol observation (binary ≤2 / ≥6) and honestly flags this as a limitation. Adding "what proportion of your bowel movements are hard/lumpy (1–2)? … loose/watery (6–7)?" makes subtyping materially more faithful to Rome IV — the single biggest defensible accuracy upgrade on the table.

Pain-defecation linkage (the Rome 2-of-3: related to defecation / change in frequency / change in form) is **already** captured via `ROME_ASSOC` (`assocCount ≥ 2`). Post-infectious onset is already captured (`dys.postInfectious`). So this reduces to: **add two Bristol-proportion questions and route `romeDisplaySubtype()` through the >25% thresholds**, with the current single-Bristol read as fallback.

**Recommendation.** Adopt. Add the two proportion items (reveal-gated on bowel symptoms, so the form stays short), implement the >25% C/D/M/U logic, keep single-Bristol + cluster-norm as the graceful fallback. Retain the "single-visit estimate, not a diary diagnosis" disclaimer.

### 1.4b · "Peak Override" anti-dilution rule — 🟢 ADOPT (direct sensitivity win)

**Analysis.** This is the cleanest answer to "make it more sensitive." A patient scoring 4/Very-Severe on abdominal pain but 0 on the other three items in a 4-item cluster averages to 25% → "Mild," **masking severe pain**. The override: after computing the band, scan the raw cluster answers — if any item is at the ceiling (4), escalate the band floor to ≥Moderate and flag *that specific item* with an alert. A single 3/Severe escalates Subclinical→Mild.

This is **within-cluster** and therefore orthogonal to the existing **across-cluster** balanced mean — they compose cleanly. It changes only the *displayed band* and adds an item-level alert; it does **not** touch the raw Index feeding patterns, so the safeguard holds.

**Recommendation.** Adopt. This is exactly the "sensitive and appropriate" behaviour requested, and it's low-risk.

---

## Band cut-offs document

### 2.1 · New cutoffs 10 / 35 / 65 (vs current 20 / 40 / 60) — 🔵 PROVISIONAL EITHER WAY

Both the current and proposed cutoffs are **asserted, not data-derived** — same "provisional until pilot recalibration" status. On a 0–4 scale the response distribution shifts, so cutoffs *should* be re-anchored if 1.1 is adopted. The 10% "subclinical" floor is a reasonable addition (occasional minor symptoms shouldn't read as burdened). Recommend treating exact numbers as pilot outputs; adopt the **4-band shape with a subclinical floor** now, lock the numbers at recalibration. → tied to **Q1**.

### 2.2 · Peak override — see §1.4b (adopt).

### 2.3 · Lived-Burden 2-D plotting — see §1.3 (adopt as 2-D report widget).

---

## Document 2 — Advanced Clinical Axes

### 3.1 · Pelvic-Floor Dyssynergia (paradoxical straining) — 🟢 ADOPT (core mission)

The tool already has a `pelvic_floor` pattern (AR items) and the `gsrs_incomplete` corroborator. The **new, high-value** insight is the *paradoxical* signature that discriminates obstructed-defecation from slow-transit IBS-C: **straining / incomplete evacuation WITH normal-or-loose stool form (Bristol 3–5)**, ± digital evacuation / splinting / rectal blockage. Straining with *hard* stool is ordinary constipation; straining with *normal* stool points to dyssynergia — which needs pelvic-floor PT, **not** laxatives. This is precisely the physiotherapy use-case the tool exists to serve.

**Recommendation.** Adopt. Add a distinct **PFD probability flag** that co-flags with (and is called out separately from) IBS-C when the paradoxical combination is present. Routes to pelvic-floor PT + anorectal assessment. High value, aligns with the tool's reason for being.

### 3.2 · Functional Dyspepsia PDS vs EPS subtyping — 🟢 ADOPT (low cost)

The tool has a `functional_dyspepsia` pattern but doesn't subtype. Rome IV splits FD into **PDS** (postprandial distress — early satiety / fullness; already captured by `ug_earlysat` / `ug_fullness`) and **EPS** (epigastric pain/burning, *not* meal-locked). They dictate different management (prokinetics/meal-spacing vs acid modulation). Needs **one** new EPS discriminator item (epigastric burning that occurs when fasting).

**Recommendation.** Adopt if the UG section is retained. Add the EPS item and split the FD read into PDS/EPS.

### 3.3a · Bile-Acid Malabsorption (BAM) lens — 🟢 ADOPT (high value, underdiagnosed)

BAM is common, treatable (bile-acid sequestrants), and routinely missed for years while patients loop on low-FODMAP. Trigger: **IBS-D pattern + cholecystectomy history** (already in surgical flags) **+** (pale/greasy/hard-to-flush stool **OR** symptoms triggered by fatty meals rather than fermentable carbs). Needs 1–2 new items.

**Recommendation.** Adopt. New "BAM probability" note routing to *consider SeHCAT / bile-acid sequestrant trial*. Prevents the low-FODMAP loop — directly "more appropriate."

### 3.3b · Mast-Cell / Histamine lens — 🟡 ENHANCE EXISTING

Already partly built: `im_histamine` + `im_histamine_foods` follow-up + `inflammatory_immune`. The proposal's addition is a *distinct* histamine-reactivity read when GI symptoms co-occur with **vasomotor/allergic** signs (flushing, hives, rhinitis) **and** specifically high-histamine food triggers (aged cheese, wine, fermented) rather than general FODMAPs.

**Recommendation.** Enhance rather than add a module: surface a distinct "histamine reactivity" call-out when that combination fires. Low cost.

### 3.4 · Autonomic / Connective-Tissue (hEDS / POTS) root-cause modifier — 🟢 ADOPT (moderate-high value)

GI dysmotility secondary to hypermobility/POTS is under-recognised and reframes the entire management approach (secondary, not primary gut disease). The SY section already has `sy_orthostatic` / `sy_palpitations`. The **missing** element is **joint hypermobility** (one item, Beighton-lite: "joints bend beyond normal / dislocate/sublux easily"). When severe constipation / gastroparesis-fullness / reflux co-occurs with orthostatic intolerance OR hypermobility → *"consider autonomic / connective-tissue root cause"* (the `autonomicNote` plumbing already exists).

**Recommendation.** Adopt. One new item + one routing rule.

### 3.5 · ARFID circuit-breaker — 🟢 ADOPT (safety upgrade over the existing note)

The tool already has `restrictionScreenNote` (fires on `imp_food` + restrictive-diet history / low BMI) — but it only **notes** the risk while other triage output may still surface low-FODMAP/elimination candidacy. The proposal upgrades this to a true **circuit breaker**: when ARFID risk fires, **actively suppress** any restrictive-diet recommendation in the triage output and replace it with *"screen for disordered eating before any dietary restriction."*

**Recommendation.** Adopt the suppression logic (not just the note). This is a genuine safety guardrail — the definition of "appropriate." A dedicated instrument (SCOFF) stays out of scope; this wires suppression off data already collected + 1–2 breadth/fear items.

---

## Document 1 §5 — Red-Flag Tiered Stratification — 🟢 ADOPT

**Current**: single `anyRedFlag` boolean → *every* red flag routes to Tier 1 with identical wording.

**Analysis.** Hematemesis and "unexplained weight loss" are not the same urgency, and flattening them (a) over-triages chronic-but-stable alarms and (b) — worse for a physio audience — gives no "**this is an emergency, today**" signal for the ones that are. Stratifying into **1A Alarm (ER/immediate)** / **1B Urgent (2-week-wait)** / **2 Routine (standard referral)** matches NICE pathways and implements the plan's own deferred item (B6).

**One clinical caveat on the proposed mapping.** The document files nocturnal-waking and weight-loss under "routine." I'd push **nocturnal symptoms** and **unexplained weight loss** up to **Urgent** — nocturnal waking is a classic organic-vs-functional discriminator and weight loss is a cardinal alarm. Exact bucket assignment should be your (clinician) call. Safety rule: stratification may **add** urgency granularity but must **never downgrade** a flag below "refer."

**Recommendation.** Adopt. Add `urgency: 'emergency' | 'urgent' | 'routine'` to each `RED_FLAGS` entry, tier the banner + Tier-1 wording. You set the final per-flag mapping.

### Document 1 §4 · Dys-R weighted stratification — 🟢 ADOPT (low-risk calibration win)

**Current**: flat count — every dysbiosis signal counts as 1.

**Analysis.** Post-infectious onset and recent broad-spectrum antibiotics are far more predictive of dysbiosis than foul-smelling gas; a flat count buries that. The proposed weights (Major 2.0 / Moderate 1.0 / Minor 0.5) → tiers (High ≥3.0 / Moderate 1.5–2.5 / Low <1.5) are a clean, defensible improvement. It stays a **correlate** (not a diagnosis), just better calibrated.

**Recommendation.** Adopt. Rework `dysbiosisLens()` to return a weighted score + tier. Update the report copy from "X signals" → weighted tier. Note it still must never be called a dysbiosis *diagnosis*.

---

## The Report — remove patient version, clinician-only

**Requested and endorsed.** The report is for clinician/therapist interpretation, not patient self-management — so the plain-language `buildPatientPrint` should go.

**What this touches:**
- Remove `buildPatientPrint()`, both "🖨 Patient summary" buttons, and the `printSummary('patient')` path (collapse `printSummary` to clinician-only).
- Retire the patient-only copy maps (`PT_HEAD_DESC`, `PT_SUBTYPE_DESC`) — **but keep `ptBandBg()`**, which the clinician print's `prBandPill()` also uses.
- Remove the ~18 patient-print smoke assertions; keep/extend clinician-print coverage.

**Recommendation.** Do the report removal **as part of the report rebuild**, not as a separate step — because every adopted change above (2-D severity×frequency, PFD/BAM/autonomic/FD-subtype reads, weighted Dys-R tier, stratified red flags, peak-override alerts) needs a home in the clinician report. Removing the patient report and then immediately re-touching the clinician report in the next change would be churn. Sequence: land the engine changes → rebuild the single clinician report to surface them → delete the patient path in the same pass.

---

## Recommended build order

1. **Report consolidation groundwork** — remove patient path, confirm clinician report is the sole surface (unblocks everything else having one home).
2. **Red-flag stratification** (§5) — isolated, high value, no scoring interaction.
3. **Weighted Dys-R** (§4) — isolated calibration change.
4. **Peak-override + band shape** (§1.4b, §2.1) — sensitivity guardrail on the band layer.
5. **Rome IV Bristol-%** (§1.4) — subtyping accuracy.
6. **Advanced lenses** — PFD-paradoxical (§3.1), BAM (§3.3a), autonomic/hEDS (§3.4), FD PDS/EPS (§3.2), histamine enhance (§3.3b), ARFID circuit-breaker (§3.5).
7. **2-D severity × frequency report widget** (§1.3).
8. **[If approved] 0–4 scale migration** (§1.1) — do this *first* if adopted, since it re-anchors everything downstream; otherwise skip.

Every step ships with its smoke-test regression and a browser check, per the repo's established discipline. Nothing here blends systemic data back into the Gut Symptom Index, and nothing lets a driver/frequency answer flip pattern-firing — the two invariants the engine is built to protect.

---

## Decisions needed from you

1. **Scale**: keep 4-point (preserve "validated GSRS" claim) **or** move to 0–4 (re-label as "GSRS-derived, provisional")?
2. **Frequency**: 2-D severity×frequency report (recommended) **or** a single blended Lived-Burden number?
3. **Advanced lenses**: which to build now (PFD / BAM / autonomic-hEDS / FD-subtype / ARFID circuit-breaker)?
4. **Red-flag urgency mapping**: confirm which flags are Emergency vs Urgent vs Routine (my draft pushes nocturnal + weight-loss to Urgent).
