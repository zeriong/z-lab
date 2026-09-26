/**
 * 4. 얼음 탑 — 얼음 탑 꼭대기의 작은 돼지. 정밀 조준·전복.
 * 계획서는 4층이지만 새총 사거리(최대 18px/tick)에서 x≈760·높이 400 의 꼭대기는
 * 직격이 불가능해 3층(높이 300)으로 낮췄다. 탑을 무너뜨려 떨어뜨려도 죽는다.
 */
import { aim } from '../gameplay/Ballistics';
import { GROUND, pig, tower } from './builders';
import type { LevelDef } from './types';

const TOWER_X = 760;
const FLOORS = 3;
const TOP_Y = GROUND - 100 * FLOORS; // 360

export const level04: LevelDef = {
  id: 4,
  name: '얼음 탑',
  birds: ['red', 'red', 'red'],
  star2: 13000,
  star3: 22000,
  entities: [...tower(TOWER_X, GROUND, FLOORS, 'ice'), pig('small', TOWER_X, TOP_Y)],
  solutionShots: [
    // 꼭대기 돼지 직격 (돼지 중심 y=346, 판자 윗면 360 을 살짝 넘겨 조준)
    aim({ x: TOWER_X, y: 334 }, 48),
    aim({ x: TOWER_X, y: 334 }, 50),
    // 낮은 샷으로 1층 기둥을 깨 탑을 무너뜨린다
    aim({ x: TOWER_X - 40, y: 622 }, 15),
  ],
};
