// §5 초기값 표 — 모든 수치는 (a) 도출 / (b) 수명 캡 / (c) 임의 태그를 단다.
// (c) 임의 값 전부가 이 파일에 있다. 스텝 7(콘텐츠 저작·튜닝)이 유일한 교체 지점이다 (§13 수치 규칙).

import type { Material } from './types';

/** (a) 도출 — 16:9 관례, 레터박스 전제 (M24) */
export const WORLD = {
  width: 1280,
  height: 720,
  /** (c) 임의 — 지면 윗면 y. 평지 지형 (§5) */
  groundY: 660,
  groundThickness: 120,
};

/** (c) 임의 — 슬링샷 패드 위치. 좌측 배치 + 발사 여유 확보. 수명: 스텝 7 튜닝 */
export const SLING = { x: 200, y: 500 };

export const CFG = {
  /** (a) 도출 — 고정 타임스텝 (M15) */
  fixedDt: 1000 / 60,
  /** (a) 도출 — 탭 비활성 dt 클램프 (M25) */
  maxFrameDt: 50,
  /** (c) 임의 — 발사 계수 k (v0 = -k·d). 수명: 스텝 7 튜닝에서 교체 */
  launchK: 0.18,
  /** (c) 임의 — 최대 당김 px. 동일 수명 */
  maxDrag: 120,
  /** (c) 임의 — 이 미만 당김은 발사 취소. 동일 수명 */
  minLaunchPull: 10,
  /** (c) 임의 — 새 잡기 판정 반경 px. 동일 수명 */
  grabRadius: 60,
  /** (c) 임의 — 정지 판정: speed < 0.15가 45프레임 연속 (§5 M11). 동일 수명 */
  stopSpeed: 0.15,
  stopFrames: 45,
  /** (c) 임의 — 발사 후 턴 타임아웃. 시뮬레이션 누적기로만 계산 (§11 일시정지 누수 방지) */
  turnTimeoutMs: 8000,
  /** (c) 임의 — 궤적 점선: 24점 × 3틱 간격 (M8) */
  trajPoints: 24,
  trajTickStep: 3,
};

/** (a) 도출 — 점수 배점: 원작 관례 차용 (§5 M13) */
export const SCORE = {
  pig: 5000,
  block: 500,
  /** 클리어 시 잔여 새 1마리당 */
  birdBonus: 10000,
};

/** (c) 임의 — 파괴 임계/hp: ice 4/2 · wood 7/4 · stone 11/8 (§5 데미지 모델). 수명: 스텝 7 */
export const MATERIALS: Record<
  Material,
  { threshold: number; hp: number; density: number; color: string; edge: string }
> = {
  ice: { threshold: 4, hp: 2, density: 0.0006, color: '#bfe6f7', edge: '#8ec9e8' },
  wood: { threshold: 7, hp: 4, density: 0.001, color: '#c98d4b', edge: '#96682f' },
  stone: { threshold: 11, hp: 8, density: 0.0025, color: '#9aa0a6', edge: '#6b7076' },
};

/** (c) 임의 — 돼지 임계 5 / hp 6 (§5). 수명: 스텝 7 */
export const PIG = {
  threshold: 5,
  hp: 6,
  density: 0.001,
  color: '#7ed957',
  edge: '#4ea52f',
};

/** (c) 임의 — 새 바디 파라미터. frictionAir=0은 궤적 예측 일치를 위한 설계 고정 (§5 M6~M8, §11) */
export const BIRD = {
  r: 16,
  density: 0.004,
  restitution: 0.4,
  friction: 0.5,
  color: '#e74c3c',
  edge: '#a82315',
};
