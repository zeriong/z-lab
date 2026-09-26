import js from '@eslint/js';
import tseslint from 'typescript-eslint';

// ADR-1: 물리 래퍼(core/physics/) 밖에서는 엔진 API를 직접 부르지 않는다.
// ADR-3: core/에서는 DOM API와 벽시계 타이머를 쓰지 않는다.
const noPlanck = {
  name: 'planck',
  message: '물리 엔진 API는 src/core/physics/ 래퍼를 통해서만 쓴다 (ADR-1).',
};
const outerLayers = [
  {
    group: ['**/app/*', '**/render/*', '**/ui/*', '**/input/*', '**/storage/*'],
    message: 'core/는 바깥 레이어를 모른다 (§3.1 의존 방향).',
  },
];
const coreGlobals = [
  { name: 'window', message: 'core/는 DOM 없이 Node에서 돌아야 한다.' },
  { name: 'document', message: 'core/는 DOM 없이 Node에서 돌아야 한다.' },
  { name: 'requestAnimationFrame', message: '루프는 app/loop.ts가 소유한다.' },
  { name: 'setTimeout', message: 'core/ 타이머는 simTime으로 잰다 (ADR-4).' },
  { name: 'setInterval', message: 'core/ 타이머는 simTime으로 잰다 (ADR-4).' },
  { name: 'localStorage', message: '저장은 storage/에서만 한다.' },
];

export default tseslint.config(
  { ignores: ['dist/**', 'node_modules/**', 'playwright-report/**', 'test-results/**'] },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ['src/**/*.ts'],
    ignores: ['src/core/**'],
    rules: { 'no-restricted-imports': ['error', { paths: [noPlanck] }] },
  },
  {
    files: ['src/core/**/*.ts'],
    ignores: ['src/core/physics/**'],
    rules: { 'no-restricted-imports': ['error', { paths: [noPlanck], patterns: outerLayers }] },
  },
  {
    files: ['src/core/physics/**/*.ts'],
    rules: { 'no-restricted-imports': ['error', { patterns: outerLayers }] },
  },
  {
    files: ['src/core/**/*.ts'],
    rules: { 'no-restricted-globals': ['error', ...coreGlobals] },
  },
);
