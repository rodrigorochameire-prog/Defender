import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

await esbuild.build({
  entryPoints: [path.join(rootDir, 'api/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'cjs',
  outfile: path.join(rootDir, 'api/index.js'),
  external: ['pg-native'],
  // Ensure all local modules are bundled
  packages: 'bundle',
  // Resolve paths from root
  absWorkingDir: rootDir,
  // Source map for debugging
  sourcemap: false,
  // Minify for smaller bundle
  minify: false,
  // Keep names for debugging
  keepNames: true,
});

console.log('✅ API build complete: api/index.js');

