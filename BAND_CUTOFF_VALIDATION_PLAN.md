# Band Cutoff Validation Pilot — Research Protocol

**Document Date**: July 2026  
**Status**: Planning Phase  
**Prepared by**: Claude Code (GSHS Development)  
**Intended For**: Clinical leads, researchers, data analysts

---

## Executive Summary

The GSHS Gut Symptom Burden Index uses provisional band cutoffs at **20% (Minimal), 40% (Mild–Moderate), 60% (Significant), ≥80% (Severe)** to translate the underlying GSRS-based severity norm (0–1) into clinically actionable bands. These thresholds are evidence-informed from published IBS severity scales but **have not been recalibrated against real patient outcome data**. This pilot protocol defines how to collect that data, validate the cutoff placement, and adjust if needed.

**Goal**: Run a prospective pilot with 50–100 patients to determine whether the band cutoffs meaningfully predict clinical outcomes (treatment response, specialist referral, functional impact, lab markers) and whether the current thresholds are optimally placed.

---

## Part 1: Pilot Design

### 1a. Study Population

**Inclusion**:
- Adults (18+) presenting to primary care with chronic GI symptoms (≥3 months)
- Completed the GSHS questionnaire as part of routine assessment
- Provide informed consent for data linkage and follow-up

**Exclusion**:
- Acute GI infection in the past 4 weeks
- Uncontrolled malignancy
- Inflammatory bowel disease (study separately if warranted)
- Pregnancy at enrollment
- Unable to provide follow-up data at 3 months

**Target N**: 50–100 patients across 3–5 primary-care practices (UK, mixed urban/rural)

### 1b. Timeline

| Phase | Duration | Activities |
|-------|----------|-----------|
| **Planning & ethics** | 4–6 weeks | Prepare research protocol, submit to REC/IRB, secure site buy-in |
| **Recruitment & baseline** | 8–12 weeks | Enroll patients, collect GSHS data + baseline investigations |
| **Follow-up** (3 months) | 12 weeks | Contact patients, collect outcome data + repeat labs/tests where available |
| **Analysis & reporting** | 8 weeks | Data analysis, cutoff validation, report findings |
| **Dissemination** | Ongoing | Publish results, present at conferences, update GSHS documentation |

**Total Duration**: ~6 months to 1-year pilot completion

### 1c. Data Collection Timeline

```
Week 0: Enrollment
  ├─ GSHS questionnaire (complete at visit or online)
  ├─ Baseline investigations (bloods, stool tests, imaging if indicated)
  ├─ Functional impact (FSDS-R, SF-36 QoL scales)
  ├─ Patient-reported severity (NRS 0–10)
  └─ Demographics (age, sex, BMI, comorbidities)

Week 12: 3-Month Follow-up (PRIMARY OUTCOME)
  ├─ Repeat GSHS questionnaire (to assess change)
  ├─ Clinical outcome: Treatment received, response (Clinician + Patient global impression)
  ├─ Repeat functional impact measures (FSDS-R, SF-36)
  ├─ Repeat patient-reported severity (NRS)
  ├─ Repeat investigations if available (calprotectin, coeliac serology if not done, etc.)
  └─ Adverse events, medication changes
```

---

## Part 2: Outcome Measures & Validation Framework

### 2a. Primary Outcomes (Assess Cutoff Validity)

**Clinician-Reported Treatment Response** — At 3 months, each patient's clinician rates:
- **Recommendation** (from GSHS Tier): Was patient referred, managed, or monitored as suggested?
- **Actual treatment received**: Investigation ordered, medication started, referral made, reassurance only
- **Patient response**: Not improved / Improved / Much improved / Resolved
- **Correlation analysis**: Band at enrollment → treatment intensity & response outcome

**Expected result**: Patients in higher bands (40–60%, Significant) should more often receive active intervention and report greater response; lower bands (20%, Minimal) should more often be reassured.

**Patient-Reported Functional Impact** — At 3 months:
- **Change in FSDS-R** (Functional Digestive Symptoms Rating Scale, 0–40, higher = worse)
- **Change in symptom NRS** (0–10)
- **Work/social impact (SF-36 subscales)**
- **Correlation analysis**: Band at enrollment → magnitude of improvement at 3 months

**Expected result**: Baseline higher bands correlate with larger absolute improvement (if treated) and smaller improvement (if untreated).

### 2b. Secondary Outcomes (Investigate Sensitivity & Specificity)

**Lab Marker Correlation** (collected at baseline + 3 months if available):
- Faecal calprotectin (inflammatory marker)
- Coeliac serology (IgA, tTG)
- H. pylori serology (upper-GI signal)
- FBC (anaemia, eosinophilia)
- Vitamin D, B12, iron studies (nutrient status)
- HbA1c (metabolic axis)
- CRP/ESR if measured

**Hypothesis**: Patients in "Inflammatory/Immune Burden" axis (secondary axis) with high scores should have elevated calprotectin; nutrient axis high scores should correlate with low iron/B12/D.

### 2c. Exploratory Outcomes (Pattern Validation)

**Pattern-Specific Subgroup Analysis**:
- Patients with `diarrhoea_dominant` pattern: Do they more often need SeHCAT, stool PCR, or respond to antimotility agents?
- Patients with `nutrient_malabsorption` pattern: Do they show evidence of deficiency (low labs, hair loss, anaemia)?
- Patients with `pelvic_floor` pattern: Do they more often accept pelvic-floor physio referral?

**Hypothesis**: Patterns should enrich for the expected clinical findings or treatment responses.

---

## Part 3: Statistical Analysis Plan

### 3a. Cutoff Validation (ROC / Sensitivity / Specificity)

For each primary outcome, construct a 2×2 table:

```
                     Treatment Received / Response Good (Clinician + Patient Report)
GSHS Band            Yes                             No
20% (Minimal)        True Negative                   False Negative
40% (Mild–Moderate)  True Positive                   False Positive
60% (Significant)    True Positive                   False Positive
80%+ (Severe)        True Positive                   False Positive (rare)
```

**Sensitivity**: Of patients who received active treatment/improved, how many had band ≥40%?  
**Specificity**: Of patients who were reassured/unchanged, how many had band <40%?

**ROC curve**: Plot sensitivity vs. 1-specificity; identify whether 40% is the optimal "action threshold" or if 35% or 45% would be better.

### 3b. Correlation & Trend Analysis

**Spearman correlation**: Band value (continuous 0–100%) vs. 3-month functional improvement (FSDS-R Δ, NRS Δ).  
**Expected**: ρ = 0.4–0.6 (moderate positive, indicating higher baseline burden predicts greater room for improvement).

**Logistic regression**: Odds of "good treatment response" by band tier, adjusting for age, comorbidities, pattern presence.

### 3c. Subgroup Comparisons

**By pattern**: Compare treatment response between patients with/without key patterns (e.g., `diarrhoea_dominant` vs. no pattern).  
**By axis**: Stratify by which secondary axis (Inflammatory, Nutrient, Psychosocial) is elevated.

---

## Part 4: Potential Findings & Cutoff Adjustments

### 4a. Scenario 1: Cutoffs Are Well-Placed (No Adjustment Needed)

**If**: Patients in 40% band have ~70–80% sensitivity/specificity for "good response" and ROC optimum is 38–42%, **Then**: Retain current thresholds. Report confidence level in GSHS documentation update from "provisional" to "pilot-validated."

### 4b. Scenario 2: Cutoff Shift Down (e.g., 30% / 50% / 70%)

**If**: Actual ROC optimum is 30% (too many "Minimal" patients improve with intervention), **Then**: Recommend lowering action threshold to 30%; conversely, if optimum is 50%, raise it.

**Justification**: Real patient distribution or treatment response may not match the literature-derived thresholds.

### 4c. Scenario 3: Non-Linear Thresholds (Different by Axis or Pattern)

**If**: Diarrhoea-dominant pattern predicts referral-need even at lower bands, while constipation-dominant doesn't, **Then**: Recommend pattern-specific band interpretation or separate thresholds per subtype.

**Implementation**: Triage.js modifier, e.g., "If `diarrhoea_dominant` and band ≥30%, escalate; if constipation-only and band <50%, hold."

---

## Part 5: Implementation & Reporting

### 5a. Data Repository & Ethics

- **Data storage**: Anonymized GSHS data + baseline/follow-up outcomes in a secure REDCap or REDCap-equivalent database
- **Access**: Restricted to named researchers; no identifiable information in analysis
- **Governance**: REC/IRB approval required before enrollment; annual review if multi-year follow-up planned

### 5b. Publication & Dissemination

**Target outlets**:
- *Primary Care Health Sciences* (peer-reviewed research)
- *Frontiers in Gastroenterology* or *Gastroenterology Research and Practice*
- Clinical conference abstracts (Digestive Disease Week, British Society of Gastroenterology)

**Key messages**:
- "GSHS band cutoffs validated in prospective primary-care cohort"
- "Clinical utility of GSRS-based severity bands for gut-symptom screening"
- "Phased implementation protocol: Band thresholds informed by patient outcomes"

### 5c. Documentation Updates

Upon pilot completion, update:

1. **CLINICIAN_HANDOFF.md** (Section 3: Banding): Change "provisional" to "pilot-validated" + cite pilot data
2. **README.md**: Update validation status badge
3. **index.html** (line ~1167): Update axisProfile note from "provisional" to "pilot-validated, based on N=X prospective cohort"
4. **GSHS release notes**: Summarize cutoff validation findings

---

## Part 6: Governance & Next Steps

### 6a. Roles & Responsibilities

| Role | Responsibility |
|------|-----------------|
| **Chief Investigator** | Study design, REC submission, clinician recruitment, oversight |
| **Data Analyst** | ROC analysis, statistical report, cutoff recommendations |
| **Clinician Co-Investigators** (multi-site) | Patient recruitment, outcome assessment at follow-up |
| **Research Nurse / Administrator** | Study coordination, data entry, patient contact |

### 6b. Stakeholder Engagement

- **GPs & Practice Managers**: Brief on study feasibility, recruitment support
- **Patients**: Informed consent, clear explanation of follow-up contact
- **Specialist (GI, Physio, Nutrition)** leads: Input on outcome measure relevance, pattern validation

### 6c. Immediate Next Steps (Before Pilot Launch)

1. **Develop REC protocol** (4 weeks)
   - Full statistical analysis plan
   - Patient information sheet
   - Follow-up contact protocol
2. **Secure site buy-in** (2–3 weeks)
   - Identify 3–5 practices willing to recruit
   - Meet with practice leads to confirm feasibility
3. **Set up data infrastructure** (2 weeks)
   - REDCap instance or secure database
   - GSHS data export + anonymization process
   - Outcome data capture forms
4. **Pilot recruitment** (8–12 weeks)
   - Enroll target N (50–100 patients)
   - Collect baseline GSHS + investigations

---

## Appendix: Candidate Outcome Measures (Detailed)

### FSDS-R (Functional Digestive Symptoms Rating Scale)
- 20-item scale, 0–40 range
- Validated for IBS functional impact
- Primary care-friendly; ~5-min completion
- *Interpretation*: Higher = worse; clinically significant change ≥3 points

### SF-36 Physical & Mental Health Subscales
- Subset of 8 items from SF-36; capture QoL + mental health
- Validated in primary care, GI populations
- *Interpretation*: 0–100; lower = worse; clinically significant change ≥5 points

### Patient Global Impression of Change (PGIC)
- Single-item 7-point scale ("much worse" → "much better")
- Validated anchor for interpreting other outcome changes
- *Interpretation*: Score ≥5 ("better" or better) = "responder"

### NRS Symptom Severity (0–10)
- Simple 0–10 numerical rating scale
- Patient reports "typical" gut-symptom intensity
- *Interpretation*: Change ≥2 points = clinically meaningful

---

## Appendix: Checklist for Pilot Launch

- [ ] REC/IRB approval obtained
- [ ] 3+ practices recruited and staffed
- [ ] REDCap database configured
- [ ] Patient information sheets printed
- [ ] Clinician investigator training completed (outcome assessment)
- [ ] First patient enrolled
- [ ] Baseline data collection protocol verified (≥3 complete cases)
- [ ] 3-month follow-up protocol piloted
- [ ] Data entry & QC process confirmed
- [ ] Analysis plan finalized & pre-registered (if using pre-registration platform)

---

**For questions or updates**: Contact the GSHS development team.  
**Document Control**: Version 1.0, July 2026. Next review: Upon REC approval.
