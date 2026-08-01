import type { StageDef } from '../types';
import { ice, pig, wood } from '../stage-schema';

/** §6 #2 — 재료가 다르다: 얼음은 쉽게 깨진다. 새 3 / 돼지 2 / 나무4+얼음2 */
export const stage02: StageDef = {
  id: 2,
  name: '얼음 맛보기',
  teaches: '재료가 다르다 — 얼음은 쉽게 깨진다',
  birds: ['basic', 'basic', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [],
  blocks: [
    wood(820, 590, 20, 100),
    wood(920, 590, 20, 100),
    wood(870, 530, 140, 20), // 지붕 판 (두 널판 위)
    wood(1080, 590, 20, 100),
    ice(870, 500, 40, 40), // 지붕 위 얼음
    ice(1080, 520, 40, 40), // 오른쪽 기둥 위 얼음
  ],
  pigs: [pig(870, 622), pig(1150, 622)],
  parScore: 3300,
};
