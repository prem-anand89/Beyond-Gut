const ui_patient = require('ui-patient.js');
const ui_record = require('ui-record.js');
const storage = require('storage.js');
const util = require('util.js');

const Patient = __req('ui-patient.js');
const Record = __req('ui-record.js');
const Store = __req('storage.js');
const { $, $$ } = __req('util.js');

function setMode(name) {
  $$('.mode').forEach(s => s.classList.toggle('show', s.id === 'mode-' + name));
  $$('.mode-btn').forEach(b => b.classList.toggle('active', b.dataset.mode === name));
  // The header progress strip is only meaningful on the questionnaire.
  const prog = document.getElementById('appProgress');
  if (prog) prog.style.display = name === 'patient' ? 'block' : 'none';
  if (name === 'record') Record.show();
  if (name === 'clinician') Patient.renderClinician();
}

function boot() {
  Record.init({
    // Switch to the questionnaire, optionally pre-bound to a patient identity + follow-up.
    goQuestionnaire: (identity, followup) => { Patient.newVisitFor(identity, followup); setMode('patient'); window.scrollTo({ top: 0 }); },
    // Re-open a SAVED visit. showResults=true → read-only summary on the
    // Clinician tab (no editable-form dump); false → load answers into the
    // questionnaire for editing.
    openVisit: (identity, visit, showResults) => {
      Patient.loadVisit(identity, visit, showResults);
      setMode(showResults ? 'clinician' : 'patient');
      window.scrollTo({ top: 0 });
    },
  });
  // Let the questionnaire banner jump to the records tab (to pick/manage patients).
  Patient.init({ goRecords: () => setMode('record') });
  Patient.reset(); Patient.render();
  const sw = document.getElementById('modeSwitch');
  if (sw) sw.addEventListener('click', e => { const b = e.target.closest('.mode-btn'); if (b) setMode(b.dataset.mode); });
  const clr = document.getElementById('activeClear');
  if (clr) clr.addEventListener('click', () => { Patient.clearPatient(); setMode('patient'); });
}
boot();
// Pilot-data hook: until the clinician/database surface lands, a researcher can
// pull the de-identified item-level CSV from the console via __gutPilotCSV().
if (typeof window !== 'undefined') window.__gutPilotCSV = () => Store.pilotExportCSV(Store.loadDB());
return __e;