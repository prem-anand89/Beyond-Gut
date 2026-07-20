# Gut & Systemic Health Screen (GSHS) — Clinician Handoff Document

**Date**: July 2026  
**Version**: 1.0  
**Audience**: GPs, gastroenterologists, physiotherapists, nutritionists, allied health  
**Purpose**: Understand how the GSHS tool works, its scoring logic, pattern detection, and clinical decision-making — without reading code

---

## Section 1: Executive Summary

**What is GSHS?**  
A validated-gut-symptom + systemic-screening + pattern-detection clinical tool designed for primary-care assessment of chronic gut dysfunction in patients with concurrent systemic health concerns. It combines:
- **Validated GSRS core** (15 items, severity-only, 2-week recall)
- **Screening domains** (inflammatory, psychosocial, nutrient, functional impact)
- **Pattern detection** (12 patterns that flag clinical signals worth investigating)
- **Four-tier management routing** (Tier 1: Refer | Tier 2: Manage with specialist | Tier 3: Microbiome/lifestyle focus | Tier 4: Monitor)

**Who it's for**:  
Primary-care clinicians (GPs, internal medicine), specialist referral coordinators, and allied health (physios, nutritionists, sleep specialists) screening patients with gut + systemic symptoms.

**What it outputs**:
- **4 primary health-burden measures**: Gut Symptom Burden, Nutrient/Malabsorption Risk, Microbiome Disruption Load, Dysbiosis Correlate Load
- **3 secondary axes**: Inflammatory/Immune Burden, Psychosocial/Gut-Brain Load, Functional Impact
- **12 clinical patterns** with investigations
- **4-tier management pathway** with specific candidacy reasons
- **Patient & clinician reports** (plain-language summary + detailed findings)

**Key design philosophy**: 
- Gut Symptom Index is GSRS-core only (never blended with screening domains)
- Patterns flag signals; clinicians interpret (no diagnosis is made)
- Red flags are always asked and always escalate
- Everything else is evidence-informed screening subject to clinical judgment

---

## Section 2: How the Tool Works — The Assessment Flow

### The Seven Content Groups

Patients complete the questionnaire in a logical clinical order:

1. **Anthropometrics** (optional, 3 items): Height (cm), weight (kg), waist circumference (cm) → BMI + Waist-to-Height Ratio (WHtR) auto-calculated for nutritional and cardiometabolic context (BMI <18.5 flags malabsorption risk; WHtR ≥0.5 flags central adiposity)
2. **History** (optional, chip cards & free text): 
   - Known conditions (coeliac, IBD, IBS, SIBO, gallstones, pancreatitis/EPI, liver disease, H. pylori, PCOS, anxiety/depression, food allergy) → context for interpretation
   - Surgical history (appendix, bariatric, hysterectomy, pelvic/abdominal, hernia) → adhesion risk
   - Regular medications (with confounders: GLP-1 agonists, opioids, SSRIs, metformin, laxatives, iron, OCPs)
   - Family history (coeliac, IBD, bowel cancer)
   - Free-text "other medications" field → captures complex regimens
3. **Red Flags** (mandatory, 10 items): Always visible, never gated. Safety screen for organic pathology alarms (haematemesis, unintentional weight loss, jaundice, new bowel-habit change >45 years, fever+pain, dysphagia, etc.)
4. **Gut Symptoms** (mandatory, 15 GSRS core items + Bristol + frequency)
   - **Severity** (0–3 scale, 2-week recall): Validated GSRS, unchanged
   - **Bristol stool form** (types 1–7): Single current observation
   - **Per-cluster symptom frequency** (5 new optional rows): "Over the last 2–3 months, how many days a week do you get [Reflux/Pain/Indigestion/Diarrhoea/Constipation]?" (0–3: 1–2 days/wk → daily). Each cluster's frequency adds up to +0.15 nudge to its norm (capped total with Bristol)
5. **Lifestyle & Modifiable Drivers** (optional): Diet quality, activity level, alcohol frequency, sleep quality, PSS-4 stress (1-month recall), bowel-movement frequency (stools/week band), smoking status, caffeine intake, hydration level, microbiome exposures (antibiotics, PPI, NSAID, post-infectious onset)
6. **Systemic Features** (mandatory baseline, adaptive expansion): Inflammatory markers, brain-gut/mood, nutrient status, functional impact, psychosocial stress
7. **Adaptive Deep Dive** (optional, conditional): Revealed only when GI core triggers specialist pathways:
   - **Pelvic floor/anorectal (AR)** — reveals when: Constipation cluster ≥0.4 OR Urgency ≥2 (4 items: incontinence, straining, blockage, evacuation maneuvers)
   - **Upper-GI/dyspepsia (UG)** — reveals when: Reflux cluster ≥0.3 OR Indigestion ≥0.3 (2 items: early satiety, post-meal fullness)
   - **Autonomic/systemic (SY)** — reveals when: Fatigue ≥2 OR Brain-fog ≥2 (3 items: orthostatic dizziness, palpitations, cyclical flare with menstrual cycle [female only])

### Recall Windows (Why They Differ)

Different questions ask about different time periods because different phenomena stabilize over different windows:

| Window | Questions | Why |
|--------|-----------|-----|
| **2 weeks** | GSRS core (severity), IM, BG, NU, IMP, AR, UG, SY | Validated recall for symptom severity; recent experience |
| **2–3 months (typical pattern)** | Per-cluster symptom frequency, stress frequency | Broader window for episodic/relapsing patterns; captures true habitual pattern (one atypical week won't mislead) |
| **1 month** | PSS-4 (stress scale, validated), sleep disturbance | Validated standard for PSS-4 instrument; stress and sleep adjust slower than acute symptoms |
| **3–6 weeks** | Recent gut disruptors (antibiotics, PPI, GLP-1 start) | Acute microbiome perturbation window; recovery typically begins after 2–4 weeks |
| **12 months** | Antibiotic course frequency, chronic medication exposure | Microbiome recovery & drug washout timeline |
| **Lifetime** | Lab-confirmed deficiencies, surgical/obstetric history, family history, known conditions | Stable or historical; not time-bound; establishes baseline risk |

---

## Section 3: The Gut Symptom Index — Plain Language

### The 15 GSRS Items (Validated Core)

All items use a **0–3 severity scale** (None / Mild / Moderate / Severe). All are asked over the **past 2 weeks**. This is the validated GSRS instrument exactly as published (Svedlund et al., 1988), with no changes to wording or scale.

#### **Reflux Cluster** (2 items)
- **Heartburn**: Burning sensation rising from stomach toward chest
- **Regurgitation**: Sour or bitter fluid coming back up

#### **Pain Cluster** (3 items)
- **Abdominal pain**: Any pain or discomfort in the stomach or abdomen
- **Hunger pain**: Hollow, gnawing feeling in stomach (eases after eating)
- **Nausea**: Feeling sick or queasy

#### **Indigestion Cluster** (4 items)
- **Rumbling**: Vibrations or noises in stomach
- **Bloating**: Swollen, tight, or full feeling in abdomen
- **Burping**: Bringing up air to relieve pressure
- **Gas/Wind**: Needing to pass wind frequently

#### **Diarrhoea Cluster** (3 items)
- **Diarrhoea**: Passing stools more often than is normal for you
- **Loose stools**: Soft, sloppy, or liquid stools
- **Urgency**: Sudden urgent need to pass stool with little warning

#### **Constipation Cluster** (3 items)
- **Constipation**: Passing stools less often than is normal for you
- **Hard stools**: Hard stools that are difficult to pass
- **Incomplete evacuation**: Feeling like bowel isn't completely empty after passing stool

### How the Index Is Calculated

**Step 1: Cluster norms (severity)** — Each cluster scored as a balanced mean (0–1 scale)
```
Reflux norm = mean(heartburn, regurgitation)
Pain norm = mean(pain, hunger, nausea)
Indigestion norm = mean(bloating, gas, burping, rumbling)
Diarrhoea norm = mean(loose stools, diarrhoea, urgency)
Constipation norm = mean(constipation, hard stools, incomplete evacuation)
```

**Why cluster-balanced (not item-summed)?** Clusters have different item counts (Reflux: 2, Indigestion: 4). If we summed raw items, a patient with severe Indigestion alone would score higher than one with identical per-symptom severity in Reflux, purely from item count. Cluster norms (mean per cluster) prevent this bias — each cluster contributes equally regardless of size.

**Step 2: Bristol stool-form nudge** (optional, augments but never replaces)
Abnormal stool form (Bristol type 1–2: hard, or type 6–7: loose/liquid) slightly lifts the Constipation or Diarrhoea cluster norm:
- Bristol 1–2 adds up to +0.15 to Constipation norm
- Bristol 6–7 adds up to +0.15 to Diarrhoea norm
- Captures the transit-quality signal not fully reflected in the "passing stool" item alone
- Capped so Bristol alone cannot move someone from Minimal to higher band

**Step 3: Per-cluster symptom-frequency nudge** (optional, 2–3 month recall)
"How many days a week" each cluster's symptoms occur (separate window from the 2-week severity scale) adds up to +0.15 per cluster:
- Frequency 0–1 (1–2 days/wk) = +0.0
- Frequency 1–2 (3–4 days/wk) = +0.05
- Frequency 2–3 (5–6 days/wk) = +0.10
- Frequency 3 (daily) = +0.15
- Combined Bristol + frequency per cluster capped at +0.15 total (so both can contribute but don't double)

**Why separate recall windows?** Severity is validated to 2 weeks (recent acute experience). Frequency needs 2–3 months to capture the true habitual pattern — a patient in a good fortnight might under-report their real typical burden if asked only about the past 2 weeks.

**Step 4: Final Index**
```
Gut Symptom Index = mean(Reflux nudged, Pain, Indigestion, Diarrhoea nudged, Constipation nudged) × 100
= 0–100 scale
```

**Worked Example:**
- Severity answers: Reflux 1/3, Pain 2/3, Indigestion 1/3, Diarrhoea 0/3, Constipation 2/3 → clusters [0.33, 0.67, 0.25, 0.0, 0.67]
- Bristol type: 2 (hard) → +0.15 to Constipation → Constipation becomes 0.67 + 0.15 capped = 0.82
- Frequency: Constipation 3 (daily) → would add +0.15, but already capped at 0.15 by Bristol, so no additional nudge
- Final: [0.33, 0.67, 0.25, 0.0, 0.82] → mean 0.41 → **41%** → **Mild–Moderate band** (nudged slightly higher by Bristol + frequency signal, reflecting true habitual constipation burden)

### The Four Bands (Clinical Severity)

| Band | Index Range | Hex Color | Interpretation | Typical Action |
|------|-------------|-----------|-----------------|----------------|
| **Minimal** | 0–20% | Green | Minimal burden; normal variation | Reassure; monitor |
| **Mild–Moderate** | 20–40% | Tan | Worth discussing; typical IBS presentation | Primary-care management + dietitian |
| **Significant** | 40–60% | Orange | Significant burden; higher confidence in signal | Specialist input + investigations |
| **Severe** | 60–100% | Red | High burden; safety + symptom severity both matter | Urgent referral + comprehensive workup |

**Validation status**: "GSRS-based (modified 4-point scale); index includes stool-form/frequency adjustments — provisional"

What this means:
- The 15-item GSRS core IS validated
- The 4-point modification (changing from 7-point to 0–3 severity-only) is emerging
- The Bristol + frequency nudges are evidence-informed but awaiting pilot recalibration
- **Use as a screening-level severity measure**, not a diagnostic cutoff

---

## Section 4: The 12 Patterns — What They Detect & Why

Patterns are clinical signals detected from cluster norms, item answers, and patient history. Each pattern suggests a specific clinical pathway worth investigating. **Patterns do not diagnose; they flag hypotheses.**

### The 12 Patterns — Quick Reference

| # | Pattern | Axis | Fires When (Plain English) | Typical Tier | Key Investigations |
|---|---------|------|-------------------------|--------------|-------------------|
| 1 | Constipation-Dominant (IBS-C) | Symptom | Rome criteria met + Constipation ≥0.3 > Diarrhoea | 2 | Thyroid, calcium, pelvic-floor assessment, fibre trial, rule slow-transit if severe |
| 2 | Diarrhoea-Dominant (IBS-D) | Symptom | Rome criteria met + Diarrhoea ≥0.3 > Constipation | 2 | Stool calprotectin, PCR, coeliac, FIT, SeHCAT or low-FODMAP trial |
| 3 | Mixed/Alternating Bowel | Symptom | Rome criteria met + both Constipation ≥0.3 AND Diarrhoea ≥0.3 | 2 | Low-FODMAP, pelvic-floor assessment, gut-brain screening, treat worst complaint first |
| 4 | Reflux/Upper-GI | Symptom | Reflux cluster ≥0.4 OR heartburn ≥2 | 2–3 | PPI trial, H. pylori if not done, GI referral if refractory, NSAID/alcohol/caffeine review |
| 5 | Upper-GI Dyspepsia | Symptom | Early satiety ≥2 OR post-meal fullness ≥2 | 2–3 | H. pylori test, PPI trial, meal pattern/caffeine review, rule out delayed gastric emptying |
| 6 | Bloating/Fermentation | Symptom | Indigestion cluster ≥0.5 OR gas/foul smelling ≥2 OR ≥2 fermentable-food triggers | 2–3 | SIBO breath test, low-FODMAP dietitian trial, fibre adjustment, stool microbiota if indicated |
| 7 | Nutrient Malabsorption | Nutrient | Lab-confirmed deficiency documented, OR BMI <18.5, OR EPI/bariatric surgery, OR ≥2 of [hair loss, anaemia signs, mouth changes] + GI ≥0.2 | 1–2 | FBC, iron, B12, folate, 25-OH D, Mg; coeliac; faecal elastase; calorie count if underweight |
| 8 | Gut-Brain Axis | Psychosocial | GI ≥0.2 AND (PSS-4 ≥50 OR anxiety ≥2 OR mood ≥2 OR brain-fog ≥2 OR fatigue ≥2) | 2–3 | PHQ-9/GAD-7 screen; gut-directed hypnotherapy or CBT referral; stress management |
| 9 | Inflammatory/Immune | Inflammatory | GI ≥0.2 AND ≥1 of [diagnosed IA condition, IM axis ≥0.4, histamine pattern, skin/joint involvement] | 2–3 | Coeliac serology; structured elimination trial; low-histamine diet trial; stool PCR if indicated |
| 10 | Recent Gut Disruptor | Microbiome | GI ≥0.2 AND (antibiotic course in last 12mo, OR current PPI/NSAID, OR microbiome-altering surgery) | 3 | Stool PCR if post-abx; C. difficile PCR if abx in past 3 months; probiotic trial; microbiome-supporting lifestyle |
| 11 | Pelvic-Floor/Anorectal | Pelvic | Urge incontinence ≥2 OR passive incontinence ≥2 OR (straining ≥2 AND [blockage ≥2 OR maneuvers ≥1]) | 2 | Anorectal/pelvic-floor exam; defecation diary; pelvic-floor physio referral; dyssynergic-defecation screening |
| 12 | Lifestyle-Driven Modifiable | Action | ≥2 of [high-burden diet, high alcohol frequency, low activity level] with GI present | 3 | Dietitian referral; exercise prescription (tailored to IBS subtype); sleep/stress optimisation |

### Adaptive Reveal Logic — When Specialist Questions Appear

The tool learns as it goes: new specialist question groups reveal only when the GI core answers suggest they're relevant. This keeps the form short for simple cases while deepening exactly where needed.

**Pelvic-Floor/Anorectal (AR) Section reveals when**:
- Constipation cluster ≥0.4 (significant constipation signal) OR
- Urgency item ≥2 (moderate-to-severe urgency) OR
- Pelvic-risk flag present (obstetric history, endometriosis, prior pelvic/hernia surgery)

**4 items appear**: Urge incontinence, passive incontinence, straining, blockage/evacuation maneuvers

**Upper-GI/Dyspepsia (UG) Section reveals when**:
- Reflux cluster ≥0.3 (any reflux signal) OR
- Indigestion cluster ≥0.3 (any bloating/gas signal)

**2 items appear**: Early satiety ("feel full too quickly"), post-meal fullness ("uncomfortable fullness after normal meals")

**Autonomic/Systemic (SY) Section reveals when**:
- Fatigue ≥2 OR
- Brain-fog ≥2 OR
- Abdominal pain ≥2 AND menstrual cycle present (female)

**3 items appear**: Orthostatic dizziness, palpitations, cyclical symptom flare with menstrual cycle (female-gated)

**Manual override**: "Show all specialist questions" button allows clinicians to force-reveal everything regardless of GI triggers, useful if screening broadly or reviewing across multiple visits.

---

### Deep Dive: Three Key Patterns

#### **1. Nutrient Malabsorption** (Highest Clinical Impact)

**Unique firing rule**: Fires independently on objective risk factors without requiring concurrent high GI burden.

**Fires when ANY of**:
- Lab-confirmed deficiency (B12, iron, vitamin D, magnesium) documented
- BMI <18.5 (low BMI with anthropometric data present)
- Diagnosed EPI (exocrine pancreatic insufficiency) or bariatric surgery history
- **OR** when ≥2 of these clinical signs + GI burden ≥0.2:
  - Hair thinning/loss
  - Iron-responsive anaemia / pallor / dyspnoea on exertion
  - Mouth changes (angular cheilitis, glossitis, easy bruising)

**Clinical meaning**: Absorption is at risk; nutritional investigation is warranted even if current gut symptoms are mild or absent.

**Investigations**: FBC (anaemia), iron studies, serum B12, folate, 25-OH vitamin D, magnesium, faecal elastase (if EPI suspected), coeliac serology

**Why this matters**: Catches unexplained deficiency or surgery-related malabsorption risk early. A patient with mild IBS-type bloating but documented low ferritin + low BMI gets Tier 1–2 urgency for workup, not dismissed as "just functional."

---

#### **2. Pelvic-Floor / Anorectal Dysfunction** (Physio-Relevant)

**Fires when ANY of**:
- Urge incontinence ≥2 (sudden need to pass stool, leaks on way)
- Passive incontinence ≥2 (leakage without warning)
- Flatus incontinence ≥2 (trouble controlling gas)

**OR when BOTH**:
- Straining to pass stool ≥2 AND
- Blockage sensation ≥2 OR manual maneuvers (pressing around/below back passage) ≥1

**Clinical meaning**: Pelvic-floor dysfunction or dyssynergic defecation; pelvic-floor physiotherapy is indicated.

**Investigations**: Anorectal/pelvic-floor examination (tone, coordination, proprioception), pelvic-floor physiotherapy referral, bowel/defecation diary

**Why this matters to physiotherapists**: The AR adaptive section reveals only when this signal is present, so physios see patients who need them (not cluttering the form with irrelevant questions for pain-only patients).

---

#### **3. Gut-Brain Axis** (Psychosocial + GI)

**Fires when**:
- GI burden ≥0.25 (any cluster shows signal) AND
- At least one psychosocial factor:
  - High psychological load (stress score ≥50, anxiety ≥2, mood ≥2)
  - Brain fog ≥2
  - Unrefreshing fatigue ≥2

**Clinical meaning**: GI and psychological burden are concurrent; both may be driving the presentation. Mind-body intervention (stress reduction, hypnotherapy, CBT) + standard gut management.

**Investigations**: PHQ-9 or GAD-7 if PSS-4 ≥10, gut-directed hypnotherapy or CBT referral

**Why this matters**: Identifies patients who won't improve with gut-only management; stress/anxiety is a modifiable driver.

---

#### **4. Pelvic-Floor / Anorectal Dysfunction** (Physio-Relevant)

**Fires when ANY of**:
- Urge incontinence ≥2 (sudden need to pass stool, leaks on the way)
- Passive incontinence ≥2 (leakage without warning)

**OR when BOTH**:
- Straining to pass stool ≥2 AND (blockage sensation ≥2 OR manual maneuvers ≥1)

**Clinical meaning**: Pelvic-floor dysfunction (weak tone, poor coordination) or dyssynergic defecation (paradoxical contraction); pelvic-floor physiotherapy assessment is indicated.

**Investigations**: Pelvic-floor examination (tone, coordination, proprioception), anorectal exam, defecation diary, pelvic-floor physiotherapy referral

**Why this matters to physiotherapists**: One of the highest-value referral signals the tool produces. Identifies patients who need pelvic-floor assessment without being lost in a long general questionnaire.

---

#### **5. Functional Dyspepsia** (Upper-GI-Specific)

**Fires when**:
- Early satiety ≥2 ("feel very full very quickly when eating") OR
- Post-meal fullness ≥2 ("uncomfortable fullness after normal-sized meals")

**Clinical meaning**: Upper-GI motor/sensory dysfunction (delayed gastric emptying, visceral hypersensitivity) rather than acid-driven reflux; H. pylori exclusion and PPI trial may help, but underlying dysfunction warrants assessment.

**Investigations**: H. pylori serology (if not done); PPI trial 4–8 weeks; assess meal patterns, caffeine, alcohol as triggers; gastric emptying study if severe/refractory

**Why this matters**: Dyspepsia often buried under "IBS" diagnosis; explicit pattern firing ensures dyspepsia-specific workup (H. pylori, PPI effectiveness) is considered.

---

## Section 5: Rome IV IBS Subtyping

### Rome IV Diagnostic Criteria (2016)

Functional bowel disorder diagnosis requires **ALL three** of these:

1. **Abdominal pain frequency**: ≥ 1 day per week, on average
2. **Symptom onset chronicity**: ≥ 6 months before assessment
3. **Pain association with bowel symptoms**: ≥ 2 of the following:
   - Related to defecation (better/worse after)
   - Associated with a change in stool frequency
   - Associated with a change in stool form/appearance

**Note**: Rome IV is validated on prospective **7-day symptom diaries**. Our tool is a single-snapshot screening assessment, so the classification is a **screening-level guide, not a formal Rome IV diagnosis**.

### IBS Subtype Classification

**How we determine subtype**:

1. **Primary input: Stool consistency** (Bristol stool form, types 1–7)
   - Types 1–2 (hard/lumpy) → **IBS-C**
   - Types 6–7 (loose/liquid) → **IBS-D**
   - Types 3–5 (indeterminate) or unanswered → fall back to cluster norms

2. **Fallback: Cluster norms** (if Bristol unanswered or indeterminate)
   - Constipation cluster > Diarrhoea cluster → **IBS-C**
   - Diarrhoea cluster > Constipation cluster → **IBS-D**
   - Both ≥0.3 → **IBS-M** (mixed)
   - Neither ≥0.3 → **IBS-U** (unclassified)

**Subtype-specific investigations** (once IBS criteria met):

| Subtype | Primary Concern | Investigations |
|---------|-----------------|-----------------|
| **IBS-C** | Slow transit, outlet dysfunction, fibre-responsive | Thyroid (TSH), calcium, pelvic-floor assessment, trial high-fibre/psyllium |
| **IBS-D** | Organic diarrhoea, bile-acid malabsorption, post-infectious | Stool calprotectin, stool PCR, coeliac serology, FIT, empirical SeHCAT or low-FODMAP trial |
| **IBS-M** | More complex; treat worst complaint first | Low-FODMAP first, then tailor. Psychological assessment (stress may worsen alternation) |
| **IBS-U** | Indeterminate; watchful waiting | Detailed history (stool diary 2 weeks), trial dietary modification |

---

## Section 6: The Clinical Tiers — Routing to Action

The triage engine maps safety flags + burden + patterns onto a single recommended tier. Tiers are not absolute but reflect **evidence-informed routing priorities**.

### Tier 1: Refer for Clinical Assessment (Safety Priority)

**Fires when**:
- ANY red flag answered "Yes" (haematemesis, jaundice, fever+pain, unintentional weight loss, dysphagia, etc.)
- **OR** Severe GI symptom burden (Index ≥60%)
- **OR** Lab-confirmed nutrient deficiency documented

**Example scenarios**:
- Patient reports rectal bleeding + weight loss 10% over 6 months → Tier 1 (organic exclusion must happen first)
- Gut Symptom Index 72% (Severe) → Tier 1 (symptom severity itself warrants urgent assessment)
- Lab shows ferritin 8 (deficient) + IBS-type symptoms → Tier 1 (malabsorption workup before symptom management)

**Action**: Refer urgently (same day to next week, depending on red flag severity). Do not start symptom management without safety clearance.

**Patient-facing wording**: "Your responses suggest symptoms that need urgent medical assessment to rule out other conditions. Please contact your doctor or emergency department immediately if you experience [specific red flags]."

---

### Tier 2: Clinician-Led Management (Moderate–High Burden + Pattern)

**Fires when**:
- Significant gut symptom burden (40–60%) **OR** a major pattern fired
- Major patterns that reach Tier 2:
  - Constipation-dominant (IBS-C) — slow transit confirmed
  - Mixed/alternating bowel pattern — complex phenotype
  - Reflux/upper-GI pattern — acid-responsive likely
  - Diarrhoea-dominant (IBS-D) — requires organic exclusion first
  - Pelvic-floor/anorectal dysfunction — physio assessment needed
  - Functional dyspepsia — H. pylori, PPI trial
  - Inflammatory/immune pattern (≥3 corroborating signals) — immune-driven screening
  - Gut-brain pattern — stress/mood is a driver
- High functional impact (IMP axis ≥Significant/Severe) even if symptom burden modest
- Rome IV criteria met (IBS subtype confirmed)
- Prominent abdominal pain (Pain cluster ≥0.5) OR prior abdominal/pelvic surgery

**Example scenarios**:
- IBS-D criteria met (Rome + Bristol 7 + diarrhoea cluster 0.6) → Tier 2 (stool calprotectin, coeliac, FIT to exclude organic)
- Constipation-dominant + low BMI + hair loss + iron anaemia → Tier 2 nutrient-malabsorption pattern (iron studies, B12, D, coeliac)
- High stress (PSS-4 45) + mild diarrhoea (Index 28%) but can't work 3 days/week → Tier 2 impact escalation (functional impact overrides mild burden)

**Action**: Manage in primary care with specialist input. Order pattern-specific investigations. Consider dietitian, physio, or mental-health referral if pattern-indicated.

**Patient-facing wording**: "Your responses suggest a pattern that benefits from professional assessment and targeted management. Your doctor will discuss [specific investigations/referrals]."

---

### Tier 3: Microbiome/Lifestyle Focus (Screening-Level Concern)

**Fires when**:
- Recent gut disruptor exposure (strongest probiotic rationale)
  - Antibiotic course in past 12 months
  - Current/recent PPI, NSAID, acid-blocker use
  - Microbiome-altering surgery
- **OR** Bloating/fermentation pattern detected
- **OR** ≥2 dysbiosis-correlate signals present
  - Post-infectious onset
  - ≥2 fermentable food triggers
  - Foul/excess gas
  - Fibre paradox (worse with fibre)
  - High stool variability
- Inflammatory pattern (≥1 but <3 corroborating signals) — lower specificity

**Example scenarios**:
- Completed 5-day antibiotic course 3 weeks ago, now bloated + loose stools → Tier 3 (post-disruptor exposure + bloating pattern; probiotic rationale clear)
- ≥2 of [post-infectious, FODMAP-sensitive, foul gas, fibre paradox] → Tier 3 dysbiosis-signal load (try low-FODMAP, consider SIBO testing)
- High IM axis (≥0.4) but only one corroborating signal → Tier 3 (screen for immune-driven symptoms; not yet Tier 2 confidence)

**Action**: Primary-care management. Probiotics, low-FODMAP dietitian trial, microbiome-supporting lifestyle (sleep, stress, activity). Consider specialist investigation only if symptoms worsen.

**Patient-facing wording**: "Your symptoms suggest patterns that often respond well to lifestyle changes, dietary modification, and microbiome-supporting strategies. Your doctor will discuss options."

---

### Tier 4: Self-Management & Monitoring (Minimal Burden)

**Fires when**:
- Modifiable lifestyle factors are the main lever
- Minimal symptom burden (Index <20%)
- No red flags, no high-confidence patterns, low functional impact

**Example scenarios**:
- Index 12% (Minimal), no patterns fired, patient reports "occasional bloating" + sedentary lifestyle → Tier 4 (reassure; encourage activity + fibre + hydration)
- Gut Symptom Index 18%, mild stress (PSS-4 15), good sleep, no medical history → Tier 4 (monitor; no intervention needed)

**Action**: Reassure patient. Empower self-management (diet, activity, stress, sleep). Offer educational resources. Arrange follow-up visit in 3–6 months to monitor; escalate if symptoms worsen.

**Patient-facing wording**: "Your responses suggest your symptoms are mild and well-managed with lifestyle strategies. Your doctor will discuss next steps and when to follow up."

---

### Tier-1 Safety Edge Case: Patient Safety Overrides

**When to override Tier-1/2/3 and refer immediately**:
- Objective findings (imaging, labs, endoscopy) contradict tool output
- Unexplained weight loss + negative workup (still refer; persistent alarm warrants higher-level assessment)
- Functional impairment severe despite low tool burden (e.g., housebound with "mild" symptoms → refer)
- Clinical judgment + context (recent bereavement, new medication, infection) better explains findings than chronic functional disorder

---

## Section 7: Four Headline Outputs + Three Secondary Axes

### The Four Primary GSHS Outputs (Patient Summary Card)

These are the first things clinicians and patients see:

| Output | Engine Source | Meaning | Validated? | Use |
|--------|---------------|---------|-----------|-----|
| **Gut Symptom Burden** | Symptom axis (GSRS-only Index) | How heavy the gut symptoms feel overall, based on validated questionnaire | ✅ YES | Primary severity measure; drives most patterns & urgency |
| **Nutrient & Malabsorption Risk** | Nutrient axis (NU) | Estimated risk that gut/other factors are affecting nutrient absorption | ⚠️ Draft (screening-level) | Supplementation intensity; deficiency risk; malabsorption workup |
| **Microbiome Disruption Load** | Disruption half of Dys-R lens | Medications/history that can alter gut bacterial balance (recent abx, PPI, NSAID, microbiome-altering surgery) | ⚠️ Correlate | Probiotic/restoration rationale; microbiome-supporting lifestyle focus |
| **Dysbiosis Correlate Load** | Correlate half of Dys-R lens | Symptom patterns associated with dysbiosis risk (post-infectious, food triggers, foul gas, stool variability, fibre paradox) | ⚠️ Correlate | SIBO testing candidacy; low-FODMAP trial; stool microbiota testing if indicated |

**Secondary axes** (displayed on-screen but grouped separately):
- **Inflammatory/Immune Burden**: Immune-driven screening signal
- **Psychosocial/Gut-Brain Load**: Stress, mood, anxiety, fatigue, brain-fog
- **Functional Impact (QOL)**: Work, social, diet, life interference

### Six Clinical Axes (Behind the Scenes)

Each axis measures a distinct health domain and is scored independently. A patient can have low Gut Symptom Burden but high Psychosocial Load; both are actionable.

| Axis | Measures | Sample Items | Validated? | Scale | Clinical Use |
|------|----------|--------------|-----------|-------|--------------|
| **Symptom (Gut)** | GSRS-core severity (0–3) + per-cluster frequency (days/wk) | 15 GSRS items (Reflux, Pain, Indigestion, Diarrhoea, Constipation) + per-cluster frequency (2–3 mo) | ✅ YES (GSRS validated; frequency nudge emerging) | 0–100% (Minimal → Severe) | Primary severity measure; Gut Symptom Burden headline; drives most patterns & urgency |
| **Inflammatory** | Immune markers (food reactions, histamine, skin/joint) + known IA conditions | Food-digestive reactions, histamine reactions, skin rash, joint aches, diagnosed IA condition | ⚠️ Draft (screening-level) | 0–100% (Minimal → Severe) | Identifies immune-driven candidates; screens for elimination diet; drives coeliac workup |
| **Nutrient** | Malabsorption proxies + lab-confirmed deficiency | Hair loss, anaemia signs (pallor, SOB), mouth changes (cheilitis), known deficiency (B12/iron/D/Mg) | ⚠️ Draft (screening-level) | 0–100% | Flags absorption risk; drives supplementation intensity; independent Tier escalator |
| **Psychosocial** | Stress (PSS-4), anxiety, mood, fatigue, brain-fog | PSS-4 (4-item validated stress scale), anxiety, mood, fatigue, brain-fog items | ⚠️ PARTIAL (PSS-4 validated, others draft) | 0–100% | Identifies gut-brain candidates; stress a modifiable driver; gut-directed hypnotherapy/CBT candidacy |
| **Impact (QOL)** | Functional burden on work, social, diet, overall life | Work interference, social/family interference, food avoidance/restriction, overall quality of life | ⚠️ Draft (screening-level, new) | 0–100% (Minimal → Severe) | Independent Tier-2 escalator (high impact even with mild symptoms); outcome measure for treatment efficacy |
| **Pelvic** | Anorectal control & evacuation function | Urge/passive/flatus incontinence, straining, blockage sensation, manual evacuation maneuvers | ⚠️ Draft (emerging, adaptive section) | Presence/Significant | Physio assessment driver; screens for pelvic-floor dysfunction & dyssynergic defecation |
| **Autonomic** | Orthostatic & cardiac symptoms | Dizziness on standing, palpitations/racing heart, cyclical menstrual flare (female) | ⚠️ Draft (emerging, adaptive section) | Presence/Significant | Co-management signal; identifies sympathetic dysregulation/visceral hypersensitivity; stress-reduction candidacy |

### Interpretation Principle

Axes are read as a **multi-dimensional profile**, not a single "gut health score." Example:

```
Patient A: Gut 35% (Mild–Moderate), Inflammatory 45% (Significant), Psychosocial 20% (Minimal)
→ Moderate gut + immune-driven inflammation + low stress 
→ Consider: Coeliac screen, immune-protocol trial, low-FODMAP

Patient B: Gut 35% (Mild–Moderate), Inflammatory 20% (Minimal), Psychosocial 65% (Severe)
→ Mild gut + minimal inflammation + high stress
→ Consider: Stress-management first (may resolve gut symptoms), gut-directed hypnotherapy
```

---

## Section 8: Safety Guardrails & Design Decisions

### Why the Tool Is Built This Way (Clinical Safety)

**1. Red flags are always asked, never gated**  
Red flags appear before results and are never hidden behind other questions. A clinician always knows if a patient reported alarm features, ensuring safety screening happens regardless of how long the questionnaire takes.

**2. Gut Symptom Index is GSRS-core only**  
The Index (0–100) never includes stress, sleep, or other systemic domains. This prevents "background psychosocial burden + mild GI = falsely elevated severity." Axes are read independently.

**3. Patterns don't diagnose**  
Tool outputs "pattern consistent with IBS-D criteria" or "nutrient-malabsorption signal detected," not "IBS-D diagnosis." Interpretation is the clinician's responsibility. No diagnostic label is made.

**4. Pattern confidence is clinician-only**  
Patients see "Pelvic-floor dysfunction pattern noted," clinicians see "Confidence: Moderate (4 of 6 signals answered)." Confidence describes data completeness, not clinical certainty. Clinician applies judgment.

**5. Triage notes don't automatically escalate tiers**  
Most safety insights (e.g., "endometriosis → pelvic adhesion risk," "cyclical pain + menstrual cycle → gynaecological overlap") are delivered as **clinician notes**, not as automatic tier escalations. This keeps the Tier focused on urgency while still surfacing context.

**6. Applicability flags inform but don't suppress advice**  
"Pregnant" or "under-18" flags are displayed with a caveat. Clinician decides if standard advice applies (e.g., a pregnant patient with unexplained weight loss still gets referred, despite the flag).

**7. One visit ≠ chronic Rome IV diagnosis**  
Rome IV was validated on prospective diaries; a single tool snapshot gives a screening-level IBS subtype, not a formal diagnosis. Requires clinical correlation.

---

## Section 9: Questionnaire Map — Every Question's Purpose

### Core Questions (Always Scored)

| Question | Section | Measures | Feeds To | Recall | Role |
|----------|---------|----------|----------|--------|------|
| gsrs_pain, gsrs_hunger, gsrs_nausea | GI core | Pain cluster (3 items) | Index + Pain cluster + Rome pain criterion + gut-brain pattern | 2 weeks | Validated GSRS |
| gsrs_heartburn, gsrs_regurg | GI core | Reflux cluster (2 items) | Index + Reflux cluster + reflux pattern + UG reveal trigger | 2 weeks | Validated GSRS |
| gsrs_bloating, gsrs_gas, gsrs_burp, gsrs_rumble | GI core | Indigestion cluster (4 items) | Index + Indigestion cluster + bloating/fermentation pattern + UG reveal trigger | 2 weeks | Validated GSRS |
| gsrs_diarr, gsrs_loose, gsrs_urgency | GI core | Diarrhoea cluster (3 items) | Index + Diarrhoea cluster + IBS-D pattern + AR reveal trigger | 2 weeks | Validated GSRS |
| gsrs_constip, gsrs_hard, gsrs_incomplete | GI core | Constipation cluster (3 items) | Index + Constipation cluster + IBS-C pattern + AR reveal trigger + pelvic-floor pattern | 2 weeks | Validated GSRS |
| bristol | Driver | Stool form type 1–7 (current observation) | IBS subtype primary input, Constipation/Diarrhoea nudge | Single visit | Non-scored driver |
| clusterFreq_[cluster] (5 rows) | GI section | Per-cluster symptom frequency (days/week, 2–3 mo) | Index cluster nudge (up to +0.15 per cluster, capped with Bristol) | 2–3 months | Optional frequency nudge |

### Systemic & Impact (Always Scored)

| Question | Section | Measures | Feeds To | Recall | Role |
|----------|---------|----------|----------|--------|------|
| im_food_react | IM section | Digestive food reactions (GI, not vasomotor) | IM axis + bloating/fermentation pattern | 2 weeks | Screening item |
| im_histamine | IM section | Histamine reactions (flushing, hives, food-triggered) | IM axis + inflammatory pattern + low-histamine diet signal | 2 weeks | Screening item |
| im_skin, im_joint | IM section | Skin/joint involvement | IM axis + inflammatory pattern | 2 weeks | Screening item |
| bg_anxiety, bg_mood, bg_brainfog, bg_fatigue | BG section | Psychological & autonomic burden (4 items) | Psychosocial axis + gut-brain pattern, SY reveal trigger | 2 weeks | Screening items (never Index) |
| nu_hairloss, nu_pallor, nu_mouth | NU section | Malabsorption proxy signs (3 items) | NU axis + nutrient-malabsorption pattern | 2 weeks | Screening items |
| nu_known_def, nu_known_def_which (free-text follow-up) | NU section | Lab-confirmed deficiency + which type | NU axis + nutrient-malabsorption pattern (fires independently on deficiency alone) | Lifetime | Lab-anchored anchor |
| imp_work, imp_social, imp_global, imp_food | IMP section | Functional impact on work, social, diet, overall life | Impact axis + Tier-2 escalation | 2 weeks | Functional outcome |
| pss4_items (4-item Perceived Stress Scale) | Driver | Stress, worry, loss of control, overwhelm | Psychosocial axis + gut-brain pattern (never Index) | 1 month | Validated driver measure |

### Adaptive Sections (Conditional Reveal, Scored When Answered)

| Question | Section | Reveals When | Measures | Feeds To | Recall | Role |
|----------|---------|--------------|----------|----------|--------|------|
| ar_incont_urge, ar_incont_passive, ar_incont_flatus | AR (adaptive) | Constipation ≥0.4 OR urgency ≥2 OR pelvic-risk flag | Urge/passive/flatus incontinence (3 items) | Pelvic-floor pattern + pelvic-floor physio Tier-2 | 2 weeks | Screening items |
| ar_straining, ar_blockage, ar_maneuvers | AR (adaptive) | Same as above | Straining, blockage sensation, digital maneuvers | Pelvic-floor pattern | 2 weeks | Screening items |
| ug_earlysat, ug_fullness | UG (adaptive) | Reflux ≥0.3 OR Indigestion ≥0.3 | Early satiety, post-meal fullness | Functional dyspepsia pattern + upper-GI workup | 2 weeks | Screening items |
| sy_orthostatic, sy_palpitations | SY (adaptive) | Fatigue ≥2 OR brain-fog ≥2 | Orthostatic dizziness, heart racing | Autonomic/systemic signal + co-management note | 2 weeks | Screening items |
| gy_cyclical | SY (adaptive) | Pain ≥2 OR bloating ≥2 (female only) | Menstrual-cycle flare | Gynaecological/hormonal note + cycle-tracking suggestion | 2 weeks | Screening item |

### History & Context (Never Scored, Clinician & Triage Notes Only)

| Item | Stored As | Measures | Feeds To | Role |
|------|-----------|----------|----------|------|
| Height (cm), Weight (kg), Waist (cm) | extras.anthro | BMI, Waist-to-Height Ratio | Triage anthropometric note (BMI <18.5, WHtR ≥0.5) | Optional driver |
| Known conditions (chips: coeliac, IBD, IBS, SIBO, etc.) | extras.conditions | Diagnostic history | Triage condition guidance + NU/IM axes context | Context |
| Surgeries (appendix, bariatric, hysterectomy, pelvic, hernia) | extras.surgeries | Surgical history & adhesion risk | Pelvic-risk flag + nutrient-malabsorption pattern (EPI, bariatric) | Context |
| Regular medications + confounders | extras.meds, extras.medsConfounders | Drug-GI interactions | Triage medication note (GLP-1, opioids, SSRIs) | Context |
| Other medications (free-text) | extras.medsOther | Unlisted complex regimens | Clinician report only | Documentation |
| Family history (chips: coeliac, IBD, cancer) | extras.familyHistory | Family risk | Triage family note (coeliac serology reminder) + CRC screening candidacy | Context |
| Treatments already tried (chips + free-text) | extras.treatmentsTried | Management history | Triage treatment note (avoid re-suggesting failed tx) + clinician context | Documentation |
| Smoking, caffeine, hydration, bowel frequency | extras.smoking, caffeine, hydration, bowelFreq | Lifestyle factors | Triage lifestyle notes + modifiable-driver card | Non-scored drivers |
| Bowel movement frequency (stools/week) | extras.bowelFreq | Motility baseline | Displayed in modifiable-factors card (Rome IV context) | Non-scored |
| Microbiome disruptors (antibiotics, PPI, NSAID, post-infectious) | extras.dys | Exposure history | Disruption Load + Recent Gut Disruptor pattern | Non-scored |
| Symptom onset/duration (5 bands: <3mo to >3yr) | answers.sx_duration | Chronicity | Triage urgency + Rome IV onset fallback (if Rome pain unanswered) | Non-scored |

---

## Section 10: Specialty-Specific Quick Guides

### For General Practitioners

**Your workflow**:
1. Check **red flags first** — If any "Yes," refer urgently before reviewing other results
2. Look at **Gut Symptom Burden** — Is it Minimal/Mild–Moderate (manage in primary care) or Significant/Severe (refer)?
3. Check **top 3–4 patterns** — Which fired? What investigations do they suggest?
4. Consult the **triage Tier** — Tier 1: refer; Tier 2: manage + specialist input; Tier 3–4: lifestyle/monitoring

**Quick decision tree**:
```
Any red flag? → YES → Refer urgently
             → NO → Check Index
             
Index ≥60%? → YES → Tier 1 (refer)
            → NO → Check patterns
            
Major pattern (constipation/diarrhoea/reflux/malabsorption)? 
            → YES → Tier 2 (manage + dietitian/GI referral per pattern)
            → NO → Check Tier → Route accordingly
```

**Key insights for GPs**:
- Nutrient malabsorption can fire even with mild gut symptoms if deficiency documented or BMI <18.5 (don't dismiss as "just functional")
- IMP (functional impact) axis can push Tier 2 even if Index is moderate (high impact = refer)
- Pelvic-floor pattern = physio referral, not just constipation management
- Psychosocial burden warrants stress-management + gut work (not gut-only)

---

### For Gastroenterologists

**Your focus**:
1. **IBS subtyping** — Use Rome IV criteria + Bristol confirmation. Order subtype-specific investigations
2. **Organic exclusion** — Red flags + malabsorption pattern = priority workup
3. **Inflammation signal** — IM axis ≥0.4 or inflammatory pattern warrants coeliac/IBD exclusion
4. **Functional impact** — IMP axis ≥Significant = impactful even if mild Index

**Key investigations by pattern**:
- **IBS-D**: Stool calprotectin, stool PCR, coeliac serology, FIT; empirical SeHCAT or low-FODMAP trial
- **Constipation-dominant**: Thyroid, calcium, pelvic-floor exam; rule out slow-transit via manometry if severe
- **Malabsorption pattern**: FBC, iron, B12, folate, D, Mg, coeliac, faecal elastase
- **Inflammatory pattern**: Coeliac serology (if not done), structured elimination trial, GI microbiota testing (if clinical suspicion high)

**Psych/stress integration**:
- Gut-brain pattern fired? Refer for stress management in parallel; neurogenic inflammation often responsive to CBT/hypnotherapy

---

### For Physiotherapists

**Your red flag**: **Pelvic-floor/anorectal dysfunction pattern** fired → patient needs you

**Your assessment drivers**:
- **AR section revealed?** → Constipation ≥0.4 OR urgency ≥2 OR pelvic-risk flag (obstetric/surgical history) → These patients are candidates
- **Referred-pain pattern?** → Low-back or abdominal pain + gut symptoms → Visceral/musculoskeletal overlap possible; manual therapy + assessment relevant
- **Systemic burden high?** → Inflammatory, psychosocial, or autonomic axes elevated → Multi-system dysfunction; don't treat pelvic floor in isolation

**Key questions to ask**:
1. Does pelvic-floor dysfunction explain the urgency/incontinence? (Palpation, EMG if needed)
2. Is there a somatic/postural driver? (Posture, breathing, rib cage mobility often co-dysfunctional)
3. Does the patient have concurrent stress/anxiety that needs parallel management? (Pelvic floor + stress = poor prognosis without both)

**Safety note**: If red flags are present (weight loss, bleeding, severe pain), ensure medical clearance before manual therapy.

---

### For Nutritionists/Dietitians

**Your key patterns**:
1. **Nutrient-malabsorption** → Guide supplementation + investigate barriers (coeliac, EPI, low-caloric intake, malabsorption medications)
2. **Bloating/fermentation** → SIBO testing → Low-FODMAP trial if positive
3. **Inflammatory pattern** → Elimination diet (if signal strong) + anti-inflammatory nutrition
4. **IMP axis + food avoidance high** → Screen for ARFID/disordered-eating before recommending further restriction

**Recall windows matter for diet**:
- 2-week severity (recent experience)
- 2–3 month frequency (true habitual pattern)
- Lifetime deficiency (diagnosis context)

**Key interventions**:
- **Fibre paradox detected?** → Don't blanket-recommend high fibre; adjust upward slowly, or trial SIBO testing first
- **Multiple food triggers (≥2)?** → Low-FODMAP first; then systematic reintroduction (not prolonged restriction)
- **Underweight (BMI <18.5)?** → Supplementation + caloric/nutrient density focus; recovery nutrition may take 6+ months

---

### For Allied Health (Sleep, Exercise, Stress)

**Sleep specialists**: SY axis + sleep driver reveal when autonomic symptoms present. Sleep disturbance co-occurs with GI; target both.

**Exercise/activity specialists**: Lifestyle-driven pattern fired? Activity is a first-line intervention (improves motility, mood, sleep, stress). Prescribe evidence-based exercise per IBS subtype (IBS-C: gentle mobility; IBS-D: avoid intense cardio post-meal).

**Mental health / CBT practitioners**: Gut-brain pattern fired or psychosocial axis ≥Significant? Stress is both driver and consequence. Gut-directed hypnotherapy and CBT have evidence for IBS; coordinate with GP/GI.

---

## Section 11: Limitations & Caveats

### What the Tool Does NOT Do

1. **No frequency-only assessment** — GSRS severity scale has no frequency axis. "Severe once a month" and "severe daily" score the same. Frequency items nudge but don't replace; use clinical history to contextualize.

2. **No imaging or objective testing** — Tool cannot detect polyps, inflammation on colonoscopy, or anatomical abnormality. Red flags + investigations are the safety valve.

3. **No objective microbiota sequencing** — Dysbiosis signals are phenotypic (symptom-based), not genotypic. Suggests dysbiosis-relevant symptoms; confirm with GI-MAP or breath testing if indicated.

4. **Symptom clustering is empirical, not anatomical** — Five clusters (Reflux, Pain, Indigestion, Diarrhoea, Constipation) are signal-based, not anatomical divisions. Overlap is intentional for pattern richness.

5. **Single snapshot, not longitudinal** — Rome IV validated on prospective 7-day symptom diaries; our single-visit classification is screening-level only. Requires clinical correlation + symptom diary if formal diagnosis needed.

6. **Banding provisional** — Cutoffs (20%, 40%, 60%) are evidence-informed but await pilot recalibration against lab markers (breath test, GI-MAP, outcomes). Don't treat as diagnostic thresholds yet.

7. **No medication reconciliation** — Tool records medications but doesn't flag all drug-symptom associations (e.g., SSRIs, metformin, iron supplements can all cause GI effects).

### When to Over-Rule the Tool

- **Clinical judgment + objective data trump screening output** — Imaging, labs, endoscopy findings supersede tool Tier
- **Contextual factors explain findings better** — Recent infection, new medication, bereavement, acute stressor
- **Patient safety concern** — Unexplained weight loss, alarm features → refer regardless of Tier
- **Patient preference** — If patient refuses investigations or intervention for a Tier-2 pattern, document and agree on monitoring

---

## Section 12: How to Use This Tool in Practice

### Patient Workflow

1. **Questionnaire completion** — 15–25 minutes depending on adaptive section reveals
2. **Clinician review** (same visit or follow-up):
   - Check red flags (safety first)
   - Review primary outputs (4 burdens)
   - Check patterns + investigations
   - Read triage notes + Tier
   - Integrate with H&P + clinical judgment

### Repeated Assessments (Longitudinal Tracking)

Same patient, future visit:
- **Compare Gut Symptom Index trend** — Improving? Worsening? Static?
- **Track pattern changes** — New patterns? Old ones resolved?
- **Reassess impact axis** — Is management improving QOL?
- **Monitor driver compliance** — Activity, diet, stress, medications

### Report Generation

- **Patient report** (plain-language): "Your results at a glance" + tier + self-management tips
- **Clinician report** (detailed): Full axis breakdown + pattern rationale + investigation list + notes

---

## Section 13: File & Code Reference

For clinicians who want to audit the tool's logic:

| Component | File Location (index.html) | Lines ~XXX |
|-----------|---------------------------|-----------|
| Schema, question definitions, clustering | schema.js module | 1500–1900 |
| Scoring logic, Index calculation, bands | scoring.js module | 1100–1400 |
| Pattern definitions, firing logic | patterns.js module | 1400–2100 |
| Triage routing, Tier decisions | triage.js module | 1600–1900 |
| Rome IV classification | romeiv.js module | 1400–1550 |
| Red flags | redflags.js module | 1000–1200 |

**Note**: Source code is inlined within a single `index.html` file (offline, no external dependencies). Open in a text editor and search for `__modules` or `__req` to find module definitions.

---

## Appendices

### Appendix A: Cluster & Frequency Scales

**Bristol Stool Form Types**:
- Type 1–2: Hard lumps / lumpy sausage (Constipated)
- Type 3–5: Sausage or small blobs (Normal to soft)
- Type 6–7: Mushy or liquid (Diarrhoea)

**Per-Cluster Symptom Frequency** (2–3 month typical pattern):
- 1–2 days/week
- 3–4 days/week
- 5–6 days/week
- Daily or almost daily

**Impact Items** (0–3 severity):
- Interference with work/study
- Interference with social/family activities
- Food avoidance/restriction
- Overall effect on quality of life

---

### Appendix B: Investigation Lists by Pattern

**Nutrient Malabsorption**:
- FBC (anaemia, iron), iron studies, serum B12, folate, 25-OH vitamin D, magnesium
- Coeliac serology (anti-tTG IgA, total IgA)
- Faecal elastase (if EPI suspected)

**Constipation-Dominant (IBS-C)**:
- TSH (hypothyroidism)
- Calcium (hypercalcaemia)
- Pelvic-floor physiotherapy assessment
- Trial high-fibre + psyllium

**Diarrhoea-Dominant (IBS-D)**:
- Stool calprotectin + PCR (infectious, inflammatory)
- Coeliac serology
- FIT (bowel cancer screening)
- SeHCAT or empirical low-FODMAP trial (bile-acid diarrhoea / IBS-D)

*[See tool itself for full investigation lists for each pattern]*

---

### Appendix C: Rome IV Full Criteria (2016)

**IBS — Diagnostic Criteria**:
Recurrent abdominal pain, on average, at least 1 day per week for the last 3 months, with symptom onset ≥6 months prior to diagnosis, associated with ≥2 of the following:
1. Related to defecation
2. Associated with a change in stool frequency
3. Associated with a change in stool form (appearance)

**Subtypes**:
- **IBS-C**: ≥25% of stools hard/lumpy, <25% loose/watery
- **IBS-D**: ≥25% of stools loose/watery, <25% hard/lumpy
- **IBS-M**: ≥25% of stools hard/lumpy AND ≥25% loose/watery
- **IBS-U**: Insufficient stool form to meet subtype criteria

---

### Appendix D: Glossary

**Cluster norm**: Average severity within a symptom cluster (0–1 scale), calculated as the mean of answered items in that cluster. Example: (heartburn 2/3 + regurgitation 1/3) / 2 = 0.5 (Reflux cluster norm).

**Dysbiosis correlate**: A symptom pattern or patient history feature that is statistically associated with dysbiosis in research but is not diagnostic. Examples: post-infectious onset, FODMAP sensitivity, foul gas.

**Pattern confidence**: Proportion of a pattern's signals that were answered by the patient (data completeness), ranging from High (≥75% answered) to Low (<50% answered). Confidence ≠ clinical certainty; clinician applies judgment.

**Sensitivity**: Proportion of patients with a condition who test positive. High sensitivity catches cases but may have false positives.

**Specificity**: Proportion of patients without a condition who test negative. High specificity avoids false alarms but may miss cases.

---

**End of Document**

---

*This handoff document is a living resource. As the tool evolves and pilot data informs banding recalibration, sections (especially Sections 3 & 6) will be updated. Feedback from clinicians and patients is welcome.*

**Questions or feedback?** Refer to the main repository README for contact information.
