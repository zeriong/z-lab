import type { StageDef } from '../types';
import { pig, stone, wood } from '../stage-schema';

/** §6 #4 — 돌은 안 부서진다: 우회하거나 지지대를 노린다. 새 3 / 돼지 3 / 나무4+돌2 */
export const stage04: StageDef = {
  id: 4,
  name: '돌벽',
  teaches: '돌은 안 부서진다 — 우회하거나 지지대를 노린다',
  birds: ['basic', 'basic', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [],
  blocks: [
    stone(760, 590, 20, 100), // 앞을 막는 돌 기둥 (2단)
    stone(760, 490, 20, 100),
    wood(880, 590, 20, 100),
    wood(980, 590, 20, 100),
    wood(930, 530, 140, 20),
    wood(930, 500, 40, 40),
  ],
  pigs: [
    pig(930, 622), // 돌벽 뒤 (고각으로 넘겨야 한다)
    pig(1080, 622),
    pig(930, 462), // 나무 큐브 위
  ],
  parScore: 4300,
};
