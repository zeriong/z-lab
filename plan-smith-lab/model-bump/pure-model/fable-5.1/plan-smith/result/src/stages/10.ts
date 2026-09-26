import type { StageDef } from '../types';

// 10단계 "최후의 성": 4층 성, 돌 6/13(46%), 새 3, 돼지 5.
const stage: StageDef = {
  id: 10,
  name: '최후의 성',
  birds: ['red', 'red', 'red'],
  pigs: [
    { x: 1200, y: 974, hp: 18 },
    { x: 1200, y: 804, hp: 18 },
    { x: 1200, y: 634, hp: 18 },
    { x: 1200, y: 464, hp: 18 },
    { x: 1500, y: 974, hp: 18 },
  ],
  blocks: [
    { x: 940, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 940, y: 790, w: 30, h: 140, material: 'ice' },
    { x: 1110, y: 930, w: 30, h: 140, material: 'stone' },
    { x: 1290, y: 930, w: 30, h: 140, material: 'stone' },
    { x: 1200, y: 845, w: 220, h: 30, material: 'stone' },
    { x: 1110, y: 760, w: 30, h: 140, material: 'wood' },
    { x: 1290, y: 760, w: 30, h: 140, material: 'wood' },
    { x: 1200, y: 675, w: 220, h: 30, material: 'stone' },
    { x: 1110, y: 590, w: 30, h: 140, material: 'ice' },
    { x: 1290, y: 590, w: 30, h: 140, material: 'ice' },
    { x: 1200, y: 505, w: 220, h: 30, material: 'stone' },
    { x: 1440, y: 975, w: 50, h: 50, material: 'wood' },
    { x: 1440, y: 925, w: 50, h: 50, material: 'stone' },
  ],
  starThresholds: [5000, 6500, 7500],
};

export default stage;
