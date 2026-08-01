/**
 * 수치 상수 — 전부 플랜 §8 표에서 온 값이다.
 * 태그 표기: 〔도출〕근거 있음 / 〔초기값〕임의 시작값(교체 시점 명시) / 〔임의〕근거 없음 선언.
 * 〔초기값〕 중 5단계(느낌 튜닝)에 해당하는 값은 아래 주석에 "튜닝 적용" 으로 대체 근거를 남긴다.
 */

import type { Material } from './types';

/** 〔도출〕16:9 논리 캔버스 */
export const LOGICAL_W = 1280;
export const LOGICAL_H = 720;

/** 지면 상단 y (월드 좌표 = 논리 캔버스 좌표) */
export const GROUND_Y = 640;

/** 〔도출〕물리 스텝 1/60초 고정 — rAF delta를 엔진에 그대로 넘기지 않는다 (§7-A 제약 1) */
export const FIXED_DT = 1000 / 60;
/** 한 프레임에 허용하는 최대 캐치업 스텝(탭 전환 후 폭주 방지) */
export const MAX_STEPS_PER_FRAME = 5;

/**
 * 중력. 〔초기값 → 튜닝 적용〕플랜 기준(최대 파워 궤적 정점 = 화면 높이 40~50%, 체류 1.6~2.2초)에
 * 맞추어 Matter 기본 1.0 → 0.85 로 낮췄다.
 * 스텝당 가속도 a = gravity.y * gravity.scale(0.001) * dt^2 ≈ 0.236 px/step^2.
 * 45도·최대 파워(18px/step)에서 v_y ≈ 12.7 → 정점 ≈ 342px(47%), 체류 ≈ 1.8초.
 */
export const GRAVITY_Y = 0.85;
export const GRAVITY_ACC = GRAVITY_Y * 0.001 * FIXED_DT * FIXED_DT;

/** 〔초기값 → 튜닝 적용〕최대 당김 거리(px). 새총 그래픽(높이 130px) 안에서 파워 단계가 보인다 */
export const MAX_PULL = 110;
/** 발사로 인정하는 최소 당김 거리 — 이하는 조준 취소 */
export const MIN_PULL = 10;
/** 〔초기값 → 튜닝 적용〕최대 발사 속도 18px/step = 1,080px/s (위 정점/체류 기준으로 1,320 → 1,080) */
export const MAX_LAUNCH_SPEED = 18;

/** 〔초기값〕궤적 예측: 12점 × 4스텝 간격 ≈ 0.8초, 충돌 무시 */
export const PRED_POINTS = 12;
export const PRED_STEP_INTERVAL = 4;
export const PRED_DOT_R = 4; // 점 지름 8px — 3단계 오차 기준(≤8px)의 근거

/** 재료 물성. HP 〔초기값〕비율 2:1:4.5 / 데미지 임계 〔도출〕정착 충격량보다 크게 */
export interface MaterialSpec {
  hp: number;
  threshold: number;
  density: number;
  friction: number;
  restitution: number;
  fill: string;
  stroke: string;
  debris: string;
}

export const MATERIALS: Record<Material, MaterialSpec> = {
  wood: {
    hp: 40,
    threshold: 8,
    density: 0.0022,
    friction: 0.62,
    restitution: 0.03,
    fill: '#b5762f',
    stroke: '#7d4d18',
    debris: '#c98c45',
  },
  ice: {
    hp: 20,
    threshold: 4,
    density: 0.0014,
    friction: 0.28,
    restitution: 0.08,
    fill: '#a8e0f6',
    stroke: '#5fb9de',
    debris: '#dff4ff',
  },
  stone: {
    hp: 90,
    threshold: 14,
    density: 0.0052,
    friction: 0.7,
    restitution: 0.02,
    fill: '#9aa3ab',
    stroke: '#666f77',
    debris: '#b9c1c8',
  },
};

/** 돼지 */
export const PIG_RADIUS = 18;
export const PIG_HP = 24;
export const PIG_THRESHOLD = 4;
export const PIG_DENSITY = 0.0018;

/** 새 */
export const BIRD_RADIUS = 14;
export const BIRD_DENSITY = 0.0062;
export const BIRD_RESTITUTION = 0.34;
/** 대시 배수 〔초기값〕돌(HP 90)을 직격 1회로 뚫는 하한에서 잡았다: 79 × 1.9 ≈ 150 > 90 */
export const DASH_MULTIPLIER = 1.9;

/**
 * 데미지 = 상대 속도^2 × DAMAGE_SCALE × 공격체 계수.
 * §7-A 제약 2: 1/mass 항을 쓰지 않는다(정적 바디 무한 질량 → NaN 경로를 코드에 두지 않음).
 * 〔초기값〕기본새 최대 파워 직격(≈15px/step) → 15^2×0.35 ≈ 79: 나무 파괴 / 돌 생존.
 */
export const DAMAGE_SCALE = 0.35;
export const ATTACK_FACTOR: Record<BodyKindKey, number> = {
  bird: 1.0,
  block: 0.7,
  pig: 0.5,
  debris: 0.5,
  ground: 0.6,
  terrain: 0.6,
};
type BodyKindKey = 'bird' | 'block' | 'pig' | 'debris' | 'ground' | 'terrain';

/** 충격 사운드/이펙트 하한 〔임의〕 잡음 억제용 */
export const IMPACT_FX_MIN = 6;
/** 화면 흔들림은 "큰 붕괴"에서만 (§1-B R5) */
export const SHAKE_MIN_IMPACT = 45;
export const SHAKE_MAX = 14;

/** 〔초기값〕정지 감지: 속도 < 0.35px/step 이 45스텝 연속, 또는 6초 하드 캡 */
export const REST_SPEED = 0.35;
export const REST_STEPS = 45;
export const SETTLE_HARD_CAP_STEPS = Math.round(6000 / FIXED_DT);
/** 발사한 새가 굴러가다 멈춘 것으로 보는 기준 */
export const BIRD_REST_SPEED = 0.6;
export const BIRD_REST_STEPS = 30;
/** 판정 후 결과 화면까지 지연 — §1-B "0.6초 안에" */
export const RESULT_DELAY_STEPS = Math.round(600 / FIXED_DT);

/** 〔초기값〕파편: 시각 파티클 240 상한, 물리 파편 바디 40 상한 */
export const PARTICLE_CAP = 240;
export const DEBRIS_CAP = 40;
export const DEBRIS_PER_BLOCK = 2;
export const DEBRIS_RADIUS = 6;
export const DEBRIS_LIFE_STEPS = 600;

/** 〔임의〕앵그리버드류 관례 가중치 — 별 기준이 par 상대값이라 절대값은 결과에 영향 없음 */
export const SCORE_PIG = 1000;
export const SCORE_BIRD_LEFT = 500;
export const SCORE_BLOCK = 100;

/** 〔도출(규칙)〕star1=클리어, star2=par×0.70, star3=par×0.90 */
export const STAR2_RATIO = 0.7;
export const STAR3_RATIO = 0.9;

/** 파편 시드 고정 (§7-A 제약 3) — 스테이지 id와 시도 횟수로 시드를 만든다 */
export const BASE_SEED = 0x9e37;
