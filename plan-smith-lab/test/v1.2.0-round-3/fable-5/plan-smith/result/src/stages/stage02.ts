import type { StageData } from '../types';

// 스테이지 2: 탑 2개 — 조준 전환 학습 (새 3 / 돼지 2 / wood)
const stage: StageData = {
  birds: 3,
  pigs: [
    { x: 620, y: 484, r: 16 },
    { x: 820, y: 484, r: 16 },
  ],
  blocks: [
    { x: 590, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 650, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 620, y: 410, w: 120, h: 20, material: 'wood' },
    { x: 790, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 850, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 820, y: 410, w: 120, h: 20, material: 'wood' },
  ],
};

export default stage;
