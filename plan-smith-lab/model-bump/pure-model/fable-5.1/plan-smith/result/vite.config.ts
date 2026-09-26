import { defineConfig } from 'vitest/config';

// 단일 설정 파일: Vite 빌드 + Vitest 유닛 테스트.
// e2e(Playwright)는 playwright.config.ts에서 별도로 돈다.
export default defineConfig({
  base: './',
  build: {
    target: 'es2022',
    sourcemap: false,
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    // Playwright 스펙은 vitest가 집지 않도록 명시적으로 제외
    exclude: ['e2e/**', 'node_modules/**', 'dist/**'],
  },
});
