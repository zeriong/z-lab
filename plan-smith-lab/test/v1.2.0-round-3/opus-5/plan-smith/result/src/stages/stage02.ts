import type { StageDef } from './schema';

// 도입 요소: 지지 구조 무너뜨리기
const stage02: StageDef = {
  id: 2,
  name: '지지대',
  ground: [{ x: 0, y: 960, w: 1920, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 3,
  pigs: [
    { x: 1150, y: 926, size: 34 },
    { x: 1500, y: 926, size: 34 },
  ],
  blocks: [
    { x: 1080, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1220, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1430, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1570, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1150, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1500, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1150, y: 754, w: 140, h: 36, angle: 0, material: 'wood' },
    { x: 1500, y: 754, w: 140, h: 36, angle: 0, material: 'wood' },
  ],
  starScore: { two: 14000, three: 19000 },
  stepCap: 2400,
};

export default stage02;
