import { defineConfig } from 'vite';

// base: './' makes built asset URLs relative so the dist/ folder works when
// served from any path (subdirectory or file://), not just the domain root.
export default defineConfig({
  base: './',
  build: {
    target: 'es2019',
    outDir: 'dist',
    emptyOutDir: true,
  },
});
