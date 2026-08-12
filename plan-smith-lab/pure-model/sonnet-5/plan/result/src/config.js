/**
 * 계획서 §7: 모든 튜닝 상수를 이 파일 하나에 모은다.
 * 플레이테스트로 조정될 값들은 "초기값(playtest 조정 대상)"으로 주석에 표기한다.
 */

// --- 캔버스 / 화면 (§1-2, §1-4 데스크톱 우선 고정 해상도) ---
export const CANVAS_WIDTH = 1024;
export const CANVAS_HEIGHT = 576;

// --- 게임 루프 (§1-3) ---
export const FIXED_DT_MS = 1000 / 60; // 고정 타임스텝 16.667ms
export const MAX_FRAME_DELTA_MS = 250; // 탭 전환 등 큰 델타 유입 시 상한(따라잡기 폭주 방지 보조)

// --- 물리 엔진 (§1-1) ---
export const GRAVITY = { y: 1, scale: 0.001 }; // Matter 기본값 기준
export const PHYSICS_ITERATIONS = { position: 8, velocity: 6 }; // 기본(6/4)보다 상향 — 안정성 대응(§1-1)
export const MIN_BLOCK_THICKNESS = 8; // 콘텐츠 제작 규칙(§1-1) — 스테이지 JSON 검증 시 참고용 하한

// --- 슬링샷 입력 (§4) ---
export const BIRD_RADIUS = 14; // 최소 12px 이상(§1-1 터널링 대응)
export const BIRD_HIT_RADIUS_MULT = 1.6; // 히트 판정 반경 배수(§4-1)
export const MAX_PULL = 120; // px, 앵커 기준 최대 드래그 반경(§4-3)
export const MIN_DRAG_DISTANCE = 20; // px, 미만이면 발사로 인정하지 않음(§4-1)
export const PULL_TO_VELOCITY_SCALE = 9; // px(드래그) -> px/s, 초기값(playtest 조정 대상, §4-3)
export const MAX_BIRD_SPEED_PX_S = 2400; // 매 프레임 속도 상한(터널링 대응, §1-1)

// --- 궤적 예측 (§4-2, 빈 공간 이상적 탄도) ---
export const TRAJECTORY_POINTS = 7;
export const TRAJECTORY_TIME_STEP_S = 0.08;
// 물리 엔진의 GRAVITY 설정과 시각적으로 맞도록 조정하는 근사 상수(초기값, playtest 조정 대상 — §1-1, §4-3).
export const TRAJECTORY_GRAVITY_PX_S2 = 2000;

// --- 파괴 판정 (§6-2) ---
export const DAMAGE_SCALE = 0.6; // 상대속도 -> 데미지 환산 계수(재질 무관 공통, playtest 조정 대상)

// --- 돼지 판정 (§6-3) ---
export const PIG_RADIUS_DEFAULT = 18;
export const PIG_KILL_THRESHOLD = 6; // 상대속도 임계값(playtest 조정 대상)

// --- 새 소진 판정 (§6-5) ---
export const STOP_VELOCITY_THRESHOLD = 0.05; // per-step 속도 크기 기준 "정지"로 간주
export const STOP_DURATION_MS = 500; // 정지 상태가 이 시간 이상 유지되면 소진 처리
export const OUT_OF_BOUNDS_MARGIN_X = 100;
export const OUT_OF_BOUNDS_MARGIN_Y = 200;

// --- 점수 (§6-4) ---
export const SCORE = {
  pig: 500,
  block: { wood: 50, stone: 100, ice: 20 },
  unusedBirdBonus: 1000,
};

// --- 스테이지 / 세이브 (§5-2) ---
export const TOTAL_STAGES = 10;
export const STORAGE_KEY = 'angry-birds-web:save-v1';
