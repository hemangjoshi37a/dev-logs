/**
 * Build script — compiles server TypeScript to dist/server/ using esbuild.
 */
import { build } from 'esbuild';

await build({
  entryPoints: ['server/routes/requests.ts'],
  outdir: 'dist/server/routes',
  format: 'esm',
  platform: 'node',
  target: 'node18',
  bundle: false,
  sourcemap: false,
});

console.log('Server built to dist/server/');
