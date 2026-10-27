#!/usr/bin/env node
/**
 * Flow-phase-1 verification: patient-level profile persistence, exercised
 * through a real browser + real localStorage (not just the DOM-free module
 * tests in gshs-smoke.mjs). Confirms the full round trip: save a visit with
 * history chips set -> start a new visit for the same patient (by ref) ->
 * history is pre-filled without re-clicking -> change one chip -> save ->
 * reload the patient record -> the change is the new baseline.
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

  // 1) Seed a first visit for a referenced patient with history already set.
  //    extras is closure-private inside ui-patient.js (not exported), so this
  //    seeds the SAME end state saveVisit() would have produced, directly
  //    through the real storage.js functions, against real localStorage —
  //    then step 2 below drives the actual newVisitFor()/render() UI path.
  const result = await page.evaluate(() => {
    const Store = window.__req('storage.js');
    // Build a visit's extras the way the real wizard would leave them after
    // the patient ticks chips on the About/history step, then go through the
    // exact same storage functions saveVisit()/newVisitFor() use internally.
    let db = Store.loadDB();
    const profile1 = Store.profileFromExtras({
      conditions: ['ibs', 'autoimmune'], surgeries: ['appendix'], surgeryOther: '',
      familyHistory: ['fh_ibd'], obstetric: [], knownLabs: ['vitamins'], knownLabsDetail: { vitamins: 'B12 low' },
      medsConfounders: [], medsOther: '', meds: { abx: false, ppi: true, nsaid: false }, heightCm: 165,
    });
    profile1.profileUpdatedAt = Date.now();
    db.patients.push({ id: Store.uid(), code: Store.nextPatientCode(db), ref: 'PPTEST1', createdAt: Date.now(), visits: [], profile: profile1 });
    const saved = Store.saveDB(db);
    return { savedOk: !!saved };
  });
  ok(result.savedOk, 'saveDB() writes the new patient + profile to real localStorage');

  // 2) Reload the page (fresh JS context, same localStorage) and confirm
  //    findPatient()+applyProfile() hydrate a brand-new visit for that ref.
  await page.reload({ waitUntil: 'domcontentloaded' });
  const hydrated = await page.evaluate(() => {
    const P = window.__req('ui-patient.js');
    P.newVisitFor({ name: '', age: '34', gender: 'Female', ref: 'PPTEST1' }, false);
    P.render(); // paint the wizard so the About step (and its banner) exist in the DOM
    return true;
  });
  ok(hydrated, 'newVisitFor() + render() ran without throwing after reload');

  // flow-phase-3: every new visit now defaults to the Gut Quick Screen, which
  // doesn't show the Background step (or its hydration banner) at all. Click
  // the real "Add full assessment" button — the same path an actual patient
  // would use — before checking the banner/chips below.
  await page.waitForTimeout(50);
  const expandBtn = page.locator('button', { hasText: 'Add full assessment' });
  await expandBtn.click();
  await page.waitForTimeout(50);
  // expandToFull() keeps the patient on whichever step they were on (by id),
  // which was 'safety' here, not 'background' — jump to Background the same
  // way a real patient would, via its stepper chip.
  await page.locator('#gstepper button', { hasText: 'Background' }).click();
  await page.waitForTimeout(50);
  const bannerText = await page.evaluate(() => {
    const el = document.querySelector('#mode-patient')?.textContent || '';
    return el;
  });
  ok(bannerText.includes('pre-filled from your last visit'), 'the hydration banner text renders on the Background step for a returning patient');

  const conditionChipSelected = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.chip-opt'));
    const b = btns.find(x => x.textContent.includes('Autoimmune'));
    return !!b && b.classList.contains('sel');
  });
  ok(conditionChipSelected, 'the autoimmune condition chip is pre-selected on the real rendered page, not re-clicked');

  // 3) Change one chip (simulate the patient un-ticking a condition) and save
  //    through the real saveVisit(), then confirm the new baseline persists.
  const afterEdit = await page.evaluate(() => {
    const btns = Array.from(document.querySelectorAll('.chip-opt'));
    const b = btns.find(x => x.textContent.includes('Autoimmune'));
    if (b) b.click(); // untick it
    const P = window.__req('ui-patient.js');
    const res = P.render && P.saveVisit ? P.saveVisit() : null;
    return { saved: !!res };
  });
  ok(afterEdit.saved, 'saveVisit() succeeds after editing a hydrated chip');

  const finalProfile = await page.evaluate(() => {
    const Store = window.__req('storage.js');
    const db = Store.loadDB();
    const p = db.patients.find(x => (x.ref || '').toUpperCase() === 'PPTEST1');
    return p ? p.profile : null;
  });
  ok(!!finalProfile, 'patient record for PPTEST1 still exists after save');
  ok(finalProfile && !(finalProfile.conditions || []).includes('autoimmune'), 'un-ticking the chip and saving persisted as the new baseline (autoimmune no longer in profile)');
  ok(finalProfile && (finalProfile.conditions || []).includes('ibs'), 'the untouched condition chip (ibs) is still in the new baseline');
  ok(finalProfile && finalProfile.knownLabsDetail && finalProfile.knownLabsDetail.vitamins === 'B12 low', 'free-text lab detail survived the hydrate -> edit -> save round trip untouched');

  if (errors.length) { console.log('Page errors:', errors); failed += errors.length; }

  await browser.close();
  console.log(failed ? `\n${failed} check(s) failed.` : '\nAll checks passed.');
  process.exit(failed ? 1 : 0);
}

main();
