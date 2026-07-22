const util = require('./util.js');
const schema = require('./schema.js');
const scales = require('./scales.js');
const redflags = require('./redflags.js');
const scoring = require('./scoring.js');
const romeiv = require('./romeiv.js');
const patterns = require('./patterns.js');
const triage = require('./triage.js');
const trend = require('./trend.js');
const storage = require('./storage.js');
const ui_patient = require('./ui-patient.js');
const ui_record = require('./ui-record.js');
const app = require('./app.js');

// Central export for all modules
module.exports = {
  'util.js': util,
  'schema.js': schema,
  'scales.js': scales,
  'redflags.js': redflags,
  'scoring.js': scoring,
  'romeiv.js': romeiv,
  'patterns.js': patterns,
  'triage.js': triage,
  'trend.js': trend,
  'storage.js': storage,
  'ui-patient.js': ui_patient,
  'ui-record.js': ui_record,
  'app.js': app,
};
