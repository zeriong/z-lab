// 자동 클리어 스크립트 입력 모음. e2e (c)가 각 스테이지를 이 발사 벡터로 클리어한다.
// 값은 전부 초기 추정치 — 플레이테스트에서 교체(계획서 §9 숫자 태그).
import type { StageSolution } from '../types';
import s01 from './01.solution';
import s02 from './02.solution';
import s03 from './03.solution';
import s04 from './04.solution';
import s05 from './05.solution';
import s06 from './06.solution';
import s07 from './07.solution';
import s08 from './08.solution';
import s09 from './09.solution';
import s10 from './10.solution';

export const SOLUTIONS: readonly StageSolution[] = [s01, s02, s03, s04, s05, s06, s07, s08, s09, s10];

export function getSolution(stageId: number): StageSolution | undefined {
  return SOLUTIONS.find((s) => s.stageId === stageId);
}
