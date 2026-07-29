import type { Material } from './types';

/* ------------------------------------------------------------------ *
 * 논리 좌표계 — 캔버스는 이 크기를 기준으로 그리고, 화면에 맞춰 스케일한다.
 * ------------------------------------------------------------------ */
export const LOGICAL_W = 1280;
export const LOGICAL_H = 720;
/** 지면 표면 y (블록/돼지는 이 위에 올라간다) */
export const GROUND_Y = 640;

/* ------------------------------------------------------------------ *
 * 물리 스텝 상수
 *
 * Matter.js의 속도 단위는 "px / step" 이며,
 * 한 스텝의 중력 가속량은  gravity.y * gravity.scale * delta^2  이다.
 * 궤적 예측과 실제 발사가 어긋나지 않도록 여기 있는 값만 사용한다.
 * ------------------------------------------------------------------ */
export const TIMESTEP = 1000 / 60;
export const GRAVITY_Y = 1;
export const GRAVITY_SCALE = 0.001;
/** 스텝당 y 속도 증가량 (약 0.278 px/step) */
export const G_PER_STEP = GRAVITY_Y * GRAVITY_SCALE * TIMESTEP * TIMESTEP;

/* ------------------------------------------------------------------ *
 * 슬링샷
 * ------------------------------------------------------------------ */
/** 최대 당김 거리(px) */
export const MAX_PULL = 130;
/** 당김 벡터 → 초기 속도(px/step) 변환 계수. 최대 당김 시 약 22 px/step */
export const PULL_TO_VELOCITY = 0.17;
/** 장전된 새를 집을 수 있는 반경 */
export const GRAB_RADIUS = 80;

/** 궤적 점 개수 (겨냥은 되지만 정답은 아닌 밸런스) */
export const TRAJECTORY_DOTS = 11;
/** 궤적 점 간격(물리 스텝 수) */
export const TRAJECTORY_STEP_GAP = 7;

/* ------------------------------------------------------------------ *
 * 발사체
 * ------------------------------------------------------------------ */
export const BIRD_RADIUS = 16;
export const BIRD_DENSITY = 0.004; // mass ≈ 3.2
/** 궤적 공식과 실제 비행을 일치시키려면 공기저항 0 */
export const BIRD_FRICTION_AIR = 0;
export const BIRD_RESTITUTION = 0.35;
export const BIRD_FRICTION = 0.5;

/* ------------------------------------------------------------------ *
 * 정지(안정) 판정
 * ------------------------------------------------------------------ */
/** 이 속도 미만이면 "멈춘 것"으로 본다 (px/step) */
export const SETTLE_SPEED = 0.4;
/** 월드 전체가 이만큼 계속 조용하면 안정 (ms) */
export const WORLD_SETTLE_MS = 1500;
/** 발사된 새가 이만큼 조용하면 소진 처리 (ms) */
export const BIRD_SETTLE_MS = 600;
/** 새가 영원히 날지 못하도록 하는 상한 (ms) */
export const BIRD_MAX_FLIGHT_MS = 8000;
/** 다음 새 장전 지연 (ms) */
export const RELOAD_DELAY_MS = 550;
/** 클리어/실패 오버레이 표시 지연 (ms) */
export const RESULT_DELAY_MS = 850;

/* ------------------------------------------------------------------ *
 * 충돌 / 데미지
 * ------------------------------------------------------------------ */
/** 이 상대속도 미만 접촉은 무시 (스택 지터로 인한 오판정 방지) */
export const MIN_IMPACT_SPEED = 1.2;
/** 정적 바디(지면 등)를 대신할 유효 질량 */
export const STATIC_MASS_PROXY = 3;
/** 충격량 계산에 쓰이는 상대 질량 상한 */
export const IMPACT_MASS_CAP = 12;

export interface MaterialSpec {
  density: number;
  hp: number;
  damageThreshold: number;
  restitution: number;
  friction: number;
  fill: string;
  fillDamaged: string;
  edge: string;
  score: number;
}

export const MATERIALS: Record<Material, MaterialSpec> = {
  glass: {
    density: 0.0008,
    hp: 12,
    damageThreshold: 8,
    restitution: 0.02,
    friction: 0.3,
    fill: 'rgba(150, 224, 240, 0.62)',
    fillDamaged: 'rgba(150, 224, 240, 0.3)',
    edge: 'rgba(226, 252, 255, 0.9)',
    score: 400,
  },
  wood: {
    density: 0.0016,
    hp: 26,
    damageThreshold: 14,
    restitution: 0.05,
    friction: 0.6,
    fill: '#c08a4a',
    fillDamaged: '#9a6a34',
    edge: '#7d5527',
    score: 500,
  },
  stone: {
    density: 0.005,
    hp: 48,
    damageThreshold: 26,
    restitution: 0.03,
    friction: 0.75,
    fill: '#9aa3ad',
    fillDamaged: '#737c86',
    edge: '#5c646d',
    score: 700,
  },
};

/* 돼지 */
export const PIG_HP = 20;
export const PIG_DAMAGE_THRESHOLD = 5;
export const PIG_DENSITY = 0.0012;

/* ------------------------------------------------------------------ *
 * 점수
 * ------------------------------------------------------------------ */
export const SCORE_PIG = 5000;
export const SCORE_UNUSED_BIRD = 10000;

/* ------------------------------------------------------------------ *
 * 기타
 * ------------------------------------------------------------------ */
export const STORAGE_KEY = 'ab-opus-plan-progress-v1';
/** 이 범위를 벗어난 바디는 월드에서 제거 (안정 판정을 막지 않도록) */
export const CULL_MARGIN = 260;
