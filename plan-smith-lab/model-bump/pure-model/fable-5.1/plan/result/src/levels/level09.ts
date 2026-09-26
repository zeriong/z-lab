/** 9. 요새 — 돌 외벽 + 내부 얼음 오두막 + 지붕. 다단계 파괴 계획. */
import { aim } from '../gameplay/Ballistics';
import { GROUND, hut, pig, stack } from './builders';
import type { LevelDef } from './types';

const LEFT_WALL_X = 840; // 돌 상자 4개 (윗면 500)
const HUT_X = 960;
const OPEN_PIG_X = 1080;
const RIGHT_WALL_X = 1160; // 돌 상자 2개 (윗면 580)

export const level09: LevelDef = {
  id: 9,
  name: '요새',
  birds: ['red', 'red', 'red', 'red', 'red'],
  star2: 26000,
  star3: 42000,
  entities: [
    ...stack(LEFT_WALL_X, GROUND, 4, 'stone'),
    pig('medium', LEFT_WALL_X, GROUND - 160),
    ...hut(HUT_X, GROUND, 'ice', 'medium'),
    pig('medium', OPEN_PIG_X),
    ...stack(RIGHT_WALL_X, GROUND, 2, 'stone'),
    pig('large', RIGHT_WALL_X, GROUND - 80),
  ],
  solutionShots: [
    // 1) 왼쪽 성벽 위 돼지 (중심 y=480)
    aim({ x: LEFT_WALL_X, y: 476 }, 50),
    // 2) 얼음 오두막: 지붕을 뚫는 가파른 로브
    aim({ x: HUT_X, y: 640 }, 60),
    // 3) 노출된 지면 돼지
    aim({ x: OPEN_PIG_X, y: 640 }, 60),
    // 4) 오른쪽 성벽 위 큰 돼지 (중심 y=554)
    aim({ x: RIGHT_WALL_X, y: 550 }, 50),
    // 예비
    aim({ x: OPEN_PIG_X, y: 640 }, 62),
  ],
};
