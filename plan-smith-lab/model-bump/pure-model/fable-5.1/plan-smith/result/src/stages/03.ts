import type { StageDef } from '../types';

// 3단계 "2층집": 나무만, 새 5, 돼지 2(1층 바닥 + 2층).
const stage: StageDef = {
  id: 3,
  name: '2층집',
  birds: ['red', 'red', 'red', 'red', 'red'],
  pigs: [
    { x: 1200, y: 974, hp: 10 },
    { x: 1200, y: 804, hp: 10 },
  ],
  blocks: [
    { x: 1130, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1270, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1200, y: 845, w: 200, h: 30, material: 'wood' },
    { x: 1130, y: 760, w: 30, h: 140, material: 'wood' },
    { x: 1270, y: 760, w: 30, h: 140, material: 'wood' },
    { x: 1200, y: 675, w: 200, h: 30, material: 'wood' },
    { x: 1200, y: 635, w: 50, h: 50, material: 'wood' },
    { x: 1010, y: 975, w: 50, h: 50, material: 'wood' },
    { x: 1390, y: 975, w: 50, h: 50, material: 'wood' },
  ],
  starThresholds: [2500, 3500, 4500],
};

export default stage;
