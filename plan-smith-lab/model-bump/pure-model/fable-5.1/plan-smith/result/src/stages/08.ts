import type { StageDef } from '../types';

// 8단계 "요새": 돌 4/9(44%), 새 3, 돼지 4.
const stage: StageDef = {
  id: 8,
  name: '요새',
  birds: ['red', 'red', 'red'],
  pigs: [
    { x: 1200, y: 974, hp: 18 },
    { x: 1200, y: 804, hp: 18 },
    { x: 1200, y: 634, hp: 18 },
    { x: 1470, y: 974, hp: 18 },
  ],
  blocks: [
    { x: 960, y: 930, w: 30, h: 140, material: 'stone' },
    { x: 1130, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1270, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1200, y: 845, w: 200, h: 30, material: 'stone' },
    { x: 1130, y: 760, w: 30, h: 140, material: 'ice' },
    { x: 1270, y: 760, w: 30, h: 140, material: 'ice' },
    { x: 1200, y: 675, w: 200, h: 30, material: 'stone' },
    { x: 1400, y: 975, w: 50, h: 50, material: 'ice' },
    { x: 1400, y: 925, w: 50, h: 50, material: 'stone' },
  ],
  starThresholds: [4000, 5200, 6000],
};

export default stage;
