import { defineConfig } from 'vite';
import path from 'path';

/**
 * Separate Vite config for building the overlay script as a single IIFE bundle.
 * Output: dist/overlay.js
 */
export default defineConfig({
  build: {
    lib: {
      entry: path.resolve(__dirname, 'overlay/index.ts'),
      name: 'DevLogsOverlay',
      fileName: () => 'overlay.js',
      formats: ['iife'],
    },
    outDir: 'dist',
    emptyOutDir: false,
    minify: true,
  },
});
