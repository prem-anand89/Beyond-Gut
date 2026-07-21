#!/usr/bin/env node
/**
 * GSHS Build Script
 *
 * Currently: Validates that index.html has all inlined modules.
 * Future: Can extract/bundle modules with esbuild when source files are migrated.
 *
 * The single-file index.html approach is optimal for offline clinical deployment.
 * Module extraction into separate files improves code readability for developers
 * but requires bundling for final deployment.
 */

const fs = require('fs');
const path = require('path');

const indexPath = path.join(__dirname, 'index.html');
const html = fs.readFileSync(indexPath, 'utf8');

// List of modules that should be defined in index.html
const requiredModules = [
  'util.js',
  'schema.js',
  'scales.js',
  'redflags.js',
  'scoring.js',
  'romeiv.js',
  'patterns.js',
  'triage.js',
  'trend.js',
  'ui-patient.js',
  'storage.js',
];

console.log('🔍 Verifying bundled modules...\n');

let allFound = true;
requiredModules.forEach(mod => {
  const moduleRegex = new RegExp(`__modules\\['${mod}'\\]\\s*=\\s*function`);
  if (moduleRegex.test(html)) {
    console.log(`✅ ${mod}`);
  } else {
    console.log(`❌ ${mod} NOT FOUND`);
    allFound = false;
  }
});

if (allFound) {
  console.log('\n✓ All required modules are present in index.html');
  process.exit(0);
} else {
  console.log('\n❌ Some modules are missing!');
  process.exit(1);
}
