import { defineConfig } from 'vite';

// 정적 호스팅 배포(상대 경로 base)를 전제로 한다. §1.4
export default defineConfig({
  base: './',
  server: { port: 5173 },
  build: {
    target: 'es2020',
    sourcemap: true,
  },
});
