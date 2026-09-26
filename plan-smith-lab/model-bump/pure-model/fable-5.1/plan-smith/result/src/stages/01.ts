import type { StageDef } from '../types';

// 1단계 "첫 걸음": 나무만, 새 5, 돼지 1. 바닥 y=1000 기준.
const stage: StageDef = {
  id: 1,
  name: '첫 걸음',
  birds: ['red', 'red', 'red', 'red', 'red'],
  pigs: [{ x: 1200, y: 974, hp: 10 }],
  blocks: [
    { x: 1120, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1280, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1200, y: 845, w: 200, h: 30, material: 'wood' },
    { x: 1200, y: 805, w: 50, h: 50, material: 'wood' },
  ],
  starThresholds: [1000, 2000, 3000],
};

export default stage;
