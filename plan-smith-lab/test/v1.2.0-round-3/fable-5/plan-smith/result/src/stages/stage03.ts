import type { StageData } from '../types';

// 스테이지 3: 유리 도입(1타 파괴) — 재질 차이 학습 (새 3 / 돼지 2 / wood+glass)
const stage: StageData = {
  birds: 3,
  pigs: [
    { x: 700, y: 384, r: 16 }, // 플랭크 위, 유리 벽 사이
    { x: 860, y: 484, r: 16 }, // 유리 벽 뒤 지상
  ],
  blocks: [
    { x: 660, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 740, y: 460, w: 20, h: 80, material: 'wood' },
    { x: 700, y: 410, w: 140, h: 20, material: 'wood' },
    { x: 660, y: 370, w: 14, h: 60, material: 'glass' },
    { x: 740, y: 370, w: 14, h: 60, material: 'glass' },
    { x: 700, y: 333, w: 120, h: 14, material: 'glass' },
    { x: 820, y: 470, w: 14, h: 60, material: 'glass' },
  ],
};

export default stage;
