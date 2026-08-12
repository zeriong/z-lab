import { StageDef } from '../types/stage';
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

// 콘텐츠 축(난이도 커브):
// 1-2: 튜토리얼 — 목재만, 돼지 1-2마리, 발사체 여유
// 3-5: 재질 확장 — 석재·유리 도입
// 6-8: 복합 구조 — 다중 재질 결합 구조물 + 경사/틈이 있는 지형
// 9-10: 최고난도 — 위 요소 결합 + 발사체 여유분 최소화
export const STAGES: StageDef[] = [
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
