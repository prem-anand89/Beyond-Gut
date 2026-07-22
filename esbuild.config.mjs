import * as esbuild from 'esbuild';
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

if (import.meta.url === `file://\${process.argv[1]}`) {
  build();
}
