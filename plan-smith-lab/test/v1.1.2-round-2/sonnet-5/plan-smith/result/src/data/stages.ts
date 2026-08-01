import stagesRaw from './stages.json';
import type { StageData } from '../types';

// resolveJsonModule + the StageData cast is the compile-time schema check the
// plan's §딜리버리 스택 row calls for ("스테이지 JSON 스키마를 컴파일 타임에 체크").
export const STAGES: StageData[] = (stagesRaw as StageData[])
  .slice()
  .sort((a, b) => a.order - b.order);

export function getStageById(id: string): StageData | undefined {
  return STAGES.find((s) => s.id === id);
}

export function getNextStageId(id: string): string | null {
  const idx = STAGES.findIndex((s) => s.id === id);
  if (idx === -1 || idx === STAGES.length - 1) return null;
  return STAGES[idx + 1].id;
}
