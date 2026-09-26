/** 10. 성 — 좌우 탑 + 중앙 대형 성, 돌 비중 높음. 종합. */
import { aim } from '../gameplay/Ballistics';
import { GROUND, pig, pillar, plankH, plankV, stack, tower } from './builders';
import type { LevelDef } from './types';

const LEFT_TOWER_X = 700; // 나무 2층 (윗면 460)
const CASTLE_X = 900;
const OPEN_PIG_X = 1050;
const RIGHT_TOWER_X = 1150; // 돌 상자 2개 (윗면 580)

export const level10: LevelDef = {
  id: 10,
  name: '성',
  birds: ['red', 'red', 'red', 'red', 'red', 'red'],
  star2: 36000,
  star3: 56000,
  entities: [
    // 왼쪽 탑
    ...tower(LEFT_TOWER_X, GROUND, 2, 'wood'),
    pig('medium', LEFT_TOWER_X, GROUND - 200),
    // 중앙 성: 돌 기둥 + 돌 바닥판 (윗면 480) + 얼음 상층 + 나무 지붕판 (윗면 380)
    pillar(CASTLE_X - 40, GROUND, 'stone'),
    pillar(CASTLE_X + 40, GROUND, 'stone'),
    plankH(CASTLE_X, 500, 'stone', 100),
    plankV(CASTLE_X - 30, 480, 'ice'),
    plankV(CASTLE_X + 30, 480, 'ice'),
    plankH(CASTLE_X, 400, 'wood', 80),
    pig('medium', CASTLE_X, 480),
    pig('small', CASTLE_X, 380),
    // 성과 오른쪽 탑 사이 지면 돼지
    pig('medium', OPEN_PIG_X),
    // 오른쪽 탑
    ...stack(RIGHT_TOWER_X, GROUND, 2, 'stone'),
    pig('large', RIGHT_TOWER_X, GROUND - 80),
  ],
  solutionShots: [
    // 1) 왼쪽 탑 위 돼지 (중심 y=440)
    aim({ x: LEFT_TOWER_X, y: 440 }, 50),
    // 2) 성 꼭대기 작은 돼지 (중심 y=366)
    aim({ x: CASTLE_X, y: 362 }, 48),
    // 3) 성 상층 안 돼지: 얼음 기둥을 뚫는 빠른 샷
    aim({ x: CASTLE_X, y: 462 }, 40),
    // 4) 성 뒤 지면 돼지: 돌 기둥을 넘기는 높은 로브
    aim({ x: OPEN_PIG_X, y: 640 }, 65),
    // 5) 오른쪽 탑 위 큰 돼지 (중심 y=554), 성 위를 넘긴다
    aim({ x: RIGHT_TOWER_X, y: 550 }, 60),
    // 예비
    aim({ x: OPEN_PIG_X, y: 640 }, 62),
  ],
};
