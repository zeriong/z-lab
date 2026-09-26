import type { StageDef } from '../types';

// 5단계 "얼음 탑": 3층 탑, 새 4, 돼지 3.
const stage: StageDef = {
  id: 5,
  name: '얼음 탑',
  birds: ['red', 'red', 'red', 'red'],
  pigs: [
    { x: 1250, y: 974, hp: 14 },
    { x: 1250, y: 804, hp: 14 },
    { x: 1250, y: 634, hp: 14 },
  ],
  blocks: [
    { x: 1180, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1320, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1250, y: 845, w: 200, h: 30, material: 'ice' },
    { x: 1180, y: 760, w: 30, h: 140, material: 'ice' },
    { x: 1320, y: 760, w: 30, h: 140, material: 'ice' },
    { x: 1250, y: 675, w: 200, h: 30, material: 'wood' },
    { x: 1190, y: 635, w: 50, h: 50, material: 'ice' },
    { x: 1310, y: 635, w: 50, h: 50, material: 'ice' },
  ],
  starThresholds: [3000, 4200, 5000],
};

export default stage;
