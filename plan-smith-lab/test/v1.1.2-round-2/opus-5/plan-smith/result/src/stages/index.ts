/**
 * 스테이지 목록 + 로더 (§5-6단계).
 * 로드 시점에 전부 검증한다 — 검증 실패한 스테이지는 목록에서 제외되고 콘솔에 필드별 이유가 남는다.
 */

import type { StageDef } from '../types';
import { parseStage } from '../stage-schema';
import { stage01 } from './stage01';
import { stage02 } from './stage02';
import { stage03 } from './stage03';
import { stage04 } from './stage04';
import { stage05 } from './stage05';
import { stage06 } from './stage06';
import { stage07 } from './stage07';
import { stage08 } from './stage08';
import { stage09 } from './stage09';
import { stage10 } from './stage10';

const RAW: unknown[] = [
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

export const TOTAL_STAGES = 10;

const validated: StageDef[] = [];
RAW.forEach((raw, i) => {
  const parsed = parseStage(raw, `stage${String(i + 1).padStart(2, '0')}`);
  if (parsed) validated.push(parsed);
});

if (validated.length !== TOTAL_STAGES) {
  console.error(
    `[stages] 유효한 스테이지가 ${validated.length}개다 — ${TOTAL_STAGES}개여야 한다. 위의 검증 오류를 확인하라.`,
  );
}

export const STAGES: readonly StageDef[] = validated;

export function stageById(id: number): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}

export function nextStageId(id: number): number | null {
  return id < TOTAL_STAGES ? id + 1 : null;
}
