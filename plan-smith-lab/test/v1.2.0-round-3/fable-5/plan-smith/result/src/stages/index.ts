import type { StageData } from '../types';
import stage01 from './stage01';
import stage02 from './stage02';
import stage03 from './stage03';
import stage04 from './stage04';
import stage05 from './stage05';
import stage06 from './stage06';
import stage07 from './stage07';
import stage08 from './stage08';
import stage09 from './stage09';
import stage10 from './stage10';

/** 스테이지 데이터 10종 (L1) — 난이도 곡선은 플랜 S9 표를 따른다 */
export const STAGES: StageData[] = [
  stage01,
  stage02,
  stage03,
  stage04,
  stage05,
  stage06,
  stage07,
  stage08,
  stage09,
  stage10,
];

export function getStage(n: number): StageData {
  const data = STAGES[n - 1];
  if (!data) throw new Error(`stage ${n} does not exist`);
  return data;
}
