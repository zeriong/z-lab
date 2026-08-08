import type { StageDef } from './schema';

// 도입 요소: 종합(배럴 + 보호된 돼지 + 2구역)
const stage10: StageDef = {
  id: 10,
  name: '최후의 요새',
  ground: [{ x: 0, y: 960, w: 2600, h: 120 }],
  sling: { x: 300, y: 830 },
  birds: 5,
  pigs: [
    { x: 1105, y: 926, size: 30 },
    { x: 1195, y: 926, size: 30 },
    { x: 1570, y: 926, size: 34 },
    { x: 1955, y: 926, size: 30 },
    { x: 2045, y: 926, size: 30 },
  ],
  blocks: [
    { x: 1060, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1240, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1150, y: 786, w: 260, h: 28, angle: 0, material: 'wood' },
    { x: 1090, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1210, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 1150, y: 598, w: 200, h: 28, angle: 0, material: 'wood' },
    { x: 1900, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 2100, y: 880, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 2000, y: 786, w: 280, h: 28, angle: 0, material: 'wood' },
    { x: 1940, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 2060, y: 692, w: 28, h: 160, angle: 0, material: 'wood' },
    { x: 2000, y: 598, w: 200, h: 28, angle: 0, material: 'wood' },
    { x: 1150, y: 880, w: 28, h: 160, angle: 0, material: 'ice' },
    { x: 2000, y: 880, w: 28, h: 160, angle: 0, material: 'ice' },
    { x: 1420, y: 926, w: 60, h: 68, angle: 0, material: 'ice' },
    { x: 1500, y: 926, w: 60, h: 68, angle: 0, material: 'ice' },
    { x: 1660, y: 926, w: 60, h: 68, angle: 0, material: 'ice' },
    { x: 1740, y: 926, w: 60, h: 68, angle: 0, material: 'ice' },
    { x: 960, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1340, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1800, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 2200, y: 880, w: 40, h: 160, angle: 0, material: 'stone' },
    { x: 1150, y: 554, w: 120, h: 60, angle: 0, material: 'stone' },
    { x: 2000, y: 554, w: 120, h: 60, angle: 0, material: 'stone' },
    { x: 1290, y: 926, w: 60, h: 68, angle: 0, material: 'barrel' },
    { x: 2140, y: 926, w: 60, h: 68, angle: 0, material: 'barrel' },
  ],
  starScore: { two: 28000, three: 38000 },
  stepCap: 4500,
};

export default stage10;
