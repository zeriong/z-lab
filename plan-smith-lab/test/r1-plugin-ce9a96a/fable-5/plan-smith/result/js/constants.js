// 게임 전역 상수.
// 수치 태깅(플랜 규율): [캐논]=도메인 캐논 도출, [초기값]=튜닝 대상 초기값.

export const WIDTH = 1280;
export const HEIGHT = 720;

// [캐논] 고정 타임스텝 60Hz — 리플레이 재현성의 근거.
export const FIXED_DT = 1000 / 60;

// Matter 기본 gravity.y=1, gravity.scale=0.001 기준 스텝당 중력 가속(px/step^2).
// 궤적 프리뷰가 엔진과 같은 공식을 쓰기 위한 파생값.
export const GRAVITY_STEP = 1 * 0.001 * FIXED_DT * FIXED_DT;

export const GROUND_Y = 680; // 지면 상단 y

// --- 슬링샷 --- [초기값]
export const MAX_PULL = 100;          // 최대 당김 거리(px)
export const MAX_LAUNCH_SPEED = 25;   // 최대 발사 속도(px/step)
export const MIN_LAUNCH_PULL = 12;    // 이 미만 당김은 발사 취소

// --- 발사체(새) --- [초기값]
export const BIRD = {
  radius: 18,
  density: 0.004,
  restitution: 0.35,
  friction: 0.6,
};

// --- 재질 --- [초기값] 내구도(hp)·밀도
export const MATERIALS = {
  wood:  { hp: 60,  density: 0.0009, friction: 0.6, restitution: 0.1,  color: '#b5793a', edge: '#8a5a28' },
  glass: { hp: 30,  density: 0.0006, friction: 0.4, restitution: 0.05, color: '#a8d8e8', edge: '#6fb2c9' },
  stone: { hp: 140, density: 0.002,  friction: 0.8, restitution: 0.05, color: '#9a9a9a', edge: '#6f6f6f' },
};

// --- 돼지 --- [초기값]
export const PIG = {
  hp: 30,
  density: 0.0012,
  friction: 0.5,
  restitution: 0.2,
};

// --- 파괴 규칙 --- [초기값] 충격량 누적 → 내구도 차감
export const DAMAGE_FACTOR = 1.6;    // (상대속도-임계)당 데미지 계수
export const MIN_DAMAGE_SPEED = 3;   // 이하 상대속도 충돌은 무시
export const STATIC_IMPACT_MASS = 2; // 정적 바디(지면) 충돌 시 대입 질량

// --- settle 판정 --- [초기값]
export const SETTLE_SPEED = 0.2;     // 속도 임계
export const SETTLE_ANGULAR = 0.05;  // 각속도 임계
export const SETTLE_TICKS = 60;      // 임계 이하 유지 틱 수(=1초)

// --- 판정 타임아웃 --- [초기값] settle 미도달 시 강제 판정
export const JUDGE_TIMEOUT_MS = 10000;

// --- 발사체 소진 --- [초기값]
export const BIRD_SPENT_MS = 6000;    // 발사 후 강제 소진 시간
export const BIRD_REST_MIN_MS = 1000; // 이 시간 이후 정지 시 소진 처리

export const STAGE_COUNT = 10;
