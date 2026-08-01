import type { StageDef } from '../types';
import { ice, pig, stone, wood } from '../stage-schema';

/** §6 #9 — 고각 궤적과 낙하 데미지. 새 5 / 돼지 5 / 높은 탑 + 상단 매달린 판 */
export const stage09: StageDef = {
  id: 9,
  name: '높은 탑',
  teaches: '고각 궤적과 낙하 데미지',
  birds: ['basic', 'basic', 'dash', 'basic', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [],
  blocks: [
    // 1층
    wood(980, 590, 20, 100),
    wood(1080, 590, 20, 100),
    wood(1030, 530, 140, 20),
    // 2층
    wood(980, 470, 20, 100),
    wood(1080, 470, 20, 100),
    wood(1030, 410, 140, 20),
    // 3층 (얼음 — 위에서 맞으면 통째로 내려앉는다)
    ice(1000, 380, 40, 40),
    ice(1060, 380, 40, 40),
    ice(1030, 350, 140, 20),
    // 부속
    wood(1180, 590, 20, 100),
    ice(1180, 520, 40, 40),
    stone(880, 590, 20, 100),
  ],
  pigs: [
    pig(1030, 622), // 탑 아래
    pig(1030, 502), // 1층 천장 위
    pig(1030, 322), // 최상단 (고각 필수)
    pig(940, 622),
    pig(1210, 622),
  ],
  parScore: 7700,
};
