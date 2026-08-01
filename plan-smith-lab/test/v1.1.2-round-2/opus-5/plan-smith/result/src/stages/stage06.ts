import type { StageDef } from '../types';
import { pig, stone, wood } from '../stage-schema';

/** §6 #6 — 탭-대시새: 돌 벽을 실용적으로 뚫는 유일한 수단. 새 4(기본2+대시2) / 돼지 3 / 돌4+나무4 */
export const stage06: StageDef = {
  id: 6,
  name: '대시의 시간',
  teaches: '탭-대시새 — 돌 벽을 실용적으로 뚫는 유일한 수단',
  birds: ['basic', 'dash', 'basic', 'dash'],
  slingshot: { x: 190, y: 498 },
  terrain: [],
  blocks: [
    stone(700, 590, 20, 100), // 두 겹 돌벽 (3단 높이 아님 — 고각으로는 넘길 수 없게 두껍게)
    stone(700, 490, 20, 100),
    stone(740, 590, 20, 100),
    stone(740, 490, 20, 100),
    wood(880, 590, 20, 100),
    wood(980, 590, 20, 100),
    wood(930, 530, 140, 20),
    wood(930, 500, 40, 40),
  ],
  pigs: [pig(930, 622), pig(1080, 622), pig(930, 462)],
  parScore: 4900,
};
