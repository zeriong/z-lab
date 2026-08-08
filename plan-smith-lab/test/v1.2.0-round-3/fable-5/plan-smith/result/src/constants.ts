import type { Material } from './types';

// ---- 월드 (960×540 = 16:9 관례, 플랜 수치 태그: 임의) ----
export const WORLD_W = 960;
export const WORLD_H = 540;
export const GROUND_Y = 500; // 지면 띠 상단

// ---- 슬링샷 ----
export const ANCHOR = { x: 160, y: 380 };
export const PULL_RADIUS = 80; // 당김 반경 (선언적 임의값 — S9 캘리브레이션 대상)
export const LAUNCH_K = 0.2; // 발사 계수 k: 속도(px/step) = 당김(px) × k (선언적 임의값)
export const BIRD_R = 14;

// Matter 기본 중력(y=1, scale=0.001)이 60fps 스텝(16.666ms)에서 만드는
// 스텝당 가속도 근사치: 0.001 × 16.666² ≈ 0.278 — 궤적 예측(L7)이 같은 공식을 쓴다.
export const GRAVITY_PER_STEP = 0.278;

// ---- 파괴 판정 (v_break 계열 — 선언적 임의값, S9 캘리브레이션 대상) ----
export const BLOCK_BREAK_SPEED = 4; // 블록 내구도 차감 임계 상대속도
export const PIG_BREAK_SPEED = 3; // 돼지 1회 소멸 임계 상대속도

export const MATERIAL_HP: Record<Material, number> = {
  glass: 4, // 임계 이상 1타에 파괴되도록 설정 (난이도표: 유리 = 1타 파괴)
  wood: 12,
  stone: 30,
};

export const MATERIAL_DMG_MULT: Record<Material, number> = {
  glass: 2,
  wood: 1,
  stone: 0.6,
};

export const MATERIAL_COLORS: Record<Material, string> = {
  wood: '#c08a4a',
  glass: 'rgba(178, 224, 244, 0.88)',
  stone: '#9aa0a6',
};

export const MATERIAL_STROKES: Record<Material, string> = {
  wood: '#7a4a21',
  glass: '#6aa8c8',
  stone: '#5f6668',
};

// ---- 정착/수명 (임의값 — 속도 하한과 타임아웃 병행, 플랜 S6) ----
export const SETTLE_SPEED = 0.2; // 전 바디 속도 하한
export const SETTLE_TIMEOUT_MS = 6000; // 정착 대기 상한
export const BIRD_RETIRE_MS = 6000; // 발사된 새의 수명 상한
export const BIRD_CALM_TICKS = 45; // 새 정착 판정 연속 틱

// ---- 점수 (원작 관례 유래 — 플랜 S7) ----
export const SCORE_BLOCK = 500;
export const SCORE_PIG = 5000;
export const SCORE_BIRD_BONUS = 10000;
