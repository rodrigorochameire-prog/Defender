import * as esbuild from 'esbuild';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');

await esbuild.build({
  entryPoints: [path.join(rootDir, 'server/api/index.ts')],
  bundle: true,
  platform: 'node',
  target: 'node18',
  // Use CommonJS format for Vercel serverless
  format: 'cjs',
  outfile: path.join(rootDir, 'api/index.cjs'),
  // External native modules that can't be bundled
  external: ['pg-native', 'bufferutil', 'utf-8-validate'],
  // Bundle all packages (don't treat node_modules as external)
  packages: 'bundle',
  // Resolve paths from project root
  absWorkingDir: rootDir,
  // Define process.env for Node.js
  define: {
    'process.env.NODE_ENV': '"production"',
  },
  // Don't use sourcemaps in production
  sourcemap: false,
  // Don't minify for easier debugging
  minify: false,
  // Keep function/class names for debugging
  keepNames: true,
  // Log level
  logLevel: 'info',
});

console.log('✅ API build complete: api/index.cjs');

