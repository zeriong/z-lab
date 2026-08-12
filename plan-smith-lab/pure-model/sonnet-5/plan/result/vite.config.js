import { defineConfig } from 'vite';

// 계획서 §1-4: 프레임워크 없이 Vite 단독 사용. 설정은 기본값 그대로 사용 가능한 범위로 최소화한다.
export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
  },
});
