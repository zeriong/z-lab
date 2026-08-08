import type { StageDef } from './schema';

// 도입 요소: 매달린 구조(지지대를 저격하면 위가 통째로 무너진다)
const stage06: StageDef = {
  id: 6,
  name: '매달린 구조',
  ground: [{ x: 0, y: 960, w: 1920, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 4,
  pigs: [
    { x: 1340, y: 738, size: 34 },
    { x: 1340, y: 926, size: 34 },
    { x: 1660, y: 926, size: 34 },
  ],
  blocks: [
    { x: 1120, y: 800, w: 28, h: 320, angle: 0, material: 'wood' },
    { x: 1560, y: 800, w: 28, h: 320, angle: 0, material: 'wood' },
    { x: 1260, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1420, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1340, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1340, y: 754, w: 140, h: 36, angle: 0, material: 'wood' },
    { x: 1060, y: 926, w: 60, h: 68, angle: 0, material: 'wood' },
    { x: 1620, y: 926, w: 60, h: 68, angle: 0, material: 'wood' },
    { x: 1340, y: 618, w: 480, h: 44, angle: 0, material: 'stone' },
    { x: 1220, y: 556, w: 80, h: 80, angle: 0, material: 'stone' },
    { x: 1340, y: 556, w: 80, h: 80, angle: 0, material: 'stone' },
    { x: 1460, y: 556, w: 80, h: 80, angle: 0, material: 'stone' },
  ],
  starScore: { two: 18000, three: 24000 },
  stepCap: 3000,
};

export default stage06;
