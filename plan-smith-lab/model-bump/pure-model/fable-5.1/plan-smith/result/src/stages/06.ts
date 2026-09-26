import type { StageDef } from '../types';

// 6단계 "얼음 성벽": 첫 돌 블록(지붕 1개), 새 4, 돼지 3.
const stage: StageDef = {
  id: 6,
  name: '얼음 성벽',
  birds: ['red', 'red', 'red', 'red'],
  pigs: [
    { x: 1210, y: 974, hp: 14 },
    { x: 1210, y: 804, hp: 14 },
    { x: 1480, y: 974, hp: 14 },
  ],
  blocks: [
    { x: 1000, y: 930, w: 30, h: 140, material: 'ice' },
    { x: 1000, y: 790, w: 30, h: 140, material: 'ice' },
    { x: 1140, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1280, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1210, y: 845, w: 200, h: 30, material: 'stone' },
    { x: 1140, y: 805, w: 50, h: 50, material: 'ice' },
    { x: 1280, y: 805, w: 50, h: 50, material: 'ice' },
    { x: 1420, y: 975, w: 50, h: 50, material: 'ice' },
    { x: 1420, y: 925, w: 50, h: 50, material: 'ice' },
  ],
  starThresholds: [3000, 4300, 5000],
};

export default stage;
