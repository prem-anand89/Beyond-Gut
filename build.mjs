#!/usr/bin/env node
/**
 * Build script for GSHS - optimizes index.html for production
 * - Minifies inline JavaScript
 * - Preserves HTML structure and offline capability
 * - Creates production bundle
 */

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

const SOURCE = './index.html';
const DIST_DIR = './dist';
const PROD_OUTPUT = './dist/index.html';
const MIN_JS_OUTPUT = './dist/gshs.min.js';

// Ensure dist directory exists
if (!fs.existsSync(DIST_DIR)) {
  fs.mkdirSync(DIST_DIR, { recursive: true });
}

console.log('🏗️ Building GSHS...\n');

try {
  // Read source HTML
  const html = fs.readFileSync(SOURCE, 'utf-8');

  // Extract the inline script
  const scriptMatch = html.match(/<script>([\s\S]*?)<\/script>/);
  if (!scriptMatch) {
    throw new Error('No script tag found in index.html');
  }

  const inlineScript = scriptMatch[1];

  // Write temporary .mjs file for esbuild
  const tempScriptPath = './temp-gshs-script.mjs';
  // Wrap the script as a module so esbuild can process it
  fs.writeFileSync(tempScriptPath, inlineScript);

  console.log('📝 Extracting inline script...');

  // Use esbuild to bundle/minify
  if (process.env.NODE_ENV === 'production') {
    console.log('🔧 Minifying with esbuild...');
    try {
      execSync(`npx esbuild ${tempScriptPath} --outfile=${MIN_JS_OUTPUT} --minify --target=es2015`, {
        stdio: 'pipe'
      });
      console.log(`✓ Minified script: ${MIN_JS_OUTPUT}`);
    } catch (e) {
      console.log('⚠️  esbuild minification skipped (fallback to original)');
    }
  }

  // Copy HTML to dist as-is for now (full-featured version)
  fs.copyFileSync(SOURCE, PROD_OUTPUT);
  console.log(`✓ Copied to dist: ${PROD_OUTPUT}`);

  // Create a summary
  const sourceSize = fs.statSync(SOURCE).size;
  const distSize = fs.statSync(PROD_OUTPUT).size;

  console.log(`\n✅ Build complete:`);
  console.log(`  Source: ${(sourceSize / 1024).toFixed(1)}KB`);
  console.log(`  Dist: ${(distSize / 1024).toFixed(1)}KB`);
  console.log(`\n📦 Output: ${PROD_OUTPUT}`);

  // Clean up temp file
  if (fs.existsSync(tempScriptPath)) {
    fs.unlinkSync(tempScriptPath);
  }

} catch (error) {
  console.error('❌ Build failed:', error.message);
  process.exit(1);
}
