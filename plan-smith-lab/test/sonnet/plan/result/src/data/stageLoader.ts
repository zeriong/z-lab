import type { StageData } from "../types";

import s01 from "./stages/stage-01.json";
import s02 from "./stages/stage-02.json";
import s03 from "./stages/stage-03.json";
import s04 from "./stages/stage-04.json";
import s05 from "./stages/stage-05.json";
import s06 from "./stages/stage-06.json";
import s07 from "./stages/stage-07.json";
import s08 from "./stages/stage-08.json";
import s09 from "./stages/stage-09.json";
import s10 from "./stages/stage-10.json";

// 빌드에 포함되는 정적 스테이지 데이터 (런타임 fetch 불필요)
export const STAGES: StageData[] = [
  s01, s02, s03, s04, s05, s06, s07, s08, s09, s10,
] as StageData[];

export function getStage(id: number): StageData {
  const s = STAGES.find((st) => st.id === id);
  if (!s) throw new Error(`stage ${id} not found`);
  return s;
}

export const STAGE_COUNT = STAGES.length;
