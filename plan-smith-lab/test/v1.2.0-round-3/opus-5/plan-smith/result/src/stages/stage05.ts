import type { StageDef } from './schema';

// 도입 요소: 2층 구조·도미노
const stage05: StageDef = {
  id: 5,
  name: '2층 도미노',
  ground: [{ x: 0, y: 960, w: 1920, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 4,
  pigs: [
    { x: 1150, y: 738, size: 34 },
    { x: 1430, y: 738, size: 34 },
    { x: 1290, y: 926, size: 34 },
  ],
  blocks: [
    { x: 1080, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1220, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1360, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1500, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1150, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1430, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1100, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1200, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1380, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1480, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1150, y: 598, w: 180, h: 28, angle: 0, material: 'ice' },
    { x: 1430, y: 598, w: 180, h: 28, angle: 0, material: 'ice' },
    { x: 1150, y: 554, w: 100, h: 60, angle: 0, material: 'ice' },
    { x: 1430, y: 554, w: 100, h: 60, angle: 0, material: 'ice' },
  ],
  starScore: { two: 19000, three: 25000 },
  stepCap: 3000,
};

export default stage05;
