import { defineConfig } from 'vitest/config';

// ADR-3: Vite + TS, 정적 산출물. base './'로 경로를 상대화한다.
export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
    target: 'es2020',
    sourcemap: false,
  },
  server: { port: 5173 },
  preview: { port: 4173 },
  test: {
    environment: 'node',
    include: ['tests/unit/**/*.test.ts', 'tests/sim/**/*.test.ts'],
    testTimeout: 180_000,
  },
});
