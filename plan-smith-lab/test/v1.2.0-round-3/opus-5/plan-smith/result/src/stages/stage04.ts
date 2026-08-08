import type { StageDef } from './schema';

// 도입 요소: 돌(고 hp, 직격 한 방으로는 깨지지 않는다)
const stage04: StageDef = {
  id: 4,
  name: '돌 방패',
  ground: [{ x: 0, y: 960, w: 1920, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 4,
  pigs: [
    { x: 1230, y: 926, size: 34 },
    { x: 1450, y: 926, size: 34 },
    { x: 1340, y: 726, size: 34 },
  ],
  blocks: [
    { x: 1120, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1560, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1340, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1340, y: 780, w: 480, h: 40, angle: 0, material: 'stone' },
    { x: 1220, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1460, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1230, y: 746, w: 200, h: 28, angle: 0, material: 'wood' },
    { x: 1450, y: 746, w: 200, h: 28, angle: 0, material: 'wood' },
    { x: 1230, y: 706, w: 100, h: 52, angle: 0, material: 'wood' },
    { x: 1450, y: 706, w: 100, h: 52, angle: 0, material: 'wood' },
  ],
  starScore: { two: 18000, three: 24000 },
  stepCap: 3000,
};

export default stage04;
