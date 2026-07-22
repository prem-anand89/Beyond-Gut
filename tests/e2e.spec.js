import { test, expect } from '@playwright/test';

// Configure for the local dev server
test.use({ baseURL: 'http://localhost:3000' });

// ── Real-UI helpers ──────────────────────────────────────────────────────
// The app is a single-file, hand-rolled DOM renderer (no framework, no
// form-field `name`/`id` attributes on most inputs). Severity questions are
// rendered by questionRow(q) as a `.q` div containing a label
// `#q-${id}` and a sibling `.opts` group of `.opt` buttons — one per scale
// level (0=None … 4=Very severe on the current 0–4 scale). These helpers
// target that real structure instead of the non-existent `input[name=...]`
// selectors the previous version of this file used.

// Ordered list of the 15 core GSRS items (mirrors GI_IDS in gshs-smoke.mjs),
// with their GSRS cluster, for tests that need every cluster answered.
const GI_ITEMS = [
  { id: 'gsrs_heartburn', cluster: 'Reflux' },
  { id: 'gsrs_regurg', cluster: 'Reflux' },
  { id: 'gsrs_pain', cluster: 'Pain' },
  { id: 'gsrs_hunger', cluster: 'Pain' },
  { id: 'gsrs_nausea', cluster: 'Pain' },
  { id: 'gsrs_rumbling', cluster: 'Indigestion' },
  { id: 'gsrs_bloating', cluster: 'Indigestion' },
  { id: 'gsrs_burping', cluster: 'Indigestion' },
  { id: 'gsrs_gas', cluster: 'Indigestion' },
  { id: 'gsrs_diarrhoea', cluster: 'Diarrhoea' },
  { id: 'gsrs_loose', cluster: 'Diarrhoea' },
  { id: 'gsrs_urgency', cluster: 'Diarrhoea' },
  { id: 'gsrs_constip', cluster: 'Constipation' },
  { id: 'gsrs_hard', cluster: 'Constipation' },
  { id: 'gsrs_incomplete', cluster: 'Constipation' },
];

// Click the severity option (0–4) for a question rendered by questionRow(id).
// Works for any QUESTIONS entry, gated or core, as long as it is currently
// visible (its parent reveal holder, if any, must already be shown).
async function answerQuestion(page, id, value) {
  const row = page.locator('.q').filter({ has: page.locator(`#q-${id}`) });
  await row.locator('.opts .opt').nth(value).click();
}

// Click a labelled option row rendered by segRow()/chipRow() (bowel frequency,
// per-cluster symptom frequency, Rome pain-frequency) — these have no id on
// their label, so match by the row's visible text instead.
async function clickSegOption(page, labelSubstring, index) {
  const row = page.locator('.q').filter({ hasText: labelSubstring });
  await row.locator('.opts .opt').nth(index).click();
}
async function clickChipOption(page, labelSubstring, optionText) {
  const row = page.locator('.q').filter({ hasText: labelSubstring });
  await row.getByRole('button', { name: optionText, exact: true }).click();
}

// Toggle a Rome-association chip (rm_assoc_*) by its exact label text.
async function toggleRomeAssoc(page, exactLabel) {
  await page.getByRole('button', { name: exactLabel, exact: true }).click();
}

// Answer a "Yes"/"No" red-flag row (redFlagCard) by a distinctive substring
// of its label — these rows have no id, only `.q-txt` text.
async function answerRedFlag(page, labelSubstring, value) {
  const row = page.locator('.q').filter({ hasText: labelSubstring });
  await row.getByRole('button', { name: value ? 'Yes' : 'No', exact: true }).click();
}

// Bristol stool-type chip (bristolCard) — BRISTOL_TYPES is ordered 1..7, so
// type n is the (n-1)th `.bristol-opt` button.
async function selectBristol(page, n) {
  await page.locator('.bristol-opt').nth(n - 1).click();
}

async function clickSeeResults(page) {
  await page.getByRole('button', { name: 'See results →' }).click();
  await page.waitForSelector('#patient-results .hero .big', { timeout: 5000 });
}

async function readIndex(page) {
  const txt = await page.locator('#patient-results .hero .big').first().textContent();
  return parseFloat(txt);
}

async function waitForReady(page) {
  // The questionnaire root is #mode-patient (not #app); the first core GI
  // question is a reliable readiness signal that render() has completed.
  await page.waitForSelector('#mode-patient.show', { timeout: 10000 });
  await page.waitForSelector('#q-gsrs_heartburn', { timeout: 10000 });
}

async function resetApp(page) {
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await waitForReady(page);
}

test.describe('Beyond-Gut GSHS E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    // window.print() opens the OS print dialog; no-op it defensively so print
    // tests never risk hanging headless Chromium.
    await page.addInitScript(() => { window.print = () => {}; });
    await page.goto('/');
    await waitForReady(page);
    // Clear any existing data so each test starts from a blank slate.
    await resetApp(page);
  });

  test.describe('Core Feature: Cluster-Balanced GI Index (C1)', () => {
    test('should equally weight Reflux vs Indigestion at same per-item severity', async ({ page }) => {
      // Answer every core GI item — the 2-item Reflux cluster ceiling'd,
      // everything else at None — so the cluster-balanced mean has a single
      // fully-defined, fully-answered cluster (mirrors the smoke-test fixture).
      for (const { id } of GI_ITEMS) {
        await answerQuestion(page, id, id === 'gsrs_heartburn' || id === 'gsrs_regurg' ? 4 : 0);
      }
      await clickSeeResults(page);
      const refluxIndex = await readIndex(page);

      await resetApp(page);
      // Same severe ceiling, but on the 4-item Indigestion cluster instead.
      for (const { id } of GI_ITEMS) {
        const indigestionIds = ['gsrs_rumbling', 'gsrs_bloating', 'gsrs_burping', 'gsrs_gas'];
        await answerQuestion(page, id, indigestionIds.includes(id) ? 4 : 0);
      }
      await clickSeeResults(page);
      const indigestionIndex = await readIndex(page);

      // Cluster-weighted (not item-count weighted): identical per-symptom
      // severity in clusters of different sizes must yield the same index.
      expect(refluxIndex).toEqual(indigestionIndex);
      expect(refluxIndex).toBe(20); // one maxed cluster of five → 20% mean
    });

    test('should keep GSRS Index unchanged when systemic-only items are high', async ({ page }) => {
      // Explicitly zero every GI item (a real "None" answer, not "unanswered")
      // so the Gut Symptom Burden is a defined 0%, then push three systemic
      // (Inflammatory/immune) items to Very severe.
      for (const { id } of GI_ITEMS) await answerQuestion(page, id, 0);
      await answerQuestion(page, 'im_food_react', 4);
      await answerQuestion(page, 'im_infections', 4);
      await answerQuestion(page, 'im_allergies', 4);
      await clickSeeResults(page);

      const heroText = await page.locator('#patient-results .hero').first().textContent();
      expect(heroText).toContain('0%');
      expect(heroText).toContain('Minimal');

      // De-blend invariant: systemic data never blends into the Gut Symptom
      // Index — the Inflammatory secondary axis must read elevated instead.
      const inflammatoryRow = page.locator('#patient-results .row').filter({ hasText: 'Inflammatory' });
      await expect(inflammatoryRow).toBeVisible();
      const inflammatoryText = await inflammatoryRow.textContent();
      expect(inflammatoryText).toMatch(/Significant|Severe/);
    });
  });

  test.describe('Core Feature: Bristol Nudge Scoping (C2)', () => {
    test('should nudge Constipation/Diarrhoea clusters only, not Reflux/Pain/Indigestion', async ({ page }) => {
      // Reflux items severe, bowel-habit clusters left genuinely UNANSWERED —
      // the Bristol nudge must not move a pure-reflux index either way.
      await answerQuestion(page, 'gsrs_heartburn', 4);
      await answerQuestion(page, 'gsrs_regurg', 4);
      await selectBristol(page, 4); // Bristol type 4 = normal
      await clickSeeResults(page);
      const refluxNormal = await readIndex(page);

      await resetApp(page);
      await answerQuestion(page, 'gsrs_heartburn', 4);
      await answerQuestion(page, 'gsrs_regurg', 4);
      await selectBristol(page, 1); // Bristol type 1 = very constipated
      await clickSeeResults(page);
      const refluxAbnormal = await readIndex(page);

      expect(refluxNormal).toEqual(refluxAbnormal);
    });
  });

  test.describe('Feature: Adaptive Symptom Reveals', () => {
    test('should reveal Pain/Rome cards only when gsrs_pain >= 1', async ({ page }) => {
      await expect(page.locator('#reveal-card-pain')).not.toBeVisible();
      await expect(page.locator('#reveal-card-rome')).not.toBeVisible();

      // "None" (index 0) must keep the cards hidden.
      await answerQuestion(page, 'gsrs_pain', 0);
      await expect(page.locator('#reveal-card-pain')).not.toBeVisible();

      // "Mild" (index 1) meets the gsrs_pain >= 1 reveal gate.
      await answerQuestion(page, 'gsrs_pain', 1);
      await expect(page.locator('#reveal-card-pain')).toBeVisible();
      await expect(page.locator('#reveal-card-rome')).toBeVisible();
    });

    test('should reveal AR (pelvic) section on constipation/urgency signals', async ({ page }) => {
      await expect(page.locator('#reveal-AR')).not.toBeVisible();

      // Mild urgency does not meet the item-level min:2 ("Moderate") gate.
      await answerQuestion(page, 'gsrs_urgency', 1);
      await expect(page.locator('#reveal-AR')).not.toBeVisible();

      // Moderate (index 2) meets the gsrs_urgency >= 2 reveal arm.
      await answerQuestion(page, 'gsrs_urgency', 2);
      await expect(page.locator('#reveal-AR')).toBeVisible();
    });

    test('should reveal UG (upper GI) section on reflux/bloating signals', async ({ page }) => {
      await expect(page.locator('#reveal-UG')).not.toBeVisible();

      // A single ceiling Indigestion item (4/16 cluster norm = 0.25) clears
      // the re-tuned 0.22 UG reveal threshold (D0b).
      await answerQuestion(page, 'gsrs_bloating', 4);
      await expect(page.locator('#reveal-UG')).toBeVisible();
    });
  });

  test.describe('Feature: Pattern Detection & Triage Routing', () => {
    test('should fire pelvic_floor pattern on incontinence >= 2', async ({ page }) => {
      // Urgency reveals AR first (the pelvic_floor items live inside it).
      await answerQuestion(page, 'gsrs_urgency', 2);
      await expect(page.locator('#reveal-AR')).toBeVisible();
      await answerQuestion(page, 'ar_incont_urge', 2);
      await clickSeeResults(page);

      const resultsText = await page.locator('#patient-results').textContent();
      expect(resultsText).toContain('Pelvic-floor / anorectal pattern');
    });

    test('should escalate to Tier 2 on pattern fire + triage routing', async ({ page }) => {
      // Fill every core GI item so the cluster-balanced mean spans all 5
      // clusters (keeping the OVERALL band well under Severe, which would
      // force Tier 1 on its own) while the Pain and Constipation clusters
      // individually clear their Tier-2 thresholds: Pain >= 0.5 (2/3 items
      // ceiling'd → norm 0.667) and Constipation >= 0.3 with Diarrhoea silent
      // → constipation_dominant fires (bowel subtype IBS-C).
      const overrides = { gsrs_pain: 4, gsrs_hunger: 4, gsrs_constip: 4, gsrs_hard: 4 };
      for (const { id } of GI_ITEMS) await answerQuestion(page, id, overrides[id] ?? 0);
      await clickSeeResults(page);

      const triage = await page.locator('#patient-results').textContent();
      expect(triage).toMatch(/Tier 2/);
      expect(triage).toContain('Constipation-dominant pattern');
    });

    test('should fire nutrient_malabsorption on low BMI', async ({ page }) => {
      // lowBMI fires this pattern unconditionally (independent of current GI
      // symptom severity) — no GI answers needed.
      await page.locator('label:text-is("Height (cm)") + input').fill('170');
      await page.locator('label:text-is("Weight (kg)") + input').fill('50'); // BMI ≈ 17.3
      await clickSeeResults(page);

      const resultsText = await page.locator('#patient-results').textContent();
      expect(resultsText).toContain('Nutrient-malabsorption pattern');
    });
  });

  test.describe('Feature: Red Flag Escalation (Tier 1)', () => {
    test('should escalate to Tier 1 on red flag: weight loss', async ({ page }) => {
      await answerRedFlag(page, 'Losing weight without trying', true);
      await clickSeeResults(page);

      const resultsText = await page.locator('#patient-results').textContent();
      expect(resultsText).toMatch(/Tier 1/);
      // E2: weight-loss is mapped to 'urgent' (not routine) — the tiered
      // banner leads with a prompt-assessment headline for this flag.
      await expect(page.locator('.rf-banner')).toBeVisible();
    });

    test('should escalate to Tier 1 on red flag: haematemesis', async ({ page }) => {
      await answerRedFlag(page, 'Vomiting blood or coffee-ground material', true);
      await clickSeeResults(page);

      const resultsText = await page.locator('#patient-results').textContent();
      expect(resultsText).toMatch(/Tier 1/);
      // E2: haematemesis is 'emergency' urgency — the highest tier present.
      const bannerText = await page.locator('.rf-banner').textContent();
      expect(bannerText).toMatch(/same-day/i);
    });
  });

  test.describe('Feature: Rome IV IBS Subtyping', () => {
    test('should classify IBS-C when Constipation cluster dominant', async ({ page }) => {
      // gsrs_pain reveals the Pain/Rome cards and sx_duration follow-up.
      await answerQuestion(page, 'gsrs_pain', 2);
      await expect(page.locator('#reveal-card-rome')).toBeVisible();
      await answerQuestion(page, 'sx_duration', 2); // "6 months to a year" — meets Rome onset
      await clickChipOption(page, 'how often do you get abdominal pain', '1 day a week'); // meets Rome frequency
      await toggleRomeAssoc(page, 'Pain is better or worse around a bowel movement');
      await toggleRomeAssoc(page, 'Pain comes with a change in how often you pass stool');
      await selectBristol(page, 2); // Bristol type 2 → single-Bristol IBS-C basis
      await clickSeeResults(page);

      const resultsText = await page.locator('#patient-results').textContent();
      expect(resultsText).toMatch(/Meets Rome IV-informed criteria for IBS-C/);
    });

    test('should classify IBS-D when Diarrhoea cluster dominant', async ({ page }) => {
      await answerQuestion(page, 'gsrs_pain', 2);
      await expect(page.locator('#reveal-card-rome')).toBeVisible();
      await answerQuestion(page, 'sx_duration', 2);
      await clickChipOption(page, 'how often do you get abdominal pain', '1 day a week');
      await toggleRomeAssoc(page, 'Pain is better or worse around a bowel movement');
      await toggleRomeAssoc(page, 'Pain comes with a change in how often you pass stool');
      await selectBristol(page, 6); // Bristol type 6 → single-Bristol IBS-D basis
      await clickSeeResults(page);

      const resultsText = await page.locator('#patient-results').textContent();
      expect(resultsText).toMatch(/Meets Rome IV-informed criteria for IBS-D/);
    });
  });

  test.describe('Feature: Triage Notes Rendering', () => {
    test('should show anthro note when BMI is underweight', async ({ page }) => {
      await page.locator('label:text-is("Height (cm)") + input').fill('170');
      await page.locator('label:text-is("Weight (kg)") + input').fill('50'); // BMI ≈ 17.3 = underweight
      await clickSeeResults(page);

      const notes = await page.locator('#patient-results').textContent();
      expect(notes).toContain('BMI');
    });

    test('should show cyclical flare note when gy_cyclical + pain >= 2', async ({ page }) => {
      // gy_cyclical is femaleOnly — set gender via the patient-details dialog.
      await page.getByRole('button', { name: '+ Add patient details' }).click();
      await page.locator('#dlg').waitFor({ state: 'visible' });
      await page.locator('#dlg .pf-gender', { hasText: 'Female' }).click();
      await page.locator('#dlgOk').click();
      await waitForReady(page);

      // gsrs_pain >= 2 both satisfies gynOverlap's pain requirement AND
      // reveals the SY (systemic/autonomic) section that hosts gy_cyclical.
      await answerQuestion(page, 'gsrs_pain', 2);
      await expect(page.locator('#reveal-SY')).toBeVisible();
      await answerQuestion(page, 'gy_cyclical', 2);
      await clickSeeResults(page);

      const notes = await page.locator('#patient-results').textContent();
      expect(notes).toContain('Cyclical');
    });
  });

  test.describe('Output: Patient Print', () => {
    test('should generate patient print with 4 headline outputs', async ({ page }) => {
      await answerQuestion(page, 'gsrs_pain', 2);
      await answerQuestion(page, 'gsrs_bloating', 2);
      await clickSeeResults(page);
      await page.getByRole('button', { name: '🖨 Patient summary' }).click();

      // #print-area is display:none outside print media — read via
      // textContent (unlike innerText, it ignores CSS visibility).
      const printContent = await page.locator('#print-area').textContent();
      expect(printContent).toContain('Gut Symptom Burden');
      expect(printContent).toContain('Disruption Load');
      expect(printContent).toContain('Dysbiosis Correlate Load');
    });

    test('should show plain-language pattern descriptions in patient print, with no confidence jargon', async ({ page }) => {
      await answerQuestion(page, 'gsrs_urgency', 2);
      await expect(page.locator('#reveal-AR')).toBeVisible();
      await answerQuestion(page, 'ar_incont_urge', 2);
      await clickSeeResults(page);
      await page.getByRole('button', { name: '🖨 Patient summary' }).click();

      const printContent = await page.locator('#print-area').textContent();
      expect(printContent).toContain('Patterns noted');
      expect(printContent).toContain('Pelvic-floor / anorectal pattern');
      // Patient-facing print carries a plain "Confidence: Low, N% complete"
      // transparency caveat by design (shared with the clinician print's
      // Clinical impression) — that's fine. What must never leak is detailed
      // clinician-only confidence-SCORING jargon.
      expect(printContent).not.toContain('confidence level');
      expect(printContent).not.toContain('signalHits');
    });
  });

  test.describe('Output: Clinician Print', () => {
    test('should generate clinician print with all clinical details', async ({ page }) => {
      // The clinician-report print button is available directly from the
      // patient-results actions row — no tab switch required. Low BMI fires
      // nutrient_malabsorption unconditionally, guaranteeing a populated
      // "Suggested investigations / management" list.
      await page.locator('label:text-is("Height (cm)") + input').fill('170');
      await page.locator('label:text-is("Weight (kg)") + input').fill('50');
      await clickSeeResults(page);
      await page.getByRole('button', { name: '🖨 Clinician report' }).click();

      const clinicianPrint = await page.locator('#print-area').textContent();
      expect(clinicianPrint).toContain('Clinical impression');
      expect(clinicianPrint).toMatch(/investigations/i);
      expect(clinicianPrint).toMatch(/Tier [1-4]/);
    });

    test('should list investigations matching fired patterns', async ({ page }) => {
      // Low BMI fires nutrient_malabsorption unconditionally.
      await page.locator('label:text-is("Height (cm)") + input').fill('170');
      await page.locator('label:text-is("Weight (kg)") + input').fill('50');
      await clickSeeResults(page);
      await page.getByRole('button', { name: '🖨 Clinician report' }).click();

      const investigations = await page.locator('#print-area').textContent();
      expect(investigations).toMatch(/FBC|iron|B12|vitamin|serology/i);
    });
  });

  test.describe('Feature: Frequency Dimension', () => {
    test('should apply per-cluster frequency nudge to Index', async ({ page }) => {
      // Constipation frequency row only reveals when bowel output is
      // infrequent (bowelFreq < 2) AND constipation symptoms are present.
      await clickSegOption(page, 'How often do you have a bowel movement?', 0); // '<3 times/week'
      await answerQuestion(page, 'gsrs_constip', 3);
      await answerQuestion(page, 'gsrs_hard', 3); // last click also runs refreshReveals()
      await expect(page.locator('#reveal-freq-Constipation')).toBeVisible();
      await clickSegOption(page, 'Constipation or hard stools', 0); // '1–2 days/week' — minimal
      await clickSeeResults(page);
      const minFreqIndex = await readIndex(page);

      await resetApp(page);
      await clickSegOption(page, 'How often do you have a bowel movement?', 0);
      await answerQuestion(page, 'gsrs_constip', 3);
      await answerQuestion(page, 'gsrs_hard', 3);
      await expect(page.locator('#reveal-freq-Constipation')).toBeVisible();
      await clickSegOption(page, 'Constipation or hard stools', 3); // 'Daily or almost daily' — maximal
      await clickSeeResults(page);
      const maxFreqIndex = await readIndex(page);

      expect(maxFreqIndex).toBeGreaterThan(minFreqIndex);
    });
  });

  test.describe('Data Persistence', () => {
    test('should save and restore a complete visit', async ({ page }) => {
      await answerQuestion(page, 'gsrs_pain', 2);
      await answerQuestion(page, 'gsrs_bloating', 1);
      await clickSeeResults(page);
      await page.getByRole('button', { name: 'Save this response' }).click();
      await expect(page.getByRole('button', { name: 'Saved ✓' })).toBeVisible();

      // Verify the visit actually persisted to localStorage with the answers
      // given — the save flow creates a standalone (unlinked) patient record
      // even without a name/reference.
      const saved = await page.evaluate(() => JSON.parse(localStorage.getItem('bmgutscreen_v2')));
      expect(saved.patients.length).toBeGreaterThan(0);
      const visit = saved.patients[saved.patients.length - 1].visits[0];
      expect(visit.answers.gsrs_pain).toBe(2);
      expect(visit.answers.gsrs_bloating).toBe(1);

      // Reload and confirm the data survives (still in localStorage, not lost).
      await page.reload();
      await waitForReady(page);
      const afterReload = await page.evaluate(() => JSON.parse(localStorage.getItem('bmgutscreen_v2')));
      expect(afterReload.patients.length).toBe(saved.patients.length);
    });
  });

  test.describe('Accessibility Baseline', () => {
    test('should have keyboard navigation in questionnaire', async ({ page }) => {
      // Tab from a known start point and confirm focus lands on a genuinely
      // interactive, focusable element (no `name` attributes exist to probe).
      await page.locator('body').click({ position: { x: 0, y: 0 } });
      await page.keyboard.press('Tab');
      const focused = await page.evaluate(() => ({
        tag: document.activeElement.tagName,
        type: document.activeElement.type || null,
      }));
      expect(['BUTTON', 'INPUT', 'A'].includes(focused.tag)).toBe(true);
    });

    test('should have colour contrast styling on important outputs', async ({ page }) => {
      await answerQuestion(page, 'gsrs_pain', 4);
      await clickSeeResults(page);
      await expect(page.locator('#patient-results .hero .big')).toBeVisible();

      // The triage tier pill carries explicit inline background/colour styling
      // (unlike headline pills earlier in the DOM, which rely on stylesheet-
      // only colour classes with no inline style attribute).
      const tierPill = page.locator('#patient-results .pill').filter({ hasText: /Tier \d/ });
      const pillStyle = await tierPill.first().getAttribute('style');
      expect(pillStyle).toBeTruthy();
      expect(pillStyle).toContain('background');
    });
  });
});
