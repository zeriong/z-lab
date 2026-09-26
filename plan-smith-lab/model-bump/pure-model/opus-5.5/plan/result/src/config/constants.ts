/**
 * 물리/게임 파라미터의 단일 출처 (§15).
 * "고정"이라고 적은 것 외에는 모두 초기값(v0)이다. Phase 0 스파이크와 플레이테스트로 조정하고,
 * 조정한 값은 이 파일에서만 바꾼다.
 */

// ── 좌표계 (§3.3, 고정) ────────────────────────────────────────────────
/** 논리 해상도 (고정) */
export const LOGICAL_W = 1920;
export const LOGICAL_H = 1080;
/** 지면 윗면 y (고정). y축은 아래로 증가한다. */
export const GROUND_Y = 980;
/** 지면 정적 바디가 덮는 x 구간 (고정) */
export const GROUND_X_MIN = -400;
export const GROUND_X_MAX = 2320;
export const GROUND_THICKNESS = 200;

// ── 물리 (§2 ADR-4, §15) ───────────────────────────────────────────────
/** px/m. 변환은 core/physics/world.ts에서만 한다. */
export const PPM = 50;
/** 고정 스텝 (s) */
export const DT = 1 / 60;
/** S1 스파이크로 결정. 모자라면 10 / 8 */
export const VEL_ITERS = 8;
export const POS_ITERS = 3;
/** 중력 (m/s², y-down이므로 +G) */
export const G = 20;

// ── 슬링샷 (§5.1) ──────────────────────────────────────────────────────
/** 최대 당김에서의 발사 속도 (m/s). 기준: 최대 파워 45° 발사가 x≈1850 부근에 떨어진다. */
export const V_MAX = 25.5;
export const L_MAX = 130;
export const L_MIN = 20;
export const GRAB_RADIUS = 70;
export const SLINGSHOT_DEFAULT_X = 260;
/** 주머니 기준점(앵커)은 지면에서 150px 위 */
export const SLINGSHOT_ANCHOR_HEIGHT = 150;
/** 새총 두 갈래 끝의 앵커 기준 오프셋 (시각 전용) */
export const SLING_FORK_BACK = { x: 14, y: -8 };
export const SLING_FORK_FRONT = { x: -14, y: -4 };

// ── 궤적 예측 (§5.2) ───────────────────────────────────────────────────
export const PREVIEW_SECONDS = 0.75;
export const PREVIEW_DOT_EVERY_STEPS = 3;
export const TRAIL_EVERY_STEPS = 3;

// ── 데미지 (§5.4) ──────────────────────────────────────────────────────
/**
 * 임계 충격량 T (N·s). S1에서 관측한 정지 상태 최대 스텝 충격량 × 1.5로 정한다.
 * v0: 스테이지 설계 상한(바디당 지지 하중 ≲ 15 kg)에서의 정지 접촉 충격량 ≈ 1.6 N·s × 1.5.
 */
export const DAMAGE_T = 2.5;
/** 데미지 스케일 K. 캘리브레이션 앵커 A1을 만족하도록 정한다. */
export const DAMAGE_K = 16;
/** 스테이지 시작 후 데미지를 끄는 유예 시간 (고정) */
export const GRACE_SECONDS = 1.0;
/** 월드 이탈 경계 (px). 위쪽(y<0)은 이탈로 보지 않는다. */
export const WORLD_BOUNDS = { minX: -300, maxX: 2220, maxY: 1300 } as const;

// ── 새 종료와 정착 (§5.5) ──────────────────────────────────────────────
export const BIRD_DONE_SPEED = 0.3;
export const BIRD_DONE_TIME = 1.0;
export const SETTLE_LIN = 0.05;
export const SETTLE_ANG = 0.05;
export const SETTLE_HOLD = 0.5;
export const FLY_TIMEOUT = 8;
export const SETTLE_TIMEOUT = 3;

// ── 턴 (§4.2) ──────────────────────────────────────────────────────────
export const LOADING_SECONDS = 0.5;
/** (고정) */
export const CLEAR_PENDING_SECONDS = 1.5;

// ── 특수 능력 (§5.3, §5.6) ─────────────────────────────────────────────
export const YELLOW_BOOST = 2.2;
export const YELLOW_MAX_SPEED = 60;
export const BOMB_AUTO_FUSE = 2.0;

// ── 루프 (§2 ADR-4, 고정) ──────────────────────────────────────────────
export const MAX_FRAME_DELTA = 0.1;
export const MAX_STEPS = 5;
export const DPR_CAP = 2;

// ── 스테이지 제약 (§6.4) ───────────────────────────────────────────────
export const STAGE_COUNT = 10;
export const MAX_DYNAMIC_BODIES = 80;
export const MIN_BLOCK_SIZE = 20;
export const MIN_BIRDS = 1;
export const MAX_BIRDS = 6;
export const SPAWN_OVERLAP_TOLERANCE = 0.5;
export const SPAWN_MAX_DRIFT = 5;

// ── 테스트/재생 (§11.2) ────────────────────────────────────────────────
export const REPLAY_MAX_SECONDS = 120;
export const ROBUSTNESS_JITTER = 3;

// ── UI (§6.3, §7.3) ────────────────────────────────────────────────────
export const TRANSITION_MS = 200;
export const PAUSE_BUTTON_LOGICAL = 64;
export const PAUSE_BUTTON_MIN_CSS = 44;
export const PAUSE_BUTTON_MARGIN_RATIO = 0.015;

// ── 이펙트 (§8.2, 시각 전용) ───────────────────────────────────────────
export const DEBRIS_SECONDS = 0.6;
export const MAX_PARTICLES = 320;
