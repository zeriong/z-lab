import type { StageData } from '../types';

// 스테이지 8: 좌우 대칭 2요새 (새 5 / 돼지 5 / 혼합)
const stage: StageData = {
  birds: 5,
  pigs: [
    { x: 620, y: 484, r: 16 }, // 요새 A 내부
    { x: 620, y: 384, r: 16 }, // 요새 A 지붕
    { x: 860, y: 484, r: 16 }, // 요새 B 내부
    { x: 860, y: 384, r: 16 }, // 요새 B 지붕
    { x: 740, y: 484, r: 16 }, // 두 요새 사이
  ],
  blocks: [
    // 요새 A (x=620)
    { x: 575, y: 460, w: 22, h: 80, material: 'stone' },
    { x: 665, y: 460, w: 22, h: 80, material: 'stone' },
    { x: 620, y: 410, w: 130, h: 20, material: 'wood' },
    { x: 540, y: 470, w: 14, h: 60, material: 'glass' },
    // 요새 B (x=860)
    { x: 815, y: 460, w: 22, h: 80, material: 'stone' },
    { x: 905, y: 460, w: 22, h: 80, material: 'stone' },
    { x: 860, y: 410, w: 130, h: 20, material: 'wood' },
    { x: 780, y: 470, w: 14, h: 60, material: 'glass' },
  ],
};

export default stage;
