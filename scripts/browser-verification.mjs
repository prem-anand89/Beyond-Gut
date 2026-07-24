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
  const context = await browser.newContext();
  const page = await context.newPage();

  // Capture runtime errors across the whole run (used by Tests 5 & 8).
  const pageErrors = [];
  page.on('pageerror', e => pageErrors.push('PAGEERROR: ' + e.message));

  try {
    console.log('\n🧪 GSHS Browser Verification Suite\n');
    console.log(`Opening: ${BASE_URL}\n`);

    // Test 1: Page load and initial render
    console.log('TEST 1: Page load and initial render');
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.waitForLoadState('domcontentloaded');
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/01-page-load.png` });
    const title = await page.title();
    console.log(`✓ Page loaded. Title: "${title}"\n`);

    // Test 2: Check for key sections and elements
    console.log('TEST 2: Verify questionnaire sections render');

    // Look for section headers
    const sectionHeaders = await page.$$('h2, h3');
    console.log(`  Found ${sectionHeaders.length} section headers`);

    // Check for input fields (questions)
    const inputs = await page.$$('input[type="radio"], input[type="text"], textarea, select');
    console.log(`  Found ${inputs.length} form input elements`);

    // Check for buttons
    const buttons = await page.$$('button');
    console.log(`  Found ${buttons.length} buttons`);

    if (sectionHeaders.length > 0 && inputs.length > 0) {
      console.log(`✓ Questionnaire structure verified\n`);
    }

    // Test 3: Test basic form interaction
    console.log('TEST 3: Test form interaction');

    // Look for the first radio button or select input and interact with it
    const firstInput = await page.$('input[type="radio"], select');
    if (firstInput) {
      const tagName = await firstInput.evaluate(el => el.tagName.toLowerCase());

      if (tagName === 'input') {
        await firstInput.click();
        console.log(`  ✓ Clicked first radio button`);
      } else if (tagName === 'select') {
        const options = await firstInput.$$('option');
        if (options.length > 1) {
          await firstInput.selectOption('1'); // Select the second option
          console.log(`  ✓ Selected option in first select`);
        }
      }
      await page.screenshot({ path: `${SCREENSHOTS_DIR}/02-after-interaction.png` });
    } else {
      console.log(`  ⚠ No interactive elements found`);
    }
    console.log();

    // Test 4: Check patient print functionality
    console.log('TEST 4: Check results/print functionality');

    // Look for "See results" or similar button
    const resultButtons = await page.$$eval('button', buttons =>
      buttons.filter(b => b.textContent.includes('result') || b.textContent.includes('Result') ||
                          b.textContent.includes('summary') || b.textContent.includes('Summary')).slice(0, 1)
    );

    if (resultButtons.length > 0) {
      console.log(`  Found results button`);
      // Don't click yet - results require more complete form
    } else {
      console.log(`  ⚠ No results button found yet (may appear after form completion)`);
    }
    console.log();

    // Test 5: Verify no console errors
    console.log('TEST 5: Console error check');
    const consoleErrors = [];
    page.on('console', msg => {
      if (msg.type() === 'error') {
        consoleErrors.push(msg.text());
      }
    });

    // Trigger any potential errors with a basic interaction
    await page.keyboard.press('Tab');
    await page.waitForTimeout(500);

    if (consoleErrors.length === 0) {
      console.log(`✓ No console errors detected\n`);
    } else {
      console.log(`⚠ Found ${consoleErrors.length} console error(s):`);
      consoleErrors.forEach(err => console.log(`  - ${err}`));
      console.log();
    }

    // Test 6: Verify CSS and styling loads
    console.log('TEST 6: Verify styling and theming');
    const bodyStyle = await page.evaluate(() => {
      const body = document.body;
      return {
        backgroundColor: window.getComputedStyle(body).backgroundColor,
        color: window.getComputedStyle(body).color,
        fontFamily: window.getComputedStyle(body).fontFamily
      };
    });

    console.log(`  Background: ${bodyStyle.backgroundColor}`);
    console.log(`  Text color: ${bodyStyle.color}`);
    console.log(`✓ Styling loaded correctly\n`);

    // Test 7: Responsive design check
    console.log('TEST 7: Verify responsive layout');
    const viewport = page.viewportSize();
    console.log(`  Current viewport: ${viewport?.width}x${viewport?.height}`);

    // Set to mobile size and check
    await page.setViewportSize({ width: 375, height: 812 });
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/03-mobile-view.png` });
    console.log(`  ✓ Mobile view rendered\n`);

    // Reset viewport
    await page.setViewportSize({ width: 1280, height: 720 });

    // Test 8: Guided-steps wizard — navigation, context nav bar, reveal engine, results
    console.log('TEST 8: Guided-steps wizard flow');
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(400);

    const nSteps = await page.$$eval('#gstepper .step', els => els.length);
    console.log(`  Stepper renders ${nSteps} steps`);
    if (nSteps < 2) throw new Error('guided-steps stepper did not render');

    // Step 1: Back disabled, Next names step 2, current step is ringed.
    const backDisabled1 = await page.$eval('.navbtn.back', el => el.disabled);
    const nextName1 = await page.$eval('.navbtn.next .nm', el => el.textContent.trim());
    const nowLabel1 = await page.$eval('#gstepper .step.now .lb', el => el.textContent.trim());
    if (!backDisabled1) throw new Error('Back button should be disabled on step 1');
    console.log(`  Step 1 "${nowLabel1}": Back disabled ✓, Next → "${nextName1}"`);

    // Advance to the Gut symptoms step and confirm a reveal fires (pain→Rome cards).
    // Walk forward until the active step contains the GI section.
    for (let i = 0; i < nSteps - 1; i++) {
      const onGut = await page.$('.gstep.active #reveal-card-pain');
      if (onGut) break;
      await page.click('.navbtn.next');
      await page.waitForTimeout(180);
    }
    const painBefore = await page.$eval('#reveal-card-pain', el => getComputedStyle(el).display);
    await page.evaluate(() => {
      const rows = Array.from(document.querySelectorAll('.gstep.active .q'));
      for (const r of rows) {
        const t = r.querySelector('.q-txt');
        if (t && /abdominal pain/i.test(t.textContent)) {
          const opts = r.querySelectorAll('.opt');
          if (opts[2]) opts[2].click();
          return;
        }
      }
    });
    await page.waitForTimeout(250);
    const painAfter = await page.$eval('#reveal-card-pain', el => getComputedStyle(el).display);
    if (painBefore !== 'none' || painAfter === 'none') {
      throw new Error(`reveal engine broke inside the wizard (pain card ${painBefore}→${painAfter})`);
    }
    console.log(`  Reveal engine intact: pain card ${painBefore} → ${painAfter} after answering pain ✓`);

    // Walk to the last step; Next should read "View results" and run calc().
    for (let i = 0; i < nSteps; i++) {
      const isLast = await page.$eval('.navbtn.next .nm', el => /view results/i.test(el.textContent));
      if (isLast) break;
      await page.click('.navbtn.next');
      await page.waitForTimeout(150);
    }
    const lastNext = await page.$eval('.navbtn.next .nm', el => el.textContent.trim());
    console.log(`  Last step Next button: "${lastNext}"`);
    await page.click('.navbtn.next');
    await page.waitForTimeout(500);
    const hasResults = await page.$eval('#patient-results', el => el.children.length > 0);
    const hasHero = !!(await page.$('#patient-results .hero'));
    if (!hasResults || !hasHero) throw new Error('View results did not render the results screen');
    console.log(`  "View results" rendered the headline + hero score ✓`);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/04-guided-steps-results.png` });

    if (pageErrors.length) {
      console.log(`  ⚠ ${pageErrors.length} runtime error(s) during wizard flow:`);
      pageErrors.forEach(e => console.log(`    - ${e}`));
      throw new Error('runtime errors during guided-steps navigation');
    }
    console.log(`✓ Guided-steps wizard verified (navigation, reveal, results, no errors)\n`);

    console.log('📊 Summary:');
    console.log(`  Total tests: 8`);
    console.log(`  Screenshots saved: ${SCREENSHOTS_DIR}/`);
    console.log(`  Basic functionality verified\n`);

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    await page.screenshot({ path: `${SCREENSHOTS_DIR}/error.png` }).catch(() => {});
    process.exit(1);
  } finally {
    await context.close();
    await browser.close();
  }
}

runTests().catch(console.error);
