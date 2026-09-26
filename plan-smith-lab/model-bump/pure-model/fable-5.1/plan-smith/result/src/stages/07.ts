import type { StageDef } from '../types';

// 7단계 "돌 지붕": 돌 지붕 3개(33%), 새 3, 돼지 4.
const stage: StageDef = {
  id: 7,
  name: '돌 지붕',
  birds: ['red', 'red', 'red'],
  pigs: [
    { x: 1080, y: 974, hp: 18 },
    { x: 1330, y: 974, hp: 18 },
    { x: 1330, y: 804, hp: 18 },
    { x: 1330, y: 634, hp: 18 },
  ],
  blocks: [
    { x: 1010, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1150, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1080, y: 845, w: 200, h: 30, material: 'stone' },
    { x: 1260, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1400, y: 930, w: 30, h: 140, material: 'wood' },
    { x: 1330, y: 845, w: 200, h: 30, material: 'stone' },
    { x: 1260, y: 760, w: 30, h: 140, material: 'ice' },
    { x: 1400, y: 760, w: 30, h: 140, material: 'ice' },
    { x: 1330, y: 675, w: 200, h: 30, material: 'stone' },
  ],
  starThresholds: [4000, 5000, 5800],
};

export default stage;
