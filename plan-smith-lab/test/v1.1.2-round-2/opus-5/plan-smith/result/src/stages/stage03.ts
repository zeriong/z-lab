import type { StageDef } from '../types';
import { pig, wood } from '../stage-schema';

/** §6 #3 — 직격이 아니라 구조 붕괴로 잡는다. 새 3 / 돼지 2 / 나무 6 (2층 탑) */
export const stage03: StageDef = {
  id: 3,
  name: '2층 탑',
  teaches: '직격이 아니라 구조 붕괴로 잡는다',
  birds: ['basic', 'basic', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [],
  blocks: [
    wood(900, 590, 20, 100),
    wood(1000, 590, 20, 100),
    wood(950, 530, 140, 20), // 1층 천장
    wood(920, 500, 40, 40),
    wood(980, 500, 40, 40),
    wood(950, 470, 140, 20), // 2층 천장 (위에 돼지가 앉는다)
  ],
  pigs: [
    pig(950, 622), // 1층 내부
    pig(950, 442), // 2층 지붕 위 — 붕괴로 떨어뜨려야 한다
  ],
  parScore: 3300,
};
