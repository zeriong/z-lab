// B6 — 10종 저작 콘텐츠(난이도 곡선)
//
// 스테이지마다 새 요소가 하나씩 늘어난다:
// 1 튜토리얼 / 2 지지 구조 / 3 얼음 / 4 돌 / 5 2층·도미노 / 6 매달린 구조 /
// 7 폭발 배럴 / 8 보호된 돼지 / 9 2구역 배치 / 10 종합.
//
// 런타임 fetch 가 아니라 빌드타임 임포트다 — 정의가 타입 검사 대상이 되고
// 개수(10)가 정적으로 보장된다.

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
import type { StageDef } from './schema';

export const stageDefs: StageDef[] = [
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

export function stageById(id: number): StageDef | undefined {
  return stageDefs.find((d) => d.id === id);
}
