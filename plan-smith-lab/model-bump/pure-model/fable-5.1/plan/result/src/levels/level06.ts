/** 6. 높은 발판 — terrain 발판(y=420) 위 돼지 + 지면 hut. 높은 각도 샷. */
import { aim } from '../gameplay/Ballistics';
import { GROUND, HUT_HALF_SPAN, hut, pig, platform } from './builders';
import type { LevelDef } from './types';

const PLAT_X = 700;
const PLAT_TOP = 420;
const HUT_X = 1000;
const HUT_LEFT_FACE = HUT_X - HUT_HALF_SPAN.medium - 10;

export const level06: LevelDef = {
  id: 6,
  name: '높은 발판',
  birds: ['red', 'red', 'red', 'red'],
  star2: 19000,
  star3: 31000,
  entities: [
    platform(PLAT_X, PLAT_TOP, 120, 20),
    platform(PLAT_X, PLAT_TOP + 20, 40, GROUND - PLAT_TOP - 20), // 발판 받침 기둥
    pig('medium', PLAT_X, PLAT_TOP),
    ...hut(HUT_X, GROUND, 'wood', 'medium', { tri: true }),
  ],
  solutionShots: [
    aim({ x: PLAT_X, y: PLAT_TOP - 24 }, 50),
    aim({ x: HUT_LEFT_FACE, y: 630 }, 20),
    aim({ x: HUT_X, y: 640 }, 45),
    aim({ x: HUT_X, y: 600 }, 55),
  ],
};
