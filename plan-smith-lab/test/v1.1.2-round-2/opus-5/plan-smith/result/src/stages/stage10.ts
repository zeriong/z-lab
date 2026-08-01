import type { StageDef } from '../types';
import { ice, pig, stone, terrain, wood } from '../stage-schema';

/** §6 #10 — 전 메커닉 종합. 새 5 / 돼지 6 / 복합 요새(3재료+경사+분리) */
export const stage10: StageDef = {
  id: 10,
  name: '복합 요새',
  teaches: '전 메커닉 종합 — 돌 우회·구조 붕괴·대시·경사 활용·자원 배분',
  birds: ['basic', 'dash', 'basic', 'dash', 'basic'],
  slingshot: { x: 190, y: 498 },
  terrain: [terrain(1190, 624, 220, 36, -0.24)],
  blocks: [
    // 전면 돌벽
    stone(720, 590, 20, 100),
    stone(720, 490, 20, 100),
    // 본채 (나무 골격 + 얼음 충전재 + 돌 지붕)
    wood(840, 590, 20, 100),
    wood(940, 590, 20, 100),
    wood(890, 530, 140, 20),
    ice(860, 500, 40, 40),
    ice(920, 500, 40, 40),
    wood(890, 470, 140, 20),
    stone(930, 440, 40, 40),
    // 우측 별동 (분리 목표)
    ice(1040, 590, 20, 100),
    wood(1040, 520, 40, 40),
    stone(1040, 480, 40, 40),
  ],
  pigs: [
    pig(660, 622), // 돌벽 앞 — 첫 발로 정리
    pig(780, 622), // 돌벽 뒤
    pig(890, 622), // 본채 1층
    pig(860, 442), // 본채 2층 천장 위
    pig(980, 622), // 본채와 별동 사이
    pig(1140, 575), // 경사면 위
  ],
  parScore: 8700,
};
