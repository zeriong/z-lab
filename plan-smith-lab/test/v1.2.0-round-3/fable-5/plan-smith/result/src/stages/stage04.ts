import type { StageData } from '../types';

// 스테이지 4: 지붕 아래 돼지 — 구조 붕괴로 잡기 (새 4 / 돼지 3 / wood+glass)
const stage: StageData = {
  birds: 4,
  pigs: [
    { x: 676, y: 484, r: 16 }, // 지붕 아래
    { x: 764, y: 484, r: 16 }, // 지붕 아래
    { x: 720, y: 368, r: 16 }, // 유리 지붕 위
  ],
  blocks: [
    { x: 640, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 800, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 720, y: 460, w: 16, h: 80, material: 'glass' },
    { x: 720, y: 410, w: 220, h: 20, material: 'wood' },
    { x: 720, y: 392, w: 160, h: 16, material: 'glass' },
  ],
};

export default stage;
