/** 3. 두 채 — 나무 hut + 얼음 hut. 재질 차이(얼음은 잘 깨짐). */
import { aim } from '../gameplay/Ballistics';
import { GROUND, HUT_HALF_SPAN, hut } from './builders';
import type { LevelDef } from './types';

const WOOD_X = 700;
const ICE_X = 1000;
const WOOD_LEFT_FACE = WOOD_X - HUT_HALF_SPAN.small - 10;

export const level03: LevelDef = {
  id: 3,
  name: '두 채',
  birds: ['red', 'red', 'red', 'red'],
  star2: 16000,
  star3: 27000,
  entities: [
    ...hut(WOOD_X, GROUND, 'wood', 'small', { tri: true }),
    ...hut(ICE_X, GROUND, 'ice', 'medium'),
  ],
  solutionShots: [
    // 가까운 나무 오두막: 낮고 빠른 샷으로 기둥 관통
    aim({ x: WOOD_LEFT_FACE, y: 625 }, 10),
    // 먼 얼음 오두막: 지붕을 뚫고 떨어지는 로브
    aim({ x: ICE_X, y: 600 }, 50),
    aim({ x: ICE_X, y: 640 }, 45),
    aim({ x: WOOD_X, y: 640 }, 45),
  ],
};
