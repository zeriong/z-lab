import type { StageData } from '../types';

// 스테이지 6: 2층 구조, 돼지 상하 분산 (새 4 / 돼지 4 / 혼합)
const stage: StageData = {
  birds: 4,
  pigs: [
    { x: 680, y: 486, r: 14 }, // 1층 좌
    { x: 760, y: 486, r: 14 }, // 1층 우
    { x: 720, y: 386, r: 14 }, // 2층 (유리 기둥 사이)
    { x: 720, y: 314, r: 14 }, // 옥상
  ],
  blocks: [
    // 1층 (wood)
    { x: 640, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 720, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 800, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 720, y: 410, w: 220, h: 20, material: 'wood' },
    // 2층 (glass 기둥 + wood 플랭크)
    { x: 670, y: 372, w: 18, h: 56, material: 'glass' },
    { x: 770, y: 372, w: 18, h: 56, material: 'glass' },
    { x: 720, y: 336, w: 160, h: 16, material: 'wood' },
  ],
};

export default stage;
