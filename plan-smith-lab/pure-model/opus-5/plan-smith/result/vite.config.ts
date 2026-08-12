import { defineConfig } from 'vite';

// 정적 배포 산출물 하나만 만든다(§4). 플러그인 없음 — 프레임워크를 사지 않았기 때문.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: true,
  },
  server: {
    port: 5173,
    open: false,
  },
});
