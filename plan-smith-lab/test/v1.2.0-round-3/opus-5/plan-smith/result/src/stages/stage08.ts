import type { StageDef } from './schema';

// 도입 요소: 보호된 돼지(돌 상자 안 — 직접 때릴 수 없다)
const stage08: StageDef = {
  id: 8,
  name: '돌 상자',
  ground: [{ x: 0, y: 960, w: 1920, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 4,
  pigs: [
    { x: 1230, y: 926, size: 34 },
    { x: 1450, y: 926, size: 34 },
    { x: 950, y: 738, size: 32 },
    { x: 1660, y: 926, size: 34 },
  ],
  blocks: [
    { x: 1120, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1340, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1560, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1230, y: 778, w: 260, h: 44, angle: 0, material: 'stone' },
    { x: 1450, y: 778, w: 260, h: 44, angle: 0, material: 'stone' },
    { x: 1230, y: 716, w: 80, h: 80, angle: 0, material: 'stone' },
    { x: 1340, y: 716, w: 80, h: 80, angle: 0, material: 'stone' },
    { x: 1450, y: 716, w: 80, h: 80, angle: 0, material: 'stone' },
    { x: 1180, y: 696, w: 40, h: 120, angle: 0, material: 'stone' },
    { x: 1500, y: 696, w: 40, h: 120, angle: 0, material: 'stone' },
    { x: 1340, y: 622, w: 380, h: 28, angle: 0, material: 'wood' },
    { x: 1250, y: 580, w: 120, h: 56, angle: 0, material: 'wood' },
    { x: 1430, y: 580, w: 120, h: 56, angle: 0, material: 'wood' },
    { x: 880, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1020, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 950, y: 786, w: 200, h: 28, angle: 0, material: 'wood' },
  ],
  starScore: { two: 22000, three: 30000 },
  stepCap: 3600,
};

export default stage08;
