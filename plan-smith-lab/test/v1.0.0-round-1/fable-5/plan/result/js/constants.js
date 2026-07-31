// 공용 상수 — 좌표계는 1280x720 가상 해상도 기준.

export const VW = 1280;
export const VH = 720;

export const STEP_MS = 1000 / 60; // 고정 타임스텝 (60Hz)

export const GROUND_TOP = 650; // 지면 윗면 y

// 슬링샷: 앵커 위치 / 최대 당김 반경 / 강성 계수(발사 속도 = 당김 벡터 × stiffness)
export const SLING = {
  x: 200,
  y: 500,
  maxPull: 90,
  stiffness: 0.2,
  grabRadius: 130, // 이 반경 안에서 포인터 다운 시 드래그 시작
};

export const BIRD_RADIUS = 18;

// Matter 기본 gravity(y=1, scale=0.001)에서 1스텝(16.67ms)당 속도 증가량.
// dv = gravity.y * gravity.scale * dt^2  →  궤적 예측이 실제 물리와 동일 공식.
export const GRAVITY_PER_STEP = 1 * 0.001 * STEP_MS * STEP_MS;

// 충격량→데미지: 상대속도가 minSpeed를 넘는 만큼 factor를 곱해 HP 차감.
export const DAMAGE = { minSpeed: 4, factor: 14 };

export const SCORE = { block: 500, pig: 5000, birdBonus: 10000 };

// 시도 종료 판정: 속도 임계 이하가 REST_TIME_MS 지속되면 종료.
export const REST_SPEED = 0.3;
export const REST_TIME_MS = 2000;

// 화면 밖 이탈 경계
export const OOB = { left: -120, right: 1400, bottom: 820 };

export const CLEAR_DELAY_MS = 800; // 마지막 돼지 제거 후 클리어 연출 지연

export const PREROLL_STEPS = 30; // 스테이지 로드 후 안정화 프리롤

export const STORAGE_KEY = 'angrybirds.progress.v1';
