# Slingshot Birds

브라우저용 슬링샷 물리 게임. TypeScript + Vite + Matter.js + Canvas 2D. 서버 없음, 정적 파일만으로 동작.

## 명령

```sh
npm install
npx playwright install chromium   # e2e 최초 1회
npm run dev        # http://localhost:5173
npm run typecheck  # tsc --noEmit
npm run test       # vitest (유닛)
npm run e2e        # playwright (dev 5173 + preview 4173 자동 기동)
npm run build      # dist/
```

## 구조

- `src/types.ts` 스키마·상수(전부 초기값) / `src/stages/NN.ts` 스테이지 10개, `NN.solution.ts` 자동 클리어 입력
- `src/physics.ts` 엔진·스폰·발사(k) / `src/damage.ts` 충격→HP→제거·점수 / `src/judge.ts` 정착·클리어/실패
- `src/state.ts` 6상태 전이표 / `src/loop.ts` PLAYING에서만 고정 스텝 / `src/input.ts` 슬링샷 포인터 입력
- `src/render.ts` 캔버스 / `src/camera.ts` / `src/viewport.ts` 레터박스·좌표 변환 / `src/effects.ts` / `src/audio.ts`
- `src/screens/` 메인·선택·HUD(우측 상단 ⏸)·일시정지·결과·세로 안내 (DOM 오버레이)
- `src/game.ts` 오케스트레이터, `window.__ab` 디버그 훅(e2e 사용)

## 조작

새를 잡고 뒤로 당긴 뒤 놓는다(마우스/터치). `Esc` 또는 우측 상단 ⏸ 로 일시정지.
