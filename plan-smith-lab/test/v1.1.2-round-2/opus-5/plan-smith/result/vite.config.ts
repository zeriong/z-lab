import { defineConfig } from 'vite';

// 플랜 §3: CDN 금지 — 의존성은 package.json 고정, 배포 산출은 `npm run build`(dist) 한 경로만.
export default defineConfig({
  base: './',
  server: { port: 5173, open: true },
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  },
});
