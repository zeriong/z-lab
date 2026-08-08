import { defineConfig } from 'vite';

// 정적 산출물 전용 설정. 백엔드 없음(가정 A3) — dist/ 를 그대로 정적 호스팅한다.
export default defineConfig({
  base: './',
  build: {
    target: 'es2020',
    outDir: 'dist',
    sourcemap: false,
  },
  server: {
    port: 5173,
  },
});
