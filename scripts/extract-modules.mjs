#!/usr/bin/env node
/**
 * Extract inlined modules from index.html into separate .mjs files
 * Usage: node scripts/extract-modules.mjs
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

  // Convert to CommonJS export format
  const jsCode = convertToCommonJS(moduleName, moduleBody);

  // Write to file
  const outputPath = path.join(OUTPUT_DIR, moduleName);
  fs.writeFileSync(outputPath, jsCode);

  console.log(`✓ Extracted ${moduleName} → ${outputPath} (${jsCode.length} bytes)`);
  extractedCount++;
}

// Create index.js that exports all modules
const indexContent = generateIndex(Object.keys(modules));
fs.writeFileSync(path.join(OUTPUT_DIR, 'index.js'), indexContent);
console.log(`\n✓ Generated index.js (${indexContent.length} bytes)`);

// Create a build configuration file
generateEsbuildConfig();

console.log(`\n📦 Extraction complete: ${extractedCount} modules extracted`);
console.log('\nNext steps:');
console.log('1. npm install --save-dev esbuild');
console.log('2. npm run build');
console.log('3. npm run test:smoke');

/**
 * Convert a module function to CommonJS export
 * Changes: __e.X = X to module.exports.X = X
 */
function convertToCommonJS(moduleName, body) {
  let code = body.trim();

  // Replace __e.name = name with module.exports.name = name
  code = code.replace(/__e\.(\w+)\s*=\s*(\w+)/g, 'module.exports.$1 = $2');

  // Add standard imports at the top if the module uses __req
  if (code.includes('__req(')) {
    const imports = extractRequiredModules(code);
    if (imports.length > 0) {
      const importLines = imports
        .map(mod => `const ${sanitizeImportName(mod)} = require('${mod}');`)
        .join('\n');
      code = importLines + '\n\n' + code;
    }
  }

  return code;
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
 * Generate index.js that re-exports all modules
 */
function generateIndex(moduleNames) {
  const imports = moduleNames
    .map(name => `const ${sanitizeImportName(name)} = require('./${name}');`)
    .join('\n');

  const exports = moduleNames
    .map(name => `  '${name}': ${sanitizeImportName(name)},`)
    .join('\n');

  return `${imports}

// Central export for all modules
module.exports = {
${exports}
};
`;
}

/**
 * Generate esbuild configuration
 */
function generateEsbuildConfig() {
  const esbuildConfig = `import * as esbuild from 'esbuild';
import fs from 'fs';

export async function build() {
  try {
    await esbuild.build({
      entryPoints: ['src/core/index.js'],
      bundle: true,
      outfile: 'dist/gshs-bundle.js',
      format: 'iife',
      platform: 'browser',
      globalName: 'GSHS',
      minify: process.env.NODE_ENV === 'production',
      sourcemap: process.env.NODE_ENV !== 'production',
      external: [],
    });
    console.log('✓ Build complete: dist/gshs-bundle.js');
  } catch (error) {
    console.error('Build failed:', error);
    process.exit(1);
  }
}

if (import.meta.url === \`file://\\\${process.argv[1]}\`) {
  build();
}
`;

  fs.writeFileSync('./esbuild.config.mjs', esbuildConfig);
  console.log(`✓ Generated esbuild.config.mjs`);
}
