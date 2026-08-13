# 앵그리버드 구현 완료 검증 — §11 기준별 확인

## 1. 파일 존재성 (§11.1)
- ✓ index.html (1280x720 canvas, 5개 오버레이, DOM id 규약 준수)
- ✓ style.css (overlay toggle, responsive canvas)
- ✓ stages.js (STAGES 배열, BLOCK_TYPES 팔레트)
- ✓ physics.js (Physics 모듈)
- ✓ ui.js (UI, Store, Sound 모듈)
- ✓ game.js (Game 모듈, Game.boot() 호출)

## 2. 스크립트 태그 순서 (§11.2)
index.html `</body>` 직전:
1. https://cdn.jsdelivr.net/npm/matter-js@0.19.0/build/matter.min.js ✓
2. stages.js ✓
3. physics.js ✓
4. ui.js ✓
5. game.js ✓

## 3. STAGES 배열 (§11.3)
- ✓ 길이: 10
- ✓ id 1~10 각각 정확히 1회 정의
- ✓ 각 스테이지:
  - Stage 1: birds=3, blocks=3, pigs=1 ✓
  - Stage 2: birds=3, blocks=6, pigs=1 ✓
  - Stage 3: birds=3, blocks=6, pigs=2 ✓
  - Stage 4: birds=4, blocks=7, pigs=2 ✓
  - Stage 5: birds=4, blocks=7, pigs=3 ✓
  - Stage 6: birds=4, blocks=9, pigs=3 ✓
  - Stage 7: birds=4, blocks=10, pigs=3 ✓
  - Stage 8: birds=5, blocks=14, pigs=4 ✓
  - Stage 9: birds=5, blocks=16, pigs=4 ✓
  - Stage 10: birds=5, blocks=20, pigs=5 ✓

## 4. 단계별 최소 요구사항 (§11.4)
모든 스테이지가 다음을 만족:
- ✓ pigs.length >= 1 (모두 만족)
- ✓ blocks.length >= 3 (모두 만족)
- ✓ birds >= 3 (모두 만족)

## 5. 블록 타입 유효성 (§11.5)
모든 blocks[i].type이 BLOCK_TYPES 키 중 하나:
- ✓ wood_pillar, wood_beam, wood_long_beam (모두 사용)
- ✓ ice_pillar, ice_beam (Stage 3)
- ✓ stone_block, stone_beam (Stages 4, 8, 9, 10)
- ✓ 오타: 0건

## 6. 심볼 정의 (§11.6) - §5.1 표의 21행

### stages.js
- ✓ STAGES (정확히 1회)
- ✓ BLOCK_TYPES (정확히 1회)

### physics.js
- ✓ Physics.createWorld() (정확히 1회)
- ✓ Physics.loadStage(stage) (정확히 1회)
- ✓ Physics.spawnBirdBody(x, y, vx, vy) (정확히 1회)
- ✓ Physics.step() (정확히 1회)
- ✓ Physics.isSettled() (정확히 1회)
- ✓ Physics.clear() (정확히 1회)
- ✓ Physics.engine getter (정확히 1회)

### ui.js
- ✓ UI.init() (정확히 1회)
- ✓ UI.show(id) (정확히 1회)
- ✓ UI.hide(id) (정확히 1회)
- ✓ UI.renderSelect() (정확히 1회)
- ✓ UI.setHud(score, birdsLeft) (정확히 1회)
- ✓ Store.load() (정확히 1회)
- ✓ Store.save() (정확히 1회)
- ✓ Sound.play(name) (정확히 1회)
- ✓ Sound.toggle() (정확히 1회)

### game.js
- ✓ Game.boot() (정확히 1회, 파일 마지막에 호출)
- ✓ Game.start(n) (정확히 1회)
- ✓ Game.tick() (정확히 1회)
- ✓ Game.launchBird() (정확히 1회)
- ✓ Game.checkResult() (정확히 1회)
- ✓ Game.state (정의 1회, getter/setter)

## 7. DOM id 규약 및 이벤트 리스너 (§11.7)

### 오버레이 id (§5.1)
- ✓ ov-menu, ov-select, ov-pause, ov-clear, ov-fail

### 버튼 id 및 리스너
- ✓ btn-start (addEventListener 있음)
- ✓ btn-open-select (addEventListener 있음)
- ✓ btn-select-back (addEventListener 있음)
- ✓ btn-pause (addEventListener 있음)
- ✓ btn-mute (addEventListener 있음)
- ✓ btn-resume (addEventListener 있음)
- ✓ btn-retry (addEventListener 있음)
- ✓ btn-home (addEventListener 있음)
- ✓ btn-next (addEventListener 있음)
- ✓ btn-clear-home (addEventListener 있음)
- ✓ btn-fail-retry (addEventListener 있음)
- ✓ btn-fail-home (addEventListener 있음)

### 기타 id
- ✓ game-canvas (1280x720)
- ✓ stage-grid (슬롯 생성 영역)
- ✓ hud-score (점수 표시)
- ✓ hud-birds (새 아이콘)
- ✓ clear-score, clear-stars, fail-msg
- ✓ load-banner (로드 실패 배너)

## 8. 상태 변수 초기화 (§11.8) - §8.2 콜드스타트

Game 모듈 내 선언:
- ✓ state = 'MENU'
- ✓ stageNo = 0
- ✓ pigs = []
- ✓ blocks = []
- ✓ birdsLeft = 0
- ✓ currentBird = null
- ✓ dragging = false
- ✓ score = 0
- ✓ settleFrames = 0

UI 모듈 내 선언:
- ✓ Sound.muted = false
- ✓ Sound.ctx = null (첫 포인터 입력에서 초기화)

## 9. Physics.step() 호출 위치 (§11.9)

game.js 내 Game.tick():
```javascript
if (state === 'PLAYING') {
  Physics.step();        // ✓ 정확히 1회, PLAYING 조건 안
  // ... 피해 추적
  checkResult();         // ✓ 바로 다음 줄에 호출
}
```

## 10. 일시정지 오버레이 (§11.10)

HTML ov-pause 안:
- ✓ "다시하기" 텍스트 (btn-retry)
- ✓ "메인으로" 텍스트 (btn-home)
- ✓ "계속하기" 텍스트 (btn-resume)

btn-pause 스타일:
- ✓ right: 16px (있음)
- ✓ left: 없음 (우측 배치 확인)

PAUSED 상태 처리 (game.js):
- ✓ state === 'PAUSED'일 때 Physics.step() 호출 없음
- ✓ render()는 계속 호출 (화면 유지)

## 11. Sound.play() 호출 지점 (§11.11)

ui.js Sound 모듈:
1. ✓ 발사: Game.launchBird()에서 Sound.play('launch')
2. ✓ 충돌: 블록 파괴 시 Sound.play('hit')
3. ✓ 돼지 제거: 돼지 제거 시 Sound.play('pop')

## 12. localStorage 안전성 (§11.12)

ui.js Store.load() / Store.save():
```javascript
try {
  let data = localStorage.getItem(KEY);
  ...
} catch (e) {
  // 메모리 폴백
}
```
- ✓ 모든 localStorage 접근이 try 블록 안에 있음
- ✓ catch 블록에서 memoryFallback 사용

## 13. §1.3 동사 문장 31개 매핑

### 메인 메뉴 (V1, V2)
- ✓ V1: btn-start 클릭 → Game.start(1) → 캔버스에 스테이지 그려짐
- ✓ V2: 메뉴에 "게임시작", "스테이지 선택", 조작 안내 표시

### 스테이지 선택 (V3, V4, V5, V6)
- ✓ V3: UI.renderSelect()가 10개 슬롯을 stage-grid에 생성
- ✓ V4: 잠긴 슬롯에 'locked' 클래스, 클릭 리스너 미부착
- ✓ V5: Store에서 별 읽어 슬롯에 표시
- ✓ V6: btn-select-back → 메인으로

### 인게임 캔버스 (V7~V17)
- ✓ V7: Physics.loadStage() → blocks, pigs 배열 채우기
- ✓ V8: pointerdown에서 거리 체크 후 dragging = true, pointermove로 currentBird 업데이트
- ✓ V9: renderTrajectoryPreview()에서 18개 점 렌더
- ✓ V10: pointerup에서 launchBird() → Physics.spawnBirdBody()
- ✓ V11: Physics.step()에서 gravity 적용, 화면 밖 바디 제거
- ✓ V12: collisionStart 핸들러에서 damage 계산, hp 감소
- ✓ V13: pig hp <= 0일 때 dead 플래그, deadPigsTracked에 추가, score += 5000
- ✓ V14: settleFrames > 45 또는 elapsed > 6000일 때 턴 종료, 새 배치
- ✓ V15: state === 'PAUSED'일 때 Physics.step() 스킵
- ✓ V16: createBlockParticles()에서 파편 8개 생성, 0.6초 decay
- ✓ V17: render()에서 sky gradient, hills, ground, slingshot 그리기

### 인게임 HUD (V18~V21)
- ✓ V18: UI.setHud()가 hud-birds에 아이콘 추가
- ✓ V19: UI.setHud()가 hud-score 숫자 갱신
- ✓ V20: btn-pause 우측 배치, PLAYING에서만 작동
- ✓ V21: btn-mute 클릭 → Sound.toggle(), 아이콘 변경

### 일시정지 오버레이 (V22~V24)
- ✓ V22: btn-retry → Game.start(Game.stageNo)
- ✓ V23: btn-home → Physics.clear() + Game.state = 'MENU'
- ✓ V24: btn-resume → Game.state = 'PLAYING'

### 클리어/실패 (V25~V27)
- ✓ V25: pigs.length === 0 → checkResult()에서 CLEAR, 별 계산, show('clear')
- ✓ V26: btn-next → stageNo < 10이면 Game.start(stageNo+1)
- ✓ V27: birdsLeft === 0 + isSettled() → FAIL, show('fail')

### 저장/오디오/부트 (V28~V31)
- ✓ V28: Store.save()가 progress 저장, reload해도 복원
- ✓ V29: Sound.play() 3개 지점에서 호출
- ✓ V30: index.html을 직접 열 때 Game.boot() 자동 실행
- ✓ V31: typeof Matter === 'undefined'일 때 load-banner 표시

## 14. Matter.js 화이트리스트 (§11.14)

physics.js에서 사용하는 Matter 함수:
- ✓ Engine.create() ✓ Engine.update()
- ✓ Composite.add() ✓ Composite.remove() ✓ Composite.allBodies()
- ✓ Bodies.rectangle() ✓ Bodies.circle()
- ✓ Body.setVelocity()
- ✓ Events.on()

금지된 API 0회 사용 확인:
- ✗ World.* (deprecated)
- ✗ Runner
- ✗ Render
- ✗ Constraint
- ✗ Body.setStatic

---

## 검증 결과

✓ **§11의 14개 항목 모두 충족**

구현자가 자신의 산출물을 읽어 확인할 수 있는 기준:
1. 파일 6개 존재 확인
2. 스크립트 태그 5개, 순서 확인
3. STAGES.length === 10, id 1~10 확인
4. 각 스테이지 pigs/blocks/birds 개수 확인
5. BLOCK_TYPES 7개 키 확인
6. 각 심볼 정의 위치 확인 (각 1회)
7. DOM id 규약 표 완전성 확인
8. 상태 변수 초기값 확인
9. Physics.step() 호출 위치 확인
10. 일시정지 오버레이 DOM 확인
11. Sound.play() 3개 지점 확인
12. localStorage try 블록 포함 확인
13. 각 V 요구사항 구현 확인
14. Matter 화이트리스트 준수 확인

**실행 전 사람이 수행할 검사** (구현자 범위 밖):
- index.html을 브라우저로 열어 메인 메뉴 확인
- "게임시작" 클릭 후 새를 당겨 발사
- 돼지 제거 후 클리어 오버레이 확인
- 우측 일시정지 버튼 동작 확인
- 탭 닫았다 다시 열어 해금 단계 확인
