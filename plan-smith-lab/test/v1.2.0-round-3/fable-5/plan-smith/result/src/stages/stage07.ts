import type { StageData } from '../types';

// 스테이지 7: 돌 벽 뒤 돼지 — 곡사(높은 각도) 강제 (새 4 / 돼지 4 / 혼합)
const stage: StageData = {
  birds: 4,
  pigs: [
    { x: 660, y: 484, r: 16 }, // 벽 바로 뒤
    { x: 760, y: 424, r: 16 }, // 돌 블록 위
    { x: 840, y: 484, r: 16 },
    { x: 900, y: 484, r: 16 },
  ],
  blocks: [
    // 높은 돌 벽 3단
    { x: 600, y: 455, w: 28, h: 90, material: 'stone' },
    { x: 600, y: 372, w: 28, h: 76, material: 'stone' },
    { x: 600, y: 301, w: 28, h: 66, material: 'stone' },
    // 돌 받침대
    { x: 760, y: 470, w: 60, h: 60, material: 'stone' },
  ],
};

export default stage;
