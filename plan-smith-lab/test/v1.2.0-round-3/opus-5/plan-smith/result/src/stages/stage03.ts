import type { StageDef } from './schema';

// 도입 요소: 얼음(저 hp·고반발)
const stage03: StageDef = {
  id: 3,
  name: '얼음 지붕',
  ground: [{ x: 0, y: 960, w: 1920, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 3,
  pigs: [
    { x: 1150, y: 926, size: 34 },
    { x: 1430, y: 926, size: 34 },
  ],
  blocks: [
    { x: 1080, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1220, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1360, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1500, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1150, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1430, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1290, y: 880, w: 28, h: 160, angle: 0, material: 'ice' },
    { x: 1290, y: 786, w: 180, h: 28, angle: 0, material: 'ice' },
    { x: 1150, y: 754, w: 140, h: 36, angle: 0, material: 'ice' },
    { x: 1430, y: 754, w: 140, h: 36, angle: 0, material: 'ice' },
  ],
  starScore: { two: 15000, three: 20000 },
  stepCap: 2400,
};

export default stage03;
