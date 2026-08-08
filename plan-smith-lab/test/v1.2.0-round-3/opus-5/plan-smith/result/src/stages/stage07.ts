import type { StageDef } from './schema';

// 도입 요소: 폭발 배럴(파괴 시 반경 임펄스)
const stage07: StageDef = {
  id: 7,
  name: '폭발 배럴',
  ground: [{ x: 0, y: 960, w: 1920, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 4,
  pigs: [
    { x: 1150, y: 926, size: 34 },
    { x: 1470, y: 926, size: 34 },
    { x: 1150, y: 738, size: 34 },
    { x: 1470, y: 738, size: 34 },
  ],
  blocks: [
    { x: 1080, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1220, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1400, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1540, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1150, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1470, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1150, y: 754, w: 140, h: 36, angle: 0, material: 'wood' },
    { x: 1470, y: 754, w: 140, h: 36, angle: 0, material: 'wood' },
    { x: 1310, y: 880, w: 28, h: 160, angle: 0, material: 'ice' },
    { x: 1310, y: 786, w: 200, h: 28, angle: 0, material: 'ice' },
    { x: 1310, y: 740, w: 120, h: 64, angle: 0, material: 'ice' },
    { x: 1310, y: 666, w: 120, h: 84, angle: 0, material: 'ice' },
    { x: 1240, y: 926, w: 60, h: 68, angle: 0, material: 'barrel' },
  ],
  starScore: { two: 22000, three: 29000 },
  stepCap: 3600,
};

export default stage07;
