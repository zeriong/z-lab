// A1: 10개 스테이지를 배열로 export. 길이 10은 satisfies 튜플로 컴파일 타임에, 나머지 스키마는 validateStages로 로드 시 강제.
import { STAGE_COUNT, type StageDef } from '../types';
import stage01 from './01';
import stage02 from './02';
import stage03 from './03';
import stage04 from './04';
import stage05 from './05';
import stage06 from './06';
import stage07 from './07';
import stage08 from './08';
import stage09 from './09';
import stage10 from './10';

type Ten<T> = readonly [T, T, T, T, T, T, T, T, T, T];

export const STAGES = [
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
] as const satisfies Ten<StageDef>;

export class StageSchemaError extends Error {
  constructor(message: string) {
    super(`StageSchemaError: ${message}`);
    this.name = 'StageSchemaError';
  }
}

/** 스키마 검증. 실패 시 throw — 모듈 로드(개발/빌드)와 유닛 테스트 양쪽에서 죽는다. */
export function validateStages(stages: readonly StageDef[]): void {
  if (stages.length !== STAGE_COUNT) throw new StageSchemaError(`expected ${STAGE_COUNT} stages, got ${stages.length}`);
  const ids = new Set<number>();
  stages.forEach((s, i) => {
    if (s.id !== i + 1) throw new StageSchemaError(`stage at index ${i} has id ${s.id}, expected ${i + 1}`);
    if (ids.has(s.id)) throw new StageSchemaError(`duplicate id ${s.id}`);
    ids.add(s.id);
    if (!s.name) throw new StageSchemaError(`stage ${s.id} has no name`);
    if (s.birds.length < 1) throw new StageSchemaError(`stage ${s.id} has no birds`);
    if (s.pigs.length < 1) throw new StageSchemaError(`stage ${s.id} has no pigs`);
    s.pigs.forEach((p, j) => {
      if (!(p.hp > 0)) throw new StageSchemaError(`stage ${s.id} pig ${j} hp must be > 0`);
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) throw new StageSchemaError(`stage ${s.id} pig ${j} bad position`);
    });
    s.blocks.forEach((b, j) => {
      if (!(b.w > 0 && b.h > 0)) throw new StageSchemaError(`stage ${s.id} block ${j} size must be > 0`);
    });
    const [a, b, c] = s.starThresholds;
    if (!(a > 0 && a < b && b < c)) throw new StageSchemaError(`stage ${s.id} starThresholds must be ascending positive`);
  });
}

validateStages(STAGES);

export function getStage(id: number): StageDef | undefined {
  return STAGES.find((s) => s.id === id);
}

export function nextStageId(id: number): number | null {
  return id < STAGE_COUNT ? id + 1 : null;
}
