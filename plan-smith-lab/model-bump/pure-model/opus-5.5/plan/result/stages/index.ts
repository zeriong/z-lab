import type { StageData } from '../src/core/stage/schema';
import stage00 from './stage00.json';
import stage01 from './stage01.json';
import stage02 from './stage02.json';
import stage03 from './stage03.json';
import stage04 from './stage04.json';
import stage05 from './stage05.json';
import stage06 from './stage06.json';
import stage07 from './stage07.json';
import stage08 from './stage08.json';
import stage09 from './stage09.json';
import stage10 from './stage10.json';

/**
 * 스테이지 데이터는 빌드 시점에 JSON으로 번들한다 (§6.2). 런타임 fetch가 없다.
 * 타입은 부팅 시 validateStageSet으로 검증하므로 여기서는 단언만 한다.
 */
export const STAGES: StageData[] = [
  stage01, stage02, stage03, stage04, stage05, stage06, stage07, stage08, stage09, stage10,
] as unknown as StageData[];

/** 테스트용 스테이지 (Phase 1). 제품 세트에는 넣지 않는다. */
export const STAGE00: StageData = stage00 as unknown as StageData;
