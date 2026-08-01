import type { StageDef } from '../types';
import { pig, wood } from '../stage-schema';

/** §6 #1 — 가르치는 것: 당겨서 쏜다(직격 한 번). 새 2 / 돼지 1 / 나무 2 */
export const stage01: StageDef = {
  id: 1,
  name: '첫 발',
  teaches: '당겨서 쏜다 — 직격 한 번',
  birds: ['basic', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [],
  blocks: [
    wood(880, 590, 20, 100), // 좌측 널판
    wood(980, 590, 20, 100), // 우측 널판
  ],
  pigs: [pig(930, 622)],
  parScore: 1600,
};
