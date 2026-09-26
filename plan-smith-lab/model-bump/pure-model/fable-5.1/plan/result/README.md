# 앵그리버드 웹

Vite + TypeScript, 물리 Matter.js, Canvas 2D 렌더러 + DOM UI. 외부 에셋 없음.

## 실행

```bash
npm install
npm run dev       # 개발 서버
npm run build     # tsc --noEmit + vite build → dist/
npm run preview   # 빌드 결과 미리보기
npm test          # vitest (헤드리스: 레벨 검증·정답 샷·데미지·판정·상태 머신·궤적·저장)
```

`?debug=1` 을 붙이면 와이어프레임·재질 슬라이더·각도/파워 표시·레벨 점프·돼지 즉사 패널이 열린다.

## 조작

- 새총 위 새를 드래그해 당겼다 놓으면 발사 (마우스·터치·펜). 당기는 동안 예측 궤적이 보인다.
- 인게임 우측 상단 `❚❚` 버튼 또는 `Esc`/`P`: 일시정지 → [계속하기] [다시하기] [메인으로]
- `R`: 다시하기. 탭을 숨기면 자동 일시정지.
- 스테이지 10개는 처음부터 모두 선택 가능. 클리어 별·최고 점수는 `localStorage['ab.progress.v1']` 에 저장.

## 구조

```
src/
  main.ts                 부트스트랩
  core/      Game(상태 머신·씬 전환·루프), Loop(60Hz 고정 스텝 누산기), StateMachine,
             Input(Pointer Events → 월드 좌표), Storage(진행 저장), config, math
  physics/   World(Engine 래퍼·엔티티 맵·제거 큐), Materials, Damage(collisionStart 데미지), Settle(정착 판정)
  entities/  Entity, Bird, Pig, Block, Slingshot, Factory(LevelDef → 바디)
  gameplay/  Session(헤드리스 한 스테이지), ShotController(조준·발사·비행·정착),
             Trajectory(고스트 엔진 예측), Ballistics(발사 수식·정답 샷 계산 aim()), Score, Judge
  levels/    types, builders(plank/box/tower/hut…), level01~10, index
  render/    Renderer(레이어 순서·DPR), drawBackground/Block/Pig/Bird/Slingshot, Particles
  ui/        MainMenu, StageSelect, Hud(우상단 일시정지 버튼), PauseOverlay, ResultOverlay, ui.css
  debug/     DebugPanel
tests/       levels.validate, levels.solvable, damage, judge, fsm, trajectory, storage
```

의존 방향: `ui → core ← gameplay → physics/entities → matter-js`. `physics`·`gameplay`·`levels`·`entities` 는 DOM 을 참조하지 않아 Node 에서 그대로 실행된다.

## 핵심 규칙 (요약)

- 월드 1280×720 고정 카메라, 지면 y=660, 새총 앵커 (220, 560), 최대 당김 100px → 18px/tick.
- 새총은 제약 대신 "드래그 중 정적 배치 → 놓을 때 속도 직접 설정". 궤적 예측은 새 1개짜리 고스트 엔진.
- 데미지 = 감소질량 × 법선 상대속도 × 재질 취약도 (collisionStart 만, vRel < 3 무시, 페어 10틱 쿨다운).
- 클리어: 돼지 0 → 1.2초 후. 실패: 새 0 + 정착 + 돼지 잔존. 동시면 클리어 우선.
- 각 레벨은 `solutionShots` 로 클리어 가능성을 증명한다 (`npm test` 의 levels.solvable).
