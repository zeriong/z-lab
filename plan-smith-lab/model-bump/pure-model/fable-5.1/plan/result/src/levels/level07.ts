/** 7. 넓은 배치 — 세 구조물이 x 700/950/1180 에 분산. 사거리 조절, 새 아끼기. */
import { aim } from '../gameplay/Ballistics';
import { box, GROUND, pig, plankV } from './builders';
import type { LevelDef } from './types';

export const level07: LevelDef = {
  id: 7,
  name: '넓은 배치',
  birds: ['red', 'red', 'red', 'red'],
  star2: 20000,
  star3: 32000,
  entities: [
    // 가까운 곳: 나무 상자 위 작은 돼지
    box(700, GROUND, 'wood'),
    pig('small', 700, GROUND - 40),
    // 중간: 얼음 상자 사이 돼지
    box(890, GROUND, 'ice'),
    box(1010, GROUND, 'ice'),
    pig('medium', 950),
    // 먼 곳: 큰 돼지, 뒤에 얼음 판자
    pig('large', 1180),
    plankV(1230, GROUND, 'ice'),
  ],
  solutionShots: [
    aim({ x: 700, y: GROUND - 40 - 16 }, 35),
    aim({ x: 950, y: 630 }, 45),
    aim({ x: 1180, y: 630 }, 45),
    aim({ x: 1180, y: 630 }, 50),
  ],
};
