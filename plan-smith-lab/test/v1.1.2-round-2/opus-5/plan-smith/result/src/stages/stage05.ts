import type { StageDef } from '../types';
import { ice, pig, stone } from '../stage-schema';

/** §6 #5 — 지지대 하나로 상층 전체를 무너뜨린다. 새 4 / 돼지 3 / 얼음8+돌2 (2층) */
export const stage05: StageDef = {
  id: 5,
  name: '얼음 창고',
  teaches: '지지대 하나로 상층 전체를 무너뜨린다',
  birds: ['basic', 'basic', 'basic', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [],
  blocks: [
    stone(820, 590, 20, 100), // 좌 지지대 (돌 — 부술 수 없다)
    stone(1000, 590, 20, 100), // 우 지지대
    ice(910, 530, 200, 20), // 1층 바닥판 (두 지지대에 걸침)
    ice(840, 500, 40, 40),
    ice(890, 500, 40, 40),
    ice(940, 500, 40, 40),
    ice(980, 500, 40, 40),
    ice(910, 470, 200, 20), // 2층 바닥판
    ice(880, 440, 40, 40),
    ice(940, 440, 40, 40),
  ],
  pigs: [
    pig(880, 622), // 1층 아래
    pig(940, 622),
    pig(910, 402), // 최상단
  ],
  parScore: 5100,
};
