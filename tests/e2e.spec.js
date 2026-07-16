import { test, expect } from '@playwright/test';

// Configure for the local dev server
test.use({ baseURL: 'http://localhost:3000' });

test.describe('Beyond-Gut GSHS E2E Tests', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    // Wait for the app to load
    await page.waitForSelector('#app', { timeout: 5000 });
    // Clear any existing data
    await page.evaluate(() => localStorage.clear());
    await page.reload();
    await page.waitForSelector('#app', { timeout: 5000 });
  });

  test.describe('Core Feature: Cluster-Balanced GI Index (C1)', () => {
    test('should equally weight Reflux vs Indigestion at same per-item severity', async ({ page }) => {
      // Answer Reflux items (2 items) at severe
      await page.fill('input[name="gsrs_heartburn"]', '3');
      await page.fill('input[name="gsrs_regurg"]', '3');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.hero-index', { timeout: 3000 });
      const refluxIndex = await page.textContent('.hero-index');
      console.log(`Reflux-only severe: ${refluxIndex}`);

      // Reset and answer Indigestion items (4 items) at same severity
      await page.goto('/');
      await page.waitForSelector('#app');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.fill('input[name="gsrs_bloating"]', '3');
      await page.fill('input[name="gsrs_belching"]', '3');
      await page.fill('input[name="gsrs_stomach_discomfort"]', '3');
      await page.fill('input[name="gsrs_nausea"]', '3');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.hero-index', { timeout: 3000 });
      const indigestionIndex = await page.textContent('.hero-index');
      console.log(`Indigestion-only severe: ${indigestionIndex}`);

      // Indices should be equal (cluster-weighted, not item-count weighted)
      expect(refluxIndex).toEqual(indigestionIndex);
    });

    test('should keep GSRS Index unchanged when systemic-only items are high', async ({ page }) => {
      // Answer only IM/BG/NU items high, GI items zero
      await page.fill('input[name="im_joint_pain"]', '3');
      await page.fill('input[name="bg_anxiety"]', '3');
      await page.fill('input[name="nu_hair_loss"]', '3');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.headline-card', { timeout: 3000 });

      const gutBurdenText = await page.textContent('.headline-outputs');
      // Gut Symptom Burden should still be Minimal/0
      expect(gutBurdenText).toContain('Minimal');
      // But Systemic Burden should be elevated
      expect(gutBurdenText).toContain('Systemic Burden');
    });
  });

  test.describe('Core Feature: Bristol Nudge Scoping (C2)', () => {
    test('should nudge Constipation/Diarrhoea clusters only, not Reflux/Pain/Indigestion', async ({ page }) => {
      // Answer Reflux items severely but with NORMAL Bristol type
      await page.fill('input[name="gsrs_heartburn"]', '3');
      await page.fill('input[name="gsrs_regurg"]', '3');
      await page.click('[data-bristol-type="4"]'); // Bristol type 4 = normal
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.hero-index', { timeout: 3000 });
      const refluxNormal = await page.textContent('.hero-index');

      // Now answer same Reflux items with ABNORMAL Bristol type
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.fill('input[name="gsrs_heartburn"]', '3');
      await page.fill('input[name="gsrs_regurg"]', '3');
      await page.click('[data-bristol-type="1"]'); // Bristol type 1 = abnormal (very constipated)
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.hero-index', { timeout: 3000 });
      const refluxAbnormal = await page.textContent('.hero-index');

      // Reflux alone should NOT be affected by Bristol type (Bristol nudge is scoped to bowel clusters)
      expect(refluxNormal).toEqual(refluxAbnormal);
    });
  });

  test.describe('Feature: Adaptive Symptom Reveals', () => {
    test('should reveal Pain/Rome cards only when gsrs_pain >= 1', async ({ page }) => {
      // Initially, pain card should be hidden
      let painCard = await page.locator('[data-card="pain"]').isVisible();
      expect(painCard).toBe(false);

      // Answer pain = 0, still hidden
      await page.fill('input[name="gsrs_pain"]', '0');
      painCard = await page.locator('[data-card="pain"]').isVisible();
      expect(painCard).toBe(false);

      // Answer pain >= 1, card should appear
      await page.fill('input[name="gsrs_pain"]', '1');
      await page.waitForTimeout(200); // Brief delay for reveal
      painCard = await page.locator('[data-card="pain"]').isVisible();
      expect(painCard).toBe(true);
    });

    test('should reveal AR (pelvic) section on constipation/urgency signals', async ({ page }) => {
      // AR section should initially be hidden
      let arSection = await page.locator('[data-section="AR"]').isVisible();
      expect(arSection).toBe(false);

      // Answer urgency = 0, should stay hidden
      await page.fill('input[name="gsrs_urgency"]', '0');
      arSection = await page.locator('[data-section="AR"]').isVisible();
      expect(arSection).toBe(false);

      // Answer urgency >= 2, AR section should reveal
      await page.fill('input[name="gsrs_urgency"]', '2');
      await page.waitForTimeout(200);
      arSection = await page.locator('[data-section="AR"]').isVisible();
      expect(arSection).toBe(true);
    });

    test('should reveal UG (upper GI) section on reflux/bloating signals', async ({ page }) => {
      // UG section should initially be hidden
      let ugSection = await page.locator('[data-section="UG"]').isVisible();
      expect(ugSection).toBe(false);

      // Answer bloating >= 2, UG section should reveal
      await page.fill('input[name="gsrs_bloating"]', '2');
      await page.waitForTimeout(200);
      ugSection = await page.locator('[data-section="UG"]').isVisible();
      expect(ugSection).toBe(true);
    });
  });

  test.describe('Feature: Pattern Detection & Triage Routing', () => {
    test('should fire pelvic_floor pattern on incontinence >= 2', async ({ page }) => {
      // Trigger pelvic-floor symptoms
      await page.fill('input[name="ar_incontinence"]', '2');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.pattern-list', { timeout: 3000 });

      const patterns = await page.textContent('.pattern-list');
      expect(patterns).toContain('Pelvic-floor');
    });

    test('should escalate to Tier 2 on pattern fire + triage routing', async ({ page }) => {
      // Set up a Tier-2 case: Pain + constipation pattern
      await page.fill('input[name="gsrs_pain"]', '2');
      await page.fill('input[name="gsrs_constip"]', '2');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.triage-card', { timeout: 3000 });

      const triage = await page.textContent('.triage-card');
      expect(triage).toMatch(/Tier 2|assessment/i);
    });

    test('should fire nutrient_malabsorption on low BMI', async ({ page }) => {
      // Enter low BMI (< 18.5)
      await page.fill('input[name="height"]', '170');
      await page.fill('input[name="weight"]', '50');
      // Mild GI present
      await page.fill('input[name="gsrs_pain"]', '1');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.pattern-list', { timeout: 3000 });

      const patterns = await page.textContent('.pattern-list');
      expect(patterns).toContain('Nutrient Malabsorption');
    });
  });

  test.describe('Feature: Red Flag Escalation (Tier 1)', () => {
    test('should escalate to Tier 1 on red flag: weight loss', async ({ page }) => {
      await page.check('input[name="rf_weight_loss"]');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.triage-card', { timeout: 3000 });

      const triage = await page.textContent('.triage-card');
      expect(triage).toMatch(/Tier 1|urgent/i);

      // Should also show red-flag banner
      const redFlagBanner = await page.locator('.red-flag-alert').isVisible();
      expect(redFlagBanner).toBe(true);
    });

    test('should escalate to Tier 1 on red flag: haematemesis', async ({ page }) => {
      await page.check('input[name="rf_haematemesis"]');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.triage-card', { timeout: 3000 });

      const triage = await page.textContent('.triage-card');
      expect(triage).toMatch(/Tier 1|urgent/i);
    });
  });

  test.describe('Feature: Rome IV IBS Subtyping', () => {
    test('should classify IBS-C when Constipation cluster dominant', async ({ page }) => {
      // Answer Rome IV criteria + constipation-dominant pattern
      await page.fill('input[name="gsrs_pain"]', '2'); // Pain present
      await page.selectOption('select[name="rome_freq"]', 'weekly'); // At least weekly
      await page.fill('input[name="gsrs_constip"]', '2');
      await page.fill('input[name="gsrs_hard"]', '2');
      await page.click('[data-bristol-type="2"]'); // Bristol type 2 = constipated
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.rome-subtype', { timeout: 3000 });

      const romeSubtype = await page.textContent('.rome-subtype');
      expect(romeSubtype).toContain('IBS-C');
    });

    test('should classify IBS-D when Diarrhoea cluster dominant', async ({ page }) => {
      // Answer Rome IV criteria + diarrhoea-dominant pattern
      await page.fill('input[name="gsrs_pain"]', '2');
      await page.selectOption('select[name="rome_freq"]', 'weekly');
      await page.fill('input[name="gsrs_diarrhea"]', '2');
      await page.fill('input[name="gsrs_liquid"]', '2');
      await page.click('[data-bristol-type="6"]'); // Bristol type 6 = loose
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.rome-subtype', { timeout: 3000 });

      const romeSubtype = await page.textContent('.rome-subtype');
      expect(romeSubtype).toContain('IBS-D');
    });
  });

  test.describe('Feature: Triage Notes Rendering', () => {
    test('should show anthro note when BMI is underweight', async ({ page }) => {
      await page.fill('input[name="height"]', '170');
      await page.fill('input[name="weight"]', '50'); // BMI 17.3 = underweight
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.triage-card', { timeout: 3000 });

      const notes = await page.textContent('.triage-card');
      expect(notes).toContain('BMI');
    });

    test('should show cyclical flare note when gy_cyclical + pain >= 2', async ({ page }) => {
      await page.fill('input[name="gsrs_pain"]', '2');
      // Select gender = Female (to make gy_cyclical visible)
      await page.selectOption('select[name="gender"]', 'female');
      await page.fill('input[name="gy_cyclical"]', '2');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.triage-card', { timeout: 3000 });

      const notes = await page.textContent('.triage-card');
      expect(notes).toContain('Cyclical');
    });
  });

  test.describe('Output: Patient Print', () => {
    test('should generate patient print with 4 headline outputs', async ({ page }) => {
      // Fill out a complete assessment
      await page.fill('input[name="gsrs_pain"]', '2');
      await page.fill('input[name="gsrs_bloating"]', '2');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.btn-print', { timeout: 3000 });

      // Trigger print
      await page.click('.btn-print');
      await page.waitForSelector('.patient-print', { timeout: 3000 });

      const printContent = await page.textContent('.patient-print');
      expect(printContent).toContain('Gut Symptom Burden');
      expect(printContent).toContain('Disruption Load');
      expect(printContent).toContain('Dysbiosis');
    });

    test('should show Plain language pattern descriptions in patient print', async ({ page }) => {
      // Set up a pattern-firing case
      await page.fill('input[name="gsrs_pain"]', '2');
      await page.fill('input[name="ar_incontinence"]', '2');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.btn-print', { timeout: 3000 });

      await page.click('.btn-print');
      await page.waitForSelector('.patient-print', { timeout: 3000 });

      const printContent = await page.textContent('.patient-print');
      // Should have pattern description, not confidence/rationale
      expect(printContent).toContain('patterns');
      // Should NOT contain technical jargon like "confidence"
      expect(printContent).not.toContain('confidence level');
    });
  });

  test.describe('Output: Clinician Print', () => {
    test('should generate clinician print with all clinical details', async ({ page }) => {
      await page.fill('input[name="gsrs_pain"]', '2');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('#mode-clinician', { timeout: 3000 });

      await page.click('text="Clinician"');
      await page.waitForSelector('.clinician-print-btn', { timeout: 3000 });
      await page.click('.clinician-print-btn');
      await page.waitForSelector('.clinician-print', { timeout: 3000 });

      const clinicianPrint = await page.textContent('.clinician-print');
      expect(clinicianPrint).toContain('Clinical Impression');
      expect(clinicianPrint).toContain('Investigations');
      expect(clinicianPrint).toMatch(/Tier [1-4]/);
    });

    test('should list investigations matching fired patterns', async ({ page }) => {
      // Trigger nutrient malabsorption pattern
      await page.fill('input[name="gsrs_pain"]', '1');
      await page.fill('input[name="height"]', '170');
      await page.fill('input[name="weight"]', '50');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('#mode-clinician', { timeout: 3000 });

      await page.click('text="Clinician"');
      await page.waitForSelector('.clinician-print-btn', { timeout: 3000 });
      await page.click('.clinician-print-btn');
      await page.waitForSelector('.clinician-print', { timeout: 3000 });

      const investigations = await page.textContent('.clinician-print');
      // Should suggest appropriate investigations
      expect(investigations).toMatch(/FBC|iron|B12|vitamin|serology/i);
    });
  });

  test.describe('Feature: Frequency Dimension', () => {
    test('should apply per-cluster frequency nudge to Index', async ({ page }) => {
      // Answer Constipation items severely without frequency nudge
      await page.fill('input[name="gsrs_constip"]', '3');
      await page.fill('input[name="gsrs_hard"]', '3');
      // Set frequency to minimal (1-2 days/week)
      await page.selectOption('select[name="constipation_freq"]', '0');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.hero-index', { timeout: 3000 });
      const minFreqIndex = await page.textContent('.hero-index');

      // Now answer same GI items with daily frequency
      await page.goto('/');
      await page.evaluate(() => localStorage.clear());
      await page.reload();
      await page.fill('input[name="gsrs_constip"]', '3');
      await page.fill('input[name="gsrs_hard"]', '3');
      await page.selectOption('select[name="constipation_freq"]', '3'); // Daily
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.hero-index', { timeout: 3000 });
      const maxFreqIndex = await page.textContent('.hero-index');

      // Daily frequency should nudge the index higher
      const minVal = parseFloat(minFreqIndex);
      const maxVal = parseFloat(maxFreqIndex);
      expect(maxVal).toBeGreaterThan(minVal);
    });
  });

  test.describe('Data Persistence', () => {
    test('should save and restore a complete visit', async ({ page }) => {
      // Complete a full assessment
      const name = 'Test Patient';
      await page.fill('input[name="patient_name"]', name);
      await page.fill('input[name="gsrs_pain"]', '2');
      await page.fill('input[name="gsrs_bloating"]', '1');
      await page.click('button:has-text("Save")');
      await page.waitForTimeout(500);

      // Reload and verify
      await page.reload();
      await page.waitForSelector('#app', { timeout: 3000 });

      const savedName = await page.inputValue('input[name="patient_name"]');
      expect(savedName).toBe(name);

      const savedPain = await page.inputValue('input[name="gsrs_pain"]');
      expect(savedPain).toBe('2');
    });
  });

  test.describe('Accessibility Baseline', () => {
    test('should have keyboard navigation in questionnaire', async ({ page }) => {
      // Tab through inputs
      await page.press('body', 'Tab');
      const focusedElement = await page.evaluate(() => document.activeElement.name);
      expect(focusedElement).toBeTruthy(); // Should focus on first form input
    });

    test('should have colour contrast on important outputs', async ({ page }) => {
      await page.fill('input[name="gsrs_pain"]', '3');
      await page.click('button:has-text("See results")');
      await page.waitForSelector('.hero-index', { timeout: 3000 });

      // Spot-check that the hero index has explicit colour styling
      const heroStyle = await page.getAttribute('.hero-index', 'style');
      expect(heroStyle).toBeTruthy(); // Should have inline styles
    });
  });
});
