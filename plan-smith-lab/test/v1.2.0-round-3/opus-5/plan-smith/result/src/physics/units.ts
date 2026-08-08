/**
 * 물리 단위 변환의 단일 출처.
 *
 * 물리 라이브러리는 속도를 "기준 델타(1/60초)당 픽셀"로 다루고,
 * 게임 로직·궤적 예측·정지 판정은 전부 "초당 픽셀"로 다룬다.
 * 두 세계가 어긋나면 예측 궤적과 실제 비행이 눈에 띄게 갈라지므로
 * 변환 상수는 이 파일에서만 정의하고 모든 소비자가 여기서 읽는다.
 */

/** 엔진 내부 기준 델타(ms). 속도 단위의 분모. */
export const BASE_DELTA_MS = 1000 / 60;

/** 초당 픽셀 → 엔진 속도 단위. */
export const PX_PER_SEC_TO_ENGINE = BASE_DELTA_MS / 1000;

/** 엔진 속도 단위 → 초당 픽셀. */
export const ENGINE_TO_PX_PER_SEC = 1000 / BASE_DELTA_MS;

/**
 * 중력 1.0일 때의 실질 가속도(px/s^2).
 * 엔진의 gravityScale(0.001) × 기준 델타^2 를 초 단위로 환산한 근사값이며,
 * 궤적 예측(B8 소비)과 실제 비행이 같은 값을 쓰게 하기 위해 상수로 고정한다.
 */
export const GRAVITY_PX_PER_SEC2 = 1000;

/** 고정 물리 스텝(초). 1/120 — 최고 속도 1400px/s ÷ 120 ≈ 11.7px/스텝 < 최소 블록 두께 20px. */
export const FIXED_STEP_SEC = 1 / 120;

/** 한 프레임에서 소화할 최대 스텝 수. 스파이럴 오브 데스 방지. */
export const MAX_STEPS_PER_FRAME = 4;

/** 슬링샷 최대 당김 거리(px). */
export const MAX_DRAG_PX = 120;

/** 최대 당김에서의 발사 속도(px/s). */
export const MAX_LAUNCH_SPEED = 1400;

/** 오클릭 방지 — 이 길이 미만의 드래그는 발사로 치지 않는다. */
export const MIN_DRAG_PX = 8;

/** 가상 해상도(월드 좌표계의 기준 화면). */
export const VIRTUAL_W = 1920;
export const VIRTUAL_H = 1080;

/** 지면 상단 y (월드 좌표). */
export const GROUND_Y = 960;

/** 정지 판정 속도 임계(px/s). 이 값 아래가 30프레임 지속되면 턴을 닫는다. */
export const SETTLE_SPEED_PX_PER_SEC = 36;

/** 정지 판정 지속 프레임 수. */
export const SETTLE_FRAMES = 30;

/** 턴 하드캡(초). 잔해 진동으로 턴이 무한정 끌리는 것을 막는다. */
export const TURN_HARD_CAP_SEC = 6;

/** 드래그 벡터를 발사 속도(px/s)로 바꾼다. 궤적 예측과 실제 발사가 공유한다. */
export function dragToLaunchVelocity(dragX: number, dragY: number): { vx: number; vy: number } {
  const len = Math.hypot(dragX, dragY);
  if (len <= 0) return { vx: 0, vy: 0 };
  const clamped = Math.min(len, MAX_DRAG_PX);
  const speed = (clamped / MAX_DRAG_PX) * MAX_LAUNCH_SPEED;
  // 드래그의 반대 방향으로 날아간다.
  return { vx: (-dragX / len) * speed, vy: (-dragY / len) * speed };
}

/** 드래그 벡터를 최대 당김 거리로 자른다(화면 표시와 발사가 같은 값을 쓰게). */
export function clampDrag(dragX: number, dragY: number): { x: number; y: number; len: number } {
  const len = Math.hypot(dragX, dragY);
  if (len <= MAX_DRAG_PX) return { x: dragX, y: dragY, len };
  const k = MAX_DRAG_PX / len;
  return { x: dragX * k, y: dragY * k, len: MAX_DRAG_PX };
}
