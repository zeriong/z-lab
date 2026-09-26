import type { StageDef } from '../types';

// 9단계 "돌 삼각": 돌 5/11(45%), 새 3, 돼지 5.
const stage: StageDef = {
  id: 9,
  name: '돌 삼각',
  birds: ['red', 'red', 'red'],
  pigs: [
    { x: 1040, y: 974, hp: 18 },
    { x: 1220, y: 974, hp: 18 },
    { x: 1220, y: 804, hp: 18 },
    { x: 1220, y: 634, hp: 18 },
    { x: 1450, y: 974, hp: 18 },
  ],
  blocks: [
    { x: 980, y: 975, w: 50, h: 50, material: 'ice' },
    { x: 980, y: 925, w: 50, h: 50, material: 'ice' },
    { x: 1150, y: 930, w: 30, h: 140, material: 'stone' },
    { x: 1290, y: 930, w: 30, h: 140, material: 'stone' },
    { x: 1220, y: 845, w: 200, h: 30, material: 'stone' },
    { x: 1150, y: 760, w: 30, h: 140, material: 'wood' },
    { x: 1290, y: 760, w: 30, h: 140, material: 'wood' },
    { x: 1220, y: 675, w: 200, h: 30, material: 'stone' },
    { x: 1400, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1500, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1450, y: 845, w: 140, h: 30, material: 'stone' },
  ],
  starThresholds: [5000, 6200, 7000],
};

export default stage;
