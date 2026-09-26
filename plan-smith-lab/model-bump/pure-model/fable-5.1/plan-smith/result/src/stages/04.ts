import type { StageDef } from '../types';

// 4단계 "얼음 창": 얼음 혼합 시작, 새 4, 돼지 3.
const stage: StageDef = {
  id: 4,
  name: '얼음 창',
  birds: ['red', 'red', 'red', 'red'],
  pigs: [
    { x: 1190, y: 974, hp: 14 },
    { x: 1190, y: 804, hp: 14 },
    { x: 1470, y: 974, hp: 14 },
  ],
  blocks: [
    { x: 950, y: 930, w: 30, h: 140, material: 'ice' },
    { x: 950, y: 790, w: 30, h: 140, material: 'ice' },
    { x: 1120, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1260, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1190, y: 845, w: 200, h: 30, material: 'ice' },
    { x: 1410, y: 975, w: 50, h: 50, material: 'ice' },
    { x: 1410, y: 925, w: 50, h: 50, material: 'ice' },
  ],
  starThresholds: [3000, 4000, 4700],
};

export default stage;
