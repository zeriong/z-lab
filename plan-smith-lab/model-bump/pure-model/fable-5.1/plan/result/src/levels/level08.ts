/** 8. 도미노 — 키 큰 나무 기둥열 + 돌벽 뒤 돼지. 전복으로 간접 타격(또는 높은 로브). */
import { aim } from '../gameplay/Ballistics';
import { GROUND, pig, pillar, stack } from './builders';
import type { LevelDef } from './types';

const PIG_A = { x: 1040, y: 640 };
const PIG_B = { x: 1110, y: 640 };

export const level08: LevelDef = {
  id: 8,
  name: '도미노',
  birds: ['red', 'red', 'red', 'red'],
  star2: 20000,
  star3: 33000,
  entities: [
    pillar(700, GROUND, 'wood'),
    pillar(760, GROUND, 'wood'),
    pillar(820, GROUND, 'wood'),
    pillar(880, GROUND, 'wood'),
    ...stack(960, GROUND, 2, 'stone'),
    pig('medium', PIG_A.x),
    pig('small', PIG_B.x),
  ],
  solutionShots: [
    // 돌벽(윗면 580)을 넘기는 가파른 로브
    aim(PIG_A, 60),
    aim(PIG_B, 60),
    aim(PIG_A, 62),
    aim(PIG_B, 62),
  ],
};
