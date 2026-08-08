import type { StageData } from '../types';

// 스테이지 1: 낮은 단탑 1개 — 조작 학습 (새 3 / 돼지 1 / wood)
const stage: StageData = {
  birds: 3,
  pigs: [{ x: 700, y: 482, r: 18 }],
  blocks: [
    { x: 670, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 730, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 700, y: 410, w: 120, h: 20, material: 'wood' },
  ],
};

export default stage;
