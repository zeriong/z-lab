# 슬링샷 — 10스테이지 물리 게임

TypeScript + Vite + Matter.js + 자체 Canvas 2D 렌더러. 데이터(JSON)로 저작된 10개
스테이지와 DOM 오버레이 UI를 얹은 단일 페이지 게임.

## 커맨드 (§13 "완료"의 정의)

```bash
npm ci                    # 1. 스택 핀이 실제로 resolve된다는 증명
npx tsc --noEmit          # 2. 스테이지 스키마·상태 전이표의 컴파일 타임 검사
npm run build             # 3. dist/ 에 진입 HTML + 번들
npm run validate:stages   # 4. 10/10 stages valid
npm run test:state        # 5. 일시정지가 물리를 실제로 멈추는가 외 3건
npm run test:replay       # 6. 스테이지 1~10 헤드리스 클리어 재현
npm run dev               # 개발 서버
```

> 이 저장소의 산출물은 **위 커맨드가 실행된 적 없는 상태**로 커밋되어 있다.
> 즉 여섯 커맨드의 종료코드는 아직 관측되지 않았다. "동작한다"는 주장은
> 종료코드를 본 뒤에만 할 수 있다.

## 구조

```
src/
  main.ts                  부팅 진입점 (DOM 두 개를 찾아 App에 넘긴다)
  app.ts                   StateMachine(§5 전이표) + 씬/오버레이 전환
  physics/loop.ts          고정 타임스텝 누산기 (1/60, 프레임당 최대 5스텝)
  physics/world.ts         엔진 생성/파기, 중력, 진단(바디·리스너 카운트)
  game/scene.ts            mount/unmount, 턴 진행 — DOM을 모른다(테스트 가능성)
  game/slingshot.ts        드래그·궤적 예측·발사 (+ 순수 함수 solveLaunch)
  game/damage.ts           임펄스 → 데미지 → 파괴 → 폭발 (엔진 밖)
  game/materials.ts        재질/돼지/새 상수 테이블 — 튜닝 손잡이 전부
  game/settle.ts           정지 판정 (턴 진행의 유일한 축)
  game/score.ts            점수·별 산정
  render/canvas.ts         렌더러, DPR/리사이즈
  render/camera.ts         추적·프리뷰·흔들림
  render/effects.ts        파편·먼지 (비물리 파티클)
  audio/audio.ts           WebAudio 합성음 5종, 8채널, 음소거
  ui/hud.ts                남은 새·점수·우측 상단 일시정지 버튼
  ui/overlay.ts            메뉴/선택/일시정지/클리어/실패
  data/schema.ts           StageDef 타입 + 파서 + 콘텐츠 규칙
  data/loader.ts           loadStage/unloadStage, plugin 태그 부여
  data/stages/01..10.json  저작 콘텐츠 10개
  storage/progress.ts      localStorage(+인메모리 폴백)
scripts/validate-stages.ts
tests/state.test.ts  tests/replay.test.ts  tests/fixtures/replays.json
```

## 알아야 할 규칙 세 가지

1. **Matter는 충돌 검출과 적분만 산 것이다.** 데미지·HP·파괴·폭발의 소유자는
   `game/damage.ts` + `game/materials.ts`다. 파괴 감각 튜닝을 `restitution`/`slop`
   조합 탐색으로 하지 말 것.
2. **오버레이 컨테이너는 `pointer-events: none`, 버튼만 `auto`.** 이게 깨지면
   새총 드래그가 통째로 죽는다.
3. **시뮬레이션 계층에서 `Math.random()` 금지.** 난수는 `render/effects.ts`와
   `audio/audio.ts`(노이즈 버퍼)에만 있다.

## 아직 측정값으로 대체되지 않은 초기값

`materials.ts`의 HP·임계·밀도, `settle.ts`의 세 상수, `score.ts`의 2별 계수(0.75)와
블록 점수(500)는 전부 **초기값**이다. 플랜 §9 Step 10(밸런싱 패스)에서 스테이지
3·6·9를 각 5회 플레이해 교체하고, 교체한 값 옆에 근거 한 줄을 남긴다.

`camera.minZoom/maxZoom`은 플랜 §15가 "값을 안 정했다"고 지적한 칸이라
스테이지 데이터에 스테이지별로 적어 두었고 `data/schema.ts`에 기본값(0.55/1.15)을
못 박았다.
