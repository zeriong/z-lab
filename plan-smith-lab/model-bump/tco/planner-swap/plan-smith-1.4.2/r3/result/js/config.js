if (typeof Matter === 'undefined') {
  const errEl = document.getElementById('error');
  errEl.textContent = '물리 엔진(Matter.js)을 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 새로고침하세요.';
  errEl.classList.remove('hidden');
  throw new Error('Matter.js failed to load');
}
const { Engine, Composite, Bodies, Body, Events } = Matter;

// ---- 화면 / 좌표 ----
const W = 1280;                 // [a] 16:9 논리 해상도
const H = 720;                  // [a] 16:9
const GROUND_Y = 660;           // [c] 지면 윗면 y
const SLING_X = 190;            // [c] 새총 고정점
const SLING_Y = 520;            // [c]
// ---- 새총 ----
const MAX_PULL = 100;           // [c] 최대 당김(px)
const MIN_PULL = 15;            // [c] 이보다 짧게 당기면 발사 취소
const GRAB_RADIUS = 60;         // [c] 새총 고정점에서 이 거리 안을 눌러야 잡힘
const MAX_LAUNCH_SPEED = 20;    // [a] 45도 사거리 v*v/g = 400/0.278 ≈ 1440px ≥ 가장 먼 돼지까지 ≈ 1045px
// ---- 시간 / 물리 ----
const STEP_MS = 1000 / 60;      // [a] Matter 기본 스텝, 고정 간격으로만 호출
const GRAVITY_PER_STEP = 0.001 * STEP_MS * STEP_MS; // [a] Matter 중력 1 × scale 0.001 × dt² ≈ 0.278 px/step²
const POSITION_ITERATIONS = 10; // [b] 탑이 저절로 무너지면 20
const VELOCITY_ITERATIONS = 8;  // [b] 같은 조건에서 12
// ---- 피해 ----
const DAMAGE_MIN_SPEED = 2;     // [b] 이 상대속도(px/step) 이하 충돌은 피해 없음
const DAMAGE_K = 4;             // [b] 피해 = (상대속도 - 최소) × 환산질량 × K  (§5.6 계산표)
const HIT_FRICTION_AIR = 0.02;  // [c] 새가 처음 부딪힌 뒤 공기저항(굴러다니는 시간 단축)
// ---- 턴 ----
const SETTLE_SPEED = 0.2;       // [c] 이보다 느리면 정지로 봄
const SETTLE_ANGULAR = 0.02;    // [c]
const SETTLE_STEPS = 45;        // [c] 0.75초 연속 정지하면 턴 종료
const MIN_TURN_MS = 1500;       // [c] 발사 후 최소 이만큼은 턴 유지
const MAX_TURN_MS = 10000;      // [c] 이만큼 지나면 강제 턴 종료
const CLEAR_DELAY_MS = 1500;    // [c] 마지막 돼지 제거 후 클리어 화면까지
// ---- 새 능력 ----
const YELLOW_BOOST_SPEED = 22;  // [a] 관통 한계 = 가장 얇은 블록 20px + 새 지름 34px = 54 px/step, 22 < 54
const BOMB_FUSE_MS = 1500;      // [c] 검정 새 첫 충돌 후 자동 폭발까지
const EXPLOSION_RADIUS = 150;   // [c]
const EXPLOSION_DAMAGE = 220;   // [a] 중심 근처의 돌(hp 200)을 깰 수 있는 값
const EXPLOSION_PUSH = 12;      // [c] 폭발이 더하는 속도(px/step, 거리 비례 감쇠)
// ---- 점수 ----
const BIRD_BONUS = 10000;       // [c] 클리어 시 남은 새 1마리당
const STAR2_RATIO = 0.5;        // [b] 점수 / 최대 가능 점수
const STAR3_RATIO = 0.75;       // [b]
// ---- 기타 ----
const TRAIL_MAX = 80;           // [c]
const PARTICLE_MAX = 400;       // [c]
const STORAGE_KEY = 'angry-birds-progress-v1';

const MATERIALS = {
  glass: { density: 0.0006, hp: 20,  score: 300, color: '#bfe9f5', stroke: '#6fb6c9' },
  wood:  { density: 0.001,  hp: 75,  score: 500, color: '#c68a4a', stroke: '#8a5a2b' },
  stone: { density: 0.0025, hp: 200, score: 800, color: '#9aa0a8', stroke: '#5f646b' }
};
const SHAPES = {
  post:  { w: 20,  h: 100 },
  beam:  { w: 160, h: 20 },
  plank: { w: 100, h: 20 },
  box:   { w: 40,  h: 40 }
};
const PIGS = {
  pig:     { r: 18, hp: 25,  score: 5000 },
  bigPig:  { r: 26, hp: 60,  score: 5000 },
  kingPig: { r: 34, hp: 120, score: 10000 }
};
const BIRDS = {
  red:    { r: 18, density: 0.004, color: '#d93a2b', stroke: '#8f1d12' },
  yellow: { r: 17, density: 0.004, color: '#f2c230', stroke: '#a67f0d' },
  black:  { r: 22, density: 0.004, color: '#2b2b2b', stroke: '#000000' }
};
const BIRD_TIPS = {
  red: '',
  yellow: '노랑 새: 날아가는 중 클릭하면 가속합니다',
  black: '검정 새: 날아가는 중 클릭하면 폭발합니다 (부딪히고 1.5초 뒤 자동 폭발)'
};

const G = {
  screen: 'menu',        // 'menu' | 'select' | 'playing' | 'paused' | 'clear' | 'fail'
  phase: 'aiming',       // 플레이 중 단계: 'aiming' | 'flying' | 'clearing' | 'ended'
  levelIndex: 0,         // 0..9
  canvas: null,          // boot()가 설정
  ctx: null,             // boot()가 설정
  engine: null,          // initPhysics()가 한 번만 생성, 이후 절대 다시 만들지 않음
  time: 0,               // 게임 시간(ms). stepGame()에서만 증가 → 일시정지 중 멈춤
  accumulator: 0,
  lastFrame: 0,
  birdQueue: [],         // 새총에 올라가기를 기다리는 새 종류들
  birdType: null,        // 지금 새총 위 또는 비행 중인 새 종류
  bird: null,            // 발사된 새의 Matter 몸체, 없으면 null
  aim: { x: SLING_X, y: SLING_Y },
  dragging: false,
  launchTime: 0,
  settleCount: 0,
  abilityUsed: false,
  birdHitAt: -1,         // 비행 중인 새의 첫 충돌 시각(G.time), -1 = 아직 없음
  damageEnabled: false,  // 첫 발사 전에는 false → 로드 직후 흔들림으로 죽지 않음
  pigsLeft: 0,
  score: 0,
  clearAt: 0,
  toRemove: [],
  particles: [],
  popups: [],
  trail: [],
  shake: 0,
  progress: null         // boot()에서 loadProgress() 결과
};
