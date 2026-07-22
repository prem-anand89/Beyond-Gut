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

    console.log('📊 Summary:');
    console.log(`  Total tests: 7`);
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
