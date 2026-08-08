import type { StageDef } from './schema';

// 도입 요소: 원거리 2구역 배치(카메라가 따라가야 결과를 볼 수 있다)
const stage09: StageDef = {
  id: 9,
  name: '두 개의 진지',
  ground: [{ x: 0, y: 960, w: 2600, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 5,
  pigs: [
    { x: 1110, y: 642, size: 34 },
    { x: 1900, y: 490, size: 34 },
    { x: 1227, y: 926, size: 34 },
    { x: 1520, y: 926, size: 34 },
    { x: 1620, y: 926, size: 34 },
  ],
  blocks: [
    { x: 1040, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1180, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1110, y: 786, w: 220, h: 28, angle: 0, material: 'wood' },
    { x: 1110, y: 754, w: 140, h: 36, angle: 0, material: 'wood' },
    { x: 1820, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1980, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1900, y: 786, w: 240, h: 28, angle: 0, material: 'wood' },
    { x: 1850, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1950, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1900, y: 598, w: 200, h: 28, angle: 0, material: 'wood' },
    { x: 1110, y: 880, w: 28, h: 160, angle: 0, material: 'ice' },
    { x: 1110, y: 706, w: 100, h: 60, angle: 0, material: 'ice' },
    { x: 1760, y: 880, w: 28, h: 160, angle: 0, material: 'ice' },
    { x: 2040, y: 880, w: 28, h: 160, angle: 0, material: 'ice' },
    { x: 1900, y: 926, w: 120, h: 68, angle: 0, material: 'ice' },
    { x: 1900, y: 554, w: 120, h: 60, angle: 0, material: 'ice' },
    { x: 940, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1280, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1700, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 2100, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
  ],
  starScore: { two: 27000, three: 36000 },
  stepCap: 4200,
};

export default stage09;
