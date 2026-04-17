import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 4444,
    host: '0.0.0.0',
    proxy: {
      '/api': 'http://localhost:4445',
      '/uploads': 'http://localhost:4445',
    },
  },
});
