/**
 * Every numeric value below that carries a "declared arbitrary" or "derived"
 * comment corresponds 1:1 to a row in the plan's §숫자·계수 태그 table. Values
 * without such a comment are layout/rendering constants the plan left to the
 * implementer (not tagged in the plan because they are not gameplay-affecting
 * coefficients).
 */

export const CANVAS_WIDTH = 960;
export const CANVAS_HEIGHT = 600;

export const GROUND_SURFACE_Y = 560;
export const GROUND_THICKNESS = 200;
export const WORLD_WIDTH = 4000;

// declared arbitrary (plan §숫자 태그: "중력 스케일 ×1.2, Matter 기본값 1 대비").
// Matter's gravity.scale is left at its library default; only gravity.y is
// scaled per the plan's stated ratio.
export const GRAVITY_Y = 1.2;

// declared arbitrary (plan §숫자 태그: 나무 HP=2 / 돌 HP=4 / 유리 HP=1).
export const MATERIAL_HP: Record<'wood' | 'stone' | 'glass', number> = {
  wood: 2,
  stone: 4,
  glass: 1,
};

// declared arbitrary (plan §숫자 태그: "유리 파괴 임계 충돌속도 v>=2유닛"). The
// plan only states a numeric velocity threshold for glass; this implementation
// reuses that single value as the general impact-damage / pig-removal trigger
// for all materials, since the plan does not define a separate threshold per
// material beyond HP counts. This generalization is an implementer choice,
// not a plan-stated fact.
export const DAMAGE_VELOCITY_THRESHOLD = 2;

export const SLINGSHOT_ANCHOR = { x: 180, y: 460 };
export const MAX_DRAG_DISTANCE = 120;

// declared arbitrary (implementer tuning, not in plan's numeric tag table):
// converts drag-back pixels into Matter launch velocity.
export const LAUNCH_POWER_MULTIPLIER = 0.18;

// declared arbitrary (plan §숫자 태그: "궤적 예측선 포인트 수 = 30").
export const TRAJECTORY_POINT_COUNT = 30;

// declared arbitrary (implementer tuning): the trajectory preview is a
// simplified visual aid decoupled from Matter's internal gravity/mass
// integration (which is not reproducible bit-for-bit without running the
// engine). It is deliberately a separate constant from GRAVITY_Y so the two
// are never silently conflated.
export const TRAJECTORY_GRAVITY_APPROX = 0.6;

// declared arbitrary (plan §숫자 태그: "스테이지당 동시 물리 바디 상한 = 40").
export const MAX_BODIES_PER_STAGE = 40;

// declared arbitrary (plan §숫자 태그: "성능 저하 감지 임계 = fps<30이 2초 지속").
export const LOW_FPS_THRESHOLD = 30;
export const LOW_FPS_DURATION_MS = 2000;

// declared arbitrary (plan §숫자 태그: "돼지 처치 점수 5000" / "잔여 새 보너스 2000/마리").
export const PIG_KILL_SCORE = 5000;
export const BIRD_BONUS_SCORE = 2000;

// declared arbitrary (implementer tuning, not in plan's numeric tag table):
// defines when a launched bird is considered "settled" so the next shot (or
// clear/fail check) can proceed.
export const BIRD_SETTLE_SPEED = 0.05;
export const BIRD_SETTLE_FRAMES = 45;

export const SAVE_KEY = 'angry-birds-web-save-v1';
