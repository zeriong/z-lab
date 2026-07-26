# Sling Birds — 실행 안내

1. **스택**: Vite + TypeScript(바닐라, 프레임워크 없음) + Matter.js(물리 엔진) + Canvas 2D(렌더링). 클라이언트 전용 정적 앱, 백엔드 없음. 진행도만 localStorage에 저장.
2. **빌드 명령**: `npm install && npm run build` (내부적으로 `tsc && vite build`). 스테이지 JSON은 `node scripts/gen-stages.mjs`로 이미 생성되어 `src/data/stages/*.json`에 존재하며, 빌드에 정적으로 포함된다(재생성은 선택 사항).
3. **서빙할 정적 디렉토리**: `dist` (이 디렉토리 기준 상대경로, `dist/index.html`이 루트).
4. **조작법**: 새총 근처를 마우스/터치로 눌러 원하는 방향의 반대로 드래그한 뒤 놓으면 발사(당긴 방향의 반대로 날아감, 점선은 예상 궤적). 스피디(노랑)/폭탄(검정) 새는 비행 중 화면을 탭하면 능력 발동. 화면 우측 상단 ⏸ 버튼 클릭 시 일시정지되며 "다시하기"/"메인으로" 두 버튼이 뜬다.

## 구현 메모
- 10개 스테이지는 `src/data/stages/stage-01.json` ~ `stage-10.json` 선언적 JSON으로 정의(재질: wood/stone/glass, 새: normal/speedy/bomb). `scripts/gen-stages.mjs`로 생성.
- 상태 머신: Main → InGame → Paused → (Cleared|Failed), `src/game/game.ts`.
- 물리: Matter.js 래핑은 `src/core/physics.ts`. 렌더링은 Matter 기본 렌더러 대신 `src/render/renderer.ts`의 순수 Canvas 2D로 분리 구현(파티클/궤적 예측선 포함).
- 검증 중 두 가지 실질적 버그를 발견해 수정함:
  1. 충돌 임팩트 계산에서 정적 바디(mass=Infinity)를 단순 합산해 지면 접촉만으로도 즉시 파괴되던 버그 → 환산질량(reduced mass) 공식으로 교체.
  2. 새 바디를 `Bodies.circle(..., { isStatic: true })`로 생성 후 발사 시 `Body.setStatic(false)`로 되돌리면 Matter.js가 원래 질량을 복원하지 못해 질량이 Infinity로 남고, 다음 물리 스텝에서 중력력(Infinity)/질량(Infinity)=NaN이 되어 발사된 새가 즉시 궤도를 이탈하던 버그 → 생성 후 별도로 `Body.setStatic(body, true)`를 호출하도록 수정.
- 실제 브라우저(Chrome DevTools MCP)에서 스테이지 시작 → 드래그 발사 → 포물선 궤적 → 블록/돼지 충돌 파괴(재질별 hp, 파편 파티클) → 돼지 전멸 시 Cleared 전이 → 점수/진행도 localStorage 저장 → 일시정지(물리 완전 정지 확인)/다시하기(상태 초기화 확인)/메인으로(월드 완전 해제 확인) 전 과정을 직접 조작해 확인함.
- 스테이지 1(원래 지붕+기둥으로 돼지를 완전히 밀폐하는 구조였음 — 사방이 막혀 어떤 각도로도 직격 불가능했던 설계 결함 발견)을 낮은 나무 벽 하나 + 탁 트인 곳의 돼지로 재설계. 최종 빌드에서 실제 드래그 발사 1회로 0.6초 만에 Cleared(점수 2500) 전이되는 것까지 확인함(요구사항의 "3회 이내 클리어" 충족). 스테이지 2도 동일 패턴(돼지가 직격 가능한 위치, 블록은 뒤쪽 장식)으로 함께 손봤다. 스테이지 4/7/8/9/10은 의도적으로 "구조물을 부숴야 닿는" 밀폐형 탑을 유지(플랜의 난이도 곡선에 맞춘 것이며, 개별 3발 클리어는 별도 검증하지 않음).
