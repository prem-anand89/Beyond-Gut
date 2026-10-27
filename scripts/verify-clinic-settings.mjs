#!/usr/bin/env node
/**
 * Flow-phase-4 verification: Clinic device settings — a device can set its
 * own default screening scope for new patients, and a "skip to symptoms"
 * follow-up mode that only kicks in when a returning patient's profile
 * actually hydrated. Exercised in a real browser against real localStorage.
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

  // 1) Default behavior (no device settings saved yet): new visits still
  //    default to Gut scope, same as every prior phase.
  const defaultBehavior = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({}, false);
    return Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim()).length;
  });
  ok(defaultBehavior === 4, `with no device settings saved, a new visit still defaults to Gut scope (4 steps), got ${defaultBehavior}`);

  // 2) Set this device's default scope to Full via the real storage path
  //    (same shape clinicDeviceSettings() writes), then start a new visit —
  //    it should open directly in Full mode (8 steps), no manual expand needed.
  await page.evaluate(() => {
    const Store = window.__req('storage.js');
    const db = Store.loadDB();
    db.meta.screenDefaults = { defaultScope: 'full', followupScope: 'full' };
    Store.saveDB(db);
  });
  const fullByDefault = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({}, false);
    return Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim());
  });
  ok(fullByDefault.length === 8, `with this device set to default Full, a brand-new visit opens directly in Full mode (8 steps), got ${fullByDefault.length}`);
  ok(!fullByDefault.some(l => /Gut quick screen/.test(l)), 'no "Add full assessment" / quick-screen framing shown when the device default IS full');

  // 3) Follow-up "skip to symptoms" mode — ONLY activates when a profile
  //    actually hydrated. First confirm it does NOT activate for a brand-new
  //    patient (no profile yet) even with followupScope set to symptoms_only.
  await page.evaluate(() => {
    const Store = window.__req('storage.js');
    const db = Store.loadDB();
    db.meta.screenDefaults = { defaultScope: 'gut', followupScope: 'symptoms_only' };
    Store.saveDB(db);
  });
  const newPatientFollowup = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({ ref: 'CLINICSETTINGS1' }, true); // followup=true, but no saved profile exists for this ref yet
    return Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim());
  });
  ok(newPatientFollowup.some(l => /Background/.test(l)), 'a "follow-up" for a patient with NO saved profile yet still shows Background — skip-mode never fires without real history to fall back on');

  // 4) Now seed a real profile for that ref, then start a follow-up — THIS
  //    time Background/Meds must be skipped entirely (not just reordered).
  await page.evaluate(() => {
    const Store = window.__req('storage.js');
    const db = Store.loadDB();
    const profile = Store.profileFromExtras({ conditions: ['ibs'], surgeries: [], familyHistory: [], knownLabs: [], medsConfounders: [], meds: { abx: false, ppi: false, nsaid: false } });
    db.patients.push({ id: Store.uid(), code: Store.nextPatientCode(db), ref: 'CLINICSETTINGS1', createdAt: Date.now(), visits: [], profile });
    Store.saveDB(db);
  });
  const skipFollowup = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({ ref: 'CLINICSETTINGS1' }, true);
    return Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim());
  });
  ok(skipFollowup.length === 2, `a follow-up with an existing hydrated profile, on a device set to skip, shows only Safety+Gut (got ${skipFollowup.length}: ${skipFollowup.join(', ')})`);
  ok(!skipFollowup.some(l => /Background|Medications/.test(l)), 'Background and Medications are genuinely absent, not just reordered, in follow-up skip mode');

  // 5) A fresh baseline (non-follow-up) visit for the SAME patient, same
  //    device settings, must NOT skip — the skip is follow-up-specific.
  const baselineAgain = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({ ref: 'CLINICSETTINGS1' }, false); // followup=false this time
    return Array.from(document.querySelectorAll('#gstepper .step')).map(s => s.textContent.trim());
  });
  ok(baselineAgain.some(l => /Background/.test(l)), 'a non-follow-up (baseline) visit for the same patient still shows Background — the skip only applies to follow-ups');

  if (errors.length) { console.log('Page errors:', errors); failed += errors.length; }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
}

main();
