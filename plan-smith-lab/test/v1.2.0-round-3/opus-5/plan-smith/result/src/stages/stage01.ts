import type { StageDef } from './schema';

// 도입 요소: 튜토리얼(당기고 놓기)
const stage01: StageDef = {
  id: 1,
  name: '첫 발사',
  ground: [{ x: 0, y: 960, w: 1920, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 3,
  pigs: [{ x: 1250, y: 926, size: 34 }],
  blocks: [
    { x: 1180, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1320, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1250, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1250, y: 754, w: 120, h: 36, angle: 0, material: 'wood' },
  ],
  starScore: { two: 16000, three: 22000 },
  stepCap: 1800,
};

export default stage01;
