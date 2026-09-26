# 슬링샷 버드

TypeScript 5.6 + Vite 5.4 + Matter.js 0.20 + Canvas 2D로 만든 물리 슬링샷 게임. 스테이지 10개, 새 4종(빨강·파랑·노랑·검정), 재질 3종, 돼지 3종, 점수·별·저장, 효과음·이펙트, 게임 영역 우측 상단 일시정지(계속하기/다시하기/메인으로).

## 실행

```bash
npm install            # lockfile이 없으면 install로 생성한 뒤 커밋 (D1은 npm ci)
npm run dev            # 개발 서버
npm run build          # tsc --noEmit + vite build → dist/
npx vitest run         # 헤드리스 물리·규칙 테스트
npx playwright install chromium
npx playwright test    # 실제 입력 경로 E2E (vite preview 서버)
```

## 조작

- 새를 눌러 뒤로 끌었다 놓으면 발사. 끄는 동안 궤적 점선이 보인다.
- 비행 중 화면을 탭하면 능력: 파랑 분열, 노랑 가속, 검정 폭발.
- ESC 또는 우측 상단 버튼으로 일시정지. 탭을 숨기면 자동 일시정지.

## 구조

- `src/core` 고정 스텝 루프, 씬 상태 머신(순수 `transition`), `Game`(세션·저장·오디오 연결)
- `src/physics` 월드 생성, 엔티티 레지스트리, 세션(create/dispose/flushRemovals), 충돌 데미지
- `src/game` 새총·입력·궤적 예측(미니 Engine)·새 능력·판정·점수
- `src/render` 뷰포트(레터박스·DPR)·렌더러·절차적 도형
- `src/stages` 스테이지 10개 + 검증기, 각 스테이지는 헤드리스 풀이(`solution`)를 가진다
- `tests` vitest (validator·settle·solution·null·trajectory·scene·damage·abilities·score·storage·fx)
- `e2e` Playwright (flow·launch·persist, console.error 0건 검사)

게임 로직의 모든 타이머는 물리 스텝 수로 센다. 그래서 일시정지는 스텝만 멈추면 되고, 같은 입력이면 브라우저 밖에서도 같은 결과가 나온다.
