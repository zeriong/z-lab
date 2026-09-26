/** 1. 첫 발사 — 구조물 없음, 돼지가 지면. 당기기·놓기·포물선. */
import { aim } from '../gameplay/Ballistics';
import { pig } from './builders';
import type { LevelDef } from './types';

const PIG = { x: 900, y: 640 };

export const level01: LevelDef = {
  id: 1,
  name: '첫 발사',
  birds: ['red', 'red', 'red'],
  star2: 14000,
  star3: 22000,
  entities: [pig('medium', PIG.x)],
  solutionShots: [aim(PIG, 45), aim(PIG, 50), aim(PIG, 40)],
};
