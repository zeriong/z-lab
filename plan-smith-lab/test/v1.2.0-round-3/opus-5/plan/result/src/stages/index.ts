/**
 * §10.2 스테이지는 정적 TS 모듈. 10개 × 수 KB라 코드 스플리팅 이득이 없어 한 번에 번들한다.
 * (네트워크 실패 경로가 사라진다는 것이 주된 이득)
 */

import type { StageData } from './schema';
import { validateAllStages } from './schema';

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

export const STAGE_COUNT = STAGES.length;

export function getStage(id: number): StageData | undefined {
  return STAGES.find((s) => s.id === id);
}

/** 개발 모드에서만 스키마 검증 결과를 콘솔에 알린다 (§16.1). */
export function runStageValidation(): string[] {
  const errs = validateAllStages(STAGES);
  if (errs.length > 0 && import.meta.env.DEV) {
    console.warn('[stages] 스키마 검증 실패:\n' + errs.join('\n'));
  }
  return errs;
}

export type { StageData };
