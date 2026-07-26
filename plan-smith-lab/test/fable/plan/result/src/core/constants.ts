// 가상 해상도 — 모든 스테이지 좌표는 이 기준으로 정의하고 캔버스에 letterbox 스케일링한다.
export const VIRTUAL_W = 1280;
export const VIRTUAL_H = 720;

// 고정 타임스텝 (60Hz). 프레임레이트와 무관하게 궤적이 재현 가능해야 한다.
export const STEP_MS = 1000 / 60;

// 지형
export const GROUND_Y = 650; // 지면 윗면 y

// 슬링샷
export const SLING_X = 220;
export const SLING_Y = 520;
export const MAX_PULL = 90; // 최대 당김 반경(px)
export const MIN_PULL = 12; // 이 미만이면 발사 취소
export const LAUNCH_POWER = 0.21; // 발사 속도 = 당김(px) × 계수 (px/step)
export const GRAB_RADIUS = 90; // 이 반경 안에서 포인터 다운 시 드래그 시작

// 중력 — Matter 기본 (gravity.y=1, scale=0.001).
// 스텝당 속도 증가량(px/step^2): y * scale * dt^2. 궤적 예측이 이 값과 동일 공식을 쓴다.
export const GRAVITY_Y = 1;
export const GRAVITY_SCALE = 0.001;
export const G_STEP = GRAVITY_Y * GRAVITY_SCALE * STEP_MS * STEP_MS;

// 충격량 → 파괴 튜닝 (임계값을 데이터로 뺀다 — 스침 파괴/불파괴 리스크 대응)
export const DAMAGE_MIN_SPEED = 3; // 상대속도(px/step)가 이 미만이면 무피해
export const DAMAGE_COEFF = 4; // damage = (relSpeed - MIN) × min(mass) × COEFF

// 시도(새 1마리) 수명 관리
export const BIRD_REST_SPEED = 0.5; // 이 속도 미만이
export const BIRD_REST_STEPS = 120; // 이 스텝 수(=2초)만큼 지속되면 시도 종료
export const BIRD_MAX_FLIGHT_STEPS = 12 * 60; // 안전 상한
export const SETTLE_MIN_STEPS = 30; // 시도 종료 후 최소 안정화 대기
export const SETTLE_MAX_STEPS = 180; // 최대 대기(=3초) 후 강제 판정
export const CALM_SPEED = 0.4; // 전체 강체가 이 미만이면 "안정" 판정

// 스테이지 로드 직후 안정화 프리롤 (스택 미세 흔들림 대응)
export const PREROLL_STEPS = 30;

// 화면 밖 판정
export const OOB_MARGIN = 120;

// 점수
export const SCORE_BLOCK = 500;
export const SCORE_PIG = 5000;
export const SCORE_BIRD_BONUS = 10000;

// 새 타입별 스펙
export interface BirdSpec {
  radius: number;
  density: number;
  powerMult: number; // 발사 속도 배율
  color: string;
}

export const BIRD_SPECS = {
  red: { radius: 20, density: 0.0015, powerMult: 1.0, color: '#d7302e' },
  big: { radius: 28, density: 0.0018, powerMult: 0.92, color: '#a31f1d' },
  small: { radius: 13, density: 0.0012, powerMult: 1.28, color: '#2f7fd1' },
} as const satisfies Record<string, BirdSpec>;

export type BirdType = keyof typeof BIRD_SPECS;

// 재질별 스펙 — 얼음 < 나무 < 돌
export interface MaterialSpec {
  hp: number;
  density: number;
  fill: string;
  stroke: string;
}

export const MATERIALS = {
  ice: { hp: 35, density: 0.0008, fill: '#b9e4f5', stroke: '#7fb8d4' },
  wood: { hp: 80, density: 0.001, fill: '#c98d4b', stroke: '#8f5f2c' },
  stone: { hp: 260, density: 0.0025, fill: '#a2a2a8', stroke: '#6d6d74' },
} as const satisfies Record<string, MaterialSpec>;

export type Material = keyof typeof MATERIALS;

export const PIG_HP = 22;
export const PIG_DENSITY = 0.001;
