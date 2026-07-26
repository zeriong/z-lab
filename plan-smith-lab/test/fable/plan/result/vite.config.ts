import { defineConfig } from 'vite';

export default defineConfig({
  // Relative base so dist/ can be served from any sub-path.
  base: './',
  build: {
    target: 'es2022',
  },
});
