// 모든 상수 (§4). 태그: 〔도출〕 / 〔초기값〕 / 〔임의〕
import type { BirdType, MaterialId, PigType } from './types';

// ── 월드·좌표계 (§4.2) ───────────────────────────────────────────
/** 〔임의: 16:9, 새총과 가장 먼 구조물이 한 화면에 들어오는 폭〕 */
export const WORLD_W = 1600;
export const WORLD_H = 900;
export const GROUND_Y = 820;
export const ANCHOR = { x: 240, y: 680 } as const;
export const BUILD_MIN_X = 800;
export const BUILD_MAX_X = 1560;

// ── 루프 (§4.2) ─────────────────────────────────────────────────
export const STEP_MS = 1000 / 60;
/** 〔임의〕 */
export const MAX_FRAME_MS = 250;
/** 〔임의〕 */
export const MAX_STEPS_PER_FRAME = 5;

// ── 엔진 ────────────────────────────────────────────────────────
export const GRAVITY_Y = 1;
export const GRAVITY_SCALE = 0.001;
/** 〔도출: 0.001 × (1000/60)² 〕 스텝당 중력 가속도 */
export const G_PER_STEP = GRAVITY_SCALE * GRAVITY_Y * STEP_MS * STEP_MS;
/** 〔초기값: S10 settle 테스트가 모든 스테이지에서 통과하면 동결〕 */
export const POSITION_ITERATIONS = 10;
/** 〔초기값: 위와 같음〕 */
export const VELOCITY_ITERATIONS = 8;

// ── 슬링샷 (§4.4) ───────────────────────────────────────────────
/** 〔임의: 새 반지름 22의 약 2.7배, 손가락 폭 고려〕 */
export const GRAB_RADIUS = 60;
export const MAX_PULL = 120;
/** 〔임의〕 */
export const MIN_PULL = 15;
/** 〔도출: v²/g ≈ 1850 (=1320×1.4) → v_max ≈ 22.7 → 22.7/120〕 */
export const LAUNCH_K = 0.19;
/** 새총 기둥 (고무줄 시작점) */
export const SLING_FORK_BACK = { x: 226, y: 678 } as const;
export const SLING_FORK_FRONT = { x: 256, y: 678 } as const;

// ── 궤적 예측 (§4.4) ────────────────────────────────────────────
/** 〔임의: 0.75초 분량〕 */
export const TRAJ_STEPS = 45;
export const TRAJ_EVERY = 3;
export const TRAIL_EVERY = 4;

// ── 충돌·데미지 (§4.5) ──────────────────────────────────────────
/** 〔도출: 높이 7 자유낙하 속도 √(2·0.2778·7) ≈ 1.97〕 */
export const V_MIN = 2.0;
/** 〔도출: 최대 속도 빨강이 20×100 나무(HP20)는 부수고 돌(HP50)은 못 부숨 → 30 / 22〕 */
export const DMG_K = 1;
/** 〔임의: 1초〕 */
export const GRACE_STEPS = 60;
export const OUT_MIN_X = -200;
export const OUT_MAX_X = 1800;
export const OUT_MAX_Y = 1100;
/** 〔도출: 블록 최소 두께 20 + 최소 새 지름 24 = 44 > 40 → 터널링 불가〕 */
export const MAX_SPEED = 40;
export const CRACK_1 = 0.66;
export const CRACK_2 = 0.33;

// ── 판정 (§4.6) ─────────────────────────────────────────────────
/** 〔임의〕 */
export const REST_SPEED = 0.2;
/** 〔임의〕 */
export const BIRD_REST_STEPS = 45;
/** 〔임의〕 */
export const BIRD_MAX_STEPS = 360;
export const CLEAR_DELAY_STEPS = 90;
export const NEXT_BIRD_DELAY_STEPS = 30;
export const FAIL_REST_STEPS = 30;
export const FAIL_MAX_STEPS = 300;
/** 첫 충돌 후 새가 굴러다니지 않게 주는 공기 저항 〔임의: 충돌 전 궤적에는 영향 없음〕 */
export const BIRD_POST_HIT_AIR = 0.02;

// ── 점수 (§4.6) ─────────────────────────────────────────────────
/** 〔임의: 장르 관례〕 */
export const SCORE_BLOCK: Record<MaterialId, number> = { glass: 300, wood: 500, stone: 800 };
export const SCORE_PIG = 5000;
export const SCORE_BIRD_LEFT = 10000;
/** 〔초기값: stage.stars로 덮어쓸 수 있음〕 */
export const STAR2_RATIO = 0.45;
export const STAR3_RATIO = 0.65;

// ── 재질 (§4.8) 〔초기값: S10 동결 규칙〕 ───────────────────────
export interface MaterialSpec {
  density: number;
  friction: number;
  restitution: number;
  hp: number;
  color: string;
  edge: string;
}
export const MATERIALS: Record<MaterialId, MaterialSpec> = {
  glass: { density: 0.0008, friction: 0.3, restitution: 0.1, hp: 8, color: '#a9e4f7', edge: '#5aa7c2' },
  wood: { density: 0.001, friction: 0.6, restitution: 0.05, hp: 20, color: '#c8893e', edge: '#7a4e1e' },
  stone: { density: 0.0025, friction: 0.8, restitution: 0.02, hp: 50, color: '#9ea3a8', edge: '#5d6166' },
};

// ── 돼지 (§4.8) ─────────────────────────────────────────────────
export interface PigSpec {
  radius: number;
  density: number;
  friction: number;
  restitution: number;
  hp: number;
}
export const PIGS: Record<PigType, PigSpec> = {
  small: { radius: 20, density: 0.001, friction: 0.5, restitution: 0.2, hp: 6 },
  large: { radius: 30, density: 0.001, friction: 0.5, restitution: 0.2, hp: 15 },
  helmet: { radius: 30, density: 0.0012, friction: 0.5, restitution: 0.2, hp: 30 },
};

// ── 새 (§4.7) 〔초기값: S10 동결 규칙〕 ─────────────────────────
export interface BirdSpec {
  radius: number;
  density: number;
  color: string;
  /** 부딪힌 재질별 데미지 배율 */
  attackMul: Partial<Record<MaterialId, number>>;
}
export const BIRDS: Record<BirdType, BirdSpec> = {
  red: { radius: 22, density: 0.004, color: '#e53935', attackMul: {} },
  blue: { radius: 16, density: 0.004, color: '#42a5f5', attackMul: { glass: 2 } },
  yellow: { radius: 20, density: 0.004, color: '#fdd835', attackMul: { wood: 2 } },
  black: { radius: 26, density: 0.006, color: '#263238', attackMul: {} },
};
export const BIRD_FRICTION = 0.8;
export const BLUE_SPLIT_RADIUS = 12;
export const BLUE_SPLIT_DEG = 12;
export const YELLOW_BOOST = 2;
export const BLACK_FUSE_STEPS = 90;
export const BLAST_RADIUS = 140;
export const BLAST_PUSH = 12;
export const BLAST_DAMAGE = 30;
export const BLAST_STONE_MUL = 1.5;

// ── 스테이지 검증 (§4.9) ────────────────────────────────────────
/** 〔임의: 저사양 충돌 비용 여유분〕 */
export const MAX_BODIES = 80;
export const MIN_BLOCK_SIDE = 20;
export const MAX_OVERLAP = 0.5;
export const STAGE_COUNT = 10;

// ── 이펙트 (§4.13) ──────────────────────────────────────────────
/** 〔임의〕 */
export const PARTICLE_CAP = 300;
export const DEBRIS_LIFE = 40;
export const SMOKE_LIFE = 60;
export const POPUP_LIFE = 60;
export const SHAKE_STEPS = 12;
export const SHAKE_AMP = 8;
/** 〔임의〕 충돌음은 3스텝에 최대 1번 */
export const IMPACT_SOUND_GAP = 3;

// ── UI ──────────────────────────────────────────────────────────
export const FADE_MS = 200;
export const SAVE_KEY = 'slingshot-bird.save.v1';
