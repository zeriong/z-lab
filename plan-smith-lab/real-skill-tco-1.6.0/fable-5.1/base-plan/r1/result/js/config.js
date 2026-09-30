window.AB = window.AB || {};

// 모든 튠 상수는 이 파일 한 곳에만 둔다. (계획서 §3 그대로)
// 단위: 길이 px, 속도 px/step (1 step = 1/60 s), 시간 s
AB.CONFIG = {
  W: 1280,
  H: 720,
  GROUND_Y: 640,                     // 땅 윗면 y. 땅 body: 중심(640, 680), 크기 1280×80, isStatic
  STEP_MS: 1000 / 60,
  MAX_STEPS_PER_FRAME: 4,
  GRAVITY_STEP: 0.27778,             // px/step² (엔진 기본 중력과 일치, 예측선 계산용)

  SLING: {
    x: 180,                          // 앵커(새가 놓이는 기본 위치, 새 중심)
    y: 520,
    baseY: 640,                      // 새총 밑동
    maxPull: 90,                     // 최대 당김 거리(px)
    grabRadius: 70,                  // 이 반경 안을 pointerdown 해야 드래그 시작
    minLaunchPull: 12,               // 이보다 짧게 당기고 놓으면 발사 취소
    powerPerPx: 0.2                  // 발사 속도(px/step) = 당김(px) × 0.2 → 최대 18
  },

  BIRD: { radius: 18, density: 0.0015, friction: 0.5, restitution: 0.35, frictionAir: 0.003 },
  BIRD_TYPES: {
    red:   { color: '#d9342b', ability: null },
    chuck: { color: '#f2c530', ability: 'boost' },
    bomb:  { color: '#3a3a3a', ability: 'explode' }
  },
  BOOST: { mult: 1.5, maxSpeed: 26 },                                   // 척: 탭 시 속도 ×1.5, 상한 26 px/step
  EXPLOSION: { radius: 140, impulse: 14, damage: 120, fuseSec: 1.0 },  // 봄: 탭 또는 첫 충돌 1.0s 후 폭발

  MATERIALS: {
    wood:  { hp: 60,  density: 0.0012, friction: 0.6, restitution: 0.1,  score: 500, fill: '#c8873a', stroke: '#8a5a22' },
    ice:   { hp: 30,  density: 0.0008, friction: 0.2, restitution: 0.05, score: 300, fill: 'rgba(170,220,255,0.78)', stroke: '#7fb8e6' },
    stone: { hp: 150, density: 0.0022, friction: 0.8, restitution: 0.05, score: 800, fill: '#9a9a9a', stroke: '#5c5c5c' }
  },
  BLOCK_SIZES: {                     // [w, h]
    plank: [100, 20],
    longplank: [160, 20],
    post: [20, 80],
    shortpost: [20, 50],
    square: [40, 40],
    bigsquare: [60, 60],
    slab: [60, 20]
  },
  PIGS: { s: { r: 14, hp: 20 }, m: { r: 20, hp: 35 }, l: { r: 28, hp: 60 } },
  PIG_PHYS: { density: 0.0008, friction: 0.5, restitution: 0.2 },
  GROUND_PHYS: { friction: 0.8, restitution: 0 },

  DAMAGE: { threshold: 2, scale: 4, massCap: 3 },   // §11.1
  SCORE: { pig: 5000, birdBonus: 10000 },
  TURN: { settleSpeed: 0.3, settleSteps: 45, minSec: 1.0, maxSec: 10 },
  WIN_DELAY_SEC: 1.2,
  FAIL_DELAY_SEC: 0.8,
  PRESETTLE_STEPS: 60,
  BOUNDS: { minX: -200, maxX: 1500, maxY: 900 },    // 벗어나면 제거
  TRAIL: { everySteps: 3, maxPoints: 120 },
  PREDICT: { steps: 150, everySteps: 4 },
  QUEUE_DRAW: { x0: 130, dx: 36, max: 4 },          // 대기 새 그리기 위치(x0 − i·dx, y = GROUND_Y − 18)
  STORAGE_KEY: 'ab_progress_v1'
};
