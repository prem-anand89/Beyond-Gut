#!/usr/bin/env node
/**
 * Extract inlined modules from index.html into separate ES6 .mjs files
 * Properly handles __req dependencies by converting to ES6 imports
 * Usage: node scripts/extract-modules-esm.mjs
 */

import fs from 'fs';
import path from 'path';

const HTML_FILE = './index.html';
const OUTPUT_DIR = './src/core';

// Ensure output directory exists
if (!fs.existsSync(OUTPUT_DIR)) {
  fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}

// Read the HTML file
const html = fs.readFileSync(HTML_FILE, 'utf-8');

// Find all module definitions: __modules['module.js'] = function(__e) { ... }
const moduleRegex = /__modules\['([^']+)'\]\s*=\s*function\s*\(\s*__e\s*\)\s*\{([\s\S]*?)\n\};/g;

let match;
let extractedCount = 0;
const modules = {};

while ((match = moduleRegex.exec(html)) !== null) {
  const moduleName = match[1];
  const moduleBody = match[2];
  modules[moduleName] = moduleBody;

  // Convert to ES6 module format
  const jsCode = convertToESM(moduleName, moduleBody);

  // Write to file
  const outputPath = path.join(OUTPUT_DIR, moduleName);
  fs.writeFileSync(outputPath, jsCode);

  console.log(`✓ Extracted ${moduleName} → ${outputPath}`);
  extractedCount++;
}

// Create an index file that re-exports all modules for bundling
generateIndexFile(Object.keys(modules));

console.log(`\n📦 Extraction complete: ${extractedCount} modules extracted`);
console.log('\nNext steps:');
console.log('1. npm run build');
console.log('2. npm run test:smoke');

/**
 * Convert a module function to ES6 module format
 * __e.X = value becomes export const X = value
 * __req('module.js') becomes import { ... } from './module.js'
 */
function convertToESM(moduleName, body) {
  let code = body.trim();

  // Remove the `return __e;` statement at the end
  code = code.replace(/\n\s*return\s+__e;?\s*$/, '');

  // Extract __req calls and build imports
  const requiredModules = extractRequiredModules(code);

  // Convert __req calls to proper imports
  // Keep the variable names used in the code
  const imports = new Map();
  for (const mod of requiredModules) {
    const varName = sanitizeImportName(mod);
    imports.set(mod, varName);
    code = code.replace(new RegExp(`__req\\('${mod}'\\)`, 'g'), varName);
  }

  // Convert __e.X = value exports to export const
  const exportedVars = new Set();
  code = code.replace(/__e\.(\w+)\s*=\s*([^;]+);?/g, (match, varName, value) => {
    exportedVars.add(varName);
    return `export const ${varName} = ${value};`;
  });

  // Build import statements
  let importLines = '';
  if (imports.size > 0) {
    for (const [mod, varName] of imports) {
      importLines += `import * as ${varName} from './${mod}';\n`;
    }
    importLines += '\n';
  }

  return importLines + code;
}

/**
 * Extract module names from __req calls
 */
function extractRequiredModules(code) {
  const reqRegex = /__req\('([^']+)'\)/g;
  const modules = new Set();
  let match;

  while ((match = reqRegex.exec(code)) !== null) {
    modules.add(match[1]);
  }

  return Array.from(modules);
}

/**
 * Sanitize import name (remove .js, handle special cases)
 */
function sanitizeImportName(moduleName) {
  return moduleName
    .replace(/\.js$/, '')
    .replace(/-/g, '_')
    .replace(/'/g, '');
}

/**
 * Generate an index file for bundling
 */
function generateIndexFile(moduleNames) {
  const imports = moduleNames
    .map(name => `import * as ${sanitizeImportName(name)} from './${name}';`)
    .join('\n');

  const indexContent = `${imports}

// Main entry point - re-export all modules for the application
export default {
${moduleNames.map(name => `  '${name}': ${sanitizeImportName(name)},`).join('\n')}
};
`;

  fs.writeFileSync(path.join(OUTPUT_DIR, 'index.mjs'), indexContent);
  console.log(`✓ Generated index.mjs`);
}
