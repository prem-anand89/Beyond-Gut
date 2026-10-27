#!/usr/bin/env node
/**
 * Flow-phase-5 verification: acceptance-criteria polish — privacy one-liner,
 * patient-facing "take this to my appointment" action, the Gut/Full mode
 * badge on the Clinician tab, and the stepper's live time-left estimate.
 * Exercised in a real browser, not just source-regex checks.
 */
import { chromium } from 'playwright';
import path from 'path';

const BASE_URL = 'file://' + path.resolve('./index.html');

async function main() {
  const browser = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', e => errors.push(e.message));

  let failed = 0;
  const ok = (cond, label) => { console.log(`${cond ? 'ok  ' : 'FAIL'} - ${label}`); if (!cond) failed++; };

  await page.goto(BASE_URL, { waitUntil: 'domcontentloaded' });
  await page.evaluate(() => localStorage.clear());
  await page.evaluate(() => { window.__req('ui-patient.js').newVisitFor({}, false); });
  await page.waitForTimeout(30);

  const startText = await page.evaluate(() => document.querySelector('#mode-patient')?.textContent || '');
  ok(/Data stays on this device/.test(startText), 'the privacy one-liner renders on the actual start screen');

  const subText1 = await page.evaluate(() => document.getElementById('gstepsub')?.textContent || '');
  ok(/min left/.test(subText1), `the stepper sub-line shows a time-left estimate on step 1 (got "${subText1}")`);

  // Walk to the last step and confirm the estimate shrinks as steps pass.
  await page.locator('#gstepper .step', { hasText: 'Medications' }).click();
  await page.waitForTimeout(30);
  const subText2 = await page.evaluate(() => document.getElementById('gstepsub')?.textContent || '');
  const min1 = parseInt((subText1.match(/~(\d+) min left/) || [])[1] || '99', 10);
  const min2 = parseInt((subText2.match(/~(\d+) min left/) || [])[1] || '99', 10);
  ok(min2 <= min1, `the time-left estimate on the last step (${min2}) is not greater than on step 1 (${min1})`);

  // Finish the quick screen and confirm the patient-facing action button.
  await page.evaluate(() => {
    document.querySelectorAll('[id^="gstep-"].active .opts').forEach(g => g.querySelector('.opt')?.click());
  });
  await page.locator('button', { hasText: 'View results' }).click();
  await page.waitForTimeout(100);
  const resultsText = await page.evaluate(() => document.querySelector('#patient-results')?.textContent || '');
  ok(/Take this to my appointment/.test(resultsText), 'the patient results screen shows the renamed "Take this to my appointment" action');
  ok(!/🖨 Clinician report/.test(resultsText), 'the old "Clinician report" label is gone from the PATIENT results screen');

  // Mode badge on the Clinician tab.
  await page.evaluate(() => { window.__req('ui-patient.js').renderClinician(); });
  const clinicianText = await page.evaluate(() => document.querySelector('#mode-clinician')?.textContent || '');
  ok(/Gut Screen/.test(clinicianText), 'the Clinician tab shows the "Gut Screen" mode badge for a gut-only visit');

  if (errors.length) { console.log('Page errors:', errors); failed += errors.length; }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
}

main();
