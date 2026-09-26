/** 5. 돌 기초 — 돌 기둥 위 나무 층. 돼지 1 상층·1 지면. 약점(상층) 노리기. */
import { aim } from '../gameplay/Ballistics';
import { GROUND, pig, pillar, plankH, plankV } from './builders';
import type { LevelDef } from './types';

const X = 900;
const FRONT_PIG_X = 780;

export const level05: LevelDef = {
  id: 5,
  name: '돌 기초',
  birds: ['red', 'red', 'red', 'red'],
  star2: 19000,
  star3: 31000,
  entities: [
    // 돌 기초: 기둥 2 (윗면 500) + 나무 바닥판 100
    pillar(X - 40, GROUND, 'stone'),
    pillar(X + 40, GROUND, 'stone'),
    plankH(X, 500, 'wood', 100),
    // 나무 상층: 기둥 2 + 지붕 판자 (윗면 380)
    plankV(X - 30, 480, 'wood'),
    plankV(X + 30, 480, 'wood'),
    plankH(X, 400, 'wood', 80),
    pig('medium', X, 380),
    // 지면 돼지 (구조물 앞)
    pig('medium', FRONT_PIG_X),
  ],
  solutionShots: [
    aim({ x: X, y: 356 }, 50),
    aim({ x: FRONT_PIG_X, y: 640 }, 20),
    aim({ x: X, y: 356 }, 48),
    aim({ x: FRONT_PIG_X, y: 640 }, 25),
  ],
};
