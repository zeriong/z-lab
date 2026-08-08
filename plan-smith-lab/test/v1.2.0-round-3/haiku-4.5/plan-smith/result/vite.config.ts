import { defineConfig } from 'vite';

export default defineConfig({
  build: {
    target: 'ES2020',
    outDir: 'dist',
    minify: 'terser'
  },
  server: {
    port: 3000,
    open: true
  }
});
