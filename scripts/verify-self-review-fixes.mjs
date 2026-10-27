#!/usr/bin/env node
/**
 * Verifies the 3 bugs found reviewing all work done this session (profile
 * persistence through acceptance-criteria polish), each reproduced live in
 * a real browser before being fixed:
 *
 * 1. updateProgress()'s "Answered X of Y" counter counted against every
 *    mandatory question in the schema, not the subset Gut mode shows, so
 *    it could never reach 100% for a Gut Quick Screen patient.
 * 2. GUT_SCOPE_CAVEAT only fired on screenScope === 'gut', so a device set
 *    to defaultScope:'full' + followupScope:'symptoms_only' could skip
 *    Background/Meds on a "Full Assessment"-labeled follow-up with no
 *    caveat anywhere.
 * 3. The "Mark as follow-up" banner toggle flipped session.followup
 *    without recomputing followupQuickMode, leaving Background/Meds
 *    visibility stale against the toggle.
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

  // ── Bug 1: progress counter now reaches 100% for a fully-answered gut visit.
  await page.evaluate(() => { window.__req('ui-patient.js').newVisitFor({}, false); });
  await page.waitForTimeout(30);
  await page.evaluate(() => {
    document.querySelectorAll('#gstep-safety .opts').forEach(g => g.querySelector('.opt')?.click());
  });
  await page.locator('#gstepper .step', { hasText: 'Gut symptoms' }).click();
  await page.waitForTimeout(30);
  await page.evaluate(() => {
    document.querySelectorAll('#gstep-gut .opts').forEach(g => g.querySelector('.opt')?.click());
  });
  await page.waitForTimeout(30);
  const progressText = await page.evaluate(() => document.getElementById('progressText')?.textContent || '');
  ok(/Answered 20 of 20/.test(progressText), `the live progress counter reaches 20 of 20 (100%) once every Gut-mode question is answered, not stuck at "20 of 34" (got "${progressText}")`);

  // ── Bug 2: Full scope + followup-skip now shows a caveat, not silence.
  await page.evaluate(() => {
    const Store = window.__req('storage.js');
    const db = Store.loadDB();
    db.meta.screenDefaults = { defaultScope: 'full', followupScope: 'symptoms_only' };
    const profile = Store.profileFromExtras({ conditions: ['ibs'], surgeries: [], familyHistory: [], knownLabs: [], medsConfounders: [], meds: { abx: false, ppi: false, nsaid: false } });
    db.patients.push({ id: Store.uid(), code: Store.nextPatientCode(db), ref: 'SELFREVIEW1', createdAt: Date.now(), visits: [], profile });
    Store.saveDB(db);
  });
  const fullFollowupSteps = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({ ref: 'SELFREVIEW1' }, true);
    return Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim());
  });
  ok(!fullFollowupSteps.some(l => /Background|Medications/.test(l)),
    `sanity: Full-scope + followup-skip does skip Background/Medications (got: ${fullFollowupSteps.join(', ')})`);
  // renderClinician() reads lastCalc, populated by calc() — reach it the
  // same way a real user would, via "View results" on the last step.
  await page.locator('#gstepper .step', { hasText: 'Treatments' }).click();
  await page.waitForTimeout(30);
  await page.locator('button', { hasText: 'View results' }).click();
  await page.waitForTimeout(100);
  await page.evaluate(() => { window.__req('ui-patient.js').renderClinician(); });
  const clinicianText2 = await page.evaluate(() => document.querySelector('#mode-clinician')?.textContent || '');
  ok(/Full Assessment/.test(clinicianText2), 'badge correctly still reads "Full Assessment" for this device/scope');
  ok(/not reviewed this visit/.test(clinicianText2),
    'but the report NOW also carries a caveat naming that Background/medications were skipped — not silent under the "Full Assessment" label');

  // ── Bug 3: toggling follow-up mid-session keeps Background/Meds in sync.
  const beforeToggle = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({ ref: 'SELFREVIEW1' }, false); // baseline — Background should show
    return Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim());
  });
  ok(beforeToggle.some(l => /Background/.test(l)), 'sanity: a fresh baseline visit for this patient shows Background');
  await page.waitForTimeout(30);
  await page.locator('button', { hasText: 'Mark as follow-up' }).click();
  await page.waitForTimeout(30);
  const afterToggle = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim()));
  ok(!afterToggle.some(l => /Background|Medications/.test(l)),
    `clicking "Mark as follow-up" mid-session now immediately hides Background/Medications (device is set to skip), not left stale from the baseline load (got: ${afterToggle.join(', ')})`);
  await page.locator('button', { hasText: 'Follow-up ✓' }).click(); // toggle back off
  await page.waitForTimeout(30);
  const afterToggleBack = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim()));
  ok(afterToggleBack.some(l => /Background/.test(l)),
    `toggling back OFF (baseline again) immediately restores Background, not left stale from the follow-up skip (got: ${afterToggleBack.join(', ')})`);

  if (errors.length) { console.log('Page errors:', errors); failed += errors.length; }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
}

main();
