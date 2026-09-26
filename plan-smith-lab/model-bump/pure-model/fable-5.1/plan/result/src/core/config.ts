/**
 * 게임 전역 상수. 계획서 §3.4 / §6 의 수치를 한 곳에 모은다.
 * DOM·Matter 의존 없음 (헤드리스 테스트에서 그대로 사용).
 */
import type { Vec } from './math';

/** 논리 월드 크기 (px). 고정 카메라. */
export const WORLD_W = 1280;
export const WORLD_H = 720;

/** 지면: 표면 y = 660, 두께 60 인 정적 바디. */
export const GROUND_Y = 660;
export const GROUND_THICKNESS = 60;
export const GROUND_WIDTH = 4000;

/** 새총 앵커 (새가 정지하는 지점). */
export const ANCHOR: Readonly<Vec> = Object.freeze({ x: 220, y: 560 });

/** 고정 시간 스텝 (ms). */
export const STEP_MS = 1000 / 60;
export const MAX_STEPS_PER_FRAME = 5;
export const FRAME_DELTA_CAP_MS = 100;

/** Matter 기본 중력 (gravity.y * scale * dt² ≈ 0.278 px/tick²). */
export const GRAVITY_Y = 1;
export const GRAVITY_SCALE = 0.001;
export const GRAVITY_PER_TICK = GRAVITY_Y * GRAVITY_SCALE * STEP_MS * STEP_MS;

/** 솔버 설정. */
export const POSITION_ITERATIONS = 10;
export const VELOCITY_ITERATIONS = 8;

/** 새총 입력. */
export const MAX_PULL = 100; // px
export const MIN_PULL = 12; // px 미만에서 놓으면 취소
export const MAX_SPEED = 18; // px/tick
export const GRAB_RADIUS = 40; // 새 중심에서 이 반경 안을 누르면 드래그 시작

/** 월드 경계 밖 판정 (이 밖으로 나간 바디는 제거). */
export const BOUNDS = Object.freeze({ minX: -100, maxX: 1380, maxY: 820 });

/** 정착 판정 (§6.3). */
export const SETTLE = Object.freeze({
  quietTicks: 45,
  timeoutTicks: 480,
  nextBirdDelayTicks: 30,
  speedEps: 0.2,
  angularEps: 0.02,
});

/** 레벨 로드 후 사전 정착 틱 수. */
export const PRE_SETTLE_TICKS = 30;

/** 돼지 0 → 클리어까지 유예 (1.2초). */
export const CLEAR_DELAY_TICKS = 72;

/** 궤적 예측 (§6.2). */
export const TRAJECTORY = Object.freeze({
  ticks: 90,
  every: 3,
  groundY: 642, // 새 중심이 여기 닿으면 중단 (660 − 반지름 18)
});

/** 데미지 (§6.4). */
export const DAMAGE = Object.freeze({
  minRelVel: 3,
  cooldownTicks: 10,
  crackStage1: 0.66,
  crackStage2: 0.33,
});

/** 파티클 상한. */
export const MAX_PARTICLES = 200;

export const STORAGE_KEY = 'ab.progress.v1';
export const STAGE_COUNT = 10;
