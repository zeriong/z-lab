import type { StageDef } from '../types';

// 2단계 "두 집": 나무만, 새 5, 돼지 2.
const stage: StageDef = {
  id: 2,
  name: '두 집',
  birds: ['red', 'red', 'red', 'red', 'red'],
  pigs: [
    { x: 1060, y: 974, hp: 10 },
    { x: 1360, y: 974, hp: 10 },
  ],
  blocks: [
    { x: 1000, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1120, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1060, y: 845, w: 160, h: 30, material: 'wood' },
    { x: 1060, y: 805, w: 50, h: 50, material: 'wood' },
    { x: 1300, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1420, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1360, y: 845, w: 160, h: 30, material: 'wood' },
    { x: 1360, y: 805, w: 50, h: 50, material: 'wood' },
  ],
  starThresholds: [2000, 3500, 4500],
};

export default stage;
