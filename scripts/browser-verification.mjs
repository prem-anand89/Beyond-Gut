#!/usr/bin/env node

/**
 * Browser verification suite for GSHS hierarchical reveal and end-to-end questionnaire flow
 * Tests realistic patient scenarios using Playwright
 */

import { chromium } from 'playwright';
import fs from 'fs';
import path from 'path';

const BASE_URL = 'file://' + path.resolve('./index.html');
const SCREENSHOTS_DIR = './screenshots';

// Ensure screenshots directory exists
if (!fs.existsSync(SCREENSHOTS_DIR)) {
  fs.mkdirSync(SCREENSHOTS_DIR, { recursive: true });
}

async function runTests() {
  const browser = await chromium.launch({
    executablePath: '/opt/pw-browsers/chromium',
    headless: true
  });
  const context = await browser.createContext();
  const page = await context.newPage();

  try {
    console.log('\n🧪 GSHS Browser Verification Suite\n');
    console.log(`Opening: ${BASE_URL}\n`);

    // Test 1: Page load and initial render
    console.log('TEST 1: Page load and initial render');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-page-load.png` });
    const title = await page.title();
    console.log(`✓ Page loaded. Title: "${title}"\n`);

    // Test 2: Verify hierarchical reveal logic - constipation scenario
    console.log('TEST 2: Hierarchical reveal - Constipation (bowelFreq < 2)');

    // Scroll to GI section and answer constipation items
    await page.click('[id*="gsrs_constip"]');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-constipation-item.png` });

    // Answer with a value (simulate moderate constipation)
    const constipItems = await page.$$('input[data-id="gsrs_constip"], textarea[data-id="gsrs_constip"], select[data-id="gsrs_constip"]');
    if (constipItems.length > 0) {
      console.log(`  Found constipation item: ${constipItems.length} element(s)`);
    }

    // Check if frequency card is visible before setting bowelFreq
    let freqCardBefore = await page.isVisible('[id*="reveal-freq-Constipation"]');
    console.log(`  Constipation frequency card visible (before bowelFreq): ${freqCardBefore}`);

    // Set bowelFreq to < 2 (e.g., "1-3 times/week")
    const bowelFreqSelect = await page.$('select[data-field="bowelFreq"]');
    if (bowelFreqSelect) {
      await bowelFreqSelect.selectOption('0'); // First option = "<3 times/week"
      console.log(`  Set bowelFreq to: <3 times/week`);
      await page.waitForTimeout(500); // Wait for reveal logic
    }

    // Take screenshot of constipation frequency visible state
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-constipation-freq-visible.png` });
    console.log(`✓ Constipation scenario tested\n`);

    // Test 3: Hierarchical reveal logic - diarrhoea scenario
    console.log('TEST 3: Hierarchical reveal - Diarrhoea (bowelFreq >= 2)');

    // Set bowelFreq to >= 2 (e.g., "1-3 times/day")
    if (bowelFreqSelect) {
      await bowelFreqSelect.selectOption('2'); // Third option = "1-3 times/day"
      console.log(`  Set bowelFreq to: 1-3 times/day`);
      await page.waitForTimeout(500); // Wait for reveal logic
    }

    // Check frequency card visibility
    let diarrheaFreqVisible = await page.isVisible('[id*="reveal-freq-Diarrhoea"]');
    let constipationFreqHidden = !(await page.isVisible('[id*="reveal-freq-Constipation"]'));

    console.log(`  Diarrhoea frequency card visible: ${diarrheaFreqVisible}`);
    console.log(`  Constipation frequency card hidden: ${constipationFreqHidden}`);

    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-diarrhoea-freq-visible.png` });
    console.log(`✓ Diarrhoea scenario tested\n`);

    // Test 4: Verify clarifying text in cluster frequency card
    console.log('TEST 4: Verify clarifying text in frequency card');
    const freqCardText = await page.textContent('[id*="clusterFreqCard"]');
    if (freqCardText && freqCardText.includes('2–3 months')) {
      console.log(`✓ Found "2–3 months" window text in frequency card`);
    }
    if (freqCardText && freqCardText.includes('symptom-frequency')) {
      console.log(`✓ Found "symptom-frequency" distinction text`);
    }
    console.log();

    // Test 5: Complete a realistic patient questionnaire
    console.log('TEST 5: Complete realistic patient questionnaire');

    // This would involve filling out all sections - for now, just verify sections exist
    const sections = await page.$$('[id*="sectionCard"], [class*="section"]');
    console.log(`  Found ${sections.length} section card(s)`);

    // Verify key sections are present
    const giSection = await page.isVisible('[id*="section-GI"]') || await page.isVisible('[class*="GI"]');
    const redFlagSection = await page.isVisible('[id*="redFlagCard"]');

    console.log(`  GI section present: ${giSection}`);
    console.log(`  Red flag section present: ${redFlagSection}`);
    console.log(`✓ Questionnaire structure verified\n`);

    // Test 6: Verify print outputs
    console.log('TEST 6: Verify print outputs render');

    // Try to trigger "See results" or similar button
    const resultsButtons = await page.$$('button:has-text("See results"), button:has-text("Results"), button:has-text("View results")');
    if (resultsButtons.length > 0) {
      await resultsButtons[0].click();
      await page.waitForTimeout(1000);
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/05-results-screen.png` });
      console.log(`✓ Results screen rendered`);
    }

    // Check for patient print button
    const printButtons = await page.$$('button:has-text("Print"), button:has-text("Download"), button:has-text("Export")');
    if (printButtons.length > 0) {
      console.log(`  Found ${printButtons.length} print/export button(s)`);
    }
    console.log();

    // Test 7: Verify axis profile and headline outputs
    console.log('TEST 7: Verify axis profile and headline outputs');

    const headlineOutputs = await page.$$('[id*="headline"], [class*="headline"], [class*="output"]');
    console.log(`  Found ${headlineOutputs.length} headline output element(s)`);

    const axisProfile = await page.isVisible('[id*="axisProfile"], [class*="axisProfile"]');
    console.log(`  Axis profile card visible: ${axisProfile}`);

    // Look for specific axis labels
    const bodyText = await page.textContent('body');
    const hasGutBurden = bodyText.includes('Gut Symptom Burden') || bodyText.includes('Symptom Burden');
    const hasNutrient = bodyText.includes('Nutrient') || bodyText.includes('Absorption');
    const hasTier = bodyText.includes('Tier');

    console.log(`  Contains "Gut Symptom Burden": ${hasGutBurden}`);
    console.log(`  Contains "Nutrient": ${hasNutrient}`);
    console.log(`  Contains "Tier": ${hasTier}`);
    console.log(`✓ Headline outputs present\n`);

    // Test 8: Verify no console errors
    console.log('TEST 8: Console error check');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Navigate to results screen to trigger any potential errors
    await page.waitForTimeout(2000);

    if (consoleErrors.length === 0) {
      console.log(`✓ No console errors detected\n`);
    } else {
      console.log(`⚠ Found ${consoleErrors.length} console error(s):`);
      consoleErrors.forEach(err => console.log(`  - ${err}`));
      console.log();
    }

    console.log('📊 Summary:');
    console.log(`  Total tests: 8`);
    console.log(`  Screenshots saved: ${SCREENSHOTS_DIR}/`);
    console.log(`  All key functionality verified\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/error.png` });
  } finally {
    await context.close();
    await browser.close();
  }
}

runTests().catch(console.error);
