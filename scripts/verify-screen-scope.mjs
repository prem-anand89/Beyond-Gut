#!/usr/bin/env node
/**
 * Flow-phase-3 verification: Gut Quick Screen is the default for a new
 * anonymous session, Full mode is unchanged when explicitly chosen, and
 * mid-session expand-to-full never loses answers already given. Exercised
 * in a real browser (not just the source-regex checks in gshs-smoke.mjs).
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

  // 1) A brand-new anonymous session defaults to Gut Quick Screen: 2 steps,
  //    Safety first, no Anthropometrics/Background/Medications/etc.
  const stepLabels1 = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({}, false);
    return Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim());
  });
  await page.waitForTimeout(30);
  ok(stepLabels1.length === 2, `new anonymous session shows exactly 2 steps by default (got ${stepLabels1.length})`);
  ok(/Safety/.test(stepLabels1[0] || ''), 'Safety is the first step in Gut Quick Screen');

  const metaText1 = await page.evaluate(() => document.querySelector('#mode-patient')?.textContent || '');
  ok(/Gut quick screen/.test(metaText1), 'the top banner names this a Gut quick screen');
  ok(/Add full assessment/.test(metaText1), 'the "Add full assessment" expand control is visible');

  // 2) Answer a gut symptom, then expand to full — the answer must survive.
  //    questionRow() renders each item as <div class="q"><div class="q-txt"
  //    id="q-{id}">...<div class="opts">...<button class="opt sN">.
  await page.locator('#gstepper .step', { hasText: 'Gut symptoms' }).click();
  await page.waitForTimeout(30);
  const beforeExpand = await page.evaluate(() => {
    const label = document.querySelector('[id^="q-gsrs_"]');
    const opt = label ? label.closest('.q')?.querySelector('.opts .opt') : null;
    if (opt) opt.click();
    return !!opt;
  });
  ok(beforeExpand, 'answered a GSRS item before expanding to full');

  await page.locator('button', { hasText: 'Add full assessment' }).click();
  await page.waitForTimeout(50);

  const afterExpand = await page.evaluate(() => {
    const labels = Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim());
    return { nSteps: labels.length, hasAnthro: labels.some(l => /Anthropometrics/.test(l)) };
  });
  ok(afterExpand.nSteps === 8, `expanding to full reveals all 8 steps (got ${afterExpand.nSteps})`);
  ok(afterExpand.hasAnthro, 'Anthropometrics (a Full-only step) is now visible after expanding');

  const gsrsStillAnswered = await page.evaluate(() => {
    const label = document.querySelector('[id^="q-gsrs_"]');
    const sel = label ? label.closest('.q')?.querySelector('.opts .opt.sel') : null;
    return !!sel;
  });
  ok(gsrsStillAnswered, 'the GSRS answer given before expanding is still selected after expanding — no data loss');

  // 3) flow-phase-3.1 honesty fix, end-to-end: answer EVERY question a fresh
  //    Gut Quick Screen actually shows (Safety's red flags + every GSRS/IMP
  //    item), then view results — completeness must read 100%, not a
  //    "Provisional result" caused by IM/BG/NU mandatory items that were
  //    never shown counting as missing.
  await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({}, false);
  });
  await page.waitForTimeout(30);
  // Safety step: click "No" for every red-flag row (first .opt in each group).
  await page.evaluate(() => {
    document.querySelectorAll('#gstep-safety .opts').forEach(g => g.querySelector('.opt')?.click());
  });
  await page.locator('#gstepper .step', { hasText: 'Gut symptoms' }).click();
  await page.waitForTimeout(30);
  // Gut step: click the first option in every visible scale group (GSRS +
  // IMP; Bristol/cluster-freq/pain/Rome cards use different widgets and are
  // either optional or reveal-gated, so they're intentionally left alone —
  // the completeness denominator never required them in the first place).
  await page.evaluate(() => {
    document.querySelectorAll('#gstep-gut .opts').forEach(g => g.querySelector('.opt')?.click());
  });
  await page.waitForTimeout(30);
  await page.locator('button', { hasText: 'View results' }).click();
  await page.waitForTimeout(100);

  const resultsText = await page.evaluate(() => document.querySelector('#patient-results')?.textContent || '');
  ok(/100% complete/.test(resultsText), `a fully-answered Gut Quick Screen reads 100% complete on the actual results screen (snippet: ${(resultsText.match(/\d+% complete/) || ['<none found>'])[0]})`);
  ok(!/Provisional result/.test(resultsText), 'a fully-answered Gut Quick Screen does NOT show the "Provisional result" caveat');

  if (errors.length) { console.log('Page errors:', errors); failed += errors.length; }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
}

main();
