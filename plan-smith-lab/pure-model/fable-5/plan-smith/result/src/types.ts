// 공용 타입 — 게임 규칙 코드는 Matter 타입을 직접 import하지 않는다 (§6 패자 제약 / §13 격리 규칙)

export type Material = 'wood' | 'stone' | 'ice';

/** 스테이지 스키마 (§5 M1·M2) — TS 모듈로 저작, 스키마 위반은 컴파일 타임에 차단 (N2) */
export interface BlockDef {
  shape: 'box';
  material: Material;
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
}

export interface PigDef {
  x: number;
  y: number;
  r: number;
}

export interface Stage {
  id: number;
  /** 발사체(새) 수 */
  birds: number;
  blocks: BlockDef[];
  pigs: PigDef[];
  /** [2별 임계, 3별 임계] — 1별은 클리어 자체 (§5 M13) */
  starScores: [number, number];
  /** 저작자 의도 해법 주석 — 필수 필드 (§5, §12 완료 정의 3) */
  intent: string;
}

/** 인게임 페이즈 (§5) — AIMING → FLYING → SETTLING → AIMING(다음 새) 또는 판정 */
export type Phase = 'AIMING' | 'FLYING' | 'SETTLING';

/** 씬 (§5 M19) */
export type SceneName = 'MAIN' | 'SELECT' | 'PLAYING' | 'PAUSED' | 'CLEAR' | 'FAIL';
