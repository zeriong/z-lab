import type { BirdType, MaterialName, PigSize } from '../materials';

import s01 from './01.json';
import s02 from './02.json';
import s03 from './03.json';
import s04 from './04.json';
import s05 from './05.json';
import s06 from './06.json';
import s07 from './07.json';
import s08 from './08.json';
import s09 from './09.json';
import s10 from './10.json';

/** 스테이지 스키마 (플랜 §4) */
export interface BlockSpec {
  material: MaterialName;
  shape: 'box';
  x: number;
  y: number;
  w: number;
  h: number;
  angle: number;
}

export interface PigSpec {
  size: PigSize;
  x: number;
  y: number;
}

export interface StageDef {
  id: number;
  name: string;
  camera: { x: number; y: number; width: number };
  ground: { y: number };
  birds: BirdType[];
  blocks: BlockSpec[];
  pigs: PigSpec[];
  /** 1★/2★/3★ 임계 점수 */
  stars: [number, number, number];
}

/** 10개 전부 정적 import (총 수십 KB — lazy load 불필요, 플랜 §4) */
export const STAGES: StageDef[] = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10] as StageDef[];

export const STAGE_COUNT = STAGES.length;

export function getStage(id: number): StageDef {
  const found = STAGES.find((s) => s.id === id);
  if (!found) throw new Error(`알 수 없는 스테이지: ${id}`);
  // 에디터가 원본을 오염시키지 않도록 깊은 복사로 넘긴다.
  return JSON.parse(JSON.stringify(found)) as StageDef;
}

/** 슬링샷 위치는 스테이지 데이터가 아니라 지형에서 유도한다(전 스테이지 동일 규칙). */
export function slingAnchor(stage: StageDef): { x: number; y: number } {
  return { x: 260, y: stage.ground.y - 150 };
}

/** 궤적 점 개수: 1~3은 15개, 이후 8개로 줄여 난이도를 만든다 (플랜 §5) */
export function trajectoryPointCount(stageId: number): number {
  return stageId <= 3 ? 15 : 8;
}
